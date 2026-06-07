import type { Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { getUserById, getOrgFeatures } from '../lib/db.js';
import {
    createDeckCard,
    getDeckStatus,
    listDeckBoards,
    listDeckCards,
    listDeckStacks,
    parseDeckIdParam,
    updateDeckCard,
    validateCreateCardInput,
    validateUpdateCardInput,
} from '../lib/nextcloud-deck.js';
import { log as baseLog } from '../lib/log.js';

const log = baseLog.child({ module: 'api/nextcloud-deck' });

const NEXTCLOUD_VIEW_PERMISSION = 'nextcloud:view';
const NEXTCLOUD_MANAGE_PERMISSION = 'nextcloud:manage';

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

async function assertNextcloudManage(user: AuthedUser | null, res: Response): Promise<boolean> {
    if (!(await assertNextcloudView(user, res))) return false;
    if (!user || !userHasPermission(user, NEXTCLOUD_MANAGE_PERMISSION)) {
        res.status(403).json({ error: 'Forbidden', message: 'nextcloud:manage erforderlich' });
        return false;
    }
    return true;
}

function mapDeckError(res: Response, e: unknown): boolean {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_configured') {
        res.status(503).json({ error: 'not_configured', message: 'Nextcloud nicht konfiguriert' });
        return true;
    }
    if (msg === 'deck_unavailable' || msg === 'deck_auth_failed') {
        res.status(503).json({ error: 'deck_unavailable', message: 'Deck-Integration nicht verfügbar' });
        return true;
    }
    if (msg === 'deck_not_found') {
        res.status(404).json({ error: 'not_found' });
        return true;
    }
    if (msg === 'deck_unreachable') {
        res.status(502).json({ error: 'connection_failed', message: 'Deck nicht erreichbar' });
        return true;
    }
    if (msg === 'invalid_body' || msg === 'invalid_due_date' || msg === 'title_too_long') {
        res.status(400).json({ error: msg, message: 'Ungültige Eingabe' });
        return true;
    }
    if (msg === 'deck_invalid_response') {
        res.status(502).json({ error: 'invalid_response', message: 'Unerwartete Deck-Antwort' });
        return true;
    }
    return false;
}

export async function handleDeckStatus(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        res.json(await getDeckStatus());
    } catch (e) {
        log.error('deck status error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleDeckBoards(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        try {
            res.json({ boards: await listDeckBoards() });
        } catch (e) {
            if (mapDeckError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('deck boards error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleDeckStacks(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        const boardId = parseDeckIdParam(req.params.boardId);
        if (!boardId) {
            res.status(400).json({ error: 'invalid_id' });
            return;
        }
        try {
            res.json({ stacks: await listDeckStacks(boardId) });
        } catch (e) {
            if (mapDeckError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('deck stacks error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleDeckCards(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        const boardId = parseDeckIdParam(req.params.boardId);
        const stackId = parseDeckIdParam(req.params.stackId);
        if (!boardId || !stackId) {
            res.status(400).json({ error: 'invalid_id' });
            return;
        }
        try {
            res.json({ cards: await listDeckCards(boardId, stackId) });
        } catch (e) {
            if (mapDeckError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('deck cards error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleDeckCreateCard(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudManage(user, res))) return;
        try {
            const input = validateCreateCardInput(req.body);
            const card = await createDeckCard(input);
            res.json({ success: true, card });
        } catch (e) {
            if (mapDeckError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('deck create card error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleDeckUpdateCard(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudManage(user, res))) return;
        const cardId = parseDeckIdParam(req.params.cardId);
        if (!cardId) {
            res.status(400).json({ error: 'invalid_id' });
            return;
        }
        try {
            const input = validateUpdateCardInput(cardId, req.body);
            const card = await updateDeckCard(input);
            res.json({ success: true, card });
        } catch (e) {
            if (mapDeckError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('deck update card error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}
