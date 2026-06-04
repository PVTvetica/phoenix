import { describe, it, expect, beforeEach, vi } from 'vitest';

// The importer must clear ALL first-boot SEEDER defaults (lib/db/seeder.ts) before
// inserting the org's real versions — else the insert collides on a seeded unique key
// (the reported `duplicate key value violates unique constraint "ranks_name_key"`).
// This pins that the full seeded set is pre-cleared (child-first), and that `settings`
// is cleared key-scoped (so fork-only keys like setup_completed survive a re-import).

const h = vi.hoisted(() => ({ deletes: [] as { table: string; method: string; arg: unknown }[] }));

vi.mock('../lib/db/common', () => {
    const make = (table: string) => {
        const b: any = {
            select: () => b,
            insert: () => Promise.resolve({ error: null }),
            update: () => b,
            delete: () => ({
                neq: (c: string) => { h.deletes.push({ table, method: 'neq', arg: c }); return Promise.resolve({ error: null }); },
                eq: (_c: string, v: unknown) => { h.deletes.push({ table, method: 'eq', arg: v }); return Promise.resolve({ error: null }); },
                in: (_c: string, v: unknown[]) => { h.deletes.push({ table, method: 'in', arg: v }); return Promise.resolve({ error: null }); },
            }),
            eq: () => Promise.resolve({ data: [], error: null }),
            then: (r: any) => Promise.resolve({ count: 0, error: null, data: [] }).then(r),
        };
        return b;
    };
    return { supabase: { from: (t: string) => make(t), rpc: () => Promise.resolve({ error: null }) }, handleSupabaseError: () => {} };
});

import { importOrgData } from '../lib/db/importer';

// Header lists a few seeded tables + a settings row. ranks is the one that collided.
const NDJSON = [
    '{"kind":"header","version":1,"tableOrder":["roles","ranks","service_types","settings"],"manifest":{"roles":1,"ranks":4,"service_types":3,"settings":1}}',
    '{"kind":"row","t":"roles","r":{"id":4,"name":"Admin"}}',
    '{"kind":"row","t":"ranks","r":{"id":1,"name":"Recruit"}}',
    '{"kind":"row","t":"service_types","r":{"id":1,"name":"Security"}}',
    '{"kind":"row","t":"settings","r":{"key":"brandingConfig","value":{"name":"Org"}}}',
].join('\n');

// Every table the first-boot seeder populates (lib/db/seeder.ts) EXCEPT settings,
// which is key-scoped. If the seeder gains a table, add it here AND to SEEDED_PRECLEAR.
const SEEDED_TABLES = [
    'role_permissions', 'roles', 'ranks', 'units', 'locations', 'security_clearances',
    'service_types', 'specialization_tags', 'certifications', 'commendations', 'radio_channels',
];

beforeEach(() => { h.deletes = []; });

describe('importOrgData pre-clears first-boot seeded defaults', () => {
    it('clears every seeded table (incl. ranks — the reported collision) before importing', async () => {
        await importOrgData(NDJSON);
        const cleared = h.deletes.map((d) => d.table);
        for (const t of SEEDED_TABLES) {
            expect(cleared, `seeded table "${t}" must be pre-cleared`).toContain(t);
        }
    });

    it('clears role_permissions BEFORE roles (FK child-first)', async () => {
        await importOrgData(NDJSON);
        const cleared = h.deletes.map((d) => d.table);
        expect(cleared.indexOf('role_permissions')).toBeGreaterThanOrEqual(0);
        expect(cleared.indexOf('role_permissions')).toBeLessThan(cleared.indexOf('roles'));
    });

    it('clears settings ONLY for the imported keys (key-scoped, not a full wipe)', async () => {
        await importOrgData(NDJSON);
        const settingsDeletes = h.deletes.filter((d) => d.table === 'settings');
        expect(settingsDeletes).toHaveLength(1);
        expect(settingsDeletes[0].method).toBe('in'); // scoped delete, not delete-all
        expect(settingsDeletes[0].arg).toEqual(['brandingConfig']);
    });

    it('does not touch settings when the import has no settings rows', async () => {
        const noSettings = [
            '{"kind":"header","version":1,"tableOrder":["ranks"],"manifest":{"ranks":1}}',
            '{"kind":"row","t":"ranks","r":{"id":1,"name":"Recruit"}}',
        ].join('\n');
        await importOrgData(noSettings);
        expect(h.deletes.some((d) => d.table === 'settings')).toBe(false);
        // ...but the unconditional seeded tables are still cleared.
        expect(h.deletes.some((d) => d.table === 'ranks')).toBe(true);
    });
});
