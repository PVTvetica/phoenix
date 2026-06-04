

import { WarrantStatus, HydratedIntelligenceReport, IntelBulletin,
    IntelSubjectType, IntelThreatLevel, DossierData, WarrantNote
} from '../../types.js';
import { supabase, handleSupabaseError, safeFetch, broadcastToOrg } from './common.js';
import { requireUuid } from '../pgrest.js';
import { stripHtml, stripHtmlSingleLine } from '../textSanitize.js';
import { toHydratedWarrant, toHydratedIntelReport, toIntelBulletin, toMiniUser } from './mappers.js';
import { verifyApiKey, getPublicFeedData } from './system.js';
import { log as baseLog } from '../log.js';
import { sanitizePublicLinkUrl } from '../linkUrl.js';
import { decryptSecret } from '../crypto.js';
import { filterByClearance, canViewAllClassifications, passesClearance, type ClearanceUser } from '../clearance.js';
import { assertResolvesToPublicHost } from '../ssrf.js';
import type { Tables } from './rows.js';
export { toHydratedWarrant, toHydratedIntelReport, toIntelBulletin };

type IntelReportRow = Parameters<typeof toHydratedIntelReport>[0];
type IntelBulletinRow = Parameters<typeof toIntelBulletin>[0];
type WarrantNoteRow = Tables<'warrant_notes'> & { author?: Parameters<typeof toMiniUser>[0] };

const log = baseLog.child({ module: 'db.intel' });

// --- CLEARANCE / LIMITING-MARKER FILTER (SECURITY H3) ----------------------
// Intel report/bulletin bodies carry a classificationLevel + limitingMarkers.
// Previously filtering was deferred to the client (cosmetic), so any intel:view
// holder received above-clearance / marker-restricted bodies in the HTTP
// response. Enforce it server-side via the shared clearance util. intel:manage
// holders (and Admins) see all classifications.
export function filterIntelByClearance<T extends { classificationLevel?: number | null; limitingMarkers?: unknown[] }>(
    items: T[],
    user?: ClearanceUser | null,
): T[] {
    return filterByClearance(items, user, ['intel:manage']);
}

/** Warrant emits carry the affected id(s) so clients refetch one row
 *  (warrant_slice) instead of the whole 200-row list. Id-only payloads —
 *  the db-changes channel is anon-readable (H4). */
function broadcastWarrantUpdate(payload?: { warrantId?: string; warrantIds?: string[] }) {
    broadcastToOrg('warrant_update', payload ?? {});
}

/** Intel emits carry a kind discriminator:
 *  - 'report': intel_reports changed → clients refetch the aggregate
 *    index/stats (intel_summary) + bump the paginated-feed version;
 *  - 'dossier': only a cached dossier summary changed (RPC-fetched on
 *    demand) → clients skip the refetch entirely.
 *  Kind-less payloads fall back to the full 'intel' refetch. */
function broadcastIntelUpdate(payload?: { kind: 'report' | 'dossier'; targetId?: string }) {
    broadcastToOrg('intel_update', payload ?? {});
}

// --- WARRANTS ---

export async function createWarrant(payload: Record<string, unknown>, userId?: number) {
    const targetRsiHandle = payload.targetRsiHandle as string;
    const reason = payload.reason as string;
    const issuer = userId || (payload.issuedById as number | undefined);
    // .select('id') captures the new row id for the slice broadcast below.
    const { data: created, error } = await supabase.from('warrants').insert({
        target_rsi_handle: targetRsiHandle,
        reason: reason,
        action: payload.action as string | undefined,
        uec_reward: payload.uecReward as number | undefined,
        status: payload.status as string | undefined,
        issued_by: issuer,
        notes: payload.notes as string | undefined
    }).select('id').single();

    handleSupabaseError({ error, message: 'Failed to create warrant' });

    if (payload.autoFileReport) {
        try {
            await createIntelReport({
                targetId: targetRsiHandle,
                subjectType: 'Person',
                threatLevel: 'High',
                tags: ['Caution Note'],
                summary: `[AUTOMATED REPORT FROM CAUTION NOTE] ${reason}`,
                evidenceUrls: [],
                createdById: issuer,
                classificationLevel: 0
            });
        } catch (err) {
            log.error('auto-file intel report for warrant failed', { targetRsiHandle, err });
        }
    }
    await broadcastWarrantUpdate(created?.id ? { warrantId: created.id } : undefined);
}

export async function updateWarrant(id: string, updates: Record<string, unknown>) {
    const inner = (updates.updates ?? {}) as {
        targetRsiHandle?: string;
        reason?: string;
        action?: string;
        uecReward?: number;
        status?: string;
        notes?: string;
    };
    const dbUpdates: Record<string, unknown> = { target_rsi_handle: inner.targetRsiHandle, reason: inner.reason, action: inner.action, uec_reward: inner.uecReward, status: inner.status, notes: inner.notes, updated_at: new Date().toISOString() };
    if (inner.status === WarrantStatus.Claimed) { dbUpdates.claimed_by = updates.claimedById as number | undefined; dbUpdates.claimed_at = new Date().toISOString(); }
    else if (inner.status === WarrantStatus.Active) { dbUpdates.claimed_by = null; dbUpdates.claimed_at = null; }

    const { error } = await supabase.from('warrants').update(dbUpdates)
        .eq('id', id)
        ;
    handleSupabaseError({ error, message: 'Failed to update warrant' });
    await broadcastWarrantUpdate({ warrantId: id });
}

export async function deleteWarrant(warrantId: string) {
    const { error = null } = await supabase.from('warrants').delete()
        .eq('id', warrantId)
        ;
    handleSupabaseError({ error, message: 'Failed to delete warrant' });
    await broadcastWarrantUpdate({ warrantId });
}

export async function bulkDeleteWarrants(warrantIds: string[]) {
    await supabase.from('warrants').delete()
        .in('id', warrantIds)
        ;
    await broadcastWarrantUpdate({ warrantIds });
}

/** List-row select for warrants — shared by getWarrantsState (lib/db.ts) and
 *  the warrant_slice single-row fetch so the two shapes can never drift. */
export const WARRANT_SELECT = '*, issuedBy:users!warrants_issued_by_fkey(id, name, avatar_url, role_id), claimedBy:users!warrants_claimed_by_fkey(id, name, avatar_url), feed:alliance_peers(id, label)';

/**
 * Single-warrant fetch in the LIST row shape. Backs the realtime
 * `warrant_slice` query subset: warrant_update broadcasts carry the
 * warrantId(s) and the client refetches ONLY those rows. Returns null when
 * absent (deleted → client removes the row). THROWS on query errors so a
 * transient DB blip can never masquerade as "warrant deleted".
 */
export async function getWarrantByIdHydrated(warrantId: string) {
    const { data, error } = await supabase.from('warrants')
        .select(WARRANT_SELECT)
        .eq('id', warrantId)
        .maybeSingle();
    handleSupabaseError({ error, message: 'Failed to get warrant slice' });
    return data ? toHydratedWarrant(data) : null;
}

// --- WARRANT NOTES (#11: append-only thread) ---
// Each call appends a new row to warrant_notes and mirrors the latest content
// onto warrants.notes so existing list-view callers (which only read the
// cached column) continue to work without changes. PG 42P01 (table missing)
// triggers a soft-fail with a warning so DBs that haven't run
// migrations/add-warrant-notes.sql still let warrants update.

export async function addWarrantNote(warrantId: string, content: string, authorId: number) {
    const trimmed = (content || '').trim();
    if (!trimmed) throw new Error('Warrant note content is required');

    // Verify the warrant exists before inserting.
    const { count } = await supabase
        .from('warrants')
        .select('id', { count: 'exact', head: true })
        .eq('id', warrantId)
        ;
    if (!count) throw new Error('Warrant not found');

    const { error } = await supabase.from('warrant_notes').insert({
        warrant_id: warrantId,
        author_id: authorId,
        content: trimmed,
    });
    if (error?.code === '42P01') {
        // Table doesn't exist yet — log and continue without the thread row.
        // The legacy notes column update below still happens.
        log.warn('warrant_notes table missing — note saved to legacy column only; run migrations/add-warrant-notes.sql', { warrantId });
    } else {
        handleSupabaseError({ error, message: 'Failed to add warrant note' });
    }

    await supabase.from('warrants').update({
        notes: trimmed,
        updated_at: new Date().toISOString(),
    }).eq('id', warrantId);

    await broadcastWarrantUpdate({ warrantId });
}

export async function getWarrantNotes(warrantId: string): Promise<WarrantNote[]> {
    // Confirm the warrant exists before disclosing notes.
    const { count } = await supabase
        .from('warrants')
        .select('id', { count: 'exact', head: true })
        .eq('id', warrantId)
        ;
    if (!count) return [];

    const { data, error } = await supabase
        .from('warrant_notes')
        .select('*, author:users!warrant_notes_author_id_fkey(id, name, avatar_url, role_id)')
        .eq('warrant_id', warrantId)
        .order('created_at', { ascending: false });
    if (error?.code === '42P01') {
        // Pre-migration tenant — return empty thread; UI shows the legacy
        // notes from the warrant row itself.
        return [];
    }
    handleSupabaseError({ error, message: 'Failed to load warrant notes' });
    return ((data || []) as unknown as WarrantNoteRow[]).map((row) => ({
        id: row.id,
        warrantId: row.warrant_id,
        authorId: row.author_id ?? null,
        content: row.content,
        createdAt: row.created_at,
        author: row.author ? toMiniUser(row.author) : undefined,
    }));
}

export async function generateReportFromWarrant(warrantId: string, userId: number) {
    const { data: warrant } = await supabase.from('warrants').select('*')
        .eq('id', warrantId)

        .single();
    if (warrant) {
        await createIntelReport({
            targetId: warrant.target_rsi_handle,
            subjectType: 'Person',
            threatLevel: 'High',
            tags: ['Caution Note'],
            summary: `[AUTOMATED REPORT FROM CAUTION NOTE] ${warrant.reason}`,
            evidenceUrls: [],
            createdById: userId,
            classificationLevel: 0
        });
    }
}

// --- INTEL & DOSSIERS ---

export async function createIntelReport(reportData: Record<string, unknown>) {
    const markerIds = reportData.markerIds as number[] | undefined;
    const { data, error } = await supabase.from('intel_reports').insert({
        target_id: stripHtmlSingleLine(reportData.targetId as string, 200),
        subject_type: reportData.subjectType as string | undefined,
        threat_level: (reportData.threat_level as string | undefined) || (reportData.threatLevel as string | undefined),
        tags: reportData.tags as string[] | undefined,
        summary: stripHtml(reportData.summary as string | undefined, 8000),
        evidence_urls: reportData.evidenceUrls as string[] | undefined,
        created_by_id: reportData.createdById as number | null | undefined,
        affiliated_org: stripHtmlSingleLine(reportData.affiliatedOrg as string | undefined, 200) || null,
        classification_level: (reportData.classificationLevel as number | undefined) || 0
    }).select().single();

    handleSupabaseError({ error, message: 'Failed to create intel report' });

    if (data && markerIds && markerIds.length > 0) {
        // Verify the supplied marker IDs all belong to this org — without it,
        // a caller could attach another tenant's marker definitions to their
        // own report.
        const { data: validMarkers } = await supabase.from('security_limiting_markers')
            .select('id')
            .in('id', markerIds)
            ;
        if (!validMarkers || validMarkers.length !== markerIds.length) {
            throw new Error('One or more limiting markers are not valid for this organization.');
        }
        const markers = markerIds.map((mid) => ({ report_id: data.id, marker_id: mid }));
        await supabase.from('intel_report_limiting_markers').insert(markers);
    }
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function updateIntelReport(id: string, updates: Record<string, unknown>) {
    // Verify existence before any mutation.
    const { data: existing } = await supabase.from('intel_reports').select('id')
        .eq('id', id)

        .maybeSingle();
    if (!existing) throw new Error('Intel report not found');

    const markerIds = updates.markerIds as number[] | undefined;
    const { error } = await supabase.from('intel_reports').update({
        threat_level: updates.threatLevel as string | undefined,
        tags: updates.tags as string[] | undefined,
        summary: stripHtml(updates.summary, 8000),
        evidence_urls: updates.evidenceUrls as string[] | undefined,
        subject_type: updates.subjectType as string | undefined,
        affiliated_org: stripHtmlSingleLine(updates.affiliatedOrg, 200) || null,
        classification_level: (updates.classificationLevel as number | undefined) || 0
    }).eq('id', id);
    handleSupabaseError({ error, message: 'Failed to update intel report' });

    await supabase.from('intel_report_limiting_markers').delete().eq('report_id', id);
    if (markerIds && markerIds.length > 0) {
        const markers = markerIds.map((mid) => ({ report_id: id, marker_id: mid }));
        await supabase.from('intel_report_limiting_markers').insert(markers);
    }
    await broadcastIntelUpdate({ kind: 'report' });
}

// Optimized: Fetch basic user data for creator
export async function getIntelReportsForTarget(targetId: string): Promise<HydratedIntelligenceReport[]> {
    let query = supabase.from('intel_reports')
        .select('*, createdBy:users!intel_reports_created_by_id_fkey(id, name, avatar_url, role_id), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .ilike('target_id', targetId);

    query = query.order('created_at', { ascending: false });
    const data = await safeFetch<IntelReportRow[]>(query, [], 'Failed to get reports');
    return data.map(toHydratedIntelReport);
}

export async function getDossier(targetId: string): Promise<DossierData> {
    const userQuery = supabase.from('users').select('id').ilike('rsi_handle', targetId);
    const { data: targetUser } = await userQuery.maybeSingle();
    const targetUserId = targetUser?.id;

    // 1. Determine Subject Type by looking at latest reports
    const latestQuery = supabase.from('intel_reports')
        .select('subject_type')
        .ilike('target_id', targetId)
        .order('created_at', { ascending: false })
        .limit(1);
    const { data: latestReport } = await latestQuery.maybeSingle();

    const isOrg = latestReport?.subject_type === IntelSubjectType.Organization;

    // 2. Identify and fetch report data based on type
    let reportsQuery = supabase.from('intel_reports')
        .select('*, createdBy:users!intel_reports_created_by_id_fkey(id, name, avatar_url, role_id), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .order('created_at', { ascending: false });

    const affiliates: { targetId: string, threatLevel: IntelThreatLevel, lastReportedAt: string }[] = [];
    // Declared at outer scope so the post-branch org-report merge can see it.
    const orgSet = new Set<string>();

    if (isOrg) {
        // --- ORGANIZATION DOSSIER ---
        // Fetch reports for the Org
        reportsQuery = reportsQuery.ilike('target_id', targetId);

        // Populate affiliates with unique people in this org
        const membersQuery = supabase.from('intel_reports')
            .select('target_id, threat_level, created_at')
            .ilike('affiliated_org', targetId)
            .order('created_at', { ascending: false });
        const { data: members } = await membersQuery;

        const memberMap = new Map<string, { targetId: string; threatLevel: IntelThreatLevel; lastReportedAt: string }>();
        members?.forEach(m => {
            const handle = m.target_id.toLowerCase();
            if (!memberMap.has(handle)) {
                memberMap.set(handle, {
                    targetId: m.target_id,
                    threatLevel: m.threat_level as IntelThreatLevel,
                    lastReportedAt: m.created_at
                });
            }
        });
        affiliates.push(...memberMap.values());

    } else {
        // --- PERSON DOSSIER ---
        // Identify organization affiliation from their reports
        const primaryQuery = supabase.from('intel_reports')
            .select('affiliated_org, threat_level, created_at')
            .ilike('target_id', targetId);
        const { data: primaryReports } = await primaryQuery;

        const orgMetaMap = new Map<string, { level: IntelThreatLevel, date: string }>();

        primaryReports?.forEach(r => {
            if (r.affiliated_org) {
                const org = r.affiliated_org.toUpperCase();
                orgSet.add(org);
                if (!orgMetaMap.has(org) || new Date(r.created_at) > new Date(orgMetaMap.get(org)!.date)) {
                    orgMetaMap.set(org, { level: r.threat_level as IntelThreatLevel, date: r.created_at });
                }
            }
        });

        // Combined Feed: Target reports + Org reports.
        // Use parameterized .ilike() (Supabase escapes the value) for the primary target.
        // Org-affiliated reports are fetched via a parallel query below and merged —
        // the previous .or() with sanitized string interpolation was fragile.
        reportsQuery = reportsQuery.ilike('target_id', targetId);

        // Affiliates are the Orgs they belong to
        orgMetaMap.forEach((meta, name) => {
            affiliates.push({
                targetId: name,
                threatLevel: meta.level,
                lastReportedAt: meta.date
            });
        });
    }

    // For PERSON dossiers, also fetch reports where target_id matches any of the
    // person's affiliated orgs. One parameterized .ilike per org — safe against
    // filter-syntax injection, and case-insensitive like the original behavior.
    const orgReportPromises: Promise<IntelReportRow[]>[] = [];
    if (!isOrg) {
        for (const orgName of orgSet) {
            const q = supabase.from('intel_reports')
                .select('*, createdBy:users!intel_reports_created_by_id_fkey(id, name, avatar_url, role_id), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))')
                .ilike('target_id', orgName);
            orgReportPromises.push(safeFetch<IntelReportRow[]>(q, [], 'Failed to get org-affiliated reports'));
        }
    }

    const opsQuery = targetUserId
        ? safeFetch((() => {
            const q = supabase.from('operations').select('id, name, status, type, description, created_at, participants:operation_participants!inner(user_id)').eq('participants.user_id', targetUserId);
            return q;
        })(), [], 'Failed to get operations')
        : Promise.resolve([]);

    // Build org-scoped warrant query
    const warrantQuery = supabase.from('warrants').select('*, issuedBy:users!warrants_issued_by_fkey(id, name, avatar_url, role_id), claimedBy:users!warrants_claimed_by_fkey(id, name, avatar_url, role_id), feed:alliance_peers(id, label)').ilike('target_rsi_handle', targetId);

    // Build org-scoped requests query
    const requestsQuery = supabase.from('service_requests').select('id, client_id, unregistered_client_rsi_handle, service_type, location, description, status, urgency, threat_level, created_at, updated_at').ilike('unregistered_client_rsi_handle', targetId);

    // Build org-scoped summary query
    const summaryQuery = supabase.from('dossier_summaries').select('summary, generated_at').eq('target_id', targetId);

    const [reports, warrants, requests, opsData, summary, orgReportArrays] = await Promise.all([
        safeFetch(reportsQuery, [], 'Failed to get reports'),
        isOrg ? Promise.resolve([]) : safeFetch(warrantQuery, [], 'Failed to get warrants'),
        isOrg ? Promise.resolve([]) : safeFetch(requestsQuery, [], 'Failed to get requests'),
        isOrg ? Promise.resolve([]) : opsQuery,
        safeFetch<{ summary: string, generated_at: string } | null>(summaryQuery.maybeSingle(), null, 'Failed to get summary'),
        Promise.all(orgReportPromises),
    ]);

    // Merge org-affiliated reports into primary reports (dedupe by id).
    const mergedReports: IntelReportRow[] = reports as unknown as IntelReportRow[];
    if (orgReportArrays.length > 0) {
        const seen = new Set<string>((mergedReports || []).map((r) => r.id));
        for (const batch of orgReportArrays) {
            for (const r of batch) {
                if (!seen.has(r.id)) {
                    seen.add(r.id);
                    mergedReports.push(r);
                }
            }
        }
        mergedReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // Map raw service_request rows to camelCase for the frontend
    const mappedRequests = isOrg ? [] : ((requests || []) as unknown as Tables<'service_requests'>[]).map((r) => ({
        id: r.id,
        clientId: r.client_id,
        unregisteredClientRsiHandle: r.unregistered_client_rsi_handle,
        serviceType: r.service_type,
        location: r.location,
        description: r.description,
        status: r.status,
        urgency: r.urgency,
        threatLevel: r.threat_level,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        statusHistory: []
    }));

    // Map operations from the query result
    const mappedOperations = ((opsData || []) as unknown as Tables<'operations'>[]).map((op) => ({
        id: op.id,
        name: op.name,
        status: op.status,
        type: op.type,
        description: op.description,
        createdAt: op.created_at
    }));

    return {
        targetId,
        reports: (mergedReports || []).map(toHydratedIntelReport),
        warrants: (warrants || []).map(toHydratedWarrant),
        requests: mappedRequests,
        operations: mappedOperations,
        affiliates: affiliates,
        cachedSummary: summary?.summary,
        cachedSummaryDate: summary?.generated_at
    };
}

/**
 * Small fixed-page widget endpoint exposed via `intel:get_recent`.
 * The hub uses {@link listIntelReports} for cursor-paginated browsing —
 * do NOT use this function to back a "show all" UI; it caps at 50 rows.
 */
export async function getRecentIntelReports(subjectType?: string, limit = 50): Promise<HydratedIntelligenceReport[]> {
    let query = supabase.from('intel_reports')
        .select('*, createdBy:users!intel_reports_created_by_id_fkey(id, name), feed:alliance_peers(label), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))');

    const cappedLimit = Math.min(Math.max(1, limit), 100);
    query = query.order('created_at', { ascending: false })
        .limit(cappedLimit);
    if (subjectType) query = query.eq('subject_type', subjectType);
    const data = await safeFetch<IntelReportRow[]>(query, [], 'Failed to get recent intel');
    return data.map(toHydratedIntelReport);
}

const INTEL_REPORT_SELECT = '*, createdBy:users!intel_reports_created_by_id_fkey(id, name, avatar_url, role_id), feed:alliance_peers(label), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))';

const THREAT_RANK: Record<string, number> = {
    [IntelThreatLevel.Critical]: 4,
    [IntelThreatLevel.High]: 3,
    [IntelThreatLevel.Medium]: 2,
    [IntelThreatLevel.Low]: 1,
    [IntelThreatLevel.None]: 0,
};

export interface ListIntelReportsArgs {
    limit?: number;
    cursor?: string | null;
    threatLevel?: IntelThreatLevel;
    subjectType?: IntelSubjectType;
    tag?: string;
    warrantsOnly?: boolean;
    q?: string;
}

export interface ListIntelReportsResult {
    items: HydratedIntelligenceReport[];
    nextCursor: string | null;
    hasMore: boolean;
}

function encodeIntelCursor(createdAt: string, id: string): string {
    return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

function decodeIntelCursor(cursor: string | null | undefined): { createdAt: string; id: string } | null {
    if (!cursor || typeof cursor !== 'string') return null;
    try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
        const idx = decoded.indexOf('|');
        if (idx < 0) return null;
        const createdAt = decoded.slice(0, idx);
        const id = decoded.slice(idx + 1);
        if (!createdAt || !id) return null;
        // Light validation — must look like an ISO date.
        if (Number.isNaN(Date.parse(createdAt))) return null;
        return { createdAt, id };
    } catch {
        return null;
    }
}

/**
 * Cursor-paginated intel feed for the hub. Server-side filters and search;
 * keyset pagination on (created_at DESC, id DESC) — backed by
 * idx_intel_reports_org_created_id (migrations/add-intel-pagination-index.sql).
 *
 * Clearance filtering is intentionally NOT applied here — the caller (UI)
 * filters page-by-page using each user's clearance/markers. Stripping
 * server-side would require per-user join logic and complicate the cursor.
 */
export async function listIntelReports(args: ListIntelReportsArgs): Promise<ListIntelReportsResult> {
    const limit = Math.min(Math.max(1, args.limit ?? 50), 100);
    const fetchSize = limit + 1;
    const cursor = decodeIntelCursor(args.cursor);
    const hasSearch = typeof args.q === 'string' && args.q.trim().length > 0;

    // warrantsOnly: pre-resolve active warrant target handles for this org
    // and short-circuit if there are none (avoids `IN ()` quirk in PostgREST).
    let warrantTargets: string[] | null = null;
    if (args.warrantsOnly === true) {
        const { data: warrantRows } = await supabase.from('warrants')
            .select('target_rsi_handle')
            
            .in('status', [WarrantStatus.Active, WarrantStatus.Standing]);
        const set = new Set<string>();
        for (const row of (warrantRows || [])) {
            if (row?.target_rsi_handle) set.add(String(row.target_rsi_handle).toLowerCase());
        }
        warrantTargets = Array.from(set);
        if (warrantTargets.length === 0) {
            return { items: [], nextCursor: null, hasMore: false };
        }
    }

    let query = supabase.from('intel_reports')
        .select(INTEL_REPORT_SELECT)
        
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

    // --- Filters (always ANDed, safe to chain on top of .or()) ---
    if (args.threatLevel) query = query.eq('threat_level', args.threatLevel);
    if (args.subjectType) query = query.eq('subject_type', args.subjectType);
    if (args.tag) query = query.contains('tags', [args.tag]);
    if (warrantTargets) query = query.in('target_id', warrantTargets);

    // --- Search disjunction (re-uses safe regex from searchIntelReports) ---
    if (hasSearch) {
        const safeQuery = String(args.q)
            .replace(/[^a-zA-Z0-9 _-]/g, '')
            .trim()
            .slice(0, 100);
        if (!safeQuery) {
            // Search collapsed to empty after sanitize → return empty (caller asked for q).
            return { items: [], nextCursor: null, hasMore: false };
        }
        query = query.or(`target_id.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,tags.cs.{${safeQuery}}`);
    }

    // --- Cursor ---
    // No-search: use proper keyset .or() predicate. Search: .or() is consumed,
    // fall back to inclusive .lte() + JS-side discard of the boundary id.
    let overscan = 0;
    if (cursor) {
        // Harden against PostgREST .or() filter injection: the cursor fields are
        // interpolated into the keyset predicate below, so validate them strictly.
        // intel_reports.id is a UUID; created_at is an ISO timestamp.
        requireUuid(cursor.id);
        if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:?\d{2}|Z)?$/.test(String(cursor.createdAt))) {
            throw new Error('Invalid cursor timestamp');
        }
        if (hasSearch) {
            query = query.lte('created_at', cursor.createdAt);
            overscan = 5;
        } else {
            query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
        }
    }

    query = query.limit(fetchSize + overscan);

    const data = await safeFetch<IntelReportRow[]>(query, [], 'Failed to list intel reports');
    let rows = data || [];

    // Drop boundary rows when the search-cursor path was used.
    if (cursor && hasSearch) {
        rows = rows.filter((r) => {
            if (r.created_at < cursor.createdAt) return true;
            if (r.created_at === cursor.createdAt && String(r.id) < cursor.id) return true;
            return false;
        });
    }

    const hasMore = rows.length > limit;
    if (hasMore) rows = rows.slice(0, limit);

    const items = rows.map(toHydratedIntelReport);
    const last = rows[rows.length - 1];
    const nextCursor = hasMore && last ? encodeIntelCursor(last.created_at, String(last.id)) : null;

    return { items, nextCursor, hasMore };
}

export interface IntelHubStats {
    totalReports: number;
    criticalCount: number;   // threat_level IN ('Critical','High')
    recentCount7d: number;
}

/**
 * Aggregate intel counters for the hub hero stats. Org-wide; not clearance-filtered
 * (today's pre-fix UI numbers weren't either, and a clearance-aware count would
 * require a per-user join over every report — too expensive on the hot read path).
 */
export async function getIntelHubStats(user?: ClearanceUser | null): Promise<IntelHubStats> {
    // SECURITY: counts are clearance-ceilinged — a low-clearance viewer's
    // stats must not include reports they cannot read (the count itself
    // reveals classified activity volume). Admin / intel:manage see all.
    const maxLevel = canViewAllClassifications(user, ['intel:manage'])
        ? null
        : (user?.clearanceLevel?.level ?? 0);
    const base = () => {
        let q = supabase.from('intel_reports').select('id', { count: 'exact', head: true });
        if (maxLevel !== null) q = q.lte('classification_level', maxLevel);
        return q;
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [totalRes, criticalRes, recentRes] = await Promise.all([
        base(),
        base().in('threat_level', [IntelThreatLevel.Critical, IntelThreatLevel.High]),
        base().gte('created_at', sevenDaysAgo),
    ]);
    return {
        totalReports: totalRes.count ?? 0,
        criticalCount: criticalRes.count ?? 0,
        recentCount7d: recentRes.count ?? 0,
    };
}

export interface IntelTargetIndexEntry {
    targetId: string;
    threatLevel: IntelThreatLevel;
}

/**
 * One entry per distinct target_id (case-insensitive), holding the highest
 * known threat level seen for that target. Powers cross-component lookups
 * (e.g. RequestCard's threat pill) without shipping the full report set.
 *
 * Scans the newest 20K rows — covers practically every active target without
 * an RPC. Result deduped + capped at 5000 entries (warns if truncated).
 */
export async function getIntelTargetIndex(user?: ClearanceUser | null): Promise<IntelTargetIndexEntry[]> {
    // SECURITY: the index reveals WHICH targets are under surveillance and at
    // what threat level — the exact metadata the clearance system
    // compartmentalises. A viewer must only see index entries derived from
    // reports they could read: classification ceiling in SQL, limiting-marker
    // exclusion per row below. Admin / intel:manage see the full index.
    const seeAll = canViewAllClassifications(user, ['intel:manage']);
    let query = supabase.from('intel_reports')
        .select('target_id, threat_level, classification_level, intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .order('created_at', { ascending: false })
        .limit(20000);
    if (!seeAll) {
        query = query.lte('classification_level', user?.clearanceLevel?.level ?? 0);
    }
    const { data } = await query;

    const best = new Map<string, IntelTargetIndexEntry>();
    for (const row of (data || []) as Array<{ target_id?: string; threat_level?: string; classification_level?: number | null; intel_report_limiting_markers?: Array<{ marker?: unknown }> | null }>) {
        const targetId = String(row?.target_id || '').trim();
        if (!targetId) continue;
        if (!seeAll) {
            const markers = (row.intel_report_limiting_markers || []).map((m) => m.marker).filter(Boolean);
            if (!passesClearance(user, row.classification_level ?? 0, markers, ['intel:manage'])) continue;
        }
        const threat = String(row?.threat_level || IntelThreatLevel.None) as IntelThreatLevel;
        if (threat === IntelThreatLevel.None) continue;
        const key = targetId.toLowerCase();
        const existing = best.get(key);
        if (!existing || (THREAT_RANK[threat] ?? 0) > (THREAT_RANK[existing.threatLevel] ?? 0)) {
            best.set(key, { targetId, threatLevel: threat });
        }
    }

    const entries = Array.from(best.values());
    if (entries.length > 5000) {
        log.warn('intel target index truncated to 5000', { distinctTargets: entries.length });
        return entries.slice(0, 5000);
    }
    return entries;
}

// NOTE: getIntelAnalytics / the 'intel:get_top_entities' action were removed —
// they called a Postgres RPC (get_intel_analytics) that does not exist in
// schema.sql and had no client caller (schema↔app drift cleanup). Re-add the
// action AND the function together if an intel-analytics widget is built.

export async function updateIntelAffiliation(targetId: string, affiliatedOrg: string) {
    const { error } = await supabase.from('intel_reports').update({ affiliated_org: affiliatedOrg })
        .ilike('target_id', targetId)
        ;
    handleSupabaseError({ error, message: 'Failed to update affiliation' });
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function bulkUpdateIntelAffiliation(reportIds: string[], affiliatedOrg: string) {
    const { error = null } = await supabase.from('intel_reports').update({ affiliated_org: affiliatedOrg })
        .in('id', reportIds)
        ;
    handleSupabaseError({ error, message: 'Bulk update failed' });
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function bulkAddIntelTags(reportIds: string[], tags: string[]) {
    if (!reportIds.length) return;
    // Batched: one read of all rows' current tags, then concurrent per-row writes.
    // Tags differ per row (merge+dedupe against each row's existing set) so a single
    // bulk UPDATE can't be used — but this collapses 2N sequential round-trips to
    // 1 read + N parallel writes. Missing ids are simply absent from the read
    // (matches the old `if (!data) continue` skip).
    const { data: rows } = await supabase.from('intel_reports').select('id, tags').in('id', reportIds);
    await Promise.all((rows || []).map((row) => {
        const newTags = Array.from(new Set([...(row.tags || []), ...tags]));
        return supabase.from('intel_reports').update({ tags: newTags }).eq('id', row.id);
    }));
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function bulkDeleteIntelReports(reportIds: string[]) {
    await supabase.from('intel_reports').delete()
        .in('id', reportIds)
        ;
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function deleteIntelReport(id: string) {
    await supabase.from('intel_reports').delete()
        .eq('id', id)
        ;
    await broadcastIntelUpdate({ kind: 'report' });
}

export async function searchIntelReports(query: string, subjectType?: string): Promise<HydratedIntelligenceReport[]> {
    // Strict allowlist: alphanumerics, space, underscore, hyphen. Anything else
    // could let a crafted query break out of the PostgREST filter string and
    // inject extra OR conditions (e.g. `}},target_id.eq.<victim>`).
    const safeQuery = (typeof query === 'string' ? query : '')
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .trim()
        .slice(0, 100);
    if (!safeQuery) return [];
    let q = supabase.from('intel_reports')
        .select('*, createdBy:users!intel_reports_created_by_id_fkey(id, name, avatar_url, role_id), feed:alliance_peers(label), intel_report_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .or(`target_id.ilike.%${safeQuery}%,summary.ilike.%${safeQuery}%,tags.cs.{${safeQuery}}`);
    if (subjectType) q = q.eq('subject_type', subjectType);
    const { data } = await q.limit(50);
    return (data || []).map(toHydratedIntelReport);
}

export async function getIntelStats() {
    const reportsQuery = supabase.from('intel_reports').select('threat_level');
    const warrantsQuery = supabase.from('warrants').select('id').eq('status', 'Active');
    const [{ data: reports }, { data: warrants }] = await Promise.all([reportsQuery, warrantsQuery]);

    return {
        totalReports: reports?.length || 0,
        activeWarrants: warrants?.length || 0,
        threatBreakdown: (reports || []).reduce((acc: Record<string, number>, curr: { threat_level: string }) => {
            acc[curr.threat_level] = (acc[curr.threat_level] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    };
}

const normalizeString = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

// Loose shape of a remote/local trusted-feed sync payload. Fields are best-effort
// — feeds come from external servers, so everything is optional and validated
// at the point of use before being persisted.
interface FeedSyncMeta {
    reportsExcludedByClearance?: number;
    reportsExcludedByMarker?: number;
    totalReportsBeforeFilter?: number;
    maxShareableLevel?: number;
}
interface FeedReportItem {
    id?: string;
    target_id?: string;
    summary?: string;
    subject_type?: string;
    threat_level?: string;
    tags?: string[];
    affiliated_org?: string;
    created_at?: string;
    classification_level?: number;
    limiting_markers?: string[];
}
interface FeedWarrantItem {
    id?: string;
    target_rsi_handle?: string;
    reason?: string;
    action?: string;
    uec_reward?: number;
    status?: string;
    created_at?: string;
    issued_at?: string;
}
interface FeedBulletinItem {
    title?: string;
    body?: string;
    threat_level?: string;
    location?: string | null;
    expires_at?: string;
    duration_minutes?: number;
    classification_level?: number;
    created_at?: string;
}
interface FeedSyncData {
    countReports?: number;
    countWarrants?: number;
    countBulletins?: number;
    reports?: FeedReportItem[];
    warrants?: FeedWarrantItem[];
    bulletins?: FeedBulletinItem[];
    _meta?: FeedSyncMeta;
}

export async function syncTrustedFeeds(adminId?: number, force?: boolean) {
    // Intel feeds are alliance_peers rows discriminated by pairing_state. Map them
    // back to the legacy feed shape this routine expects (api_key decrypted).
    // Feed sources are alliance_peers rows: 'legacy'/'manual' = one-directional
    // intel subscriptions (pull via /api/intel/feed); 'active' = handshake-paired
    // allies whose enabled channels we pull via /api/alliance/data. Channels are an
    // explicit opt-in (=== true), so a freshly-paired ally shares nothing until the
    // admin enables a channel.
    const feedQuery = supabase.from('alliance_peers').select('*').in('pairing_state', ['legacy', 'manual', 'active']);
    const { data: feedRows, error: feedError } = await feedQuery;
    interface FeedPeerRow {
        id: string; label: string; base_url: string; outbound_key_enc: string | null;
        last_contact_at: string | null; inbound_max_clearance: number | null;
        pairing_state: string;
        channels: { reports?: boolean; warrants?: boolean; bulletins?: boolean } | null;
    }
    const feeds = ((feedRows || []) as FeedPeerRow[]).map((r) => ({
        id: r.id,
        label: r.label,
        url: r.base_url,
        api_key: r.outbound_key_enc ? decryptSecret(r.outbound_key_enc) : '',
        last_synced_at: r.last_contact_at,
        sync_reports: r.channels?.reports === true,
        sync_warrants: r.channels?.warrants === true,
        sync_bulletins: r.channels?.bulletins === true,
        inbound_max_clearance: r.inbound_max_clearance ?? 5,
        isAlliance: r.pairing_state === 'active',
    }));

    if (feedError) {
        return { totalReports: 0, totalWarrants: 0, totalBulletins: 0, feedResults: [{
            label: 'System', status: 'error' as const,
            message: `Failed to query feed list: ${feedError.message}`
        }]};
    }

    if (!feeds || feeds.length === 0) {
        return { totalReports: 0, totalWarrants: 0, totalBulletins: 0, feedResults: [{
            label: 'System', status: 'warning' as const,
            message: 'No trusted feeds configured. Add feeds in the External Intelligence Sources section.'
        }]};
    }

    let totalReports = 0;
    let totalWarrants = 0;
    let totalBulletins = 0;
    const feedResults: { label: string; status: 'success' | 'error' | 'warning' | 'info'; message: string }[] = [];

    for (const feed of feeds) {
        const feedLog: string[] = [];
        try {
            // 1. Build feed URL — alliance peers serve /api/alliance/data, legacy
            //    feeds serve /api/intel/feed (or a direct /api/query?target=feed).
            let url = feed.url.replace(/\/$/, '');
            const isQueryFeed = url.includes('/api/query?target=feed');
            if (feed.isAlliance) {
                if (!url.endsWith('/api/alliance/data')) url += '/api/alliance/data';
            } else if (!isQueryFeed && !url.endsWith('/api/intel/feed')) {
                url += '/api/intel/feed';
            }

            if (!force && feed.last_synced_at) {
                url += `${isQueryFeed ? '&' : '?'}since=${encodeURIComponent(feed.last_synced_at)}`;
            }

            // 2. Determine if this is a local (same-platform) feed or external
            //    Local feeds on *.myrsi.org can be resolved directly via DB query,
            //    bypassing HTTP which can fail in containerized deployments (DNS/TLS loopback issues).
            //    Alliance peers are ALWAYS independent instances (separate DBs), so
            //    they must use the HTTP path — never the same-DB shortcut, which
            //    would return our own data instead of the peer's.
            let data: FeedSyncData;
            const feedUrlLower = url.toLowerCase();
            const isLocalPlatformFeed = !feed.isAlliance && (feedUrlLower.includes('.myrsi.org') || feedUrlLower.includes('localhost'));

            if (isLocalPlatformFeed) {
                feedLog.push(`Local platform feed detected — resolving via direct DB query`);
                try {
                    // Verify the API key and get the source org
                    const keyData = await verifyApiKey(feed.api_key);
                    if (!keyData) {
                        feedResults.push({
                            label: feed.label, status: 'error',
                            message: 'API key verification failed. The key may have been revoked or is invalid.'
                        });
                        continue;
                    }

                    const since = (!force && feed.last_synced_at) ? feed.last_synced_at : undefined;
                    const feedData = await getPublicFeedData(since);
                    data = {
                        countReports: feedData.reports.length,
                        countWarrants: feedData.warrants.length,
                        countBulletins: feedData.bulletins.length,
                        reports: feedData.reports,
                        warrants: feedData.warrants,
                        bulletins: feedData.bulletins,
                        _meta: feedData._meta
                    };
                    feedLog.push(`Direct query returned: ${data.countReports} reports, ${data.countWarrants} warrants, ${data.countBulletins} bulletins`);
                    // (Per-reason "excluded by clearance/marker" counts were removed
                    // from the feed _meta — they disclosed how much classified intel
                    // exists above the requester's ceiling. See SECURITY L6.)
                } catch (localErr) {
                    feedResults.push({
                        label: feed.label, status: 'error',
                        message: `Direct DB query failed: ${localErr instanceof Error ? localErr.message : 'Unknown error'}`
                    });
                    continue;
                }
            } else {
                // External feed — use HTTP fetch
                feedLog.push(`Fetching external feed: ${url}`);

                // SSRF guard: external feeds must be public https:// endpoints.
                // Local *.myrsi.org / localhost feeds never reach this branch (they
                // resolve via direct DB query above), so this only blocks an admin
                // pointing a feed at loopback / private / cloud-metadata addresses.
                // Dev-only escape hatch for two-instance alliance E2E on loopback.
                const devLoopbackOk = feed.isAlliance && process.env.NODE_ENV !== 'production' && process.env.ALLIANCE_DEV_ALLOW_LOOPBACK === '1';
                if (!sanitizePublicLinkUrl(url) && !devLoopbackOk) {
                    feedResults.push({
                        label: feed.label, status: 'error',
                        message: 'Feed URL rejected: external feeds must be a public https:// endpoint (loopback/private/metadata addresses are blocked).'
                    });
                    continue;
                }

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                let response: Response;
                try {
                    // SECURITY (M7): the literal-IP check above does not resolve DNS.
                    // This fetch carries our decrypted feed/alliance x-api-key, so a
                    // hostname resolving to a private/cloud-metadata IP would be an
                    // SSRF + key-exfil. Resolve and reject private targets first.
                    await assertResolvesToPublicHost(url);
                    response = await fetch(url, {
                        method: 'GET',
                        headers: { 'x-api-key': feed.api_key },
                        signal: controller.signal
                    });
                } catch (fetchErr) {
                    clearTimeout(timeout);
                    const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
                        ? 'Connection timed out after 15s'
                        : `Network error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`;
                    feedResults.push({ label: feed.label, status: 'error', message: msg });
                    continue;
                }
                clearTimeout(timeout);

                if (!response.ok) {
                    let errBody = '';
                    try { errBody = await response.text(); } catch { /* response body may be unavailable; the HTTP status alone is sufficient */ }
                    const detail = errBody ? ` — ${errBody.substring(0, 200)}` : '';
                    feedResults.push({
                        label: feed.label, status: 'error',
                        message: `HTTP ${response.status} ${response.statusText}${detail}`
                    });
                    continue;
                }

                // Parse response
                const contentType = response.headers.get('content-type') || '';
                try {
                    if (!contentType.includes('application/json')) {
                        const bodyPreview = await response.text();
                        const isHtml = bodyPreview.trimStart().startsWith('<') || contentType.includes('text/html');
                        feedResults.push({
                            label: feed.label, status: 'error',
                            message: isHtml
                                ? `Received HTML instead of JSON. The feed URL may be returning a web page. Verify the URL is correct: ${url}`
                                : `Unexpected response type (${contentType}). Preview: ${bodyPreview.substring(0, 150)}`
                        });
                        continue;
                    }
                    data = await response.json();
                } catch {
                    feedResults.push({
                        label: feed.label, status: 'error',
                        message: `Failed to parse JSON response (Content-Type: ${contentType}). The remote server may be misconfigured.`
                    });
                    continue;
                }
            }

            const remoteReportCount = data.countReports ?? (data.reports?.length || 0);
            const remoteWarrantCount = data.countWarrants ?? (data.warrants?.length || 0);
            const remoteBulletinCount = data.countBulletins ?? (data.bulletins?.length || 0);
            feedLog.push(`Remote returned: ${remoteReportCount} reports, ${remoteWarrantCount} warrants, ${remoteBulletinCount} bulletins`);

            let feedNewReports = 0;
            let feedDuplicateReports = 0;
            let feedLinkedReports = 0;
            let feedNewWarrants = 0;
            let feedDuplicateWarrants = 0;
            let feedNewBulletins = 0;
            let feedReportErrors = 0;

            // 4. Process reports
            if (data.reports && Array.isArray(data.reports) && feed.sync_reports !== false) {
                for (const r of data.reports) {
                    try {
                        if (!r.target_id || !r.summary) continue;
                        const maxClearance = feed.inbound_max_clearance ?? 5;
                        if ((r.classification_level || 0) > maxClearance) continue;
                        const normalizedSummary = normalizeString(r.summary);

                        // Check if already imported from this feed (by external_id + source_feed_id)
                        const { data: existingExternal } = await supabase.from('intel_reports')
                            .select('id')
                            .eq('external_id', r.id)
                            .eq('source_feed_id', feed.id)
                            
                            .maybeSingle();

                        if (existingExternal) {
                            feedDuplicateReports++;
                            continue;
                        }

                        // Check for content match within THIS org only
                        const { data: internalMatches } = await supabase.from('intel_reports')
                            .select('id, summary, external_id')
                            .ilike('target_id', r.target_id)
                            ;

                        const existingInternal = (internalMatches || []).find(
                            (m) => normalizeString(m.summary) === normalizedSummary
                        );

                        if (existingInternal) {
                            // Link existing report to feed if not already linked
                            if (!existingInternal.external_id) {
                                await supabase.from('intel_reports').update({
                                    external_id: r.id,
                                    source_feed_id: feed.id,
                                    external_author: feed.label
                                }).eq('id', existingInternal.id);
                                feedLinkedReports++;
                            } else {
                                feedDuplicateReports++;
                            }
                        } else {
                            // Insert new report
                            const { data: inserted, error: insertErr } = await supabase.from('intel_reports').insert({
                                target_id: r.target_id,
                                subject_type: r.subject_type,
                                threat_level: r.threat_level,
                                tags: r.tags,
                                summary: r.summary,
                                affiliated_org: r.affiliated_org,
                                created_at: r.created_at,
                                source_feed_id: feed.id,
                                external_id: r.id,
                                external_author: feed.label,
                                created_by_id: null,
                                classification_level: r.classification_level || 0
                            }).select('id').single();

                            if (insertErr) {
                                feedReportErrors++;
                                log.error('report insert failed', { targetId: r.target_id, feedLabel: feed.label, message: insertErr.message });
                                continue;
                            }

                            // Attach limiting markers from source feed (match by code)
                            if (inserted && r.limiting_markers && Array.isArray(r.limiting_markers) && r.limiting_markers.length > 0) {
                                const { data: localMarkers } = await supabase.from('security_limiting_markers')
                                    .select('id, code')
                                    
                                    .in('code', r.limiting_markers);

                                if (localMarkers && localMarkers.length > 0) {
                                    await supabase.from('intel_report_limiting_markers').insert(
                                        localMarkers.map((m) => ({ report_id: inserted.id, marker_id: m.id }))
                                    );
                                }
                            }

                            feedNewReports++;
                            totalReports++;
                        }
                    } catch (reportErr) {
                        feedReportErrors++;
                        log.error('error processing report from feed', { feedLabel: feed.label, err: reportErr });
                    }
                }
            }

            // 5. Process warrants (scoped to this org)
            if (data.warrants && Array.isArray(data.warrants) && adminId && feed.sync_warrants !== false) {
                for (const w of data.warrants) {
                    try {
                        if (!w.target_rsi_handle || !w.reason) continue;

                        const { data: existing } = await supabase.from('warrants')
                            .select('id')
                            .ilike('target_rsi_handle', w.target_rsi_handle)
                            .eq('reason', w.reason)
                            
                            .maybeSingle();

                        if (!existing) {
                            await supabase.from('warrants').insert({
                                target_rsi_handle: w.target_rsi_handle,
                                reason: w.reason,
                                action: w.action,
                                uec_reward: w.uec_reward,
                                status: w.status,
                                created_at: w.created_at || w.issued_at || new Date().toISOString(),
                                source_feed_id: feed.id,
                                external_id: w.id,
                                issued_by: adminId
                            });
                            feedNewWarrants++;
                            totalWarrants++;
                        } else {
                            feedDuplicateWarrants++;
                        }
                    } catch (warrantErr) {
                        log.error('error processing warrant from feed', { feedLabel: feed.label, err: warrantErr });
                    }
                }
            }

            // 6. Process bulletins
            if (data.bulletins && Array.isArray(data.bulletins) && feed.sync_bulletins !== false) {
                for (const b of data.bulletins) {
                    try {
                        if (!b.title || !b.body) continue;

                        // Check for existing bulletin by title match within org
                        const { data: existingBulletin } = await supabase.from('intel_bulletins')
                            .select('id')
                            .eq('title', b.title)
                            
                            .maybeSingle();

                        if (!existingBulletin) {
                            // Calculate expiry: use remote expires_at, or default to 24h from now
                            const expiresAt = b.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                            const durationMinutes = b.duration_minutes || 1440;
                            await supabase.from('intel_bulletins').insert({
                                title: b.title,
                                body: b.body,
                                threat_level: b.threat_level || 'Medium',
                                location: b.location || null,
                                duration_minutes: durationMinutes,
                                expires_at: expiresAt,
                                classification_level: b.classification_level || 0,
                                created_at: b.created_at || new Date().toISOString(),
                                // Mark provenance so the UI shows the "ALLY" badge and
                                // we never re-share this ingested bulletin (loop guard).
                                source_organization_id: feed.id,
                                source_organization_name: feed.label,
                                shared_with_allies: false,
                            });
                            feedNewBulletins++;
                            totalBulletins++;
                        }
                    } catch (bulletinErr) {
                        log.error('error processing bulletin from feed', { feedLabel: feed.label, err: bulletinErr });
                    }
                }
            }

            // 7. Update last_synced_at
            await supabase.from('alliance_peers').update({ last_contact_at: new Date().toISOString() }).eq('id', feed.id);

            // 8. Build result summary for this feed
            // First, push diagnostic log entries
            for (const logEntry of feedLog) {
                feedResults.push({ label: feed.label, status: 'info', message: logEntry });
            }

            // Include clearance filtering info from _meta if present
            if (data._meta) {
                const m = data._meta;
                if ((m.totalReportsBeforeFilter ?? 0) > 0 && ((m.reportsExcludedByClearance ?? 0) > 0 || (m.reportsExcludedByMarker ?? 0) > 0)) {
                    feedResults.push({
                        label: feed.label, status: 'warning',
                        message: `Source org sharing filter: ${m.totalReportsBeforeFilter} total reports, ${m.reportsExcludedByClearance} excluded by clearance (max level: ${m.maxShareableLevel}), ${m.reportsExcludedByMarker} excluded by marker restriction`
                    });
                }
            }

            const parts: string[] = [];
            if (remoteReportCount === 0 && remoteWarrantCount === 0 && remoteBulletinCount === 0) {
                parts.push('Remote feed returned 0 records (check their Outbound Sharing Policy)');
            } else {
                if (feedNewReports > 0) parts.push(`${feedNewReports} new report(s)`);
                if (feedNewWarrants > 0) parts.push(`${feedNewWarrants} new warrant(s)`);
                if (feedNewBulletins > 0) parts.push(`${feedNewBulletins} new bulletin(s)`);
                if (feedDuplicateReports > 0) parts.push(`${feedDuplicateReports} duplicate report(s) skipped`);
                if (feedLinkedReports > 0) parts.push(`${feedLinkedReports} existing report(s) linked`);
                if (feedDuplicateWarrants > 0) parts.push(`${feedDuplicateWarrants} duplicate warrant(s) skipped`);
                if (feedReportErrors > 0) parts.push(`${feedReportErrors} report(s) failed to import`);
                if (parts.length === 0) parts.push('All records already exist locally');
            }

            const hasNew = feedNewReports > 0 || feedNewWarrants > 0 || feedNewBulletins > 0;
            feedResults.push({
                label: feed.label,
                status: feedReportErrors > 0 ? 'warning' : hasNew ? 'success' : 'info',
                message: parts.join(', ')
            });

        } catch (err) {
            log.error('error syncing feed', { feedLabel: feed.label, err });
            feedResults.push({
                label: feed.label, status: 'error',
                message: `Unexpected error: ${err instanceof Error ? err.message : 'Unknown failure'}`
            });
        }
    }

    return { totalReports, totalWarrants, totalBulletins, feedResults };
}

export async function syncWarrantsToReports(adminId: number) {
    const query = supabase.from('warrants').select('id, target_rsi_handle, reason').in('status', ['Active', 'Standing']);
    const { data: warrants } = await query;
    let createdCount = 0;

    if (warrants && warrants.length > 0) {
        // Batch-check existing reports instead of N+1.
        const handles = [...new Set(warrants.map(w => w.target_rsi_handle.toLowerCase()))];
        const existingReportsQuery = supabase.from('intel_reports')
            .select('target_id')
            .in('target_id', handles);
        const { data: existingReports } = await existingReportsQuery;
        const existingSet = new Set((existingReports || []).map(r => r.target_id.toLowerCase()));

        for (const w of warrants) {
            if (!existingSet.has(w.target_rsi_handle.toLowerCase())) {
                await createIntelReport({
                    targetId: w.target_rsi_handle,
                    subjectType: 'Person',
                    threatLevel: 'High',
                    tags: ['Caution Note', 'Auto-Sync'],
                    summary: `[AUTOMATED REPORT FROM CAUTION NOTE] Target has an active caution note: ${w.reason}`,
                    evidenceUrls: [],
                    createdById: adminId,
                    classificationLevel: 0
                });
                createdCount++;
            }
        }
    }
    return createdCount;
}

export async function deduplicateWarrants() {
    const query = supabase.from('warrants')
        .select('id, target_rsi_handle, created_at')
        .in('status', ['Active', 'Standing'])
        .order('created_at', { ascending: false });
    const { data: warrants } = await query;

    if (!warrants) return 0;
    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const w of warrants) {
        const key = w.target_rsi_handle.toLowerCase();
        if (seen.has(key)) {
            toDelete.push(w.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length > 0) {
        const deleteQ = supabase.from('warrants').delete().in('id', toDelete);
        await deleteQ;
    }
    return toDelete.length;
}

export async function deduplicateIntelReports() {
    const query = supabase.from('intel_reports')
        .select('id, target_id, summary, external_id, created_by_id, created_at')
        .order('created_at', { ascending: true });
    const { data: reports } = await query;

    if (!reports) return 0;
    const seen = new Map<string, (typeof reports)[number]>();
    const toDelete: string[] = [];

    for (const r of reports) {
        const sig = `${r.target_id.toLowerCase()}|${normalizeString(r.summary)}`;
        if (seen.has(sig)) {
            const existing = seen.get(sig)!;
            if (existing.created_by_id && !r.created_by_id) {
                toDelete.push(r.id);
            } else if (!existing.created_by_id && r.created_by_id) {
                toDelete.push(existing.id);
                seen.set(sig, r);
            } else {
                toDelete.push(r.id);
            }
        } else {
            seen.set(sig, r);
        }
    }

    if (toDelete.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < toDelete.length; i += chunkSize) {
            const chunk = toDelete.slice(i, i + chunkSize);
            const deleteQ = supabase.from('intel_reports').delete().in('id', chunk);
            await deleteQ;
        }
    }
    return toDelete.length;
}

export async function saveDossierSummary(targetId: string, summary: string) {
    const payload: Record<string, unknown> = {
        target_id: targetId,
        summary: summary,
        generated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('dossier_summaries').upsert(payload, { onConflict: 'target_id' });
    handleSupabaseError({ error, message: 'Failed to save dossier summary' });
    // Dossier summaries are RPC-fetched on demand (intel:get_dossier) — they
    // ride neither the intel subset nor the paginated feed, so clients skip
    // the refetch entirely for this kind. (Previously this emit forced a full
    // intel refetch + feed refetch on every connected client for a write
    // nobody could see — the single most wasteful emit in the app.)
    await broadcastIntelUpdate({ kind: 'dossier', targetId });
}

// --- INTEL BULLETINS ---

function broadcastBulletinUpdate(eventData?: Record<string, unknown>) {
    broadcastToOrg('bulletin_update', eventData || {});
}

export async function createIntelBulletin(data: Record<string, unknown>): Promise<IntelBulletin> {
    const durationMinutes = (data.durationMinutes as number | undefined) ?? 60;
    const isIndefinite = durationMinutes === 0;
    const expiresAt = isIndefinite
        ? new Date('9999-12-31T23:59:59Z').toISOString()
        : new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const markerIds = data.markerIds as number[] | undefined;
    const { data: row, error } = await supabase.from('intel_bulletins').insert({
        title: stripHtmlSingleLine(data.title, 200),
        body: stripHtml(data.body, 8000),
        threat_level: (data.threatLevel as string | undefined) || 'Medium',
        location: stripHtmlSingleLine(data.location, 200) || null,
        duration_minutes: durationMinutes,
        expires_at: expiresAt,
        classification_level: (data.classificationLevel as number | undefined) || 0,
        created_by_id: data.createdById as number | undefined,
        shared_with_allies: (data.sharedWithAllies as boolean | undefined) || false
    }).select().single();

    handleSupabaseError({ error, message: 'Failed to create intel bulletin' });

    if (row && markerIds && markerIds.length > 0) {
        const markers = markerIds.map((mid) => ({ bulletin_id: row.id, marker_id: mid }));
        await supabase.from('intel_bulletin_limiting_markers').insert(markers);
    }

    // SECURITY (H4): the realtime 'db-changes' channel is readable by any holder
    // of the public anon key. A bulletin row carries a classified body +
    // classification_level + limiting markers — never broadcast it. Emit only
    // non-sensitive routing metadata; clients re-fetch via the clearance-filtered
    // intel read path (getIntelState / intel:get_bulletins).
    // Id-only payload: threatLevel is CONTENT (the classification of a
    // clearance-gated bulletin) and must not ride the broadcast — receivers
    // derive styling after the clearance-gated bulletin_slice fetch.
    // createdById stays for the author's self-skip in the toast listener.
    await broadcastBulletinUpdate({ type: 'new_bulletin', bulletinId: row.id, createdById: row.created_by_id });
    // No companion intel_update: bulletins feed neither the intel aggregates
    // (index/stats scan intel_reports only) nor the paginated report feed —
    // bulletin_update alone drives the bulletin slice refetch.

    return toIntelBulletin(row);
}

export async function getActiveBulletins(): Promise<IntelBulletin[]> {
    const query = supabase.from('intel_bulletins')
        .select('*, createdBy:users!intel_bulletins_created_by_id_fkey(id, name, avatar_url, role_id), intel_bulletin_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

    const data = await safeFetch<IntelBulletinRow[]>(query, [], 'Failed to get active bulletins');
    return data.map(toIntelBulletin);
}

/**
 * Single-bulletin fetch in the active-list row shape, clearance-filtered for
 * the viewer. Backs the realtime `bulletin_slice` query subset: bulletin
 * broadcasts carry the bulletinId and the client refetches ONLY that row.
 * Returns null when absent, expired, or filtered by the viewer's clearance/
 * markers (SECURITY H3 — the exact same filterIntelByClearance gate the bulk
 * activeBulletins path applies; null → the client removes the row, exactly
 * what a full refetch would have done). THROWS on query errors so a transient
 * DB blip can never masquerade as "bulletin deleted".
 */
export async function getBulletinByIdForViewer(bulletinId: string, user?: ClearanceUser | null): Promise<IntelBulletin | null> {
    const { data, error } = await supabase.from('intel_bulletins')
        .select('*, createdBy:users!intel_bulletins_created_by_id_fkey(id, name, avatar_url, role_id), intel_bulletin_limiting_markers(marker:security_limiting_markers(id, name, code))')
        .eq('id', bulletinId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    handleSupabaseError({ error, message: 'Failed to get bulletin slice' });
    if (!data) return null;
    const bulletin = toIntelBulletin(data as IntelBulletinRow);
    return filterIntelByClearance([bulletin], user)[0] ?? null;
}

export async function deleteIntelBulletin(bulletinId: string) {
    // Verify existence before deletion.
    const { data: bulletin } = await supabase.from('intel_bulletins')
        .select('id')
        .eq('id', bulletinId)

        .maybeSingle();
    if (!bulletin) throw new Error('Bulletin not found');

    const { error } = await supabase.from('intel_bulletins').delete()
        .eq('id', bulletinId)
        ;
    handleSupabaseError({ error, message: 'Failed to delete intel bulletin' });
    // bulletinId lets clients remove the one row (bulletin_slice → null).
    await broadcastBulletinUpdate({ type: 'bulletin_deleted', bulletinId });
    // No companion intel_update — see createIntelBulletin.
}

export async function cleanupExpiredBulletins() {
    const { error } = await supabase.from('intel_bulletins')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .neq('duration_minutes', 0);
    if (error) log.error('bulletin cleanup failed', { message: error.message });
}
