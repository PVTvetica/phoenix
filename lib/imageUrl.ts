// Shared validators for user-supplied image URLs.
//
// Hard requirements for any URL persisted through these helpers:
//   - https:// scheme only (no http, data:, javascript:, blob:, file:, ftp:)
//   - Under 2048 chars
//   - No embedded credentials (user:pass@)
//   - Path ends in a recognised raster image extension — svg is excluded
//     because SVG can execute JavaScript when rendered in an <img>/<object>
//     fetched via certain code paths, and more reliably when rendered
//     inline.
//
// Returns the trimmed, validated URL on success, or null on any failure.
// Callers should treat null as "clear the field" rather than throw —
// validation is silent so the form can keep accepting a separate FA icon.

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'];
const MAX_LEN = 2048;

export function sanitizeImageUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > MAX_LEN) return null;

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (!parsed.hostname) return null;

    const pathname = parsed.pathname.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some(ext => pathname.endsWith(ext))) return null;

    return parsed.toString();
}

/** Convenience guard for render-time code that just needs a boolean. */
export function isSafeImageUrl(raw: unknown): boolean {
    return sanitizeImageUrl(raw) !== null;
}

// Same-origin static asset prefixes we ship with the app. Keep this list
// tight — expanding it is effectively an allow-list change.
const LOCAL_PATH_PREFIXES = ['/media/', '/assets/', '/icons/'];

/**
 * Variant for fields where admins can either paste an https image URL OR
 * reference a same-origin static asset shipped with the app (e.g. rank icons
 * seeded to `/media/rank-2.png`). Relative paths must start with one of the
 * LOCAL_PATH_PREFIXES and end with a permitted image extension. Everything
 * else is routed through the strict https sanitizer.
 */
export function sanitizeImageUrlOrLocalPath(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > MAX_LEN) return null;

    if (trimmed.startsWith('/')) {
        // Reject protocol-relative (//evil.example) and backslash tricks.
        if (trimmed.startsWith('//') || trimmed.includes('\\')) return null;
        // Normalise — reject path traversal.
        if (trimmed.includes('..')) return null;
        const lower = trimmed.toLowerCase();
        if (!LOCAL_PATH_PREFIXES.some(p => lower.startsWith(p))) return null;
        if (!ALLOWED_EXTENSIONS.some(ext => lower.split('?')[0].split('#')[0].endsWith(ext))) return null;
        return trimmed;
    }

    return sanitizeImageUrl(trimmed);
}
