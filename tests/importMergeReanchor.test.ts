import { describe, it, expect, beforeEach, vi } from 'vitest';

// The admin↔imported-user MERGE (id-reanchor): on a first-run/admin import, the
// acting admin maps to one of the imported users. The importer CAPTURES then FREES
// the seeded admin row (so the standard empty-DB import runs unchanged), then
// RE-ANCHORS the admin's Discord login + Admin role onto the chosen imported user,
// and RESTORES the admin if the import fails partway. This pins that contract —
// it is security-sensitive: the admin must never be locked out and must stay Admin.

const h = vi.hoisted(() => ({
    calls: [] as any[],
    failInsertTable: null as string | null,
    roleExists: true,
    noAdminRole: false,
    adminRow: {} as any,
}));

vi.mock('../lib/db/common', () => {
    const make = (table: string) => {
        const state: any = { table, op: null, sel: null, patch: null, rows: null, filters: [] as any[] };
        const snap = () => ({ table: state.table, op: state.op, sel: state.sel, patch: state.patch, rows: state.rows, filters: [...state.filters] });
        const builder: any = {
            select(sel: string, opts?: any) { state.op = state.op || 'select'; state.sel = sel; state.opts = opts; return builder; },
            update(patch: any) { state.op = 'update'; state.patch = patch; return builder; },
            delete() { state.op = 'delete'; return builder; },
            insert(rows: any) {
                state.op = 'insert'; state.rows = rows; h.calls.push(snap());
                if (h.failInsertTable && table === h.failInsertTable) return Promise.resolve({ error: { message: `insert ${table} boom` } });
                return Promise.resolve({ error: null });
            },
            neq(c: string, v: any) { state.filters.push(['neq', c, v]); h.calls.push(snap()); return Promise.resolve({ error: null }); },
            eq(c: string, v: any) {
                state.filters.push(['eq', c, v]); h.calls.push(snap());
                if (table === 'users' && state.op === 'select') return Promise.resolve({ data: [h.adminRow], error: null });
                if (table === 'roles' && state.op === 'select') {
                    if (state.sel === 'id, name') return Promise.resolve({ data: h.noAdminRole ? [] : [{ id: 99, name: 'Admin' }], error: null });
                    if (state.filters.some((f: any) => f[1] === 'name')) return Promise.resolve({ data: [{ id: 99 }], error: null });
                    return Promise.resolve({ data: h.roleExists ? [{ id: v }] : [], error: null });
                }
                return Promise.resolve({ data: [], error: null });
            },
            range() { h.calls.push(snap()); return Promise.resolve({ data: [], error: null }); },
            then(resolve: any) { h.calls.push(snap()); return Promise.resolve({ count: 0, error: null, data: [] }).then(resolve); },
        };
        return builder;
    };
    return {
        supabase: { from: (t: string) => make(t), rpc: () => Promise.resolve({ error: null }) },
        handleSupabaseError: () => {},
    };
});

import { importOrgData } from '../lib/db/importer';

const NDJSON = [
    '{"kind":"header","version":1,"tableOrder":["roles","users"],"manifest":{"roles":1,"users":2}}',
    '{"kind":"row","t":"roles","r":{"id":99,"name":"Admin"}}',
    '{"kind":"row","t":"users","r":{"id":10,"discord_id":"disc-admin","rsi_handle":"Founder","role_id":99}}',
    '{"kind":"row","t":"users","r":{"id":11,"discord_id":"disc-other","rsi_handle":"Member","role_id":1}}',
].join('\n');

beforeEach(() => {
    h.calls = [];
    h.failInsertTable = null;
    h.roleExists = true;
    h.noAdminRole = false;
    h.adminRow = { id: 1, auth_user_id: 'auth-admin', discord_id: 'disc-admin', role_id: 4, name: 'Seed Admin', rsi_handle: 'SeedAdmin' };
});

describe('importOrgData admin↔imported-user merge (id-reanchor)', () => {
    it('frees the seeded admin, re-anchors onto the chosen imported user, and reports the new id/role', async () => {
        const result = await importOrgData(NDJSON, undefined, { importedUserId: 10, adminUserId: 1 });

        // Seeded admin (id 1) was freed.
        const adminDelete = h.calls.find((c) => c.table === 'users' && c.op === 'delete' && c.filters.some((f: any) => f[1] === 'id' && f[2] === 1));
        expect(adminDelete).toBeTruthy();

        // Re-anchor: the imported "me" row (id 10) gets the admin's login + Admin role.
        const anchor = h.calls.find((c) => c.table === 'users' && c.op === 'update' && c.filters.some((f: any) => f[1] === 'id' && f[2] === 10));
        expect(anchor).toBeTruthy();
        expect(anchor.patch.auth_user_id).toBe('auth-admin');
        expect(anchor.patch.discord_id).toBe('disc-admin');
        expect(anchor.patch.role_id).toBe(99); // imported Admin role, forced — admin stays Admin

        expect(result.reanchoredAdminUserId).toBe(10);
        expect(result.reanchoredAdminRoleId).toBe(99);
    });

    it('refuses when the chosen imported user is not present in the export', async () => {
        await expect(importOrgData(NDJSON, undefined, { importedUserId: 999, adminUserId: 1 }))
            .rejects.toThrow(/not present in this export/);
        // It must bail BEFORE any destructive delete of the admin.
        expect(h.calls.some((c) => c.op === 'delete' && c.table === 'users')).toBe(false);
    });

    it('restores the freed admin if the re-anchor cannot complete (no Admin role) — no lock-out', async () => {
        // The import succeeds (row-by-row), but the imported roles contain no "Admin" role,
        // so the re-anchor throws AFTER the admin was freed → the catch must restore it.
        h.noAdminRole = true;
        await expect(importOrgData(NDJSON, undefined, { importedUserId: 10, adminUserId: 1 })).rejects.toThrow();
        // The captured admin row (id 1) was re-inserted.
        const restore = h.calls.find((c) => c.table === 'users' && c.op === 'insert' && Array.isArray(c.rows) && c.rows[0]?.id === 1);
        expect(restore).toBeTruthy();
    });

    it('leaves the standard (non-merge) import path untouched', async () => {
        const result = await importOrgData(NDJSON);
        expect(result.reanchoredAdminUserId).toBeUndefined();
        expect(result.reanchoredAdminRoleId).toBeUndefined();
        expect(h.calls.some((c) => c.op === 'delete' && c.table === 'users')).toBe(false);
    });
});
