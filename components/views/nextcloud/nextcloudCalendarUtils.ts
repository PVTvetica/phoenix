import type { CalendarEvent } from '../../../services/nextcloudCalendarTypes';

export type CalendarRangeDays = 7 | 30 | 90;

export function buildRangeIso(days: CalendarRangeDays): { from: string; to: string } {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + days);
    return { from: start.toISOString(), to: end.toISOString() };
}

export function calendarStatusLabel(status: {
    configured: boolean;
    available: boolean;
}): 'Aktiv' | 'Nicht konfiguriert' | 'Fehler' {
    if (!status.configured) return 'Nicht konfiguriert';
    if (status.available) return 'Aktiv';
    return 'Fehler';
}

export function calendarStatusAccent(
    status: { configured: boolean; available: boolean },
): 'emerald' | 'amber' | 'red' {
    if (!status.configured) return 'amber';
    if (status.available) return 'emerald';
    return 'red';
}

export function formatEventDate(iso: string, allDay?: boolean): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const opts: Intl.DateTimeFormatOptions = allDay
        ? { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
        : { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    return d.toLocaleDateString('de-DE', opts);
}

export function formatEventTime(iso: string, allDay?: boolean): string {
    if (allDay) return 'Ganztägig';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function formatEventRange(event: CalendarEvent): string {
    const startDate = formatEventDate(event.start, event.allDay);
    const endDate = formatEventDate(event.end, event.allDay);
    if (startDate === endDate) {
        return `${startDate}, ${formatEventTime(event.start, event.allDay)} – ${formatEventTime(event.end, event.allDay)}`;
    }
    return `${startDate} ${formatEventTime(event.start, event.allDay)} – ${endDate} ${formatEventTime(event.end, event.allDay)}`;
}

export function buildCalendarOpenUrl(serverUrl: string | undefined, event: CalendarEvent): string | null {
    if (event.url) return event.url;
    if (!serverUrl) return null;
    const d = new Date(event.start);
    if (Number.isNaN(d.getTime())) return null;
    const base = serverUrl.replace(/\/+$/, '');
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${base}/index.php/apps/calendar/dayGridDay/${y}/${m}/${day}`;
}
