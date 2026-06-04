// Per-IP rate limit for `auth:*` actions inside the services dispatcher.
// Defense against credential-stuffing-style probing of the unauthenticated
// OAuth callback surface (auth:discord_callback, auth:finalize_setup),
// which would otherwise ride only the global 100 req/min/IP limit on /api.
//
// Tracks attempts across all auth:* actions together — an attacker can't
// alternate between callbacks to evade the limit. 10 attempts/min/IP is
// well above any legitimate pace (OAuth callbacks fire once per login;
// finalize_setup is one-shot per org claim).
//
// In-memory, single-instance. If we ever scale to multiple server replicas,
// the bucket state must move to Redis or another shared store — otherwise
// each replica enforces its own limit and the effective ceiling multiplies.

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const MAX_BUCKETS = 10_000;

interface Bucket {
    count: number;
    windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
    ok: boolean;
    /** Seconds until the bucket resets. 0 when ok is true. */
    retryAfter: number;
}

/**
 * Record an auth attempt for `ip` and decide if it should proceed.
 * Fixed-window per IP: the first attempt opens a 60s window; subsequent
 * attempts in the same window increment the counter. At the boundary an
 * attacker can briefly hit 2× the limit (last attempt of window N + first
 * of window N+1), still ~10× below the global limit — acceptable for a
 * brute-force shield.
 *
 * `now` defaults to Date.now() but is injectable for tests.
 *
 * Missing IP ('unknown' or empty) fails open — the upstream global
 * limiter and IP abuse tracker still cap the connection.
 */
export function checkAuthRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
    if (!ip || ip === 'unknown') return { ok: true, retryAfter: 0 };

    const existing = buckets.get(ip);
    if (!existing || now - existing.windowStart >= WINDOW_MS) {
        if (!existing && buckets.size >= MAX_BUCKETS) {
            // Hard cap to prevent memory growth from spray attacks; shed
            // brand-new entries rather than evicting active ones. The
            // already-tracked attackers stay limited.
            return { ok: true, retryAfter: 0 };
        }
        buckets.set(ip, { count: 1, windowStart: now });
        return { ok: true, retryAfter: 0 };
    }

    existing.count += 1;
    if (existing.count > MAX_ATTEMPTS) {
        const retryAfter = Math.max(1, Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000));
        return { ok: false, retryAfter };
    }
    return { ok: true, retryAfter: 0 };
}

/**
 * Periodic cleanup of expired buckets. Wire to a setInterval at server
 * startup; not invoked at import-time so tests don't accumulate timer
 * handles. Returns the number of buckets removed.
 */
export function pruneAuthRateLimitBuckets(now: number = Date.now()): number {
    let removed = 0;
    for (const [ip, bucket] of buckets.entries()) {
        if (now - bucket.windowStart >= WINDOW_MS) {
            buckets.delete(ip);
            removed++;
        }
    }
    return removed;
}

/** Test-only: clear all bucket state. Underscore-prefixed to signal intent. */
export function _resetAuthRateLimit(): void {
    buckets.clear();
}

/** Test-only: peek at current bucket count without mutating state. */
export function _authRateLimitBucketCount(): number {
    return buckets.size;
}
