import IcalExpander from 'ical-expander';
import { getNextcloudConfig } from './nextcloud.js';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'nextcloud-calendar' });

export interface CalendarStatus {
    configured: boolean;
    available: boolean;
    error?: string;
}

export interface CalendarListItem {
    id: string;
    displayName: string;
    color?: string;
    url: string;
}

export interface CalendarEvent {
    id: string;
    uid: string;
    title: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    allDay?: boolean;
    calendarId: string;
    url?: string;
}

const DEFAULT_RANGE_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const RECURRENCE_MAX_ITERATIONS = 500;

function basicAuthHeader(user: string, password: string): string {
    const token = Buffer.from(`${user}:${password}`, 'utf8').toString('base64');
    return `Basic ${token}`;
}

function stripHtml(raw: string): string {
    return raw
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
}

function decodeXmlEntities(raw: string): string {
    return raw
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function calendarsHomeUrl(cfg: ReturnType<typeof getNextcloudConfig>): string {
    const encodedUser = encodeURIComponent(cfg.user);
    return `${cfg.url}/remote.php/dav/calendars/${encodedUser}/`;
}

function calendarCollectionUrl(cfg: ReturnType<typeof getNextcloudConfig>, calendarId: string): string {
    const base = calendarsHomeUrl(cfg);
    const segments = calendarId.split('/');
    return `${base}${segments.map(encodeURIComponent).join('/')}/`;
}

/** Safe relative id under the user's calendar home — no traversal. */
export function normalizeCalendarId(raw: string | undefined): string {
    const input = (raw ?? '').trim();
    if (!input) throw new Error('invalid_calendar_id');
    const segments = input.replace(/\\/g, '/').split('/').filter(s => s.length > 0 && s !== '.');
    for (const seg of segments) {
        if (seg === '..') throw new Error('invalid_calendar_id');
    }
    if (segments.length === 0 || segments.length > 8) throw new Error('invalid_calendar_id');
    for (const seg of segments) {
        if (!/^[a-zA-Z0-9._@-]+$/.test(seg)) throw new Error('invalid_calendar_id');
    }
    return segments.join('/');
}

function parseIsoDate(raw: string | undefined, fallback: Date): Date {
    if (!raw) return fallback;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error('invalid_date_range');
    return d;
}

export function parseEventDateRange(
    fromRaw?: string,
    toRaw?: string,
): { from: Date; to: Date } {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultTo = new Date(startOfToday);
    defaultTo.setUTCDate(defaultTo.getUTCDate() + DEFAULT_RANGE_DAYS);

    const from = parseIsoDate(fromRaw, startOfToday);
    let to = parseIsoDate(toRaw, defaultTo);
    if (to <= from) throw new Error('invalid_date_range');

    const maxTo = new Date(from);
    maxTo.setUTCDate(maxTo.getUTCDate() + MAX_RANGE_DAYS);
    if (to > maxTo) to = maxTo;

    return { from, to };
}

function toCalDavUtc(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

async function calDavRequest(
    url: string,
    method: string,
    cfg: ReturnType<typeof getNextcloudConfig>,
    extraHeaders: Record<string, string> = {},
    body?: string,
): Promise<string> {
    const headers: Record<string, string> = {
        Authorization: basicAuthHeader(cfg.user, cfg.password),
        ...extraHeaders,
    };
    if (body) headers['Content-Type'] = 'application/xml; charset=utf-8';

    const res = await fetch(url, { method, headers, body });
    if (res.status === 401 || res.status === 403) throw new Error('calendar_auth_failed');
    if (res.status === 404) throw new Error('calendar_not_found');
    if (!res.ok) {
        log.warn('caldav request failed', { status: res.status, method });
        throw new Error('calendar_unreachable');
    }
    return res.text();
}

function isCalendarResource(block: string): boolean {
    return /<(?:[\w:]+:)?calendar\s*\/>/i.test(block)
        || /<(?:[\w:]+:)?calendar[\s>]/i.test(block);
}

function parseCalendarEntries(xml: string, cfg: ReturnType<typeof getNextcloudConfig>): CalendarListItem[] {
    const home = calendarsHomeUrl(cfg);
    const homePath = new URL(home).pathname;
    const responses = xml.match(/<(?:[\w:]+:)?response[\s\S]*?<\/(?:[\w:]+:)?response>/gi) ?? [];
    const items: CalendarListItem[] = [];

    for (const block of responses) {
        if (!isCalendarResource(block)) continue;

        const hrefMatch = block.match(/<(?:[\w:]+:)?href>([^<]+)<\/(?:[\w:]+:)?href>/i);
        if (!hrefMatch) continue;
        let href = decodeXmlEntities(hrefMatch[1].trim());
        if (!href.startsWith('http')) {
            href = `${cfg.url}${href.startsWith('/') ? '' : '/'}${href}`;
        }
        let path: string;
        try {
            path = new URL(href).pathname;
        } catch {
            continue;
        }
        if (!path.startsWith(homePath) || path === homePath || path === `${homePath}/`) continue;

        const rel = path.slice(homePath.length).replace(/\/$/, '');
        if (!rel || rel.includes('inbox') || rel.includes('outbox') || rel.includes('trashbin')) continue;

        const displayName = block.match(/<(?:[\w:]+:)?displayname>([^<]*)<\/(?:[\w:]+:)?displayname>/i)?.[1];
        const color = block.match(/<(?:[\w:]+:)?calendar-color[^>]*>([^<]+)<\/(?:[\w:]+:)?calendar-color>/i)?.[1];
        const name = (displayName && displayName.trim()) || rel.split('/').pop() || rel;

        try {
            const id = normalizeCalendarId(rel);
            items.push({
                id,
                displayName: decodeXmlEntities(name).slice(0, 200),
                color: color?.trim().replace(/^#/, '') ? `#${color.trim().replace(/^#/, '')}` : undefined,
                url: calendarCollectionUrl(cfg, id),
            });
        } catch {
            continue;
        }
    }

    return items.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
}

function extractCalendarDataBlocks(xml: string): string[] {
    const matches = xml.match(/<(?:[\w:]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[\w:]+:)?calendar-data>/gi) ?? [];
    return matches.map((block) => {
        const inner = block.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, '');
        return decodeXmlEntities(inner.trim());
    }).filter(s => s.includes('BEGIN:VCALENDAR'));
}

function mapIcalEvent(
    event: {
        uid?: string;
        summary?: string;
        description?: string;
        location?: string;
        startDate?: { isDate?: boolean; toJSDate?: () => Date };
        endDate?: { toJSDate?: () => Date };
        component?: {
            getFirstPropertyValue?: (name: string) => unknown;
            getFirstProperty?: (name: string) => { getFirstValue?: () => { isDate?: boolean } };
        };
    },
    startDate: Date,
    endDate: Date,
    calendarId: string,
    cfg: ReturnType<typeof getNextcloudConfig>,
    occurrenceKey?: string,
): CalendarEvent | null {
    const uid = event.uid ?? event.component?.getFirstPropertyValue?.('uid');
    const title = (event.summary ?? event.component?.getFirstPropertyValue?.('summary') ?? '').toString().trim();
    if (!uid || !title) return null;

    const descRaw = event.description ?? event.component?.getFirstPropertyValue?.('description');
    const locRaw = event.location ?? event.component?.getFirstPropertyValue?.('location');
    const description = typeof descRaw === 'string' && descRaw.trim() ? stripHtml(descRaw).slice(0, 5000) : undefined;
    const location = typeof locRaw === 'string' && locRaw.trim() ? stripHtml(locRaw).slice(0, 500) : undefined;

    const dtStart = event.component?.getFirstProperty?.('dtstart');
    const allDay = !!(event.startDate?.isDate ?? dtStart?.getFirstValue?.()?.isDate);

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    const id = `${calendarId}:${uid}:${occurrenceKey ?? startIso}`;

    return {
        id,
        uid: String(uid),
        title: title.slice(0, 500),
        description,
        location,
        start: startIso,
        end: endIso,
        allDay,
        calendarId,
        url: buildCalendarEventOpenUrl(cfg.url, startDate),
    };
}

export function buildCalendarEventOpenUrl(serverUrl: string, start: Date): string {
    const base = serverUrl.replace(/\/+$/, '');
    const y = start.getUTCFullYear();
    const m = String(start.getUTCMonth() + 1).padStart(2, '0');
    const d = String(start.getUTCDate()).padStart(2, '0');
    return `${base}/index.php/apps/calendar/dayGridDay/${y}/${m}/${d}`;
}

function expandIcsToEvents(
    ics: string,
    calendarId: string,
    from: Date,
    to: Date,
    cfg: ReturnType<typeof getNextcloudConfig>,
): CalendarEvent[] {
    const results: CalendarEvent[] = [];
    try {
        const expander = new IcalExpander({
            ics,
            maxIterations: RECURRENCE_MAX_ITERATIONS,
            skipInvalidDates: true,
        });
        const { events, occurrences } = expander.between(from, to);

        for (const ev of events) {
            const start = ev.startDate?.toJSDate?.();
            const end = ev.endDate?.toJSDate?.();
            if (!start || !end) continue;
            const mapped = mapIcalEvent(ev, start, end, calendarId, cfg);
            if (mapped) results.push(mapped);
        }

        for (const occ of occurrences) {
            const start = occ.startDate?.toJSDate?.();
            const end = occ.endDate?.toJSDate?.();
            if (!start || !end) continue;
            const item = occ.item;
            const mapped = mapIcalEvent(
                item,
                start,
                end,
                calendarId,
                cfg,
                String(start.getTime()),
            );
            if (mapped) results.push(mapped);
        }
    } catch (e) {
        log.warn('ics expand failed', { calendarId, err: e });
    }
    return results;
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) {
        return { configured: false, available: false };
    }
    try {
        await calDavRequest(calendarsHomeUrl(cfg), 'PROPFIND', cfg, { Depth: '0' });
        return { configured: true, available: true };
    } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'calendar_auth_failed') {
            return {
                configured: true,
                available: false,
                error: 'Kalender-Integration nicht verfügbar. App-Passwort und CalDAV-Zugriff prüfen.',
            };
        }
        return {
            configured: true,
            available: false,
            error: 'Kalender-Integration nicht erreichbar.',
        };
    }
}

export async function listCalendars(): Promise<CalendarListItem[]> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const xml = await calDavRequest(calendarsHomeUrl(cfg), 'PROPFIND', cfg, { Depth: '1' }, `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <cal:calendar-description />
    <cs:getctag />
    <oc:id />
    <x1:calendar-color xmlns:x1="http://apple.com/ns/ical/" />
  </d:prop>
</d:propfind>`);

    return parseCalendarEntries(xml, cfg);
}

export async function listCalendarEvents(
    calendarIdRaw: string,
    fromRaw?: string,
    toRaw?: string,
): Promise<CalendarEvent[]> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const calendarId = normalizeCalendarId(calendarIdRaw);
    const { from, to } = parseEventDateRange(fromRaw, toRaw);
    const url = calendarCollectionUrl(cfg, calendarId);

    const body = `<?xml version="1.0" encoding="utf-8" ?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${toCalDavUtc(from)}" end="${toCalDavUtc(to)}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;

    const xml = await calDavRequest(url, 'REPORT', cfg, { Depth: '1' }, body);
    const icsBlocks = extractCalendarDataBlocks(xml);

    const byId = new Map<string, CalendarEvent>();
    for (const ics of icsBlocks) {
        for (const ev of expandIcsToEvents(ics, calendarId, from, to, cfg)) {
            byId.set(ev.id, ev);
        }
    }

    return Array.from(byId.values()).sort((a, b) => a.start.localeCompare(b.start));
}
