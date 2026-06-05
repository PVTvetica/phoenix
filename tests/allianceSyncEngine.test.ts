import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Scheduler tests for the live-sync engine (lib/db/allianceSync.ts): per-peer
// due-time gating with phase offsets, the down-peer skip/probe cycle, transport
// failure short-circuiting, recovery RSVP re-push, clean-pass alert clearing,
// and the force-sync cooldown. The three job modules are mocked — their own
// behavior is pinned in their own suites.

const h = vi.hoisted(() => ({
    orgEmits: [] as Array<{ event: string; payload: Record<string, unknown> }>,
    peers: [] as Array<Record<string, unknown>>,
    dirCache: [] as Array<Record<string, unknown>>,
    settings: new Map<string, unknown>(),
    peerUpdates: [] as Array<{ id: string; values: Record<string, unknown> }>,
}));

vi.mock('../lib/db/common', () => {
    function builder(table: string) {
        const state = { op: 'select' as string, values: null as Record<string, unknown> | null, id: null as string | null, key: null as string | null };
        const b: any = {};
        b.select = () => b;
        b.update = (values: Record<string, unknown>) => { state.op = 'update'; state.values = values; return b; };
        b.upsert = (values: Record<string, unknown>) => { state.op = 'upsert'; state.values = values; return b; };
        b.eq = (col: string, val: string) => { if (col === 'id' || col === 'peer_id') state.id = val; if (col === 'key') state.key = val; return b; };
        b.in = () => b; b.is = () => b; b.not = () => b; b.order = () => b; b.limit = () => b;
        const settle = (mode: 'many' | 'single') => {
            if (state.op === 'update' && table === 'alliance_peers' && state.id) {
                h.peerUpdates.push({ id: state.id, values: state.values! });
                const row = h.peers.find(p => p.id === state.id);
                if (row) Object.assign(row, state.values);
                return Promise.resolve({ data: null, error: null });
            }
            if (state.op !== 'select') return Promise.resolve({ data: null, error: null });
            if (table === 'alliance_peers') {
                const data = state.id ? (h.peers.find(p => p.id === state.id) ?? null) : h.peers;
                return Promise.resolve({ data: mode === 'single' ? data : (Array.isArray(data) ? data : [data].filter(Boolean)), error: null });
            }
            if (table === 'alliance_peer_directory_cache') return Promise.resolve({ data: h.dirCache, error: null });
            if (table === 'settings' && state.key) {
                const v = h.settings.get(state.key);
                return Promise.resolve({ data: v === undefined ? null : { value: v }, error: null });
            }
            return Promise.resolve({ data: mode === 'single' ? null : [], error: null });
        };
        b.single = () => settle('single');
        b.maybeSingle = () => settle('single');
        b.then = (resolve: any, reject: any) => settle('many').then(resolve, reject);
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

const jobs = vi.hoisted(() => ({
    reconcile: vi.fn(),
    rsvpRepush: vi.fn(),
    intelSync: vi.fn(),
    directory: vi.fn(),
}));
vi.mock('../lib/db/operations-federation', () => ({
    reconcileMirrorsWithPeer: jobs.reconcile,
    pushLocalRsvpsForPeer: jobs.rsvpRepush,
}));
vi.mock('../lib/db/intel', () => ({ syncTrustedFeeds: jobs.intelSync }));
vi.mock('../lib/db/alliances', () => ({ refreshPeerDirectory: jobs.directory }));

import { allianceSyncTick, forceSyncPeer, peerPhaseOffsetMs, __resetAllianceSyncEngineForTests } from '../lib/db/allianceSync';
import { __resetAllianceSyncStateForTests, ALLIANCE_SYNC_DEFAULTS } from '../lib/db/allianceSyncState';

const CLEAN_RECONCILE = { ok: true, peerUp: true, pulled: 0, revoked: 0, deferred: 0 };
const CLEAN_INTEL = { totalReports: 0, totalWarrants: 0, totalBulletins: 0, skippedItems: 0, feedResults: [] };

const activePeer = (over: Record<string, unknown> = {}) => ({
    id: 'p1', label: 'Ally', status: 'Active', pairing_state: 'active',
    channels: { reports: true, operations: true },
    sync_health: 'healthy', sync_next_attempt_at: null, sync_alert: null, sync_failures: 0,
    ...over,
});

beforeEach(() => {
    vi.useFakeTimers();
    h.orgEmits = [];
    h.peers = [];
    h.dirCache = [];
    h.settings.clear();
    h.peerUpdates = [];
    jobs.reconcile.mockReset().mockResolvedValue(CLEAN_RECONCILE);
    jobs.rsvpRepush.mockReset().mockResolvedValue(undefined);
    jobs.intelSync.mockReset().mockResolvedValue(CLEAN_INTEL);
    jobs.directory.mockReset().mockResolvedValue(undefined);
    __resetAllianceSyncEngineForTests();
    __resetAllianceSyncStateForTests();
});
afterEach(() => { vi.useRealTimers(); });

const advanceMin = async (min: number) => { await vi.advanceTimersByTimeAsync(min * 60_000); };

describe('peerPhaseOffsetMs', () => {
    it('is deterministic and bounded by the cadence', () => {
        const a = peerPhaseOffsetMs('peer-aaa', 120_000);
        expect(peerPhaseOffsetMs('peer-aaa', 120_000)).toBe(a);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThan(120_000);
    });
});

describe('allianceSyncTick scheduling', () => {
    it('does nothing when disabled via allianceSyncConfig', async () => {
        h.settings.set('allianceSyncConfig', { enabled: false });
        h.peers = [activePeer()];
        await allianceSyncTick();
        expect(jobs.reconcile).not.toHaveBeenCalled();
        expect(jobs.intelSync).not.toHaveBeenCalled();
        expect(jobs.directory).not.toHaveBeenCalled();
    });

    it('runs jobs on their own cadences (ops every cycle, intel less often)', async () => {
        h.peers = [activePeer()];
        // First-sight tick registers the phase offset; advance a full ops
        // cadence so the ops job is unambiguously due.
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        await allianceSyncTick();
        expect(jobs.reconcile).toHaveBeenCalledTimes(1);
        expect(jobs.reconcile).toHaveBeenCalledWith('p1');
        const reconcilesAfterOps = jobs.reconcile.mock.calls.length;
        // Advance to the intel cadence: intel becomes due too.
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.intelPollMinutes);
        await allianceSyncTick();
        expect(jobs.intelSync).toHaveBeenCalledWith(false, ['p1']);
        expect(jobs.reconcile.mock.calls.length).toBeGreaterThan(reconcilesAfterOps);
    });

    it('directory refresh is due when the cache has no synced_at and records ops state', async () => {
        h.peers = [activePeer()];
        h.dirCache = []; // never synced → due immediately
        await allianceSyncTick();
        expect(jobs.directory).toHaveBeenCalledWith('p1');
        // A fresh cache timestamp suppresses it.
        jobs.directory.mockClear();
        h.dirCache = [{ peer_id: 'p1', synced_at: new Date().toISOString() }];
        await allianceSyncTick();
        expect(jobs.directory).not.toHaveBeenCalled();
    });

    it('feed-only peers (pairing_state manual) get intel but never ops/directory', async () => {
        h.peers = [activePeer({ id: 'feed1', pairing_state: 'manual', status: 'Pending', channels: { reports: true } })];
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.intelPollMinutes);
        await allianceSyncTick();
        expect(jobs.intelSync).toHaveBeenCalledWith(false, ['feed1']);
        expect(jobs.reconcile).not.toHaveBeenCalled();
        expect(jobs.directory).not.toHaveBeenCalled();
    });

    it('skips a DOWN peer until its scheduled probe time, then probes', async () => {
        h.peers = [activePeer({
            sync_health: 'down',
            sync_next_attempt_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        })];
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        await allianceSyncTick();
        expect(jobs.reconcile).not.toHaveBeenCalled();
        expect(jobs.directory).not.toHaveBeenCalled();
        // Past the probe time → the due jobs run as the probe.
        await advanceMin(11);
        await allianceSyncTick();
        expect(jobs.reconcile).toHaveBeenCalled();
    });

    it('recovery from down re-pushes our members\' RSVPs (budget-bounded elsewhere)', async () => {
        h.peers = [activePeer({ sync_health: 'down', sync_next_attempt_at: new Date(Date.now() - 1000).toISOString() })];
        h.dirCache = [{ peer_id: 'p1', synced_at: new Date().toISOString() }];
        await allianceSyncTick(); // first sight — registers offsets; directory fresh
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        await allianceSyncTick();
        expect(jobs.reconcile).toHaveBeenCalled();
        expect(jobs.rsvpRepush).toHaveBeenCalledWith('p1');
    });

    it('a transport failure records peer failure and short-circuits the remaining jobs', async () => {
        h.peers = [activePeer()];
        // Directory cache fresh so the only later-job candidates are intel +
        // directory-after-failure; both must be skipped once transport fails.
        h.dirCache = [{ peer_id: 'p1', synced_at: new Date().toISOString() }];
        jobs.reconcile.mockRejectedValue(new Error('ECONNREFUSED'));
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.intelPollMinutes);
        await allianceSyncTick();
        expect(jobs.reconcile).toHaveBeenCalled();
        expect(jobs.intelSync).not.toHaveBeenCalled();
        expect(jobs.directory).not.toHaveBeenCalled();
        const p = h.peers[0];
        expect(p.sync_failures as number).toBeGreaterThanOrEqual(1);
        expect(p.sync_health).toBe('degraded');
    });

    it('clears a stale sync_alert on a fully clean pass', async () => {
        h.peers = [activePeer({ sync_alert: 'Intel sync skipped 3 item(s)' })];
        h.dirCache = [{ peer_id: 'p1', synced_at: new Date().toISOString() }];
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        await allianceSyncTick();
        expect(h.peers[0].sync_alert).toBeNull();
    });

    it('raises the reconcile alert as the peer\'s sync_alert', async () => {
        h.peers = [activePeer()];
        h.dirCache = [{ peer_id: 'p1', synced_at: new Date().toISOString() }];
        jobs.reconcile.mockResolvedValue({ ...CLEAN_RECONCILE, alert: 'Peer may have been restored from a backup.' });
        await allianceSyncTick();
        await advanceMin(ALLIANCE_SYNC_DEFAULTS.opsPollMinutes);
        await allianceSyncTick();
        expect(h.peers[0].sync_alert).toMatch(/restored from a backup/);
    });
});

describe('forceSyncPeer', () => {
    it('runs all applicable jobs immediately and reports ok', async () => {
        h.peers = [activePeer()];
        const res = await forceSyncPeer('p1');
        expect(res.ok).toBe(true);
        expect(jobs.reconcile).toHaveBeenCalledWith('p1');
        expect(jobs.intelSync).toHaveBeenCalledWith(false, ['p1']);
        expect(jobs.directory).toHaveBeenCalledWith('p1');
    });
    it('enforces the cooldown so a spamming admin cannot exceed the peer budget', async () => {
        h.peers = [activePeer()];
        await forceSyncPeer('p1');
        const again = await forceSyncPeer('p1');
        expect(again.ok).toBe(false);
        expect(jobs.reconcile).toHaveBeenCalledTimes(1);
        // After the cooldown it works again.
        await vi.advanceTimersByTimeAsync(31_000);
        const third = await forceSyncPeer('p1');
        expect(third.ok).toBe(true);
    });
    it('unknown peer → not found', async () => {
        const res = await forceSyncPeer('nope');
        expect(res.ok).toBe(false);
        expect(res.message).toMatch(/not found/i);
    });
});
