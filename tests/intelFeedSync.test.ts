import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Live-sync intel-ingest tests (lib/db/intel.ts syncTrustedFeeds):
//   - the dedicated PEER-CLOCK cursor: written from _meta.fetchedAt, used with
//     the configurable overlap, legacy last_contact_at fallback for upgraded
//     rows, and NEVER advanced on a transport failure
//   - warrants: nullable issued_by ingest (no admin actor), external_id dedup
//     with the content-match fallback
//   - poison-item isolation: one bad row skips + alerts, the rest ingest and
//     the cursor still advances
//   - realtime nudges: ids/discriminators only

const h = vi.hoisted(() => ({
    orgEmits: [] as Array<{ event: string; payload: Record<string, unknown> }>,
    tables: {} as Record<string, Array<Record<string, unknown>>>,
    mutations: [] as Array<{ table: string; op: string; values: Record<string, unknown> | null; filters: Record<string, unknown> }>,
    failInsert: null as null | ((table: string, values: Record<string, unknown>) => boolean),
    nextId: 1,
}));

vi.mock('../lib/db/common', () => {
    function builder(table: string) {
        const state = {
            op: 'select' as string,
            values: null as Record<string, unknown> | null,
            filters: {} as Record<string, unknown>,
            ilikes: {} as Record<string, string>,
            returning: false,
        };
        const rows = () => (h.tables[table] ?? []).filter((r) => {
            for (const [col, val] of Object.entries(state.filters)) if (r[col] !== val) return false;
            for (const [col, val] of Object.entries(state.ilikes)) {
                if (String(r[col] ?? '').toLowerCase() !== val.toLowerCase()) return false;
            }
            return true;
        });
        const b: any = {};
        b.select = () => { state.returning = true; return b; };
        b.update = (values: Record<string, unknown>) => { state.op = 'update'; state.values = values; return b; };
        b.insert = (values: Record<string, unknown>) => { state.op = 'insert'; state.values = values; return b; };
        b.upsert = (values: Record<string, unknown>) => { state.op = 'upsert'; state.values = values; return b; };
        b.eq = (col: string, val: unknown) => { state.filters[col] = val; return b; };
        b.ilike = (col: string, val: string) => { state.ilikes[col] = val; return b; };
        b.in = (col: string, vals: unknown[]) => {
            // only used by the feed-list query in this suite
            state.filters[`in:${col}`] = vals; return b;
        };
        b.is = () => b; b.not = () => b; b.order = () => b; b.limit = () => b; b.gt = () => b;
        const settle = (mode: 'many' | 'single') => {
            if (state.op === 'select') {
                let data = rows();
                const inFilter = state.filters['in:pairing_state'] as unknown[] | undefined;
                if (inFilter) data = (h.tables[table] ?? []).filter(r => inFilter.includes(r.pairing_state));
                const idFilter = state.filters['in:id'] as unknown[] | undefined;
                if (idFilter) data = data.filter(r => idFilter.includes(r.id));
                return Promise.resolve({ data: mode === 'single' ? (data[0] ?? null) : data, error: null });
            }
            if (state.op === 'insert') {
                if (h.failInsert?.(table, state.values!)) {
                    return Promise.resolve({ data: null, error: { message: 'simulated insert failure' } });
                }
                const row = { id: `gen-${h.nextId++}`, ...(state.values as Record<string, unknown>) };
                (h.tables[table] = h.tables[table] ?? []).push(row);
                h.mutations.push({ table, op: 'insert', values: row, filters: {} });
                return Promise.resolve({ data: state.returning ? { id: row.id } : null, error: null });
            }
            h.mutations.push({ table, op: state.op, values: state.values, filters: { ...state.filters } });
            if (state.op === 'update') for (const r of rows()) Object.assign(r, state.values);
            return Promise.resolve({ data: null, error: null });
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

vi.mock('../lib/ssrf', () => ({ assertResolvesToPublicHost: async () => {} }));
vi.mock('../lib/crypto', () => ({ decryptSecret: (s: string) => s, encryptSecret: (s: string) => s }));
vi.mock('../lib/db/system', () => ({
    verifyApiKey: async () => null,
    getPublicFeedData: async () => ({ reports: [], warrants: [], bulletins: [], _meta: { maxShareableLevel: 0 } }),
}));

import { syncTrustedFeeds } from '../lib/db/intel';
import { __resetAllianceSyncStateForTests, ALLIANCE_SYNC_DEFAULTS } from '../lib/db/allianceSyncState';

const PEER_FETCHED_AT = '2026-06-05T11:11:11.000Z';

function feedRow(over: Record<string, unknown> = {}) {
    return {
        id: 'feedA', label: 'Ally Org', base_url: 'https://peer.example',
        outbound_key_enc: 'ak_test', last_contact_at: '2026-06-05T08:00:00.000Z',
        intel_synced_at: '2026-06-05T10:00:00.000Z', inbound_max_clearance: 5,
        pairing_state: 'active',
        channels: { reports: true, warrants: true, bulletins: true },
        ...over,
    };
}

const fetchCalls: string[] = [];
function stubFetch(payload: unknown, opts?: { fail?: boolean; status?: number }) {
    vi.stubGlobal('fetch', async (url: string) => {
        fetchCalls.push(String(url));
        if (opts?.fail) throw new TypeError('fetch failed');
        return {
            ok: (opts?.status ?? 200) < 400,
            status: opts?.status ?? 200,
            statusText: 'X',
            headers: { get: () => 'application/json' },
            json: async () => payload,
            text: async () => JSON.stringify(payload),
        };
    });
}

const emptyPayload = { reports: [], warrants: [], bulletins: [], _meta: { maxShareableLevel: 5, fetchedAt: PEER_FETCHED_AT } };

beforeEach(() => {
    h.orgEmits = [];
    h.mutations = [];
    h.tables = { alliance_peers: [feedRow()], warrants: [], intel_reports: [], intel_bulletins: [], security_limiting_markers: [] };
    h.failInsert = null;
    h.nextId = 1;
    fetchCalls.length = 0;
    __resetAllianceSyncStateForTests();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('cursor semantics (peer-clock + overlap)', () => {
    it('pulls with ?since = cursor − overlap and advances the cursor to the peer\'s _meta.fetchedAt', async () => {
        stubFetch(emptyPayload);
        await syncTrustedFeeds();
        expect(fetchCalls).toHaveLength(1);
        const url = new URL(fetchCalls[0]);
        const overlapMs = ALLIANCE_SYNC_DEFAULTS.cursorOverlapMinutes * 60_000;
        expect(url.searchParams.get('since'))
            .toBe(new Date(new Date('2026-06-05T10:00:00.000Z').getTime() - overlapMs).toISOString());
        // Cursor written from the PEER's clock — exactly its fetchedAt.
        expect(h.tables.alliance_peers[0].intel_synced_at).toBe(PEER_FETCHED_AT);
    });
    it('NULL cursor (upgraded row) falls back to last_contact_at — a delta, not a full re-pull', async () => {
        h.tables.alliance_peers = [feedRow({ intel_synced_at: null })];
        stubFetch(emptyPayload);
        await syncTrustedFeeds();
        const url = new URL(fetchCalls[0]);
        const overlapMs = ALLIANCE_SYNC_DEFAULTS.cursorOverlapMinutes * 60_000;
        expect(url.searchParams.get('since'))
            .toBe(new Date(new Date('2026-06-05T08:00:00.000Z').getTime() - overlapMs).toISOString());
    });
    it('force bypasses the cursor (full pull)', async () => {
        stubFetch(emptyPayload);
        await syncTrustedFeeds(true);
        expect(new URL(fetchCalls[0]).searchParams.get('since')).toBeNull();
    });
    it('a transport failure NEVER advances the cursor and feeds the health machine', async () => {
        stubFetch(null, { fail: true });
        const res = await syncTrustedFeeds();
        expect(h.tables.alliance_peers[0].intel_synced_at).toBe('2026-06-05T10:00:00.000Z');
        expect(h.tables.alliance_peers[0].sync_failures).toBe(1);
        expect(h.tables.alliance_peers[0].sync_health).toBe('degraded');
        expect(res.feedResults.some(r => r.status === 'error')).toBe(true);
    });
    it('an HTTP 5xx backs off (peer broken) but a 4xx does not (peer up, rejecting us)', async () => {
        stubFetch({}, { status: 500 });
        await syncTrustedFeeds();
        expect(h.tables.alliance_peers[0].sync_failures).toBe(1);
        h.tables.alliance_peers = [feedRow()];
        stubFetch({}, { status: 403 });
        await syncTrustedFeeds();
        expect(h.tables.alliance_peers[0].sync_failures ?? 0).toBe(0);
    });
    it('onlyPeerIds scopes the pass to one peer (the engine\'s per-peer cadence hook)', async () => {
        h.tables.alliance_peers = [feedRow(), feedRow({ id: 'feedB', base_url: 'https://other.example' })];
        stubFetch(emptyPayload);
        await syncTrustedFeeds(false, ['feedB']);
        expect(fetchCalls).toHaveLength(1);
        expect(fetchCalls[0]).toContain('other.example');
    });
});

describe('warrant ingest (nullable issued_by + external_id dedup)', () => {
    const warrant = (over: Record<string, unknown> = {}) => ({
        id: 'w-ext-1', target_rsi_handle: 'Bandit', reason: 'Piracy', action: 'Detain',
        uec_reward: 100, status: 'Active', created_at: '2026-06-05T10:30:00.000Z', ...over,
    });
    it('ingests with issued_by NULL + "via ally" provenance (no admin actor needed)', async () => {
        stubFetch({ ...emptyPayload, warrants: [warrant()] });
        const res = await syncTrustedFeeds();
        expect(res.totalWarrants).toBe(1);
        const row = h.tables.warrants[0];
        expect(row.issued_by).toBeNull();
        expect(row.source_feed_id).toBe('feedA');
        expect(row.external_id).toBe('w-ext-1');
    });
    it('dedups by (source_feed_id, external_id) on re-pull (overlap replays are free)', async () => {
        h.tables.warrants = [{ id: 'local-1', external_id: 'w-ext-1', source_feed_id: 'feedA', target_rsi_handle: 'Bandit', reason: 'Piracy' }];
        stubFetch({ ...emptyPayload, warrants: [warrant()] });
        const res = await syncTrustedFeeds();
        expect(res.totalWarrants).toBe(0);
        expect(h.tables.warrants).toHaveLength(1);
    });
    it('falls back to content match for id-less legacy feeds', async () => {
        h.tables.warrants = [{ id: 'local-1', external_id: null, source_feed_id: null, target_rsi_handle: 'Bandit', reason: 'Piracy' }];
        stubFetch({ ...emptyPayload, warrants: [warrant({ id: undefined })] });
        const res = await syncTrustedFeeds();
        expect(res.totalWarrants).toBe(0);
    });
    it('nudges with warrant ids only (no content on the wire)', async () => {
        stubFetch({ ...emptyPayload, warrants: [warrant()] });
        await syncTrustedFeeds();
        const emit = h.orgEmits.find(e => e.event === 'warrant_update');
        expect(emit).toBeTruthy();
        expect(emit!.payload).toEqual({ warrantIds: [h.tables.warrants[0].id] });
        expect(JSON.stringify(emit!.payload)).not.toContain('Piracy');
    });
});

describe('poison-item isolation', () => {
    it('one failing row skips + alerts; the rest ingest and the cursor STILL advances', async () => {
        h.failInsert = (table, values) => table === 'warrants' && values.target_rsi_handle === 'PoisonRow';
        stubFetch({
            ...emptyPayload,
            warrants: [
                { id: 'w1', target_rsi_handle: 'PoisonRow', reason: 'bad row' },
                { id: 'w2', target_rsi_handle: 'GoodRow', reason: 'fine' },
            ],
        });
        const res = await syncTrustedFeeds();
        expect(res.totalWarrants).toBe(1);
        expect(res.skippedItems).toBe(1);
        expect(h.tables.warrants.map(w => w.target_rsi_handle)).toEqual(['GoodRow']);
        // The cursor advanced anyway — a poison item can never stall the feed.
        expect(h.tables.alliance_peers[0].intel_synced_at).toBe(PEER_FETCHED_AT);
        // Operator-visible alert, not a silent swallow.
        expect(h.tables.alliance_peers[0].sync_alert).toMatch(/skipped 1 item/);
    });
});

describe('report + bulletin nudges', () => {
    it('new reports emit ONE intel_update {kind:report}; bulletins emit per-id', async () => {
        stubFetch({
            ...emptyPayload,
            reports: [{ id: 'r1', target_id: 'Bandit', summary: 'spotted', subject_type: 'Person', threat_level: 'High', classification_level: 0 }],
            bulletins: [{ title: 'Alert', body: 'incoming', threat_level: 'High' }],
        });
        await syncTrustedFeeds();
        const intel = h.orgEmits.filter(e => e.event === 'intel_update');
        expect(intel).toEqual([{ event: 'intel_update', payload: { kind: 'report' } }]);
        const bulletins = h.orgEmits.filter(e => e.event === 'bulletin_update');
        expect(bulletins).toHaveLength(1);
        expect(bulletins[0].payload).toEqual({ bulletinId: h.tables.intel_bulletins[0].id });
        // Loop guard provenance stamped on the ingested bulletin.
        expect(h.tables.intel_bulletins[0].source_organization_id).toBe('feedA');
        expect(h.tables.intel_bulletins[0].shared_with_allies).toBe(false);
    });
});
