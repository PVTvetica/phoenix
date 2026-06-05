// =============================================================================
// lib/db/allianceSyncState.ts — alliance live-sync: shared low-level state
// =============================================================================
// The acyclic foundation of the live-sync engine (lib/db/allianceSync.ts).
// Holds the pieces every federation module shares WITHOUT importing any of
// them (only common.js), so alliances.ts / intel.ts / operations-federation.ts
// can all use it with zero import cycles:
//
//   - allianceSyncConfig (settings-backed, clamped, cached in-process)
//   - per-peer outbound token bucket — the SINGLE rate guard for ALL calls to
//     a peer (debounced op pushes, member-triggered polls, RSVP pushes,
//     recovery catch-up, force-sync). Budget math lives in allianceSync.ts.
//   - peer-health state machine (sync_health/sync_failures/backoff columns)
//   - generic trailing-debounce map (op-push coalescing)
//
// All in-process state (buckets, debounce timers) is per-process and resets on
// restart — always safe: pushes are version-gated + idempotent and the
// reconcile loop converges anything a lost timer missed.

import { supabase, broadcastToOrg } from './common.js';
import { log as baseLog } from '../log.js';

const log = baseLog.child({ module: 'db.allianceSyncState' });

const nowIso = () => new Date().toISOString();

// =============================================================================
// Config (settings key: allianceSyncConfig)
// =============================================================================

export interface AllianceSyncConfig {
    enabled: boolean;
    /** Ops manifest poll + reconcile cadence (guest → host). */
    opsPollMinutes: number;
    /** Intel/warrants/bulletins delta-pull cadence. */
    intelPollMinutes: number;
    /** Roster/fleet/profile background refresh cadence. */
    directoryHours: number;
    /** Trailing debounce for joint-op snapshot pushes. */
    pushDebounceMs: number;
    /** Per-peer outbound token-bucket rate (also the burst capacity). */
    outboundBudgetPerMin: number;
    /** Intel cursor overlap: re-fetch this much history every pull. Replays
     *  are free (INSERT-only + dedup); under-fetching loses data forever. */
    cursorOverlapMinutes: number;
}

export const ALLIANCE_SYNC_DEFAULTS: AllianceSyncConfig = {
    enabled: true,
    opsPollMinutes: 2,
    intelPollMinutes: 5,
    directoryHours: 6,
    pushDebounceMs: 3000,
    outboundBudgetPerMin: 12,
    cursorOverlapMinutes: 5,
};

// Hard floors/caps enforced regardless of what an admin writes into settings —
// a mis-tuned config must never be able to hammer a peer past its rate limit
// (20 req/min/IP) or disable the cursor-overlap safety margin.
const clamp = (v: unknown, lo: number, hi: number, dflt: number): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : dflt;
    return Math.min(hi, Math.max(lo, n));
};

export function clampAllianceSyncConfig(raw: Partial<AllianceSyncConfig> | null | undefined): AllianceSyncConfig {
    return {
        enabled: raw?.enabled !== false,
        opsPollMinutes: clamp(raw?.opsPollMinutes, 1, 60, ALLIANCE_SYNC_DEFAULTS.opsPollMinutes),
        intelPollMinutes: clamp(raw?.intelPollMinutes, 2, 240, ALLIANCE_SYNC_DEFAULTS.intelPollMinutes),
        directoryHours: clamp(raw?.directoryHours, 1, 168, ALLIANCE_SYNC_DEFAULTS.directoryHours),
        pushDebounceMs: clamp(raw?.pushDebounceMs, 1000, 30_000, ALLIANCE_SYNC_DEFAULTS.pushDebounceMs),
        outboundBudgetPerMin: clamp(raw?.outboundBudgetPerMin, 4, 15, ALLIANCE_SYNC_DEFAULTS.outboundBudgetPerMin),
        cursorOverlapMinutes: clamp(raw?.cursorOverlapMinutes, 1, 60, ALLIANCE_SYNC_DEFAULTS.cursorOverlapMinutes),
    };
}

let configCache: AllianceSyncConfig = { ...ALLIANCE_SYNC_DEFAULTS };
let configCacheAt = 0;
const CONFIG_TTL_MS = 60_000;

/** Read + clamp the settings-backed config; refreshes the in-process cache. */
export async function getAllianceSyncConfig(): Promise<AllianceSyncConfig> {
    const { data } = await supabase.from('settings').select('value').eq('key', 'allianceSyncConfig').maybeSingle();
    configCache = clampAllianceSyncConfig((data?.value as Partial<AllianceSyncConfig>) ?? null);
    configCacheAt = Date.now();
    return configCache;
}

/** Last-known config without a DB read (sync paths: debounce delay, bucket
 *  rate). The engine tick refreshes the cache every minute; between ticks the
 *  cached value is at most CONFIG_TTL_MS stale, which only affects tuning
 *  knobs, never correctness. */
export function getCachedAllianceSyncConfig(): AllianceSyncConfig {
    if (Date.now() - configCacheAt > CONFIG_TTL_MS) {
        // Stale is fine, but kick off a background refresh for the next caller.
        void getAllianceSyncConfig().catch(() => undefined);
        configCacheAt = Date.now(); // don't stampede refreshes
    }
    return configCache;
}

// =============================================================================
// Per-peer outbound token bucket
// =============================================================================

interface Bucket { tokens: number; lastRefillMs: number }
const buckets = new Map<string, Bucket>();

/**
 * Consume one outbound-call token for a peer. Continuous refill at
 * outboundBudgetPerMin, burst capacity = one minute's worth.
 * `force` (critical immediate events: status_change/alert/cancel) consumes a
 * token when available but NEVER blocks — those are human-bounded and must
 * not be dropped; they still drain the bucket so debounced traffic defers.
 */
export function tryConsumeToken(peerId: string, opts?: { force?: boolean }): boolean {
    const rate = getCachedAllianceSyncConfig().outboundBudgetPerMin;
    const now = Date.now();
    let b = buckets.get(peerId);
    if (!b) { b = { tokens: rate, lastRefillMs: now }; buckets.set(peerId, b); }
    b.tokens = Math.min(rate, b.tokens + ((now - b.lastRefillMs) / 60_000) * rate);
    b.lastRefillMs = now;
    if (b.tokens >= 1) { b.tokens -= 1; return true; }
    if (opts?.force) { b.tokens = 0; return true; }
    return false;
}

// =============================================================================
// Peer-health state machine
// =============================================================================
// healthy: last outbound contact succeeded.
// degraded: 1–2 consecutive failures — keep normal cadence.
// down: ≥3 consecutive failures — back off (sync_next_attempt_at), skip all
//       scheduled sync until the probe time; pushes to the peer are dropped
//       (the reconcile loop converges on recovery).

export type PeerSyncHealth = 'unknown' | 'healthy' | 'degraded' | 'down';

const DOWN_AFTER_FAILURES = 3;
// Backoff (seconds) indexed by consecutive failures past the 'down' threshold.
export const SYNC_BACKOFF_SECONDS = [60, 120, 300, 600, 1800] as const;

/** Pure: health for a consecutive-failure count. */
export function healthForFailures(failures: number): PeerSyncHealth {
    if (failures >= DOWN_AFTER_FAILURES) return 'down';
    if (failures >= 1) return 'degraded';
    return 'healthy';
}

/** Pure: base backoff seconds for a failure count (0 = retry at normal cadence). */
export function backoffSeconds(failures: number): number {
    if (failures < DOWN_AFTER_FAILURES) return 0;
    return SYNC_BACKOFF_SECONDS[Math.min(failures - DOWN_AFTER_FAILURES, SYNC_BACKOFF_SECONDS.length - 1)];
}

/** ±20% full jitter so recovering peers don't thunder in lockstep. */
function jittered(seconds: number): number {
    return seconds * (0.8 + Math.random() * 0.4);
}

/** Record a successful outbound contact: reset failures, mark healthy. */
export async function recordPeerSuccess(peerId: string): Promise<void> {
    const { data: prev } = await supabase.from('alliance_peers')
        .select('sync_health').eq('id', peerId).maybeSingle();
    await supabase.from('alliance_peers').update({
        sync_health: 'healthy', sync_failures: 0,
        sync_last_ok_at: nowIso(), sync_next_attempt_at: null,
        last_contact_at: nowIso(), updated_at: nowIso(),
    }).eq('id', peerId);
    if (prev && prev.sync_health !== 'healthy') {
        log.info('peer sync recovered', { peerId, from: prev.sync_health });
        broadcastToOrg('alliance_update', { id: peerId });
    }
}

/** Record a failed outbound contact: bump failures, derive health + backoff. */
export async function recordPeerFailure(peerId: string): Promise<void> {
    const { data: prev } = await supabase.from('alliance_peers')
        .select('sync_health, sync_failures').eq('id', peerId).maybeSingle();
    if (!prev) return;
    const failures = (prev.sync_failures ?? 0) + 1;
    const health = healthForFailures(failures);
    const backoff = backoffSeconds(failures);
    await supabase.from('alliance_peers').update({
        sync_health: health, sync_failures: failures,
        sync_next_attempt_at: backoff > 0 ? new Date(Date.now() + jittered(backoff) * 1000).toISOString() : null,
        updated_at: nowIso(),
    }).eq('id', peerId);
    if (prev.sync_health !== health) {
        log.warn('peer sync health degraded', { peerId, health, failures });
        broadcastToOrg('alliance_update', { id: peerId });
    }
}

/**
 * Authenticated inbound contact from a peer we consider down: their outbound
 * path works, which doesn't prove OUR outbound path does — so don't flip
 * healthy, just pull the next probe forward to "now" (fires next tick).
 * Fire-and-forget; called on the inbound hot path.
 */
export function noteInboundContact(peer: { id: string; sync_health?: string | null }): void {
    if (peer.sync_health !== 'down') return;
    void supabase.from('alliance_peers')
        .update({ sync_next_attempt_at: nowIso(), updated_at: nowIso() })
        .eq('id', peer.id)
        .then(({ error }) => { if (error) log.warn('inbound-contact probe nudge failed', { peerId: peer.id, error }); });
}

/** Operator-visible anomaly note (rollback detected, N items skipped). The
 *  engine clears it (null) on the next fully-clean sync pass. */
export async function setSyncAlert(peerId: string, alert: string | null): Promise<void> {
    const { data: prev } = await supabase.from('alliance_peers')
        .select('sync_alert').eq('id', peerId).maybeSingle();
    if (!prev || (prev.sync_alert ?? null) === alert) return;
    await supabase.from('alliance_peers').update({ sync_alert: alert, updated_at: nowIso() }).eq('id', peerId);
    broadcastToOrg('alliance_update', { id: peerId });
}

// =============================================================================
// Generic trailing debounce (op-push coalescing)
// =============================================================================
// Contract: one pending timer per key; re-scheduling restarts the window with
// the NEW fn; the flush deletes its own map entry before running (so a flush
// can re-schedule itself, e.g. on bucket-empty); cancel clears + deletes.

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleDebounced(key: string, delayMs: number, fn: () => Promise<void>): void {
    const existing = debounceTimers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
        debounceTimers.delete(key); // hygiene: never leak entries for dead keys
        void fn().catch((e) => log.warn('debounced task failed', { key, err: e }));
    }, delayMs);
    // Don't hold the process open for a pending push.
    timer.unref?.();
    debounceTimers.set(key, timer);
}

export function cancelDebounced(key: string): void {
    const existing = debounceTimers.get(key);
    if (existing) { clearTimeout(existing); debounceTimers.delete(key); }
}

/** TEST ONLY: reset all in-process state (buckets, timers, config cache). */
export function __resetAllianceSyncStateForTests(): void {
    buckets.clear();
    for (const t of debounceTimers.values()) clearTimeout(t);
    debounceTimers.clear();
    configCache = { ...ALLIANCE_SYNC_DEFAULTS };
    configCacheAt = 0;
}
