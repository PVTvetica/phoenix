import type { Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { getUserById, getOrgFeatures } from '../lib/db.js';
import {
    assertTableExists,
    getTableSchema,
    getTablesStatus,
    listTableRows,
    listTables,
    parseRowPagination,
    parseTableIdParam,
} from '../lib/nextcloud-tables.js';
import { log as baseLog } from '../lib/log.js';

const log = baseLog.child({ module: 'api/nextcloud-tables' });

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

function mapTablesError(res: Response, e: unknown): boolean {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_configured') {
        res.status(503).json({ error: 'not_configured', message: 'Nextcloud nicht konfiguriert' });
        return true;
    }
    if (msg === 'tables_unavailable' || msg === 'tables_auth_failed') {
        res.status(503).json({ error: 'tables_unavailable', message: 'Tables-App nicht verfügbar' });
        return true;
    }
    if (msg === 'tables_not_found') {
        res.status(404).json({ error: 'not_found', message: 'Tabelle nicht gefunden' });
        return true;
    }
    if (msg === 'invalid_pagination') {
        res.status(400).json({ error: 'invalid_pagination' });
        return true;
    }
    if (msg === 'tables_unreachable') {
        res.status(502).json({ error: 'connection_failed', message: 'Tables nicht erreichbar' });
        return true;
    }
    return false;
}

export async function handleTablesStatus(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        res.json(await getTablesStatus());
    } catch (e) {
        log.error('tables status error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleTablesList(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        try {
            res.json({ tables: await listTables() });
        } catch (e) {
            if (mapTablesError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('tables list error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleTablesSchema(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const tableId = parseTableIdParam(req.params.tableId);
        if (!tableId) {
            res.status(400).json({ error: 'invalid_table_id' });
            return;
        }

        try {
            await assertTableExists(tableId);
            res.json(await getTableSchema(tableId));
        } catch (e) {
            if (mapTablesError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('tables schema error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleTablesRows(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const tableId = parseTableIdParam(req.params.tableId);
        if (!tableId) {
            res.status(400).json({ error: 'invalid_table_id' });
            return;
        }

        const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
        const offset = typeof req.query.offset === 'string' ? req.query.offset : undefined;

        try {
            parseRowPagination(limit, offset);
        } catch (e) {
            if (mapTablesError(res, e)) return;
            res.status(400).json({ error: 'invalid_query' });
            return;
        }

        try {
            await assertTableExists(tableId);
            res.json(await listTableRows(tableId, limit, offset));
        } catch (e) {
            if (mapTablesError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('tables rows error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}
