import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Unit tests for the live-sync foundation (lib/db/allianceSyncState.ts):
// config clamps, the peer-health state machine + backoff curve, the per-peer
// outbound token bucket, and the trailing-debounce contract. These are the
// primitives every rate/health guarantee in the sync engine rests on.

const h = vi.hoisted(() => ({
    orgEmits: [] as Array<{ event: string; payload: Record<string, unknown> }>,
    peerRows: new Map<string, Record<string, unknown>>(),
    updates: [] as Array<{ table: string; values: Record<string, unknown>; id: string | null }>,
    settings: new Map<string, unknown>(),
}));

vi.mock('../lib/db/common', () => {
    function builder(table: string) {
        const state: { op: string | null; values: Record<string, unknown> | null; id: string | null; key: string | null } =
            { op: null, values: null, id: null, key: null };
        const b: any = {};
        b.select = () => b;
        b.update = (values: Record<string, unknown>) => { state.op = 'update'; state.values = values; return b; };
        b.upsert = (values: Record<string, unknown>) => { state.op = 'upsert'; state.values = values; return b; };
        b.eq = (col: string, val: string) => {
            if (col === 'id' || col === 'peer_id') state.id = val;
            if (col === 'key') state.key = val;
            return b;
        };
        b.in = () => b; b.is = () => b; b.not = () => b; b.order = () => b; b.limit = () => b;
        const settle = () => {
            if (state.op === 'update' && table === 'alliance_peers' && state.id) {
                h.updates.push({ table, values: state.values!, id: state.id });
                const row = h.peerRows.get(state.id);
                if (row) Object.assign(row, state.values);
                return Promise.resolve({ data: null, error: null });
            }
            if (table === 'alliance_peers' && state.id) {
                // Fresh copy per read — PostgREST never returns live references,
                // and the transition checks rely on prev-vs-next comparison.
                const row = h.peerRows.get(state.id);
                return Promise.resolve({ data: row ? { ...row } : null, error: null });
            }
            if (table === 'settings' && state.key) {
                const v = h.settings.get(state.key);
                return Promise.resolve({ data: v === undefined ? null : { value: v }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        };
        b.single = settle;
        b.maybeSingle = settle;
        b.then = (resolve: any, reject: any) => settle().then(resolve, reject);
        return b;
    }
    return {
        supabase: { from: (table: string) => builder(table), rpc: () => Promise.resolve({ data: null, error: null }) },
        handleSupabaseError: ({ error, message }: { error: unknown; message: string }) => { if (error) throw new Error(message); },
        broadcastToOrg: (event: string, payload: Record<string, unknown> = {}) => { h.orgEmits.push({ event, payload }); },
        broadcastToChannel: () => {},
        safeFetch: async () => [],
        getSystemRoles: async () => ({}),
    };
});

import {
    ALLIANCE_SYNC_DEFAULTS, clampAllianceSyncConfig, getAllianceSyncConfig,
    healthForFailures, backoffSeconds, SYNC_BACKOFF_SECONDS,
    tryConsumeToken, recordPeerSuccess, recordPeerFailure, noteInboundContact, setSyncAlert,
    scheduleDebounced, cancelDebounced, __resetAllianceSyncStateForTests,
} from '../lib/db/allianceSyncState';

beforeEach(() => {
    h.orgEmits = [];
    h.updates = [];
    h.peerRows.clear();
    h.settings.clear();
    __resetAllianceSyncStateForTests();
});
afterEach(() => {
    vi.useRealTimers();
    __resetAllianceSyncStateForTests();
});

describe('clampAllianceSyncConfig', () => {
    it('returns defaults for an absent config', () => {
        expect(clampAllianceSyncConfig(null)).toEqual(ALLIANCE_SYNC_DEFAULTS);
        expect(clampAllianceSyncConfig(undefined)).toEqual(ALLIANCE_SYNC_DEFAULTS);
    });
    it('enforces hard floors regardless of admin settings (rate-limit safety)', () => {
        const c = clampAllianceSyncConfig({ opsPollMinutes: 0, intelPollMinutes: 0, directoryHours: 0, pushDebounceMs: 1, outboundBudgetPerMin: 999, cursorOverlapMinutes: 0 });
        expect(c.opsPollMinutes).toBeGreaterThanOrEqual(1);
        expect(c.intelPollMinutes).toBeGreaterThanOrEqual(2);
        expect(c.directoryHours).toBeGreaterThanOrEqual(1);
        expect(c.pushDebounceMs).toBeGreaterThanOrEqual(1000);
        // The cap matters most: a mis-tuned budget must never hammer the
        // peer's 20/min/IP limit.
        expect(c.outboundBudgetPerMin).toBeLessThanOrEqual(15);
        expect(c.cursorOverlapMinutes).toBeGreaterThanOrEqual(1);
    });
    it('treats garbage values as defaults and only an explicit false as disabled', () => {
        const c = clampAllianceSyncConfig({ opsPollMinutes: NaN as unknown as number, enabled: false });
        expect(c.opsPollMinutes).toBe(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        expect(c.enabled).toBe(false);
        expect(clampAllianceSyncConfig({}).enabled).toBe(true);
    });
    it('reads + clamps the settings key', async () => {
        h.settings.set('allianceSyncConfig', { outboundBudgetPerMin: 100 });
        const c = await getAllianceSyncConfig();
        expect(c.outboundBudgetPerMin).toBe(15);
    });
});

describe('peer-health state machine (pure)', () => {
    it('maps consecutive failures to health states', () => {
        expect(healthForFailures(0)).toBe('healthy');
        expect(healthForFailures(1)).toBe('degraded');
        expect(healthForFailures(2)).toBe('degraded');
        expect(healthForFailures(3)).toBe('down');
        expect(healthForFailures(10)).toBe('down');
    });
    it('backoff starts at the down threshold and caps at the last step', () => {
        expect(backoffSeconds(1)).toBe(0);
        expect(backoffSeconds(2)).toBe(0);
        expect(backoffSeconds(3)).toBe(SYNC_BACKOFF_SECONDS[0]);
        expect(backoffSeconds(4)).toBe(SYNC_BACKOFF_SECONDS[1]);
        expect(backoffSeconds(7)).toBe(SYNC_BACKOFF_SECONDS[4]);
        expect(backoffSeconds(50)).toBe(SYNC_BACKOFF_SECONDS[4]); // cap, never beyond
    });
});

describe('recordPeerFailure / recordPeerSuccess', () => {
    it('escalates degraded → down with a jittered next-attempt time', async () => {
        h.peerRows.set('p1', { sync_health: 'healthy', sync_failures: 0 });
        await recordPeerFailure('p1');
        expect(h.peerRows.get('p1')!.sync_health).toBe('degraded');
        expect(h.peerRows.get('p1')!.sync_next_attempt_at).toBeNull();
        await recordPeerFailure('p1');
        expect(h.peerRows.get('p1')!.sync_health).toBe('degraded');
        await recordPeerFailure('p1');
        const row = h.peerRows.get('p1')!;
        expect(row.sync_health).toBe('down');
        expect(row.sync_failures).toBe(3);
        // Jitter is ±20% of the 60s base step.
        const deltaMs = new Date(row.sync_next_attempt_at as string).getTime() - Date.now();
        expect(deltaMs).toBeGreaterThan(60_000 * 0.7);
        expect(deltaMs).toBeLessThan(60_000 * 1.3);
    });
    it('broadcasts alliance_update (id only) on transition, not on repetition', async () => {
        h.peerRows.set('p1', { sync_health: 'healthy', sync_failures: 0 });
        await recordPeerFailure('p1'); // healthy → degraded: emit
        await recordPeerFailure('p1'); // degraded → degraded: no emit
        const emits = h.orgEmits.filter(e => e.event === 'alliance_update');
        expect(emits).toHaveLength(1);
        expect(emits[0].payload).toEqual({ id: 'p1' }); // ids only, never content
    });
    it('success resets failures + backoff and emits on recovery', async () => {
        h.peerRows.set('p1', { sync_health: 'down', sync_failures: 5, sync_next_attempt_at: new Date().toISOString() });
        await recordPeerSuccess('p1');
        const row = h.peerRows.get('p1')!;
        expect(row.sync_health).toBe('healthy');
        expect(row.sync_failures).toBe(0);
        expect(row.sync_next_attempt_at).toBeNull();
        expect(h.orgEmits.some(e => e.event === 'alliance_update')).toBe(true);
    });
});

describe('noteInboundContact (recovery trigger)', () => {
    it('pulls the probe forward for a down peer (but does NOT flip healthy)', async () => {
        h.peerRows.set('p1', { sync_health: 'down', sync_failures: 4 });
        noteInboundContact({ id: 'p1', sync_health: 'down' });
        await new Promise(r => setTimeout(r, 0));
        const upd = h.updates.find(u => u.id === 'p1');
        expect(upd).toBeTruthy();
        expect(upd!.values.sync_next_attempt_at).toBeTruthy();
        expect(upd!.values.sync_health).toBeUndefined(); // their outbound ≠ our outbound
    });
    it('no-ops for healthy peers (inbound hot path stays cheap)', async () => {
        noteInboundContact({ id: 'p1', sync_health: 'healthy' });
        await new Promise(r => setTimeout(r, 0));
        expect(h.updates).toHaveLength(0);
    });
});

describe('setSyncAlert', () => {
    it('writes + broadcasts on change, no-ops when unchanged', async () => {
        h.peerRows.set('p1', { sync_alert: null });
        await setSyncAlert('p1', 'rollback detected');
        expect(h.peerRows.get('p1')!.sync_alert).toBe('rollback detected');
        expect(h.orgEmits.filter(e => e.event === 'alliance_update')).toHaveLength(1);
        await setSyncAlert('p1', 'rollback detected'); // unchanged → silent
        expect(h.orgEmits.filter(e => e.event === 'alliance_update')).toHaveLength(1);
        await setSyncAlert('p1', null); // clear → emit
        expect(h.peerRows.get('p1')!.sync_alert).toBeNull();
        expect(h.orgEmits.filter(e => e.event === 'alliance_update')).toHaveLength(2);
    });
});

describe('per-peer token bucket', () => {
    it('grants up to the budget then refuses; refills continuously', () => {
        vi.useFakeTimers();
        const budget = ALLIANCE_SYNC_DEFAULTS.outboundBudgetPerMin;
        for (let i = 0; i < budget; i++) expect(tryConsumeToken('p1')).toBe(true);
        expect(tryConsumeToken('p1')).toBe(false);
        // Other peers have their own bucket.
        expect(tryConsumeToken('p2')).toBe(true);
        // ~1/budget of a minute refills one token.
        vi.advanceTimersByTime(Math.ceil(60_000 / budget) + 50);
        expect(tryConsumeToken('p1')).toBe(true);
        expect(tryConsumeToken('p1')).toBe(false);
    });
    it('force consumes when available but never blocks (critical events)', () => {
        vi.useFakeTimers();
        const budget = ALLIANCE_SYNC_DEFAULTS.outboundBudgetPerMin;
        for (let i = 0; i < budget; i++) tryConsumeToken('p1');
        expect(tryConsumeToken('p1')).toBe(false);
        expect(tryConsumeToken('p1', { force: true })).toBe(true); // never dropped
    });
});

describe('trailing debounce contract', () => {
    it('coalesces re-schedules into one flush of the LATEST fn', async () => {
        vi.useFakeTimers();
        const calls: string[] = [];
        scheduleDebounced('k', 3000, async () => { calls.push('first'); });
        vi.advanceTimersByTime(2000);
        scheduleDebounced('k', 3000, async () => { calls.push('second'); });
        vi.advanceTimersByTime(2999);
        expect(calls).toEqual([]); // window restarted
        vi.advanceTimersByTime(1);
        await vi.runAllTimersAsync();
        expect(calls).toEqual(['second']);
    });
    it('the flush deletes its own key first, so a flush can re-schedule itself', async () => {
        vi.useFakeTimers();
        const calls: number[] = [];
        scheduleDebounced('k', 1000, async () => {
            calls.push(1);
            scheduleDebounced('k', 1000, async () => { calls.push(2); });
        });
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(1000);
        expect(calls).toEqual([1, 2]);
    });
    it('cancel clears the pending flush', async () => {
        vi.useFakeTimers();
        const calls: number[] = [];
        scheduleDebounced('k', 1000, async () => { calls.push(1); });
        cancelDebounced('k');
        await vi.advanceTimersByTimeAsync(5000);
        expect(calls).toEqual([]);
    });
});
