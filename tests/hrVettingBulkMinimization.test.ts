import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression for the HR vetting bulk-egress leak (data-minimisation).
// vettingData is recruiter-grade PII (background-check verdicts + free-text
// adjudication). It must reach the browser ONLY via the per-applicant
// hr:get_application_data lazy fetch — NEVER in the bulk getHRApplications list
// (which ships ≤200 applicants to every recruiter on each HR-state refresh).
// This guards against a future change re-introducing the bulk leak.
let mockedBulkRows: any[] = [];
let mockedVettingRow: any = null;

vi.mock('../lib/db/common', () => {
    const chain: any = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve({ data: mockedVettingRow, error: null }),
    };
    return {
        supabase: { from: () => chain },
        handleSupabaseError: () => {},
        broadcastToOrg: () => {},
        getSystemRoles: () => [],
        safeFetch: async () => mockedBulkRows,
    };
});

import { getHRApplications, getApplicationVettingData } from '../lib/db/hr';

const SENSITIVE = 'CONFIDENTIAL-ADJUDICATION-NOTE';

describe('HR vetting bulk-list PII minimization', () => {
    beforeEach(() => {
        mockedBulkRows = [];
        mockedVettingRow = null;
    });

    it('strips vettingData from every row of the bulk applicant list', async () => {
        mockedBulkRows = [
            {
                id: 'app1', applicant_name: 'Recruit One', rsi_handle: 'recruit1', status: 'pending',
                created_at: 't', assignedRecruiter: null,
                vetting_data: { stage: 'investigation', checks: { rsiProfile: 'flagged' }, comments: { rsiProfile: SENSITIVE } },
            },
            {
                id: 'app2', applicant_name: 'Recruit Two', rsi_handle: 'recruit2', status: 'pending',
                created_at: 't', assignedRecruiter: null,
                vetting_data: { stage: 'adjudication', checks: {}, comments: {} },
            },
        ];
        const apps = await getHRApplications();
        expect(apps).toHaveLength(2);
        for (const a of apps) expect(a.vettingData).toBeUndefined();
        // Defence-in-depth: the serialized bulk payload carries no adjudication note.
        expect(JSON.stringify(apps)).not.toContain(SENSITIVE);
    });

    it('still exposes vetting data through the per-applicant lazy fetch', async () => {
        mockedVettingRow = { vetting_data: { stage: 'investigation', comments: { rsiProfile: SENSITIVE } } };
        const data = await getApplicationVettingData('app1');
        expect(data).not.toBeNull();
        expect(JSON.stringify(data)).toContain(SENSITIVE);
    });

    it('returns null vetting data when the application has none', async () => {
        mockedVettingRow = { vetting_data: null };
        const data = await getApplicationVettingData('app-missing');
        expect(data).toBeNull();
    });
});
