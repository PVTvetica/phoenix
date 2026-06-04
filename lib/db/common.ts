
import { supabase, handleSupabaseError } from '../supabaseServer.js';
import { cache, TTL } from '../cache.js';
import { log as baseLog } from '../log.js';
import type { Tables } from './rows.js';

const log = baseLog.child({ module: 'db' });

export { supabase, handleSupabaseError };

/**
 * HELPER: Safe Table Fetch
 * Prevents 500 errors if the user hasn't run migrations yet for new features.
 */
/**
 * Broadcasts an event to the single-org Supabase Realtime channel 'db-changes'.
 * (Single-org build: no per-tenant channel scoping.)
 */
export function broadcastToOrg(event: string, payload: Record<string, unknown> = {}): Promise<void> {
    return broadcastToChannel('db-changes', event, payload);
}

/**
 * Persistent channel pool — reuses Supabase Realtime channels instead of
 * creating/subscribing/destroying per broadcast (was adding 1-5s latency each).
 */
type PooledChannel = ReturnType<typeof supabase.channel>;
const channelPool = new Map<string, { channel: PooledChannel; ready: Promise<void> }>();

// SECURITY: every broadcast channel is PRIVATE (Supabase Realtime
// Authorization). Subscribing requires a JWT that passes the realtime.messages
// RLS policies in schema.sql — the public anon key alone can no longer
// observe org broadcasts (previously ANY anon-key holder could subscribe and
// harvest event metadata, and the EAM/op-alert/board channels carried
// content). The server authorizes its own connection with the service-role
// key (RLS-bypassing), set once below.
let serverRealtimeAuthSet = false;
function ensureServerRealtimeAuth() {
    if (serverRealtimeAuthSet) return;
    serverRealtimeAuthSet = true;
    try {
        // The service-role key is itself a JWT with role=service_role.
        void supabase.realtime.setAuth(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
    } catch (e) {
        log.warn('failed to set server realtime auth', { err: e });
        serverRealtimeAuthSet = false;
    }
}

function getOrCreateChannel(channelName: string): { channel: PooledChannel; ready: Promise<void> } {
    const existing = channelPool.get(channelName);
    if (existing) return existing;

    ensureServerRealtimeAuth();
    const channel = supabase.channel(channelName, { config: { private: true } });
    const ready = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 5000); // Don't block forever
        channel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
                clearTimeout(timeout);
                resolve();
            }
        });
    });

    const entry = { channel, ready };
    channelPool.set(channelName, entry);
    return entry;
}

/**
 * Broadcasts an event to a named Supabase Realtime channel.
 * Reuses persistent channels — no subscribe/unsubscribe churn.
 */
export async function broadcastToChannel(channelName: string, event: string, payload: Record<string, unknown> = {}): Promise<void> {
    try {
        const { channel, ready } = getOrCreateChannel(channelName);
        await ready;
        channel.send({ type: 'broadcast', event, payload });
    } catch (e) {
        log.warn('broadcast send failed', { event, channelName, err: e });
        // Drop stale channel so it reconnects on next use
        const stale = channelPool.get(channelName);
        if (stale) {
            supabase.removeChannel(stale.channel);
            channelPool.delete(channelName);
        }
    }
}

/**
 * System Role Lookup — finds the 4 seeded roles by is_system flag + ID order.
 * Seed order is always: Client (1st), Member (2nd), Dispatcher (3rd), Admin (4th).
 * Falls back to case-insensitive name matching for orgs that predate the is_system column.
 */
export interface SystemRoles {
    client?: { id: number; name: string };
    member?: { id: number; name: string };
    dispatcher?: { id: number; name: string };
    admin?: { id: number; name: string };
}

export async function getSystemRoles(): Promise<SystemRoles> {
    const cacheKey = 'system_roles';
    const cached = cache.get<SystemRoles>(cacheKey);
    if (cached) return cached;

    // Primary: is_system flag (reliable for all orgs that have been seeded/repaired)
    const { data: systemRoles } = await supabase.from('roles')
        .select('id, name, is_system')
        
        .eq('is_system', true)
        .order('id', { ascending: true });

    if (systemRoles && systemRoles.length >= 4) {
        const result: SystemRoles = {
            client: systemRoles[0],
            member: systemRoles[1],
            dispatcher: systemRoles[2],
            admin: systemRoles[3],
        };
        cache.set(cacheKey, result, TTL.SYSTEM_ROLES);
        return result;
    }

    // Fallback: case-insensitive name matching for pre-migration orgs
    const { data: allRoles } = await supabase.from('roles')
        .select('id, name')
        
        .order('id', { ascending: true });

    const roles: Array<Pick<Tables<'roles'>, 'id' | 'name'>> = allRoles || [];
    const find = (pattern: RegExp) => roles.find(r => pattern.test(r.name.trim()));

    const result: SystemRoles = {
        client: find(/^client$/i) || roles[0],
        member: find(/^member$/i) || roles[1],
        dispatcher: find(/^dispatcher$/i) || roles[2],
        admin: find(/^admin$/i) || roles[3],
    };
    // Only cache when the lookup succeeded for all four slots. If we cached an
    // incomplete result (e.g. called mid-seed for a freshly-paid org before the
    // roles row had committed), every subsequent call would see "no Client role
    // configured" for the full TTL until repair was run manually.
    const complete = !!(result.client && result.member && result.dispatcher && result.admin);
    if (complete) {
        cache.set(cacheKey, result, TTL.SYSTEM_ROLES);
    }
    return result;
}


export async function safeFetch<T>(query: PromiseLike<{ data: T | null; error: { code?: string; message?: string; hint?: string; details?: string } | null }>, fallback: T, errorMessage: string): Promise<T> {
    try {
        const { data, error } = await query;
        if (error) {
            // Include PGRST201 (Ambiguous Join) in safe fallback to prevent dashboard crashes.
            // PGRST204 is the schema-cache "column not found" error — surfaces when a
            // freshly-added column hasn't been picked up by PostgREST yet.
            if (error.code === 'PGRST205' || error.code === 'PGRST204' || error.code === 'PGRST200' || error.code === 'PGRST201' || error.code === '42P01') {
                log.warn('safeFetch returning fallback', {
                    target: errorMessage,
                    code: error.code,
                    errMessage: error.message,
                    hint: error.hint || '',
                    details: error.details || '',
                });
                return fallback;
            }
            // Surface the full error shape so silent fallbacks aren't a black box —
            // the previous "message-only" log made it impossible to tell why ops
            // were coming back empty after a migration.
            log.error('safeFetch DB error', {
                target: errorMessage,
                code: error.code,
                errMessage: error.message,
                hint: error.hint || '',
                details: error.details || '',
            });
            handleSupabaseError({ error, message: errorMessage });
        }
        return data as T;
    } catch (err) {
        log.error('safeFetch fatal', { target: errorMessage, err });
        return fallback;
    }
}
