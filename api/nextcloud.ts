import type { Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';
import { getUserById, getOrgFeatures } from '../lib/db.js';
import {
    getNextcloudStatus,
    listNextcloudFiles,
    streamNextcloudFileToResponse,
    uploadNextcloudFile,
    NEXTCLOUD_MAX_UPLOAD_BYTES,
} from '../lib/nextcloud.js';
import { parseMultipart } from '../lib/parseMultipart.js';
import { log as baseLog } from '../lib/log.js';

const log = baseLog.child({ module: 'api/nextcloud' });

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

function mapNextcloudError(res: Response, e: unknown): boolean {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'not_configured') {
        res.status(503).json({ error: 'not_configured', message: 'Nextcloud nicht konfiguriert' });
        return true;
    }
    if (msg === 'invalid_path') {
        res.status(400).json({ error: 'invalid_path' });
        return true;
    }
    if (msg === 'not_found') {
        res.status(404).json({ error: 'not_found' });
        return true;
    }
    if (msg === 'unsupported_media') {
        res.status(415).json({ error: 'unsupported_media', message: 'Vorschau für diesen Dateityp nicht unterstützt' });
        return true;
    }
    if (msg === 'nextcloud_unreachable') {
        res.status(502).json({ error: 'connection_failed', message: 'Nextcloud nicht erreichbar' });
        return true;
    }
    if (msg === 'file_exists') {
        res.status(409).json({ error: 'file_exists', message: 'Datei existiert bereits' });
        return true;
    }
    if (msg === 'invalid_filename') {
        res.status(400).json({ error: 'invalid_filename', message: 'Ungültiger Dateiname' });
        return true;
    }
    if (msg === 'file_too_large') {
        res.status(413).json({ error: 'file_too_large', message: 'Datei überschreitet das Upload-Limit (50 MB)' });
        return true;
    }
    if (msg === 'invalid_multipart') {
        res.status(400).json({ error: 'invalid_multipart', message: 'multipart/form-data erwartet' });
        return true;
    }
    return false;
}

export async function handleNextcloudStatus(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;
        const status = await getNextcloudStatus();
        res.json(status);
    } catch (e) {
        log.error('nextcloud status error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleNextcloudFiles(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const pathRaw = typeof req.query.path === 'string' ? req.query.path : '/';
        try {
            const list = await listNextcloudFiles(pathRaw);
            res.json(list);
        } catch (e) {
            if (mapNextcloudError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('nextcloud files error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleNextcloudDownload(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const pathRaw = typeof req.query.path === 'string' ? req.query.path : '';
        if (!pathRaw) {
            res.status(400).json({ error: 'invalid_path' });
            return;
        }
        try {
            await streamNextcloudFileToResponse(pathRaw, res, 'download');
        } catch (e) {
            if (mapNextcloudError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('nextcloud download error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleNextcloudPreview(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudView(user, res))) return;

        const pathRaw = typeof req.query.path === 'string' ? req.query.path : '';
        if (!pathRaw) {
            res.status(400).json({ error: 'invalid_path' });
            return;
        }
        try {
            await streamNextcloudFileToResponse(pathRaw, res, 'preview');
        } catch (e) {
            if (mapNextcloudError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('nextcloud preview error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function handleNextcloudUpload(req: Request, res: Response): Promise<void> {
    try {
        const user = await resolveAuthedUser(req);
        if (!(await assertNextcloudManage(user, res))) return;

        let parsed;
        try {
            parsed = await parseMultipart(req, NEXTCLOUD_MAX_UPLOAD_BYTES);
        } catch (e) {
            if (mapNextcloudError(res, e)) return;
            throw e;
        }

        const targetPath = parsed.fields.targetPath ?? '/';
        if (!parsed.file || parsed.file.buffer.length === 0) {
            res.status(400).json({ error: 'missing_file', message: 'Keine Datei übermittelt' });
            return;
        }

        try {
            const result = await uploadNextcloudFile(
                targetPath,
                parsed.file.filename,
                parsed.file.buffer,
                parsed.file.mimeType,
            );
            res.json(result);
        } catch (e) {
            if (mapNextcloudError(res, e)) return;
            throw e;
        }
    } catch (e) {
        log.error('nextcloud upload error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
}
