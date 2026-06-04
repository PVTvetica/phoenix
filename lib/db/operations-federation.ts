// =============================================================================
// lib/db/operations-federation.ts — Joint-operation federation (alliance P3)
// =============================================================================
// Host-authoritative mirror: the HOST instance owns the operation; invited allied
// instances get a read-only jsonb snapshot and sync their members' RSVPs back.
// Server-to-server only; reuses the P1/P2 alliance toolkit (callAlliancePeer,
// getAlliancePeerByInboundKey). The SNAPSHOT PROJECTION is the critical security
// surface — it is an explicit allow-list (never a spread of the operation) and is
// unit-tested in tests/operations-federation.projection.test.ts.

import { supabase, handleSupabaseError, safeFetch, broadcastToOrg } from './common.js';
import { getFullOperationDetails } from './ops.js';
import { callAlliancePeer } from './alliances.js';
import { toMirroredOperation } from './mappers.js';
import type { HydratedOperation, User, MirroredOperation, OperationPayoutMode } from '../../types.js';
import { log as baseLog } from '../log.js';

const log = baseLog.child({ module: 'db.operations-federation' });
const nowIso = () => new Date().toISOString();

// --- Display-only user projection: name + avatar, NO real id / email / perms. ---
function displayUser(u: Partial<User> | undefined, synthId: number): User {
    return { id: synthId, name: u?.name || 'Allied Member', avatarUrl: u?.avatarUrl } as User;
}

/**
 * PURE allow-list projection of a host operation into the snapshot shared with an
 * ally. Returns null if the op carries a sync_restricted marker (caller passes the
 * already-computed flag). NEVER spread `op` — every shared field is explicit, and
 * financial / payout / join_code / log / raw-id fields are neutralised, not copied.
 */
export function projectOperationSnapshot(op: HydratedOperation, hasRestrictedMarker: boolean): HydratedOperation | null {
    if (hasRestrictedMarker) return null;
    return {
        id: op.id,
        name: op.name,
        type: op.type,
        status: op.status,
        description: op.description,
        isJoint: op.isJoint,
        isSpecial: op.isSpecial,
        isTraining: op.isTraining,
        clearanceLevel: op.clearanceLevel,
        maxParticipants: op.maxParticipants,
        createdAt: op.createdAt,
        updatedAt: op.updatedAt,
        scheduledStart: op.scheduledStart,
        scheduledEnd: op.scheduledEnd,
        activeStartTime: op.activeStartTime,
        activeEndTime: op.activeEndTime,
        roe: op.roe,
        commanderNotes: op.commanderNotes,
        commsPlan: op.commsPlan || [],
        liveStatus: op.liveStatus,
        locationText: op.locationText,
        additionalLocationTexts: op.additionalLocationTexts,
        location: op.location,
        additionalLocations: op.additionalLocations,
        limitingMarkers: op.limitingMarkers || [],

        // Owner + participants as display-only (no real ids / payout / ships FKs).
        ownerId: 0,
        owner: displayUser(op.owner, 0),
        participants: (op.participants || []).map((p, i) => ({
            userId: i + 1,
            user: displayUser(p.user, i + 1),
            timeJoined: p.timeJoined,
            isReady: p.isReady,
            roleRequested: p.roleRequested,
            shipUtilized: p.shipUtilized,
            rsvpStatus: p.rsvpStatus,
            liveStatus: p.liveStatus,
        })),

        // Structure — keep labels/positions/status; strip every user/unit assignment ref.
        phases: op.phases,
        scheduleEntries: op.scheduleEntries,
        tasks: (op.tasks || []).map((t) => ({ ...t, assignedUserId: undefined, assignedUnitId: undefined, assignedUser: undefined, assignedUnit: undefined })),
        commandNodes: (op.commandNodes || []).map((n) => ({ ...n, assignedUserId: undefined, assignedUnitId: undefined, assignedUser: undefined, assignedUnit: undefined, fleetGroupId: undefined, fleetGroup: undefined })),
        boardElements: op.boardElements,
        logistics: (op.logistics || []).map((l) => ({ ...l, fulfilledByUserId: undefined, fulfilledByOrgId: undefined })),

        // Allied peers + their members (names only) — useful and safe.
        alliedOrgs: op.alliedOrgs,
        alliedParticipants: op.alliedParticipants,

        // Financials / internals: type requires the keys, so neutralise (never copy).
        tracksUec: false,
        totalUec: 0,
        totalCosts: 0,
        payoutMode: 'equal' as OperationPayoutMode,
        log: [],
        joinCode: undefined,
        aarSummary: undefined,
        aarLessonsLearned: undefined,
        aarSubmittedAt: undefined,
        aarSubmittedBy: undefined,
        discordEventId: undefined,
        discordAnnouncementChannelId: undefined,
        discordAnnouncementMessageId: undefined,
    } as HydratedOperation;
}

/** Apply an incoming snapshot only if its version is newer (idempotent / drops stale). */
export function shouldApplyVersion(incoming: number, stored: number | null | undefined): boolean {
    return typeof incoming === 'number' && incoming > (stored ?? -1);
}

// =============================================================================
// HOST side
// =============================================================================

async function operationHasSyncRestrictedMarker(opId: string): Promise<boolean> {
    const { data } = await supabase
        .from('operation_limiting_markers')
        .select('marker:security_limiting_markers!inner(sync_restricted)')
        .eq('operation_id', opId);
    type MarkerEmbed = { sync_restricted?: boolean | null };
    const rows = (data ?? []) as unknown as Array<{ marker: MarkerEmbed | MarkerEmbed[] | null }>;
    return rows.some((r) => {
        const markers = Array.isArray(r.marker) ? r.marker : r.marker ? [r.marker] : [];
        return markers.some((m) => m?.sync_restricted === true);
    });
}

/** Build the projected snapshot for a host-owned operation (null if classified). */
export async function buildOperationSnapshot(opId: string): Promise<HydratedOperation | null> {
    const op = await getFullOperationDetails(opId);
    if (!op) return null;
    const restricted = await operationHasSyncRestrictedMarker(opId);
    return projectOperationSnapshot(op as HydratedOperation, restricted);
}

/** Monotonic version bump — version-gates snapshots on the guest side. */
export async function bumpOperationVersion(opId: string): Promise<number> {
    const { data } = await supabase.from('operations').select('joint_version, is_joint').eq('id', opId).maybeSingle();
    if (!data?.is_joint) return data?.joint_version ?? 0;
    const next = (data.joint_version ?? 0) + 1;
    await supabase.from('operations').update({ joint_version: next, updated_at: nowIso() }).eq('id', opId);
    return next;
}

interface OpEnvelopeMeta { v: number; op_id: string; version: number }

async function opEnvelope(opId: string): Promise<OpEnvelopeMeta> {
    const { data } = await supabase.from('operations').select('joint_version').eq('id', opId).maybeSingle();
    return { v: 1, op_id: opId, version: data?.joint_version ?? 0 };
}

/** Host invites an Active peer (with channels.operations) to a joint op + notifies it. */
export async function inviteAllyToOperation(opId: string, peerId: string): Promise<void> {
    const { data: peer } = await supabase.from('alliance_peers').select('status, channels').eq('id', peerId).maybeSingle();
    if (!peer || peer.status !== 'Active' || (peer.channels as { operations?: boolean } | null)?.operations !== true) {
        throw new Error('Peer is not an active ally with joint operations enabled.');
    }
    const { error } = await supabase.from('operation_allied_orgs')
        .upsert({ operation_id: opId, peer_id: peerId, accepted: false, invited_at: nowIso() }, { onConflict: 'operation_id,peer_id' });
    handleSupabaseError({ error, message: 'Failed to invite ally' });
    await bumpOperationVersion(opId);
    const env = await opEnvelope(opId);
    const summary = await buildOperationSnapshot(opId);
    await callAlliancePeer(peerId, '/api/alliance/op-mirror/invite', { method: 'POST', body: { ...env, snapshot: summary } })
        .catch((e) => log.warn('invite push failed', { opId, peerId, err: e }));
    broadcastToOrg('operation_update', { operationId: opId });
}

/** Host uninvites a peer + tells it to drop the mirror. */
export async function revokeAllyFromOperation(opId: string, peerId: string): Promise<void> {
    await supabase.from('operation_allied_orgs').delete().eq('operation_id', opId).eq('peer_id', peerId);
    await supabase.from('operation_allied_participants').delete().eq('operation_id', opId).eq('peer_id', peerId);
    await callAlliancePeer(peerId, '/api/alliance/op-mirror/revoke', { method: 'POST', body: { v: 1, op_id: opId } })
        .catch((e) => log.warn('revoke push failed', { opId, peerId, err: e }));
    broadcastToOrg('operation_update', { operationId: opId });
}

/** Push the current snapshot to every ACCEPTED ally (critical events; fire-and-forget). */
export async function pushOperationToAllies(opId: string, event: 'status_change' | 'alert' | 'cancel' | 'full'): Promise<void> {
    const { data: allies } = await supabase.from('operation_allied_orgs').select('peer_id').eq('operation_id', opId).eq('accepted', true);
    if (!allies || allies.length === 0) return;
    const env = await opEnvelope(opId);
    const snapshot = event === 'cancel' ? null : await buildOperationSnapshot(opId);
    await Promise.all(allies.map((a: { peer_id: string }) =>
        callAlliancePeer(a.peer_id, '/api/alliance/op-mirror/push', { method: 'POST', body: { ...env, event, snapshot } })
            .catch((e) => log.warn('op push failed', { opId, peerId: a.peer_id, event, err: e })),
    ));
}

/** Inbound (guest polls): serve the snapshot to a verified, accepted ally. */
export async function getOperationSnapshotForPeer(opId: string, peerId: string, sinceVersion?: number): Promise<{ unchanged: true } | { v: number; op_id: string; version: number; snapshot: HydratedOperation | null }> {
    const { data: ally } = await supabase.from('operation_allied_orgs').select('accepted').eq('operation_id', opId).eq('peer_id', peerId).maybeSingle();
    if (!ally?.accepted) throw new Error('forbidden');
    const env = await opEnvelope(opId);
    if (sinceVersion !== undefined && env.version <= sinceVersion) return { unchanged: true };
    const snapshot = await buildOperationSnapshot(opId);
    return { ...env, snapshot };
}

/** Inbound (guest admin accepts): mark the ally accepted, return the first snapshot. */
export async function acceptInviteForPeer(opId: string, peerId: string): Promise<{ v: number; op_id: string; version: number; snapshot: HydratedOperation | null }> {
    // SECURITY: an Active peer must not be able to "accept" an op it was never
    // invited to and walk away with a snapshot — require the invite row to
    // exist before updating/returning (mirrors getOperationSnapshotForPeer's
    // accepted guard).
    const { data: invite } = await supabase.from('operation_allied_orgs')
        .select('peer_id').eq('operation_id', opId).eq('peer_id', peerId).maybeSingle();
    if (!invite) throw new Error('forbidden');
    const { error } = await supabase.from('operation_allied_orgs')
        .update({ accepted: true, accepted_at: nowIso() }).eq('operation_id', opId).eq('peer_id', peerId);
    handleSupabaseError({ error, message: 'Failed to accept invite' });
    broadcastToOrg('operation_update', { operationId: opId });
    const env = await opEnvelope(opId);
    return { ...env, snapshot: await buildOperationSnapshot(opId) };
}

export async function declineInviteForPeer(opId: string, peerId: string): Promise<void> {
    await supabase.from('operation_allied_orgs').delete().eq('operation_id', opId).eq('peer_id', peerId);
    broadcastToOrg('operation_update', { operationId: opId });
}

/** Inbound (guest RSVP push): upsert an allied member's participation snapshot. */
export interface AlliedRsvpInput { remoteUserHandle: string; displayName?: string; avatarUrl?: string; role?: string; shipText?: string; rsvpStatus: string; isReady?: boolean }
export async function upsertAlliedParticipant(opId: string, peerId: string, p: AlliedRsvpInput): Promise<void> {
    const { data: ally } = await supabase.from('operation_allied_orgs').select('accepted').eq('operation_id', opId).eq('peer_id', peerId).maybeSingle();
    if (!ally?.accepted) throw new Error('forbidden');
    const handle = String(p.remoteUserHandle || '').slice(0, 120);
    if (!handle) throw new Error('malformed_request');
    const { error } = await supabase.from('operation_allied_participants').upsert({
        operation_id: opId, peer_id: peerId, remote_user_handle: handle,
        display_name: p.displayName ?? null, avatar_url: p.avatarUrl ?? null,
        role: p.role ?? null, ship_text: p.shipText ?? null,
        rsvp_status: p.rsvpStatus || 'Pending', is_ready: !!p.isReady, updated_at: nowIso(),
    }, { onConflict: 'operation_id,peer_id,remote_user_handle' });
    handleSupabaseError({ error, message: 'Failed to record allied RSVP' });
    await bumpOperationVersion(opId);
    broadcastToOrg('operation_update', { operationId: opId });
}

// =============================================================================
// GUEST side
// =============================================================================

interface MirrorPayload { v: number; op_id: string; version: number; event?: string; snapshot: HydratedOperation | null }

/** Inbound (host invites us): store a pending mirror, visible only to admins. */
export async function receiveMirrorInvite(peer: { id: string }, body: MirrorPayload): Promise<void> {
    const { error } = await supabase.from('mirrored_operations').upsert({
        id: body.op_id, host_peer_id: peer.id,
        snapshot: body.snapshot ?? null, version: body.version ?? 0, snapshot_updated_at: nowIso(),
        accepted: false, invited_at: nowIso(), revoked_at: null,
    }, { onConflict: 'id' });
    handleSupabaseError({ error, message: 'Failed to receive invite' });
    broadcastToOrg('operation_update', { operationId: body.op_id });
}

/** Inbound (host pushes): version-gated snapshot replacement. */
export async function receiveMirrorPush(peer: { id: string }, body: MirrorPayload): Promise<void> {
    const { data: existing } = await supabase.from('mirrored_operations').select('version, host_peer_id').eq('id', body.op_id).maybeSingle();
    if (!existing || existing.host_peer_id !== peer.id) return;          // not ours / unknown
    if (body.event === 'cancel') {
        await supabase.from('mirrored_operations').update({ revoked_at: nowIso(), snapshot_updated_at: nowIso() }).eq('id', body.op_id);
        broadcastToOrg('operation_update', { operationId: body.op_id });
        return;
    }
    if (!shouldApplyVersion(body.version, existing.version)) return;     // stale / duplicate
    await supabase.from('mirrored_operations').update({
        snapshot: body.snapshot ?? null, version: body.version, snapshot_updated_at: nowIso(),
    }).eq('id', body.op_id);
    broadcastToOrg('operation_update', { operationId: body.op_id });
}

export async function receiveMirrorRevoke(peer: { id: string }, opId: string): Promise<void> {
    await supabase.from('mirrored_operations').update({ revoked_at: nowIso() }).eq('id', opId).eq('host_peer_id', peer.id);
    broadcastToOrg('operation_update', { operationId: opId });
}

/** Guest: list mirrored ops. Pending (unaccepted) only surface to admins. */
export async function listMirroredOperations(includePending: boolean): Promise<MirroredOperation[]> {
    let query = supabase.from('mirrored_operations')
        .select('*, peer:alliance_peers(peer_org_name, peer_icon_url, label)')
        .is('revoked_at', null).order('invited_at', { ascending: false });
    if (!includePending) query = query.eq('accepted', true);
    const rows = await safeFetch<Parameters<typeof toMirroredOperation>[0][]>(query, [], 'Failed to list mirrored operations');
    return rows.map(toMirroredOperation);
}

export async function getMirroredOperation(id: string): Promise<MirroredOperation | null> {
    const { data } = await supabase.from('mirrored_operations')
        .select('*, peer:alliance_peers(peer_org_name, peer_icon_url, label)').eq('id', id).is('revoked_at', null).maybeSingle();
    if (!data) return null;
    const mirror = toMirroredOperation(data as Parameters<typeof toMirroredOperation>[0]);
    const { data: parts } = await supabase.from('mirrored_operation_participation')
        .select('*, user:users!mirrored_operation_participation_user_id_fkey(id, name, avatar_url, role_id)').eq('mirror_op_id', id);
    mirror.myParticipation = (parts || []).map((r: { mirror_op_id: string; user_id: number; rsvp_status: string; ship_text: string | null; is_ready: boolean; updated_at: string; user?: { id: number; name: string; avatar_url?: string } | null }) => ({
        mirrorOpId: r.mirror_op_id, userId: r.user_id, rsvpStatus: r.rsvp_status,
        shipText: r.ship_text, isReady: r.is_ready, updatedAt: r.updated_at,
        user: r.user ? ({ id: r.user.id, name: r.user.name, avatarUrl: r.user.avatar_url } as User) : undefined,
    }));
    return mirror;
}

/** Guest admin accepts: confirm with the host, store the first full snapshot. */
export async function acceptMirroredOperation(id: string): Promise<void> {
    const { data: mirror } = await supabase.from('mirrored_operations').select('host_peer_id').eq('id', id).maybeSingle();
    if (!mirror) throw new Error('Mirror not found.');
    const res = await callAlliancePeer(mirror.host_peer_id, `/api/alliance/op/${id}/accept`, { method: 'POST', body: { v: 1, op_id: id } });
    if (!res || !res.ok) throw new Error('Host did not confirm the invite.');
    const payload = await res.json() as MirrorPayload;
    const { error } = await supabase.from('mirrored_operations').update({
        accepted: true, accepted_at: nowIso(),
        snapshot: payload.snapshot ?? null, version: payload.version ?? 0, snapshot_updated_at: nowIso(),
    }).eq('id', id);
    handleSupabaseError({ error, message: 'Failed to accept operation' });
    broadcastToOrg('operation_update', { operationId: id });
}

export async function declineMirroredOperation(id: string): Promise<void> {
    const { data: mirror } = await supabase.from('mirrored_operations').select('host_peer_id').eq('id', id).maybeSingle();
    if (mirror) await callAlliancePeer(mirror.host_peer_id, `/api/alliance/op/${id}/decline`, { method: 'POST', body: { v: 1, op_id: id } }).catch(() => undefined);
    await supabase.from('mirrored_operations').delete().eq('id', id);
    broadcastToOrg('operation_update', { operationId: id });
}

/** Guest poll: pull the latest snapshot from the host if newer. */
export async function pollMirroredOperation(id: string): Promise<void> {
    const { data: mirror } = await supabase.from('mirrored_operations').select('host_peer_id, version').eq('id', id).eq('accepted', true).is('revoked_at', null).maybeSingle();
    if (!mirror) return;
    const res = await callAlliancePeer(mirror.host_peer_id, `/api/alliance/op/${id}?since=${mirror.version}`);
    if (!res || !res.ok) return;
    const payload = await res.json() as MirrorPayload | { unchanged: true };
    await supabase.from('mirrored_operations').update({ last_polled_at: nowIso() }).eq('id', id);
    if ('unchanged' in payload) return;
    if (!shouldApplyVersion(payload.version, mirror.version)) return;
    await supabase.from('mirrored_operations').update({
        snapshot: payload.snapshot ?? null, version: payload.version, snapshot_updated_at: nowIso(),
    }).eq('id', id);
    broadcastToOrg('operation_update', { operationId: id });
}

/** Guest member RSVPs to a mirrored op: store locally + push to the host immediately. */
export async function rsvpMirroredOperation(id: string, userId: number, rsvpStatus: string, shipText?: string, isReady?: boolean): Promise<void> {
    const { data: mirror } = await supabase.from('mirrored_operations').select('host_peer_id, accepted').eq('id', id).maybeSingle();
    if (!mirror?.accepted) throw new Error('This operation is not active.');
    const { error } = await supabase.from('mirrored_operation_participation').upsert({
        mirror_op_id: id, user_id: userId, rsvp_status: rsvpStatus, ship_text: shipText ?? null, is_ready: !!isReady, updated_at: nowIso(),
    }, { onConflict: 'mirror_op_id,user_id' });
    handleSupabaseError({ error, message: 'Failed to RSVP' });
    const { data: u } = await supabase.from('users').select('name, rsi_handle, avatar_url').eq('id', userId).maybeSingle();
    const handle = (u?.rsi_handle as string) || (u?.name as string) || `user-${userId}`;
    await callAlliancePeer(mirror.host_peer_id, `/api/alliance/op/${id}/rsvp`, {
        method: 'POST',
        body: { v: 1, op_id: id, remoteUserHandle: handle, displayName: u?.name, avatarUrl: u?.avatar_url, shipText, rsvpStatus, isReady: !!isReady },
    }).catch((e) => log.warn('rsvp push failed', { id, userId, err: e }));
    broadcastToOrg('operation_update', { operationId: id });
}
