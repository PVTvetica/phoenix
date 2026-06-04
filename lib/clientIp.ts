import type { Request } from 'express';

/**
 * Resolve the originating client IP. Cloudflare always sets CF-Connecting-IP
 * to the real client; fall back to X-Forwarded-For (first hop) and then the
 * Express-resolved req.ip (which already honours `trust proxy`). Returns
 * 'unknown' if nothing identifies the caller — callers that rate-limit by IP
 * should treat that as a missing signal.
 *
 * Shared between the top-of-stack abuse blackhole (server.ts) and the
 * services dispatcher's per-action rate limits (api/services.ts) so both
 * code paths agree on the IP key for a given request.
 */
export function getClientIp(req: Request): string {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf) return cf;
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
    return req.ip || 'unknown';
}
