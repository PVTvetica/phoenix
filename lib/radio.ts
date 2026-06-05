
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { getOrgSecret } from './secrets.js';
import { supabase } from './db/common.js';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'lib.radio' });

/** Non-empty trim helper for secret/env strings. */
function nonEmpty(value: string | undefined | null): string | null {
    const v = typeof value === 'string' ? value.trim() : '';
    return v.length > 0 ? v : null;
}

/** LiveKit credentials from server .env (self-hosted default). */
export function isLiveKitConfiguredFromEnv(): boolean {
    return !!(
        nonEmpty(process.env.LIVEKIT_API_KEY)
        && nonEmpty(process.env.LIVEKIT_API_SECRET)
        && nonEmpty(process.env.LIVEKIT_URL)
    );
}

/** DB radioConfig and/or .env — matches getOrgSecret resolution order. */
export function isLiveKitConfigured(radio?: {
    apiKey?: string | null;
    apiSecret?: string | null;
    url?: string | null;
} | null): boolean {
    const hasDb = !!(
        nonEmpty(radio?.apiKey ?? undefined)
        && nonEmpty(radio?.apiSecret ?? undefined)
        && nonEmpty(radio?.url ?? undefined)
    );
    return hasDb || isLiveKitConfiguredFromEnv();
}

// Authenticated actor passed in by the dispatcher. SECURITY (H5): the radio
// actions are reachable by any authenticated user (user:manage:self), so the
// LiveKit grant MUST be authorized here against the actor's identity — the
// client-supplied room name / participant name are NOT trusted.
export interface RadioUser {
    id: number | string;
    name?: string;
    role?: string;
    permissions?: string[];
    clearanceLevel?: { level?: number } | null;
    unitId?: number | null;
}

export type RadioChannelRef =
    | { kind: 'matrix'; channelId: string }
    | { kind: 'unit'; unitId: number }
    | { kind: 'request'; requestId: string };

/** Parses the channel id segment from a `radio-<id>` room name. */
export function parseRadioChannelId(channelId: string): RadioChannelRef | null {
    const id = String(channelId || '').trim();
    if (!id) return null;
    const unitMatch = /^unit-(\d+)$/.exec(id);
    if (unitMatch) return { kind: 'unit', unitId: Number(unitMatch[1]) };
    if (id.startsWith('req-')) {
        const requestId = id.slice(4);
        return requestId ? { kind: 'request', requestId } : null;
    }
    return { kind: 'matrix', channelId: id };
}

function userIdNum(user: RadioUser): number {
    return typeof user.id === 'number' ? user.id : Number(user.id);
}

function hasPerm(user: RadioUser, perm: string): boolean {
    return user.role === 'Admin' || (user.permissions || []).includes(perm);
}

/**
 * Authorize join for matrix frequencies, unit tactical channels (`unit-<id>`),
 * and mission ops channels (`req-<requestId>`). Matches client-side channel lists.
 */
export async function assertRadioChannelAllowed(channelId: string, user: RadioUser): Promise<void> {
    const ref = parseRadioChannelId(channelId);
    if (!ref) throw new Error('Invalid radio channel');

    if (ref.kind === 'matrix') {
        const { data: channel } = await supabase.from('radio_channels').select('id').eq('id', ref.channelId).maybeSingle();
        if (!channel) throw new Error('Unknown radio channel');
        return;
    }

    if (ref.kind === 'unit') {
        const { data: unit } = await supabase
            .from('units')
            .select('id, has_radio_channel')
            .eq('id', ref.unitId)
            .maybeSingle();
        if (!unit || unit.has_radio_channel === false) throw new Error('Unknown radio channel');
        return;
    }

    const { data: req } = await supabase
        .from('service_requests')
        .select('id, client_id, lead_responder_id, status')
        .eq('id', ref.requestId)
        .maybeSingle();
    if (!req) throw new Error('Unknown radio channel');

    const active = req.status === 'Accepted' || req.status === 'In-Progress';
    if (!active) throw new Error('Unknown radio channel');

    const uid = userIdNum(user);
    if (Number.isNaN(uid)) throw new Error('Unauthorized');

    if (req.client_id === uid || req.lead_responder_id === uid) return;
    if (hasPerm(user, 'radio:manage') || hasPerm(user, 'request:dispatch')) return;

    const { data: responder } = await supabase
        .from('request_responders')
        .select('user_id')
        .eq('request_id', ref.requestId)
        .eq('user_id', uid)
        .maybeSingle();
    if (responder) return;

    throw new Error('Insufficient clearance to join this mission channel.');
}

export async function generateRadioToken(user: RadioUser, room: string) {
    // SECURITY (H5): the requested room must be a CONFIGURED radio channel
    // (`radio-<channelId>`), not an arbitrary string. Without this a member could
    // request `op-radio-<id>` or any room name and receive a join grant for it.
    const match = /^radio-(.+)$/.exec(String(room || ''));
    if (!match) throw new Error('Invalid radio channel');
    const channelId = match[1];
    await assertRadioChannelAllowed(channelId, user);

    const apiKey = await getOrgSecret('LIVEKIT_API_KEY');
    const apiSecret = await getOrgSecret('LIVEKIT_API_SECRET');
    const wsUrl = await getOrgSecret('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Radio configuration missing");

    // Best-effort: set auto-cleanup timeouts on the room. LiveKit auto-creates rooms
    // on first join, so this failing should not block token generation.
    try {
        const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret);
        await svc.createRoom({
            name: room,
            emptyTimeout: 300,      // Close room 5 min after last participant leaves
            departureTimeout: 30,   // 30s grace period for reconnects
        });
    } catch (e) {
        log.warn('room pre-create failed', { room, err: e });
    }

    const at = new AccessToken(apiKey, apiSecret, {
        // Identity + display name are taken from the AUTHENTICATED user, never the
        // client payload — prevents impersonating another member in the room.
        identity: String(user.id),
        name: user.name || String(user.id),
        ttl: '6h', // Auto-expire sessions after 6 hours to prevent indefinite connections
    });
    at.addGrant({ roomJoin: true, room: room });

    return { token: await at.toJwt(), url: wsUrl };
}

// SECURITY (L8/H5): participant identities + names of EVERY active room — incl.
// private per-op comms — must not be handed to every authenticated member.
// `includeParticipants` is set only for callers holding radio:manage; everyone
// else receives room names + counts (presence) but no identities.
export async function getRadioStatus(opts?: { includeParticipants?: boolean }) {
    const includeParticipants = !!opts?.includeParticipants;
    const apiKey = await getOrgSecret('LIVEKIT_API_KEY');
    const apiSecret = await getOrgSecret('LIVEKIT_API_SECRET');
    const wsUrl = await getOrgSecret('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !wsUrl) return { activeChannels: [] };

    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret);
    const rooms = await svc.listRooms();

    const activeChannels = await Promise.all(rooms.map(async room => {
        // Skip the extra API call for empty rooms, or whenever the caller is not
        // permitted to see participant identities.
        if (!room.numParticipants || !includeParticipants) {
            return {
                roomName: room.name,
                participantCount: room.numParticipants || 0,
                participants: [],
                participantNames: []
            };
        }

        let participants: any[] = [];
        try {
            participants = await svc.listParticipants(room.name);
        } catch (e: any) {
            // Room might have closed between listRooms and listParticipants
            if (e.code === 404 || e.message?.includes('not found')) {
                // Silent ignore, room is gone
            } else {
                log.warn('list participants failed', { room: room.name, err: e });
            }
        }

        return {
            roomName: room.name,
            participantCount: room.numParticipants,
            participants: participants.map(p => p.identity),
            participantNames: participants.map(p => p.name)
        };
    }));

    return { activeChannels };
}

export async function generateOpRadioToken(user: RadioUser, operationId: string) {
    // Confirm the operation exists + load the fields needed to authorize voice
    // access.
    const { data: op, error: opErr } = await supabase
        .from('operations')
        .select('id, owner_id, clearance_level')
        .eq('id', operationId)
        .single();
    if (opErr || !op) throw new Error('Operation not found');

    // SECURITY (H5): previously ANY authenticated user could mint a join token for
    // ANY operation's voice room (eavesdrop/transmit on private op comms). Tie
    // voice access to op visibility: owner / operations:manage bypass; otherwise
    // the caller needs operations:view AND clearance at/above the op's level.
    const perms = user.permissions || [];
    const isOwner = op.owner_id === user.id;
    const canManage = user.role === 'Admin' || perms.includes('operations:manage');
    const canView = perms.includes('operations:view');
    const userClearance = user.clearanceLevel?.level ?? 0;
    if (!isOwner && !canManage && !(canView && (op.clearance_level ?? 0) <= userClearance)) {
        throw new Error('Insufficient clearance to join this operation channel.');
    }

    const apiKey = await getOrgSecret('LIVEKIT_API_KEY');
    const apiSecret = await getOrgSecret('LIVEKIT_API_SECRET');
    const wsUrl = await getOrgSecret('LIVEKIT_URL');
    if (!apiKey || !apiSecret || !wsUrl) throw new Error('Radio configuration missing');

    const roomName = `op-radio-${operationId}`;

    // Best-effort: set auto-cleanup timeouts on the room
    try {
        const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret);
        await svc.createRoom({
            name: roomName,
            emptyTimeout: 300,      // Close room 5 min after last participant leaves
            departureTimeout: 30,   // 30s grace period for reconnects
        });
    } catch (e) {
        log.warn('room pre-create failed', { room: roomName, err: e });
    }

    const at = new AccessToken(apiKey, apiSecret, {
        // Identity + name from the authenticated user, never the client payload.
        identity: String(user.id),
        name: user.name || String(user.id),
        ttl: '6h', // Auto-expire sessions after 6 hours
    });
    at.addGrant({ roomJoin: true, room: roomName });

    return { token: await at.toJwt(), url: wsUrl, roomName };
}

export async function rebootRadioNetwork() {
    const apiKey = await getOrgSecret('LIVEKIT_API_KEY');
    const apiSecret = await getOrgSecret('LIVEKIT_API_SECRET');
    const wsUrl = await getOrgSecret('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !wsUrl) throw new Error("Radio configuration missing");

    const svc = new RoomServiceClient(wsUrl, apiKey, apiSecret);
    try {
        const rooms = await svc.listRooms();
        const promises = rooms.map(room => svc.deleteRoom(room.name));
        await Promise.allSettled(promises);
        return { success: true, count: rooms.length };
    } catch (e: any) {
        log.error('radio network reboot failed', { err: e });
        throw e;
    }
}
