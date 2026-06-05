import { describe, it, expect, vi, beforeEach } from 'vitest';

// Database Tools "Danger Zone": fullResetOrg (wipe + reseed, keep the acting
// admin signed in) and fullWipeOrg (truncate everything, redeploy for a new
// claim code). Both call the service-role-only RPC admin_truncate_all_data().
// The load-bearing safety property is FAIL-CLOSED: a reset must NEVER wipe if it
// can't first capture the admin to restore (no lock-out).

const h = vi.hoisted(() => ({
    rpcCalls: [] as string[],
    inserts: [] as Array<{ table: string; row: any }>,
    upserts: [] as Array<{ table: string; row: any }>,
    seedCalls: 0,
    adminRow: null as any,
    adminRoleId: 7 as number | null,
    wipeError: null as string | null,
}));

vi.mock('../lib/db/common', () => {
    const make = (table: string) => {
        const b: any = {};
        b.select = () => b;
        b.eq = () => b;
        b.insert = (row: any) => { h.inserts.push({ table, row }); return Promise.resolve({ error: null }); };
        b.upsert = (row: any) => { h.upserts.push({ table, row }); return Promise.resolve({ error: null }); };
        b.single = () => {
            if (table === 'users') return Promise.resolve(h.adminRow ? { data: h.adminRow, error: null } : { data: null, error: { message: 'not found' } });
            return Promise.resolve({ data: null, error: null });
        };
        b.maybeSingle = () => {
            if (table === 'roles') return Promise.resolve({ data: h.adminRoleId ? { id: h.adminRoleId } : null, error: null });
            return Promise.resolve({ data: null, error: null });
        };
        return b;
    };
    return {
        supabase: {
            from: (t: string) => make(t),
            rpc: (fn: string) => { h.rpcCalls.push(fn); return Promise.resolve({ error: h.wipeError ? { message: h.wipeError } : null }); },
        },
        handleSupabaseError: ({ error, message }: { error: unknown; message: string }) => { if (error) throw new Error(message); },
        broadcastToOrg: () => {},
        broadcastToChannel: () => {},
        safeFetch: async () => [],
        getSystemRoles: async () => ({ admin: h.adminRoleId ? { id: h.adminRoleId } : undefined }),
    };
});
vi.mock('../lib/push', () => ({ sendPushToAll: () => {} }));
vi.mock('../lib/cache', () => ({ cache: { invalidate: () => {}, invalidatePrefix: () => {}, get: () => undefined, set: () => {} }, TTL: {} }));
vi.mock('../lib/db/seeder', () => ({
    seedInstall: async () => { h.seedCalls++; },
    seedNewOrganization: async () => { h.seedCalls++; },
}));

import { fullResetOrg, fullWipeOrg } from '../lib/db/system';

beforeEach(() => {
    h.rpcCalls = [];
    h.inserts = [];
    h.upserts = [];
    h.seedCalls = 0;
    h.adminRow = { id: 101, auth_user_id: 'auth-101', discord_id: 'disc-101', name: 'Founder', rsi_handle: 'Founder', avatar_url: 'a.png' };
    h.adminRoleId = 7;
    h.wipeError = null;
});

describe('fullResetOrg', () => {
    it('FAIL-CLOSED: aborts BEFORE any wipe when the acting admin cannot be captured', async () => {
        h.adminRow = null;
        await expect(fullResetOrg(101)).rejects.toThrow(/aborted/i);
        expect(h.rpcCalls).toHaveLength(0);   // truncate never ran
        expect(h.seedCalls).toBe(0);
        expect(h.inserts).toHaveLength(0);
    });

    it('captures → truncates → reseeds → restores the admin with its ORIGINAL id + new Admin role + rsi_verified', async () => {
        const res = await fullResetOrg(101);
        expect(h.rpcCalls).toEqual(['admin_truncate_all_data']);
        expect(h.seedCalls).toBe(1);
        const restored = h.inserts.find((i) => i.table === 'users');
        expect(restored).toBeTruthy();
        expect(restored!.row.id).toBe(101);             // SAME id — session JWT stays valid
        expect(restored!.row.auth_user_id).toBe('auth-101');
        expect(restored!.row.discord_id).toBe('disc-101');
        expect(restored!.row.role_id).toBe(7);          // freshly-seeded Admin role
        expect(restored!.row.rsi_verified).toBe(true);
        // setup_completed kept true so the onboarding wizard doesn't reappear.
        expect(h.upserts.some((u) => u.table === 'settings' && u.row.key === 'setup_completed' && u.row.value === true)).toBe(true);
        expect(res.ok).toBe(true);
    });

    it('throws (post-wipe) if the Admin role is missing after reseed — surfaces the restart path', async () => {
        h.adminRoleId = null;
        await expect(fullResetOrg(101)).rejects.toThrow(/restart the server/i);
        expect(h.rpcCalls).toEqual(['admin_truncate_all_data']); // wipe ran; reseed couldn't restore
    });
});

describe('fullWipeOrg', () => {
    it('calls the truncate RPC and reports the redeploy instruction', async () => {
        const res = await fullWipeOrg();
        expect(h.rpcCalls).toEqual(['admin_truncate_all_data']);
        expect(h.seedCalls).toBe(0);                    // NO reseed — restart re-seeds + mints a code
        expect(res.ok).toBe(true);
        expect(res.message).toMatch(/restart|redeploy/i);
    });

    it('surfaces an RPC failure', async () => {
        h.wipeError = 'permission denied for function';
        await expect(fullWipeOrg()).rejects.toThrow(/Wipe failed/i);
    });
});
