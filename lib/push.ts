
import { supabase } from './db/common.js';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'lib.push' });

// Lazy load web-push to avoid "url.parse" deprecation warnings in API routes that don't need it
let webpush: any = null;

async function getWebPush() {
    if (webpush) return webpush;

    // Dynamic import
    const module = await import('web-push');
    webpush = module.default || module;

    // Initialize VAPID
    const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

    if (publicVapidKey && privateVapidKey) {
        webpush.setVapidDetails(
            vapidSubject,
            publicVapidKey,
            privateVapidKey
        );
    } else {
        log.warn('vapid keys not configured, push notifications will fail');
    }

    return webpush;
}

export interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    renotify?: boolean;
}

/** Resolved profile passed to a `payloadFn` so it can format per-recipient. */
export interface RecipientProfile {
    userId: number;
    timezone: string | null;
    dateFormat: string | null;
}

/**
 * Builder signature: receives the recipient's prefs and returns the payload
 * to send to that specific user. Used when the body needs to render a
 * timestamp (or anything else user-specific) in the recipient's locale.
 */
export type PushPayloadBuilder = (recipient: RecipientProfile) => PushPayload;

async function sendBatch(
    subscriptions: any[],
    payloadOrBuilder: PushPayload | PushPayloadBuilder,
    recipientProfiles?: Map<number, RecipientProfile>,
) {
    if (!subscriptions || subscriptions.length === 0) return;

    const wp = await getWebPush();
    const isBuilder = typeof payloadOrBuilder === 'function';

    // Static-payload fast path: stringify once, reuse for every subscription.
    const staticPayloadString = isBuilder ? null : JSON.stringify(payloadOrBuilder);

    const promises = subscriptions.map(sub => {
        try {
            const pushSub = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;

            let payloadString: string;
            if (isBuilder) {
                const profile = recipientProfiles?.get(sub.user_id) ?? {
                    userId: sub.user_id,
                    timezone: null,
                    dateFormat: null,
                };
                payloadString = JSON.stringify((payloadOrBuilder as PushPayloadBuilder)(profile));
            } else {
                payloadString = staticPayloadString!;
            }

            return wp.sendNotification(pushSub, payloadString)
                .catch(async (error: any) => {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscription is dead, clean up
                        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                    } else {
                        log.error('push send failed', { err: error });
                    }
                });
        } catch (parseError) {
            log.warn('skipping malformed push subscription', { subscriptionId: sub.id, err: parseError });
            // Continue processing other subscriptions
            return Promise.resolve();
        }
    });

    await Promise.allSettled(promises);
}

/** One round-trip lookup of timezone/dateFormat for a batch of user IDs. */
async function loadRecipientProfiles(userIds: number[]): Promise<Map<number, RecipientProfile>> {
    const map = new Map<number, RecipientProfile>();
    if (userIds.length === 0) return map;
    const { data } = await supabase
        .from('users')
        .select('id, timezone, date_format')
        .in('id', userIds);
    for (const row of data || []) {
        map.set(row.id, {
            userId: row.id,
            timezone: row.timezone ?? null,
            dateFormat: row.date_format ?? null,
        });
    }
    return map;
}

/**
 * Send to specific user IDs.
 *
 * Pass a static `PushPayload` for plain notifications, OR a builder function
 * for notifications whose body depends on the recipient (e.g. timestamps that
 * should render in the recipient's timezone). The builder receives the user's
 * `timezone` and `dateFormat` preferences pre-loaded — no extra DB call per
 * recipient.
 */
export async function sendPushToUsers(userIds: number[], payload: PushPayload | PushPayloadBuilder) {
    if (userIds.length === 0) return;
    const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, user_id, subscription')
        .in('user_id', userIds);

    const isBuilder = typeof payload === 'function';
    const profiles = isBuilder ? await loadRecipientProfiles(userIds) : undefined;

    await sendBatch(subs || [], payload, profiles);
}

/**
 * Send to all users with specific Role IDs, scoped to an organization
 */
export async function sendPushToRoles(roleIds: number[], payload: PushPayload | PushPayloadBuilder) {
    // 1. Get Users with these roles, scoped by org
    const query = supabase
        .from('users')
        .select('id')
        .in('role_id', roleIds);

    /* single-org */

    const { data: users } = await query;

    if (!users || users.length === 0) return;

    const userIds = users.map(u => u.id);
    await sendPushToUsers(userIds, payload);
}

/**
 * Send to "Staff" (Members, Dispatchers, Admins) - Query by role name instead of hardcoded IDs
 */
export async function sendPushToStaff(payload: PushPayload | PushPayloadBuilder) {
    // Resolve roles by name (role ids are not stable across installs).
    const roleQuery = supabase
        .from('roles')
        .select('id')
        .in('name', ['Member', 'Dispatcher', 'Admin']);

    const { data: roles } = await roleQuery;
    if (!roles || roles.length === 0) return;

    const roleIds = roles.map(r => r.id);
    await sendPushToRoles(roleIds, payload);
}

/**
 * Send to "Command" (Dispatchers, Admins) - Query by role name instead of hardcoded IDs
 */
export async function sendPushToCommand(payload: PushPayload | PushPayloadBuilder) {
    // Resolve roles by name (role ids are not stable across installs).
    const roleQuery = supabase
        .from('roles')
        .select('id')
        .in('name', ['Dispatcher', 'Admin']);

    /* single-org */

    const { data: roles } = await roleQuery;
    if (!roles || roles.length === 0) return;

    const roleIds = roles.map(r => r.id);
    await sendPushToRoles(roleIds, payload);
}

/**
 * Send to all users in an org who hold a given permission (via their role).
 * Preferred over sendPushToRoles when a notification is about a capability,
 * not a specific role — e.g. "someone who can `finance:approve`" should get
 * a deposit-verification ping regardless of how permissions are remapped.
 */
export async function sendPushToPermission(
    permissionName: string,
    payload: PushPayload | PushPayloadBuilder,
) {
    const { data: bindings } = await supabase
        .from('role_permissions')
        .select('role_id, permission:permissions!inner(name)')
        .eq('permission.name', permissionName);
    const roleIds = [...new Set((bindings || []).map((b: any) => b.role_id))];
    if (roleIds.length === 0) return;

    const { data: users } = await supabase
        .from('users')
        .select('id')
        
        .in('role_id', roleIds)
        .is('deleted_at', null);

    const userIds = (users || []).map((u: any) => u.id);
    if (userIds.length === 0) return;
    await sendPushToUsers(userIds, payload);
}

/**
 * Send to all users in an organization (or globally if no org specified)
 */
export async function sendPushToAll(payload: PushPayload | PushPayloadBuilder) {
    // Single-org: send to every (non-deleted) user.
    const { data: users } = await supabase
        .from('users')
        .select('id')
        .is('deleted_at', null);

    if (!users || users.length === 0) return;

    const userIds = users.map(u => u.id);
    await sendPushToUsers(userIds, payload);
}
