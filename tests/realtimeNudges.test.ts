import { describe, it, expect, vi, beforeEach } from 'vitest';

// Emit-contract tests for the two realtime "nudge" broadcasts wired ahead of the
// first deploy. Both tables are deliberately excluded from the supabase_realtime
// publication / authenticated_select allowlist (audience-scoped tools; settings
// carry secrets), so their live updates ride a broadcast — NOT postgres_changes.
// These pins fail loudly if a future edit drops the emit (which would silently
// regress those features to "updates only on reload"):
//   - external_tools add/update/reorder/delete -> broadcastToOrg('external_tools_update')
//     (db-changes channel; DataCoreContext refetches the 'external_tools' subset)
//   - broadcastSystemAlert -> broadcastToChannel('auth-alerts','system_broadcast',{message})
//     (SessionContext toasts it live)

const h = vi.hoisted(() => ({
    orgEmits: [] as Array<{ event: string; payload: Record<string, unknown> }>,
    channelEmits: [] as Array<{ channel: string; event: string; payload: Record<string, unknown> }>,
}));

vi.mock('../lib/db/common', () => {
    function builder() {
        const b: any = {};
        for (const m of ['select', 'eq', 'neq', 'in', 'is', 'not', 'order', 'limit', 'update', 'insert', 'delete', 'upsert']) {
            b[m] = () => b;
        }
        const settle = () => Promise.resolve({ data: null, error: null });
        b.single = () => settle();
        b.maybeSingle = () => settle();
        b.then = (resolve: any, reject: any) => settle().then(resolve, reject);
        return b;
    }
    return {
        supabase: { from: () => builder(), rpc: () => Promise.resolve({ data: null, error: null }) },
        handleSupabaseError: ({ error, message }: { error: unknown; message: string }) => { if (error) throw new Error(message); },
        broadcastToOrg: (event: string, payload: Record<string, unknown> = {}) => { h.orgEmits.push({ event, payload }); },
        broadcastToChannel: (channel: string, event: string, payload: Record<string, unknown> = {}) => { h.channelEmits.push({ channel, event, payload }); },
        safeFetch: async () => [],
        getSystemRoles: async () => ({}),
    };
});

// broadcastSystemAlert also fans out a push; stub it so the emit-contract test
// doesn't pull in the web-push transport.
vi.mock('../lib/push', () => ({ sendPushToAll: () => {} }));

import {
    addExternalTool, updateExternalTool, reorderExternalTool, deleteExternalTool,
    broadcastSystemAlert,
} from '../lib/db/system';

beforeEach(() => { h.orgEmits = []; h.channelEmits = []; });

describe('external_tools mutations emit the external_tools_update nudge', () => {
    it('addExternalTool emits it', async () => {
        await addExternalTool({ title: 'X', url: 'https://example.com' });
        expect(h.orgEmits.map(e => e.event)).toContain('external_tools_update');
    });
    it('updateExternalTool emits it', async () => {
        await updateExternalTool({ id: 1, title: 'X' });
        expect(h.orgEmits.map(e => e.event)).toContain('external_tools_update');
    });
    it('reorderExternalTool emits it', async () => {
        await reorderExternalTool(1, 3);
        expect(h.orgEmits.map(e => e.event)).toContain('external_tools_update');
    });
    it('deleteExternalTool emits it', async () => {
        await deleteExternalTool(1);
        expect(h.orgEmits.map(e => e.event)).toContain('external_tools_update');
    });
});

describe('broadcastSystemAlert emits the system_broadcast nudge on the auth-alerts channel', () => {
    it('emits to auth-alerts with the message in the payload', async () => {
        await broadcastSystemAlert('All hands on deck');
        const emit = h.channelEmits.find(e => e.event === 'system_broadcast');
        expect(emit).toBeTruthy();
        expect(emit!.channel).toBe('auth-alerts');
        expect(emit!.payload.message).toBe('All hands on deck');
    });
});
