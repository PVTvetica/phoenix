import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// getPreflightStatus backs the pre-auth onboarding preflight (system:preflight,
// a PUBLIC action). SECURITY: it must return BOOLEANS ONLY — never env values or
// secrets. This pins the boolean-only contract + the derived flags.

const h = vi.hoisted(() => ({ settingsRows: [] as Array<{ key: string; value: unknown }>, adminCount: 0 }));

vi.mock('../lib/db/common', () => {
    const chain: any = {
        select: () => chain,
        eq: () => chain,
        // settings query: .select('key, value').in([...]) → { data }
        in: () => Promise.resolve({ data: h.settingsRows, error: null }),
        // admin-count query: .select('id', {count}).eq().is() → { count }
        is: () => Promise.resolve({ count: h.adminCount, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
    };
    return {
        supabase: { from: () => chain },
        handleSupabaseError: () => {},
        getSystemRoles: async () => ({ admin: { id: 4, name: 'Admin' } }),
        broadcastToOrg: () => {}, broadcastToChannel: () => {}, safeFetch: async () => [],
    };
});
vi.mock('../lib/push', () => ({ sendPushToAll: () => {} }));

import { getPreflightStatus } from '../lib/db/system';

const ENV_KEYS = ['SUPABASE_JWT_SECRET', 'SECRETS_ENCRYPTION_KEY', 'DISCORD_CLIENT_ID'];
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
    savedEnv = {};
    for (const k of ENV_KEYS) { savedEnv[k] = process.env[k]; delete process.env[k]; }
    h.settingsRows = [];
    h.adminCount = 0;
});
afterEach(() => {
    for (const k of ENV_KEYS) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
});

describe('getPreflightStatus', () => {
    it('returns ONLY booleans (no value leakage)', async () => {
        h.settingsRows = [{ key: 'discordConfig', value: { clientId: 'super-secret-client-id' } }];
        process.env.SUPABASE_JWT_SECRET = 'jwt-secret-value';
        process.env.SECRETS_ENCRYPTION_KEY = 'enc-key-value';
        const status = await getPreflightStatus();
        for (const [k, v] of Object.entries(status)) {
            expect(typeof v, `key ${k} must be boolean`).toBe('boolean');
        }
        // Defence-in-depth: no secret value is serialised into the payload.
        const serialized = JSON.stringify(status);
        expect(serialized).not.toContain('super-secret-client-id');
        expect(serialized).not.toContain('jwt-secret-value');
        expect(serialized).not.toContain('enc-key-value');
    });

    it('reports configured state from env + settings', async () => {
        h.settingsRows = [
            { key: 'discordConfig', value: { clientId: 'abc' } },
            { key: 'setup_completed', value: true },
            { key: 'admin_setup_code', value: { code: 'SETUP-DEADBEEF' } },
        ];
        h.adminCount = 1;
        process.env.SUPABASE_JWT_SECRET = 's';
        process.env.SECRETS_ENCRYPTION_KEY = 'k';
        const status = await getPreflightStatus();
        expect(status.dbConnected).toBe(true);
        expect(status.adminExists).toBe(true);
        expect(status.discordConfigured).toBe(true);
        expect(status.realtimeEnabled).toBe(true);
        expect(status.secretsEncrypted).toBe(true);
        expect(status.setupCompleted).toBe(true);
        expect(status.setupCodeExists).toBe(true);
    });

    it('flags missing critical config (no Discord, no admin, no realtime)', async () => {
        h.settingsRows = []; // no discordConfig
        h.adminCount = 0;
        const status = await getPreflightStatus();
        expect(status.discordConfigured).toBe(false);
        expect(status.adminExists).toBe(false);
        expect(status.realtimeEnabled).toBe(false);
        expect(status.secretsEncrypted).toBe(false);
        expect(status.setupCompleted).toBe(false);
        expect(status.setupCodeExists).toBe(false);
        // dbConnected is true because the settings query resolved without error.
        expect(status.dbConnected).toBe(true);
    });
});
