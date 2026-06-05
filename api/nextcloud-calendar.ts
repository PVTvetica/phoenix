import type { Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { getUserById, getOrgFeatures } from '../lib/db.js';
import {
    getCalendarStatus,
    listCalendarEvents,
    listCalendars,
    normalizeCalendarId,
    parseEventDateRange,
} from '../lib/nextcloud-calendar.js';
import { log as baseLog } from '../lib/log.js';

const log = baseLog.child({ module: 'api/nextcloud-calendar' });

const NEXTCLOUD_VIEW_PERMISSION = 'nextcloud:view';

type AuthedUser = Awaited<ReturnType<typeof getUserById>>;

async function resolveAuthedUser(req: Request): Promise<AuthedUser | null> {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;
    const decoded = verifyToken(token);
    if (!decoded) return null;
    return getUserById(decoded.userId);
}

function userHasPermission(user: NonNullable<AuthedUser>, perm: string): boolean {
    if (user.role === 'Admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

async function isNextcloudFeatureEnabled(): Promise<boolean> {
    const features = await getOrgFeatures();
    const nextcloud = (features.nextcloud || {}) as { enabled?: boolean };
    return nextcloud.enabled === true;
}

async function assertNextcloudView(user: AuthedUser | null, res: Response): Promise<boolean> {
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    if (!(await isNextcloudFeatureEnabled())) {
        res.status(403).json({ error: 'feature_disabled', message: 'Nextcloud-Modul ist deaktiviert' });
        return false;
    }
    if (!userHasPermission(user, NEXTCLOUD_VIEW_PERMISSION)) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }
    return true;
}

function mapCalendarError(res: Response, e: unknown): boolean {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_configured') {
        res.status(503).json({ error: 'not_configured', message: 'Nextcloud nicht konfiguriert' });
        return true;
    }
    if (msg === 'calendar_auth_failed') {
        res.status(503).json({ error: 'calendar_unavailable', message: 'Kalender-Integration nicht verfügbar' });
        return true;
    }
    if (msg === 'calendar_not_found' || msg === 'invalid_calendar_id') {
        res.status(404).json({ error: 'not_found', message: 'Kalender nicht gefunden' });
        return true;
    }
    if (msg === 'invalid_date_range') {
        res.status(400).json({ error: 'invalid_date_range' });
        return true;
    }
    if (msg === 'calendar_unreachable') {
        res.status(502).json({ error: 'connection_failed', message: 'Kalender nicht erreichbar' });
        return true;
    }
    return false;
}

export async function handleCalendarStatus(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        res.json(await getCalendarStatus());
    } catch (e) {
        log.error('calendar status error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleCalendarList(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        try {
            res.json({ calendars: await listCalendars() });
        } catch (e) {
            if (mapCalendarError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('calendar list error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const calendarIdRaw = typeof req.query.calendarId === 'string' ? req.query.calendarId : '';
        if (!calendarIdRaw) {
            res.status(400).json({ error: 'missing_calendar_id' });
            return;
        }

        const from = typeof req.query.from === 'string' ? req.query.from : undefined;
        const to = typeof req.query.to === 'string' ? req.query.to : undefined;

        try {
            normalizeCalendarId(calendarIdRaw);
            parseEventDateRange(from, to);
        } catch (e) {
            if (mapCalendarError(res, e)) return;
            res.status(400).json({ error: 'invalid_query' });
            return;
        }

        try {
            const allowed = await listCalendars();
            const calendarId = normalizeCalendarId(calendarIdRaw);
            if (!allowed.some(c => c.id === calendarId)) {
                res.status(404).json({ error: 'not_found', message: 'Kalender nicht gefunden' });
                return;
            }
            const events = await listCalendarEvents(calendarId, from, to);
            res.json({ events });
        } catch (e) {
            if (mapCalendarError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('calendar events error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}
