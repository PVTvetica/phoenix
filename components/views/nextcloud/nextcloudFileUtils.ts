import type { NextcloudPreviewKind } from '../../../services/nextcloudTypes';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const TEXT_EXT = new Set(['txt', 'md']);

export function getFileExtension(name: string): string {
    const base = name.split('/').pop() ?? name;
    const dot = base.lastIndexOf('.');
    if (dot < 1) return '';
    return base.slice(dot + 1).toLowerCase();
}

export function getPreviewKind(filename: string): NextcloudPreviewKind {
    const ext = getFileExtension(filename);
    if (IMAGE_EXT.has(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (TEXT_EXT.has(ext)) return 'text';
    return 'none';
}

export function buildOpenInNextcloudUrl(
    serverUrl: string | undefined,
    displayBasePath: string,
    relativePath: string,
    type: 'file' | 'directory',
): string | null {
    if (!serverUrl) return null;
    let dir = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    if (type === 'file') {
        const parts = dir.split('/').filter(Boolean);
        parts.pop();
        dir = parts.length ? `/${parts.join('/')}` : '/';
    }
    const base = displayBasePath === '/' ? '' : displayBasePath;
    const fullDir = `${base}${dir === '/' ? '' : dir}`.replace(/\/+/g, '/') || '/';
    return `${serverUrl.replace(/\/+$/, '')}/apps/files/?dir=${encodeURIComponent(fullDir)}`;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
