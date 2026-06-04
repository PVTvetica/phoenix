import { describe, it, expect, beforeEach } from 'vitest';
import {
    checkAuthRateLimit,
    pruneAuthRateLimitBuckets,
    _resetAuthRateLimit,
    _authRateLimitBucketCount,
} from '../lib/authRateLimit';

const t0 = 1_700_000_000_000; // arbitrary fixed epoch ms

describe('auth rate limit', () => {
    beforeEach(() => {
        _resetAuthRateLimit();
    });

    it('allows the first 10 attempts in a 60s window', () => {
        for (let i = 0; i < 10; i++) {
            const r = checkAuthRateLimit('1.2.3.4', t0 + i * 100);
            expect(r.ok, `attempt ${i + 1} should pass`).toBe(true);
            expect(r.retryAfter).toBe(0);
        }
    });

    it('rejects the 11th attempt with a non-zero retryAfter', () => {
        for (let i = 0; i < 10; i++) checkAuthRateLimit('1.2.3.4', t0 + i * 100);
        const r = checkAuthRateLimit('1.2.3.4', t0 + 11 * 100);
        expect(r.ok).toBe(false);
        expect(r.retryAfter).toBeGreaterThan(0);
        expect(r.retryAfter).toBeLessThanOrEqual(60);
    });

    it('tracks separate IPs independently', () => {
        for (let i = 0; i < 10; i++) checkAuthRateLimit('1.1.1.1', t0 + i);
        // 1.1.1.1 is at the limit; 2.2.2.2 should still pass freely
        const a = checkAuthRateLimit('1.1.1.1', t0 + 11);
        expect(a.ok).toBe(false);
        const b = checkAuthRateLimit('2.2.2.2', t0 + 12);
        expect(b.ok).toBe(true);
    });

    it('resets the counter once the 60s window elapses', () => {
        for (let i = 0; i < 10; i++) checkAuthRateLimit('3.3.3.3', t0 + i);
        const blocked = checkAuthRateLimit('3.3.3.3', t0 + 100);
        expect(blocked.ok).toBe(false);
        // Advance past the window
        const fresh = checkAuthRateLimit('3.3.3.3', t0 + 60_001);
        expect(fresh.ok).toBe(true);
        expect(fresh.retryAfter).toBe(0);
    });

    it('fails open on missing IP', () => {
        // Spray many "unknown" or empty calls; none should ever 429.
        for (let i = 0; i < 50; i++) {
            expect(checkAuthRateLimit('', t0 + i).ok).toBe(true);
            expect(checkAuthRateLimit('unknown', t0 + i).ok).toBe(true);
        }
    });

    it('retryAfter shrinks as the window approaches its end', () => {
        for (let i = 0; i < 10; i++) checkAuthRateLimit('4.4.4.4', t0);
        const early = checkAuthRateLimit('4.4.4.4', t0 + 1_000); // ~59s left
        const late = checkAuthRateLimit('4.4.4.4', t0 + 55_000); // ~5s left
        expect(early.ok).toBe(false);
        expect(late.ok).toBe(false);
        expect(late.retryAfter).toBeLessThan(early.retryAfter);
        expect(late.retryAfter).toBeGreaterThanOrEqual(1); // always >= 1 even if window is about to flip
    });

    it('pruneAuthRateLimitBuckets removes expired buckets only', () => {
        checkAuthRateLimit('a', t0);
        checkAuthRateLimit('b', t0 + 30_000);
        expect(_authRateLimitBucketCount()).toBe(2);
        // 70s after t0: bucket 'a' is expired (window opened at t0, ends t0+60s),
        // bucket 'b' is still inside its window (opened at t0+30s, ends t0+90s).
        const removed = pruneAuthRateLimitBuckets(t0 + 70_000);
        expect(removed).toBe(1);
        expect(_authRateLimitBucketCount()).toBe(1);
    });
});
