import { describe, it, expect, beforeEach, vi } from 'vitest';

// Two importer-resilience behaviors against a real hosted-SaaS export:
//   1. CROSS-TABLE forward FK (units.leader_id → users, while users.unit_id → units):
//      units is exported before users, so leader_id is NULLed on insert and restored
//      after the full import.
//   2. SCHEMA DIVERGENCE: the single-org fork drops columns the SaaS export still
//      carries (e.g. users.last_active_at); the insert strips the unknown column and
//      retries instead of failing the whole import.

const h = vi.hoisted(() => ({
    inserts: [] as { table: string; rows: any[] }[],
    updates: [] as { table: string; patch: any; id: unknown }[],
    unknownCols: {} as Record<string, string[]>,
    failRow: null as null | { table: string; col: string; value: unknown },
}));

vi.mock('../lib/db/common', () => {
    const make = (table: string) => {
        let pendingPatch: any = null;
        const b: any = {
            select: () => b,
            insert: (rows: any) => {
                const arr = Array.isArray(rows) ? rows : [rows];
                h.inserts.push({ table, rows: arr });
                for (const c of (h.unknownCols[table] || [])) {
                    if (arr.some((r) => c in r)) {
                        return Promise.resolve({ error: { code: 'PGRST204', message: `Could not find the '${c}' column of '${table}' in the schema cache` } });
                    }
                }
                const fr = h.failRow;
                if (fr && table === fr.table && arr.some((r) => r[fr.col] === fr.value)) {
                    return Promise.resolve({ error: { code: '23503', message: `insert or update on table "${table}" violates foreign key constraint "${table}_fk"` } });
                }
                return Promise.resolve({ error: null });
            },
            update: (patch: any) => { pendingPatch = patch; return { eq: (_c: string, v: unknown) => { h.updates.push({ table, patch: pendingPatch, id: v }); return Promise.resolve({ error: null }); } }; },
            delete: () => ({ neq: () => Promise.resolve({ error: null }), eq: () => Promise.resolve({ error: null }), in: () => Promise.resolve({ error: null }) }),
            eq: () => Promise.resolve({ data: [], error: null }),
            range: () => Promise.resolve({ data: [], error: null }), // empty catalog index
            then: (r: any) => Promise.resolve({ count: 0, error: null, data: [] }).then(r),
        };
        return b;
    };
    return { supabase: { from: (t: string) => make(t), rpc: () => Promise.resolve({ error: null }) }, handleSupabaseError: () => {} };
});

import { importOrgData, type ImportProgressEvent } from '../lib/db/importer';

beforeEach(() => { h.inserts = []; h.updates = []; h.unknownCols = {}; h.failRow = null; });

describe('importer cross-table FK + schema-divergence resilience', () => {
    it('defers units.leader_id (→ users) on insert and restores it after users import', async () => {
        const ndjson = [
            '{"kind":"header","version":1,"tableOrder":["units","users"],"manifest":{"units":1,"users":1}}',
            '{"kind":"row","t":"units","r":{"id":7,"name":"HQ","parent_unit_id":null,"leader_id":5}}',
            '{"kind":"row","t":"users","r":{"id":5,"name":"Boss","discord_id":"d5"}}',
        ].join('\n');
        await importOrgData(ndjson);
        // units inserted with leader_id NULLed (the forward FK deferred).
        const unitsInsert = h.inserts.find((i) => i.table === 'units');
        expect(unitsInsert).toBeTruthy();
        expect(unitsInsert!.rows[0].leader_id).toBeNull();
        // leader_id restored after the import, pointing at the now-imported user.
        const restore = h.updates.find((u) => u.table === 'units' && u.id === 7);
        expect(restore).toBeTruthy();
        expect(restore!.patch.leader_id).toBe(5);
    });

    it('strips a column the export has but this instance lacks, then succeeds with a warning', async () => {
        h.unknownCols = { users: ['last_active_at'] };
        const ndjson = [
            '{"kind":"header","version":1,"tableOrder":["users"],"manifest":{"users":1}}',
            '{"kind":"row","t":"users","r":{"id":1,"name":"A","discord_id":"d1","last_active_at":"2026-01-01"}}',
        ].join('\n');
        const events: ImportProgressEvent[] = [];
        const result = await importOrgData(ndjson, (e) => { events.push(e); });
        // The final (retried) users insert no longer carries the dropped column.
        const lastUsersInsert = [...h.inserts].reverse().find((i) => i.table === 'users');
        expect(lastUsersInsert!.rows[0]).not.toHaveProperty('last_active_at');
        // A warning surfaced the drop, and the import still completed.
        expect(result.warnings.some((w) => w.includes('last_active_at'))).toBe(true);
        expect(events[events.length - 1].type).toBe('done');
    });

    it('drops role_permissions grants whose permission is not in this instance (NOT NULL FK), not inserting NULL', async () => {
        // Empty permissions catalog in the mock → every grant is unresolved.
        const ndjson = [
            '{"kind":"header","version":1,"tableOrder":["role_permissions"],"manifest":{"role_permissions":2}}',
            '{"kind":"row","t":"role_permissions","r":{"role_id":4,"permission_id":99,"permissions":{"name":"marketplace:view"}}}',
            '{"kind":"row","t":"role_permissions","r":{"role_id":4,"permission_id":7,"permissions":{"name":"intel:view"}}}',
        ].join('\n');
        const result = await importOrgData(ndjson);
        const insertedRows = h.inserts.filter((i) => i.table === 'role_permissions').flatMap((i) => i.rows);
        expect(insertedRows).toHaveLength(0);       // dropped, NOT inserted with a null permission_id
        expect(result.rowsSkipped).toBe(2);
        expect(result.warnings.some((w) => w.includes('marketplace:view'))).toBe(true);
    });

    it('skips a single FK-orphan row via row-by-row fallback instead of failing the whole batch', async () => {
        // e.g. a fleet_group_ships row pointing at a user_ship that was dropped (unsynced catalog).
        h.failRow = { table: 'fleet_group_ships', col: 'user_ship_id', value: 999 };
        const ndjson = [
            '{"kind":"header","version":1,"tableOrder":["fleet_group_ships"],"manifest":{"fleet_group_ships":2}}',
            '{"kind":"row","t":"fleet_group_ships","r":{"id":1,"fleet_group_id":1,"user_ship_id":5}}',
            '{"kind":"row","t":"fleet_group_ships","r":{"id":2,"fleet_group_id":1,"user_ship_id":999}}',
        ].join('\n');
        const result = await importOrgData(ndjson);
        expect(result.rowsInserted).toBe(1); // the valid row
        expect(result.rowsSkipped).toBe(1);  // the orphan, skipped not fatal
    });

    it('nulls intel_reports.source_feed_id so federated intel imports without the (dead) feed link', async () => {
        const ndjson = [
            '{"kind":"header","version":1,"tableOrder":["intel_reports"],"manifest":{"intel_reports":1}}',
            '{"kind":"row","t":"intel_reports","r":{"id":1,"title":"Shared","source_feed_id":"old-saas-feed-uuid","external_id":"e1"}}',
        ].join('\n');
        await importOrgData(ndjson);
        const ins = h.inserts.find((i) => i.table === 'intel_reports');
        expect(ins).toBeTruthy();
        expect(ins!.rows[0].source_feed_id).toBeNull(); // dropped link, report still imports
    });
});
