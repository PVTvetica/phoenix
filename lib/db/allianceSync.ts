// =============================================================================
// lib/db/allianceSync.ts — alliance live-sync engine (scheduler)
// =============================================================================
// While two allied servers are both up, federation data stays in sync
// automatically. One cron tick per minute (leased via withCronLease in
// server.ts — multi-instance safe) runs whatever is DUE per peer:
//
//   ops reconcile  every opsPollMinutes (2)  — the anti-entropy manifest poll;
//                                              converges everything pushes miss
//   intel pull     every intelPollMinutes (5) — delta ingest via the dedicated
//                                              peer-clock cursor
//   directory      every directoryHours (6)  — profile + roster/fleet cache
//
// Event pushes (operations-federation.scheduleAlliedPush) are the latency
// optimization; THIS loop is the correctness mechanism.
//
// RATE BUDGET (peer inbound limit: 20 req/min/IP on /api/alliance/*):
//   manifest poll 0.5/min + intel 0.2/min + directory ~0.01/min ≈ 0.7/min of
//   cadence-bound cron traffic, PLUS everything token-bucketed at
//   outboundBudgetPerMin (default 12): debounced op pushes, member-triggered
//   mirror polls + roster/fleet fetches, RSVP pushes, recovery catch-up and
//   force-sync. Worst case ≈ 12.7/min < 20 with headroom for the un-blockable
//   immediate events (status/alert/cancel — human-bounded). Multi-instance
//   deploys: cron traffic is single-runner (lease); the bucket is per-process,
//   so 2 instances can approach 2× the bucketed budget during a live op —
//   tune outboundBudgetPerMin down accordingly.
//
// PEER HEALTH: transport failures feed the state machine in
// allianceSyncState.ts (healthy → degraded → down + exponential backoff).
// While a peer is down, scheduled sync skips it until sync_next_attempt_at;
// the manifest poll doubles as the probe (useful payload, no dedicated ping)
// and an authenticated inbound request from the peer pulls the probe forward.
// On recovery: full catch-up (reconcile + intel from the unadvanced cursor)
// plus a re-push of our members' RSVPs (their pushes died while the host was
// down). All of it budget-bounded — recovery cannot flood a peer.

import { supabase, broadcastToOrg } from './common.js';
import {
    getAllianceSyncConfig, recordPeerFailure, recordPeerSuccess, setSyncAlert,
} from './allianceSyncState.js';
import { reconcileMirrorsWithPeer, pushLocalRsvpsForPeer } from './operations-federation.js';
import { syncTrustedFeeds } from './intel.js';
import { refreshPeerDirectory } from './alliances.js';
import { log as baseLog } from '../log.js';

const log = baseLog.child({ module: 'db.allianceSync' });

const nowIso = () => new Date().toISOString();

// Per-tick bounds: 4 slow peers × 15s callAlliancePeer timeouts would blow the
// 50s fail-open cron lease, so cap wall-clock at 40s and peer concurrency at 3;
// peers that miss the window roll to the next tick (1 minute later).
const TICK_BUDGET_MS = 40_000;
const PEER_CONCURRENCY = 3;
const FORCE_SYNC_COOLDOWN_MS = 30_000;

// In-process due-time bookkeeping (ms epoch of the last RUN — local clock,
// deliberately NOT the peer-clock intel cursor). Resets on restart, which just
// makes everything due on the first tick after a deploy — desirable.
const lastRun = new Map<string, { ops: number; intel: number }>();
const lastForceSync = new Map<string, number>();

/** Deterministic per-peer phase offset so multi-peer work staggers across
 *  ticks instead of thundering on the same minute boundary. */
export function peerPhaseOffsetMs(peerId: string, cadenceMs: number): number {
    let h = 0;
    for (let i = 0; i < peerId.length; i++) h = ((h << 5) - h + peerId.charCodeAt(i)) | 0;
    return Math.abs(h) % Math.max(1, cadenceMs);
}

interface SyncPeerRow {
    id: string;
    label: string;
    status: string;
    pairing_state: string;
    channels: { reports?: boolean; warrants?: boolean; bulletins?: boolean; operations?: boolean; roster?: boolean; fleet?: boolean } | null;
    sync_health: string | null;
    sync_next_attempt_at: string | null;
    sync_alert: string | null;
}

const PEER_SYNC_COLUMNS = 'id, label, status, pairing_state, channels, sync_health, sync_next_attempt_at, sync_alert';

function wantsIntel(peer: SyncPeerRow): boolean {
    const c = peer.channels || {};
    return c.reports === true || c.warrants === true || c.bulletins === true;
}

function isActiveAlly(peer: SyncPeerRow): boolean {
    return peer.pairing_state === 'active' && peer.status === 'Active';
}

interface DueJobs { ops: boolean; intel: boolean; directory: boolean }

/** One peer's sync pass. Returns the jobs run + whether each was clean. */
async function syncPeer(peer: SyncPeerRow, jobs: DueJobs, deadline: number): Promise<void> {
    const wasDown = peer.sync_health === 'down';
    const now = Date.now();
    const runs = lastRun.get(peer.id) ?? { ops: 0, intel: 0 };
    const alerts: string[] = [];
    let ranAny = false;
    let allClean = true;
    let transportFailed = false;

    // --- ops reconcile (also the down-peer probe — first, useful payload) ---
    if (jobs.ops && Date.now() < deadline) {
        ranAny = true;
        runs.ops = now;
        try {
            const result = await reconcileMirrorsWithPeer(peer.id);
            if (result.peerUp) {
                await recordPeerSuccess(peer.id);
                await supabase.from('alliance_peers').update({ ops_synced_at: nowIso() }).eq('id', peer.id);
            }
            if (result.alert) { alerts.push(result.alert); allClean = false; }
            if (!result.ok) allClean = false;
            if (result.pulled > 0 || result.revoked > 0 || result.deferred > 0) {
                log.info('mirror reconcile', { peerId: peer.id, pulled: result.pulled, revoked: result.revoked, deferred: result.deferred });
            }
        } catch (e) {
            log.warn('mirror reconcile transport failure', { peerId: peer.id, err: e });
            await recordPeerFailure(peer.id).catch(() => undefined);
            transportFailed = true;
        }
    }

    // --- intel delta pull (health/cursor handled inside syncTrustedFeeds) ---
    if (jobs.intel && !transportFailed && Date.now() < deadline) {
        ranAny = true;
        runs.intel = now;
        try {
            const result = await syncTrustedFeeds(false, [peer.id]);
            if (result.skippedItems > 0) allClean = false; // its own sync_alert is set inside
            if (result.feedResults.some((r) => r.status === 'error')) allClean = false;
        } catch (e) {
            log.warn('intel sync failed', { peerId: peer.id, err: e });
            allClean = false;
        }
    }

    // --- directory refresh (slow lane) --------------------------------------
    if (jobs.directory && !transportFailed && Date.now() < deadline) {
        ranAny = true;
        try {
            await refreshPeerDirectory(peer.id);
            await recordPeerSuccess(peer.id);
        } catch (e) {
            log.warn('directory refresh transport failure', { peerId: peer.id, err: e });
            await recordPeerFailure(peer.id).catch(() => undefined);
            transportFailed = true;
        }
    }

    lastRun.set(peer.id, runs);

    // --- alerts: raise this pass's anomalies; clear only on a clean pass ----
    if (alerts.length > 0) {
        await setSyncAlert(peer.id, alerts.join(' ')).catch(() => undefined);
    } else if (ranAny && allClean && !transportFailed && peer.sync_alert) {
        await setSyncAlert(peer.id, null).catch(() => undefined);
    }

    // --- recovery: the host just came back — re-push our members' RSVPs -----
    if (wasDown && !transportFailed && ranAny) {
        await pushLocalRsvpsForPeer(peer.id).catch((e) => log.warn('rsvp recovery re-push failed', { peerId: peer.id, err: e }));
    }
}

/**
 * One engine tick (cron: every minute under the 'alliance_sync' lease).
 * Loads peers, computes due jobs, and processes them with bounded concurrency
 * inside the tick's wall-clock budget.
 */
export async function allianceSyncTick(): Promise<void> {
    const cfg = await getAllianceSyncConfig();
    if (!cfg.enabled) return;
    const deadline = Date.now() + TICK_BUDGET_MS;

    const { data: peerRows } = await supabase.from('alliance_peers')
        .select(PEER_SYNC_COLUMNS)
        .in('pairing_state', ['legacy', 'manual', 'active']);
    const peers = (peerRows ?? []) as unknown as SyncPeerRow[];
    if (peers.length === 0) return;

    // Directory due-times are column-backed (survive restarts; 6h cadence
    // shouldn't reset per deploy): one batch read of the cache timestamps.
    const allyIds = peers.filter(isActiveAlly).map((p) => p.id);
    const dirSyncedAt = new Map<string, string | null>();
    if (allyIds.length > 0) {
        const { data: cacheRows } = await supabase.from('alliance_peer_directory_cache')
            .select('peer_id, synced_at').in('peer_id', allyIds);
        for (const r of (cacheRows ?? []) as { peer_id: string; synced_at: string | null }[]) {
            dirSyncedAt.set(r.peer_id, r.synced_at);
        }
    }

    const now = Date.now();
    const opsCadence = cfg.opsPollMinutes * 60_000;
    const intelCadence = cfg.intelPollMinutes * 60_000;
    const dirCadence = cfg.directoryHours * 3_600_000;

    const work: Array<{ peer: SyncPeerRow; jobs: DueJobs }> = [];
    for (const peer of peers) {
        // Health gate: a down peer is skipped until its scheduled probe time
        // (inbound contact from the peer pulls that forward — see
        // noteInboundContact). Once the probe is due, the manifest reconcile
        // runs REGARDLESS of its cadence — it IS the probe.
        let probeDue = false;
        if (peer.sync_health === 'down') {
            if (peer.sync_next_attempt_at) {
                const next = new Date(peer.sync_next_attempt_at).getTime();
                if (Number.isFinite(next) && now < next) continue;
            }
            probeDue = true;
        }

        // First-sight initialization staggers initial runs across the cadence
        // window (deterministic per-peer phase offset).
        let runs = lastRun.get(peer.id);
        if (!runs) {
            runs = {
                ops: now - opsCadence + peerPhaseOffsetMs(peer.id, opsCadence),
                intel: now - intelCadence + peerPhaseOffsetMs(peer.id, intelCadence),
            };
            lastRun.set(peer.id, runs);
        }

        const ally = isActiveAlly(peer);
        const synced = dirSyncedAt.get(peer.id) ?? null;
        const syncedMs = synced ? new Date(synced).getTime() : NaN;
        const jobs: DueJobs = {
            ops: ally && (probeDue || now - runs.ops >= opsCadence),
            intel: wantsIntel(peer) && now - runs.intel >= intelCadence,
            directory: ally && (!Number.isFinite(syncedMs) || now - syncedMs >= dirCadence),
        };
        if (jobs.ops || jobs.intel || jobs.directory) work.push({ peer, jobs });
    }
    if (work.length === 0) return;

    // Bounded worker pool inside the tick budget; the remainder rolls over.
    const queue = [...work];
    await Promise.all(Array.from({ length: Math.min(PEER_CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0 && Date.now() < deadline) {
            const item = queue.shift();
            if (!item) break;
            await syncPeer(item.peer, item.jobs, deadline).catch((e) =>
                log.error('peer sync pass threw', { peerId: item.peer.id, err: e }));
        }
    }));
    if (queue.length > 0) log.info('tick budget exhausted, peers deferred', { deferred: queue.length });
}

/**
 * Admin "Sync now" (RPC alliance:force_sync, alliance:manage): run every
 * applicable job for one peer immediately. Bucket-gated like everything else
 * + a per-peer cooldown so a spamming admin can't exceed the peer's budget.
 * Keeps the delta cursor (no full re-pull) — "sync now", not "re-import".
 */
export async function forceSyncPeer(peerId: string): Promise<{ ok: boolean; message: string }> {
    const last = lastForceSync.get(peerId) ?? 0;
    if (Date.now() - last < FORCE_SYNC_COOLDOWN_MS) {
        return { ok: false, message: 'Sync already requested — wait a moment before retrying.' };
    }
    lastForceSync.set(peerId, Date.now());

    const { data } = await supabase.from('alliance_peers')
        .select(PEER_SYNC_COLUMNS).eq('id', peerId).maybeSingle();
    const peer = data as unknown as SyncPeerRow | null;
    if (!peer) return { ok: false, message: 'Peer not found.' };

    // Force-sync is the operator override: clear the stale alert first; the
    // pass below re-raises anything still wrong.
    await setSyncAlert(peerId, null).catch(() => undefined);

    const jobs: DueJobs = {
        ops: isActiveAlly(peer),
        intel: wantsIntel(peer),
        directory: isActiveAlly(peer),
    };
    if (!jobs.ops && !jobs.intel && !jobs.directory) {
        return { ok: false, message: 'Nothing to sync for this peer (no enabled channels).' };
    }
    const deadline = Date.now() + TICK_BUDGET_MS;
    await syncPeer(peer, jobs, deadline);
    broadcastToOrg('alliance_update', { id: peerId });
    return { ok: true, message: 'Sync completed.' };
}

/** TEST ONLY: reset the engine's in-process scheduling state. */
export function __resetAllianceSyncEngineForTests(): void {
    lastRun.clear();
    lastForceSync.clear();
}
