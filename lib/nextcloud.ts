import { Readable } from 'node:stream';
import type { Response as ExpressResponse } from 'express';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'nextcloud' });

export const NEXTCLOUD_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const PREVIEW_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'txt', 'md']);

const MIME_BY_EXT: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
};

export type NextcloudConnectionState = 'not_configured' | 'active' | 'error';

export interface NextcloudEnvFlags {
    NEXTCLOUD_URL: boolean;
    NEXTCLOUD_USER: boolean;
    NEXTCLOUD_APP_PASSWORD: boolean;
    NEXTCLOUD_BASE_PATH: boolean;
}

export interface NextcloudStatus {
    configured: boolean;
    connection: NextcloudConnectionState;
    basePath: string;
    displayBasePath: string;
    serverUrl?: string;
    env: NextcloudEnvFlags;
    error?: string;
}

export interface NextcloudUploadResult {
    success: true;
    entry: NextcloudFileEntry;
}

export interface NextcloudFileEntry {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    modified?: string;
}

export interface NextcloudFileList {
    path: string;
    entries: NextcloudFileEntry[];
}

interface NextcloudConfig {
    url: string;
    user: string;
    password: string;
    basePath: string;
    configured: boolean;
}

function trimEnv(key: string): string {
    return (process.env[key] ?? '').trim();
}

export function getNextcloudConfig(): NextcloudConfig {
    const url = trimEnv('NEXTCLOUD_URL').replace(/\/+$/, '');
    const user = trimEnv('NEXTCLOUD_USER');
    const password = trimEnv('NEXTCLOUD_APP_PASSWORD');
    const basePath = trimEnv('NEXTCLOUD_BASE_PATH').replace(/^\/+|\/+$/g, '');
    return {
        url,
        user,
        password,
        basePath,
        configured: !!(url && user && password),
    };
}

export function getNextcloudEnvFlags(): NextcloudEnvFlags {
    return {
        NEXTCLOUD_URL: !!trimEnv('NEXTCLOUD_URL'),
        NEXTCLOUD_USER: !!trimEnv('NEXTCLOUD_USER'),
        NEXTCLOUD_APP_PASSWORD: !!trimEnv('NEXTCLOUD_APP_PASSWORD'),
        NEXTCLOUD_BASE_PATH: !!trimEnv('NEXTCLOUD_BASE_PATH'),
    };
}

export function getFileExtension(filename: string): string {
    const base = filename.split('/').pop() ?? filename;
    const dot = base.lastIndexOf('.');
    if (dot < 1) return '';
    return base.slice(dot + 1).toLowerCase();
}

export function isPreviewableExtension(ext: string): boolean {
    return PREVIEW_EXTENSIONS.has(ext.toLowerCase());
}

export function isPreviewablePath(relativeFilePath: string): boolean {
    return isPreviewableExtension(getFileExtension(relativeFilePath));
}

export function contentTypeForFilename(filename: string): string {
    const ext = getFileExtension(filename);
    return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export function shouldInlineDisposition(filename: string): boolean {
    const ext = getFileExtension(filename);
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf'].includes(ext);
}

/** Relative path to a file (not a directory). */
export function assertFileRelativePath(raw: string | undefined): string {
    const p = normalizeNextcloudRelativePath(raw);
    const segments = p.split('/').filter(Boolean);
    if (segments.length === 0) throw new Error('invalid_path');
    return p;
}

export function sanitizeUploadFilename(raw: string): string {
    let name = raw.replace(/\\/g, '/').split('/').pop() ?? '';
    name = name.replace(/[\x00-\x1f\x7f]/g, '').trim();
    name = name.replace(/[/\\<>:"|?*]/g, '_');
    if (!name || name === '.' || name === '..') throw new Error('invalid_filename');
    if (name.length > 200) name = name.slice(0, 200);
    return name;
}

export function buildOpenInNextcloudUrl(relativePath: string, type: 'file' | 'directory'): string | null {
    const cfg = getNextcloudConfig();
    if (!cfg.configured || !cfg.url) return null;
    let dir = normalizeNextcloudRelativePath(relativePath);
    if (type === 'file') {
        const segments = dir.split('/').filter(Boolean);
        segments.pop();
        dir = segments.length ? `/${segments.join('/')}` : '/';
    }
    const base = cfg.basePath ? `/${cfg.basePath}` : '';
    const fullDir = `${base}${dir === '/' ? '' : dir}`.replace(/\/+/g, '/') || '/';
    return `${cfg.url}/apps/files/?dir=${encodeURIComponent(fullDir)}`;
}

function dispositionFilename(name: string): string {
    const safe = name.replace(/[^\w.\-() ]+/g, '_') || 'download';
    return `filename*=UTF-8''${encodeURIComponent(safe)}`;
}

/** Relative path under the configured base folder (always starts with /). */
export function normalizeNextcloudRelativePath(raw: string | undefined): string {
    const input = (raw ?? '').trim();
    if (!input || input === '/') return '/';
    let p = input.replace(/\\/g, '/');
    if (!p.startsWith('/')) p = `/${p}`;
    const segments = p.split('/').filter(s => s.length > 0 && s !== '.');
    for (const seg of segments) {
        if (seg === '..') throw new Error('invalid_path');
    }
    return `/${segments.join('/')}`;
}

function buildDavRoot(cfg: NextcloudConfig): string {
    const encodedUser = encodeURIComponent(cfg.user);
    return `${cfg.url}/remote.php/dav/files/${encodedUser}`;
}

function joinDavPath(cfg: NextcloudConfig, relativePath: string): string {
    const root = buildDavRoot(cfg);
    const base = cfg.basePath ? `/${cfg.basePath}` : '';
    const rel = relativePath === '/' ? '' : relativePath;
    const full = `${base}${rel}`.replace(/\/+/g, '/');
    return `${root}${full}`;
}

function basicAuthHeader(cfg: NextcloudConfig): string {
    const token = Buffer.from(`${cfg.user}:${cfg.password}`, 'utf8').toString('base64');
    return `Basic ${token}`;
}

function decodeHref(href: string): string {
    try {
        return decodeURIComponent(href);
    } catch {
        return href;
    }
}

function parsePropfindEntries(xml: string, cfg: NextcloudConfig, listPath: string): NextcloudFileEntry[] {
    const responses = xml.match(/<d:response[\s\S]*?<\/d:response>/gi) ?? [];
    const davRoot = buildDavRoot(cfg);
    const listDav = joinDavPath(cfg, listPath);
    const entries: NextcloudFileEntry[] = [];

    for (const block of responses) {
        const hrefMatch = block.match(/<d:href>([^<]+)<\/d:href>/i);
        if (!hrefMatch) continue;
        let href = decodeHref(hrefMatch[1].trim());
        if (href.endsWith('/')) href = href.slice(0, -1);
        if (!href.startsWith('http')) {
            href = `${cfg.url}${href.startsWith('/') ? '' : '/'}${href}`;
        }
        if (href === listDav || href === `${listDav}/`) continue;

        const isCollection = /<d:collection\s*\/>/i.test(block)
            || /<d:resourcetype>[\s\S]*?<d:collection/i.test(block);
        const displayName = block.match(/<d:displayname>([^<]*)<\/d:displayname>/i)?.[1];
        const contentLength = block.match(/<d:getcontentlength>(\d+)<\/d:getcontentlength>/i)?.[1];
        const lastModified = block.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/i)?.[1];

        const nameFromHref = href.split('/').filter(Boolean).pop() ?? '';
        const name = (displayName && displayName.trim()) || nameFromHref;
        if (!name) continue;

        const rel = href.startsWith(davRoot)
            ? href.slice(davRoot.length) || '/'
            : `/${name}`;
        const normalizedRel = normalizeNextcloudRelativePath(
            cfg.basePath ? rel.replace(new RegExp(`^/?${cfg.basePath}`), '') || '/' : rel,
        );

        entries.push({
            name,
            path: normalizedRel,
            type: isCollection ? 'directory' : 'file',
            size: contentLength ? Number(contentLength) : undefined,
            modified: lastModified,
        });
    }

    entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    return entries;
}

async function propfind(cfg: NextcloudConfig, davUrl: string, depth: '0' | '1'): Promise<string> {
    const res = await fetch(davUrl.endsWith('/') ? davUrl : `${davUrl}/`, {
        method: 'PROPFIND',
        headers: {
            Authorization: basicAuthHeader(cfg),
            Depth: depth,
            'Content-Type': 'application/xml; charset=utf-8',
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <d:getcontentlength />
    <d:getlastmodified />
  </d:prop>
</d:propfind>`,
    });
    if (!res.ok) {
        log.warn('nextcloud propfind failed', { status: res.status, depth });
        throw new Error('nextcloud_unreachable');
    }
    return res.text();
}

export async function getNextcloudStatus(): Promise<NextcloudStatus> {
    const cfg = getNextcloudConfig();
    const env = getNextcloudEnvFlags();
    const displayBasePath = cfg.basePath ? `/${cfg.basePath}` : '/';

    if (!cfg.configured) {
        return {
            configured: false,
            connection: 'not_configured',
            basePath: cfg.basePath,
            displayBasePath,
            env,
        };
    }

    try {
        const davUrl = joinDavPath(cfg, '/');
        await propfind(cfg, davUrl, '0');
        return {
            configured: true,
            connection: 'active',
            basePath: cfg.basePath,
            displayBasePath,
            serverUrl: cfg.url,
            env,
        };
    } catch {
        return {
            configured: true,
            connection: 'error',
            basePath: cfg.basePath,
            displayBasePath,
            serverUrl: cfg.url,
            env,
            error: 'Verbindung zu Nextcloud fehlgeschlagen. URL, Benutzer und App-Passwort prüfen.',
        };
    }
}

export async function listNextcloudFiles(relativePath: string): Promise<NextcloudFileList> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) {
        throw new Error('not_configured');
    }
    const path = normalizeNextcloudRelativePath(relativePath);
    const davUrl = joinDavPath(cfg, path);
    const xml = await propfind(cfg, davUrl, '1');
    const entries = parsePropfindEntries(xml, cfg, path);
    return { path, entries };
}

async function fetchDavFile(cfg: NextcloudConfig, relativeFilePath: string): Promise<Response> {
    const path = assertFileRelativePath(relativeFilePath);
    const davUrl = joinDavPath(cfg, path);
    const res = await fetch(davUrl, {
        method: 'GET',
        headers: { Authorization: basicAuthHeader(cfg) },
    });
    if (res.status === 404) throw new Error('not_found');
    if (!res.ok) {
        log.warn('nextcloud get failed', { status: res.status });
        throw new Error('nextcloud_unreachable');
    }
    return res;
}

export async function streamNextcloudFileToResponse(
    relativeFilePath: string,
    res: ExpressResponse,
    mode: 'download' | 'preview',
): Promise<void> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const path = assertFileRelativePath(relativeFilePath);
    const filename = path.split('/').filter(Boolean).pop() ?? 'download';
    const ext = getFileExtension(filename);

    if (mode === 'preview' && !isPreviewableExtension(ext)) {
        throw new Error('unsupported_media');
    }

    const upstream = await fetchDavFile(cfg, path);
    const contentType = upstream.headers.get('content-type')
        ?? contentTypeForFilename(filename);
    const inline = mode === 'preview' || shouldInlineDisposition(filename);
    const disposition = inline ? 'inline' : 'attachment';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${disposition}; ${dispositionFilename(filename)}`);

    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    if (!upstream.body) throw new Error('nextcloud_unreachable');
    const nodeStream = Readable.fromWeb(upstream.body as import('stream/web').ReadableStream);
    await new Promise<void>((resolve, reject) => {
        nodeStream.on('error', reject);
        res.on('error', reject);
        res.on('finish', resolve);
        nodeStream.pipe(res);
    });
}

export async function uploadNextcloudFile(
    targetDir: string,
    rawFilename: string,
    body: Buffer,
    mimeType?: string,
): Promise<NextcloudUploadResult> {
    const cfg = getNextcloudConfig();
    if (!cfg.configured) throw new Error('not_configured');

    const dir = normalizeNextcloudRelativePath(targetDir);
    const filename = sanitizeUploadFilename(rawFilename);
    const filePath = dir === '/' ? `/${filename}` : `${dir}/${filename}`;
    const davUrl = joinDavPath(cfg, filePath);
    const contentType = mimeType?.trim() || contentTypeForFilename(filename);

    const res = await fetch(davUrl, {
        method: 'PUT',
        headers: {
            Authorization: basicAuthHeader(cfg),
            'Content-Type': contentType,
            'If-None-Match': '*',
        },
        body: new Uint8Array(body),
    });

    if (res.status === 412 || res.status === 409) throw new Error('file_exists');
    if (!res.ok) {
        log.warn('nextcloud put failed', { status: res.status });
        throw new Error('nextcloud_unreachable');
    }

    return {
        success: true,
        entry: {
            name: filename,
            path: filePath,
            type: 'file',
            size: body.length,
            modified: new Date().toUTCString(),
        },
    };
}
