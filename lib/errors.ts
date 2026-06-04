// Server-side error classification for the RPC 500 catch-all.
//
// The dispatcher currently passes `error.message` straight to the client.
// That's safe for the codebase's intentional `throw new Error('User-friendly
// copy')` pattern, but it leaks schema names, query fragments, and Postgres
// constraint names when a raw Supabase error or a Node system error bubbles
// up. This module identifies the unsafe shapes so the dispatcher can replace
// their message with a generic one before responding.

interface MaybeStructuredError {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    name?: unknown;
    errno?: unknown;
    syscall?: unknown;
}

/**
 * Return true when `e` looks like a Supabase PostgrestError/AuthError or a
 * Node system error — anything whose `message` may include schema/SQL/infra
 * detail we don't want to forward to clients. Heuristic, not exhaustive:
 * matches against the structural shape of the error rather than instanceof,
 * because Supabase errors are plain objects (not Error subclasses) when they
 * bubble through `throw error;`.
 */
export function isOpaqueServerError(e: unknown): boolean {
    if (e == null || typeof e !== 'object') return false;
    const err = e as MaybeStructuredError;

    // Supabase PostgrestError: { message, code: 'PGRST...', details, hint }
    // Supabase AuthError: { name: 'AuthError' | 'AuthApiError', ... }
    // Node system error (DNS/socket/fs): { code: 'ECONNREFUSED' | ..., errno, syscall }
    if (typeof err.code === 'string' && err.code.length > 0) return true;
    if (typeof err.errno === 'number' || typeof err.syscall === 'string') return true;
    if (typeof err.name === 'string' && err.name.startsWith('Auth')) return true;
    if (typeof err.details === 'string' || typeof err.hint === 'string') return true;

    return false;
}
