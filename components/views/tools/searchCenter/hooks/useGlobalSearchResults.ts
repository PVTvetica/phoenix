import { useMemo } from 'react';
import {
    User,
    HydratedServiceRequest,
    HydratedWarrant,
    HydratedOperation,
    HydratedIntelligenceReport,
    HydratedHRApplication,
    HydratedHRInterview,
    JobPosting,
    WikiPage,
    UserRole,
    ServiceRequestStatus,
    WarrantStatus,
} from '../../../../../types';
import {
    SearchResult,
    SearchFiltersState,
} from '../types';
import {
    AclContext,
    hasIntelAccess,
    hasOperationAccess,
    hasHrAccess,
    hasWikiAccess,
} from '../acl';

interface Params {
    query: string;
    filters: SearchFiltersState;
    acl: AclContext;
    allUsers: User[];
    serviceRequests: HydratedServiceRequest[];
    warrants: HydratedWarrant[];
    operations: HydratedOperation[];
    intelReports: HydratedIntelligenceReport[];
    hrApplicants: HydratedHRApplication[];
    hrInterviews: HydratedHRInterview[];
    hrJobs: JobPosting[];
    wikiPages: WikiPage[];
    isSearchingIntel: boolean;
}

export interface SearchResultsBundle {
    results: SearchResult[];
    counts: Record<string, number>;
    totalCount: number;
}

const parseTs = (iso?: string | null): number => {
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
};

const matches = (q: string, ...fields: (string | number | null | undefined)[]): boolean => {
    if (!q) return true;
    return fields.some(f => {
        if (f == null) return false;
        return String(f).toLowerCase().includes(q);
    });
};

export const useGlobalSearchResults = (params: Params): SearchResultsBundle => {
    const {
        query,
        filters,
        acl,
        allUsers,
        serviceRequests,
        warrants,
        operations,
        intelReports,
        hrApplicants,
        hrInterviews,
        hrJobs,
        wikiPages,
        isSearchingIntel,
    } = params;

    return useMemo(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            return { results: [], counts: {}, totalCount: 0 };
        }
        const q = trimmed.toLowerCase();
        const out: SearchResult[] = [];
        const counts: Record<string, number> = {
            personnel: 0,
            mission: 0,
            warrant: 0,
            operation: 0,
            intel: 0,
            hr: 0,
            wiki: 0,
        };

        // Personnel
        if (filters.types.personnel) {
            for (const u of allUsers) {
                if (!matches(q, u.name, u.rsiHandle, u.discordId, u.displayName, u.discordName)) continue;
                if (filters.personnel.tier === 'staff' && u.role === UserRole.Client) continue;
                if (filters.personnel.tier === 'clients' && u.role !== UserRole.Client) continue;
                if (filters.personnel.onlyOnDuty && !u.isDuty) continue;
                counts.personnel++;
                out.push({
                    type: 'personnel',
                    sortTimestamp: parseTs(u.createdAt),
                    id: `personnel-${u.id}`,
                    data: u,
                });
            }
        }

        // Missions
        if (filters.types.mission) {
            for (const r of serviceRequests) {
                const handleSecondary = r.secondaryClientHandles?.join(' ');
                const memberNames = r.assignedMembers.map(m => m.name).join(' ');
                if (!matches(
                    q,
                    r.id,
                    r.description,
                    r.location,
                    r.client?.name,
                    r.client?.rsiHandle,
                    r.unregisteredClientRsiHandle,
                    handleSecondary,
                    memberNames,
                    r.serviceType,
                )) continue;
                if (filters.mission.status !== 'all') {
                    const s = r.status;
                    const pending = [ServiceRequestStatus.Submitted, ServiceRequestStatus.Triaged].includes(s);
                    const active = [ServiceRequestStatus.Accepted, ServiceRequestStatus.InProgress].includes(s);
                    const completed = !pending && !active;
                    if (filters.mission.status === 'pending' && !pending) continue;
                    if (filters.mission.status === 'active' && !active) continue;
                    if (filters.mission.status === 'completed' && !completed) continue;
                }
                counts.mission++;
                out.push({
                    type: 'mission',
                    sortTimestamp: parseTs(r.updatedAt) || parseTs(r.createdAt),
                    id: `mission-${r.id}`,
                    data: r,
                });
            }
        }

        // Warrants
        if (filters.types.warrant) {
            for (const w of warrants) {
                if (!matches(q, w.targetRsiHandle, w.reason, w.id, w.notes)) continue;
                if (filters.warrant.status !== 'all') {
                    if (filters.warrant.status === 'closed') {
                        if (![WarrantStatus.Claimed, WarrantStatus.Cancelled].includes(w.status)) continue;
                    } else if (w.status !== filters.warrant.status) continue;
                }
                counts.warrant++;
                out.push({
                    type: 'warrant',
                    sortTimestamp: parseTs(w.issuedAt),
                    id: `warrant-${w.id}`,
                    data: w,
                });
            }
        }

        // Operations (with ACL)
        if (filters.types.operation) {
            for (const op of operations) {
                if (!hasOperationAccess(op, acl)) continue;
                if (!matches(q, op.name, op.description, op.id)) continue;
                if (filters.operation.status !== 'all' && op.status !== filters.operation.status) continue;
                if (filters.operation.classifiedOnly && (op.clearanceLevel || 0) === 0) continue;
                counts.operation++;
                out.push({
                    type: 'operation',
                    sortTimestamp: parseTs(op.updatedAt) || parseTs(op.createdAt),
                    id: `operation-${op.id}`,
                    data: op,
                });
            }
        }

        // Intel (with ACL)
        if (filters.types.intel) {
            for (const r of intelReports) {
                if (!hasIntelAccess(r, acl)) continue;
                const tagsStr = r.tags?.join(' ');
                if (!matches(q, r.targetId, r.summary, r.affiliatedOrg, tagsStr, r.id)) continue;
                if (filters.intel.threat !== 'all' && r.threatLevel !== filters.intel.threat) continue;
                if (filters.intel.classifiedOnly && (r.classificationLevel || 0) === 0) continue;
                counts.intel++;
                out.push({
                    type: 'intel',
                    sortTimestamp: parseTs(r.createdAt),
                    id: `intel-${r.id}`,
                    data: r,
                });
            }
        }

        // HR (with permission gate, then sub-type fan-out)
        if (filters.types.hr && hasHrAccess(acl)) {
            const wantSubtype = filters.hr.subtype;

            if (wantSubtype === 'all' || wantSubtype === 'application') {
                for (const a of hrApplicants) {
                    if (!matches(q, a.applicantName, a.rsiHandle, a.applicantDiscordId, a.notes, a.referralSource)) continue;
                    if (filters.hr.status !== 'all' && a.status !== filters.hr.status) continue;
                    counts.hr++;
                    out.push({
                        type: 'hr',
                        subtype: 'application',
                        sortTimestamp: parseTs(a.createdAt),
                        id: `hr-application-${a.id}`,
                        data: a,
                    });
                }
            }

            if (wantSubtype === 'all' || wantSubtype === 'interview') {
                for (const i of hrInterviews) {
                    const interviewerName = i.interviewer?.name;
                    const tplName = i.template?.name;
                    if (!matches(q, i.applicantName, interviewerName, tplName, i.overallNotes, i.id)) continue;
                    counts.hr++;
                    out.push({
                        type: 'hr',
                        subtype: 'interview',
                        sortTimestamp: parseTs(i.scheduledAt),
                        id: `hr-interview-${i.id}`,
                        data: i,
                    });
                }
            }

            if (wantSubtype === 'all' || wantSubtype === 'posting') {
                for (const j of hrJobs) {
                    if (!matches(q, j.title, j.department, j.description, j.id)) continue;
                    if (filters.hr.status !== 'all' && j.status !== filters.hr.status) continue;
                    counts.hr++;
                    out.push({
                        type: 'hr',
                        subtype: 'posting',
                        sortTimestamp: parseTs(j.createdAt),
                        id: `hr-posting-${j.id}`,
                        data: j,
                    });
                }
            }
        }

        // Wiki (with ACL)
        if (filters.types.wiki) {
            for (const p of wikiPages) {
                if (!hasWikiAccess(p, acl)) continue;
                // Wiki content is JSON (tiptap) — skip body matching for now to keep cost low.
                if (!matches(q, p.title, p.slug)) continue;
                if (filters.wiki.classifiedOnly && (p.classificationLevel || 0) === 0) continue;
                counts.wiki++;
                out.push({
                    type: 'wiki',
                    sortTimestamp: parseTs(p.updatedAt) || parseTs(p.createdAt),
                    id: `wiki-${p.id}`,
                    data: p,
                });
            }
        }

        // Sort: most recent first, with stable type tie-break
        out.sort((a, b) => {
            const d = b.sortTimestamp - a.sortTimestamp;
            if (d !== 0) return d;
            return a.type.localeCompare(b.type);
        });

        // Prepend intel-loading sentinels at the very top when intel is being fetched.
        const total = out.length;
        if (isSearchingIntel && filters.types.intel && total === 0) {
            // No results yet but intel is loading — show 3 skeleton sentinels.
            const sentinels: SearchResult[] = [0, 1, 2].map(i => ({
                type: 'intel-loading',
                sortTimestamp: Number.MAX_SAFE_INTEGER,
                id: `intel-loading-${i}`,
            }));
            return { results: sentinels, counts, totalCount: 0 };
        }
        if (isSearchingIntel && filters.types.intel) {
            const sentinel: SearchResult = {
                type: 'intel-loading',
                sortTimestamp: Number.MAX_SAFE_INTEGER,
                id: 'intel-loading-marker',
            };
            return { results: [sentinel, ...out], counts, totalCount: total };
        }

        return { results: out, counts, totalCount: total };
    }, [
        query,
        filters,
        acl,
        allUsers,
        serviceRequests,
        warrants,
        operations,
        intelReports,
        hrApplicants,
        hrInterviews,
        hrJobs,
        wikiPages,
        isSearchingIntel,
    ]);
};
