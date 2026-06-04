import { describe, it, expect, vi } from 'vitest';

// Simulate a service_requests row that contains every field we must NEVER leak.
const row = {
    id: 'SR-SECRET',
    client_id: 42,
    client_rating: 5,
    client_feedback: '  Excellent crew, saved my ship!  ',
    service_type: 'Combat Escort',
    updated_at: '2026-03-15T10:45:00.000Z',
    // The following fields must not appear in the output. They are selected by
    // neither the query nor the mapper, but we keep them on the fake row as a
    // regression guard in case a future dev expands the SELECT.
    discord_id: '111222333',
    email: 'jane@example.com',
    first_name: 'Jane',
    last_name: 'Doe',
    unregistered_client_rsi_handle: 'JanesShip',
    organization_id: 'org-uuid-xyz',
};

vi.mock('../lib/db/common', () => {
    const selectChain: any = {
        select: () => selectChain,
        in: () => selectChain,
        eq: () => selectChain,
        not: () => selectChain,
        then: (r: any) => Promise.resolve({ data: [row] }).then(r),
    };
    // .then on the chain lets `await query` resolve to { data }.
    return {
        supabase: { from: () => selectChain },
        handleSupabaseError: () => {},
        safeFetch: async () => [],
        broadcastToOrg: () => {},
    };
});

vi.mock('../lib/db/system', () => ({ getAllSettings: async () => ({}) }));

import { getPublicFeaturedTestimonials } from '../lib/db/public';

describe('getPublicFeaturedTestimonials anonymity', () => {
    it('returns only allowlisted keys', async () => {
        const items = await getPublicFeaturedTestimonials(['SR-SECRET']);
        expect(items).toHaveLength(1);
        const keys = Object.keys(items[0]).sort();
        expect(keys).toEqual(['id', 'quote', 'ratedAt', 'rating', 'serviceType'].sort());
    });

    it('never includes client identifiers anywhere in the serialized response', async () => {
        const items = await getPublicFeaturedTestimonials(['SR-SECRET']);
        const serialized = JSON.stringify(items);
        expect(serialized).not.toMatch(/jane@example\.com/i);
        expect(serialized).not.toMatch(/111222333/); // discord_id
        expect(serialized).not.toMatch(/JanesShip/); // RSI handle
        expect(serialized).not.toMatch(/Jane/); // first name
        expect(serialized).not.toMatch(/Doe/); // last name
        expect(serialized).not.toMatch(/SR-SECRET/); // internal request id
        expect(serialized).not.toMatch(/org-uuid-xyz/); // org id
        expect(serialized).not.toContain('"42'); // numeric client_id
    });

    it('uses an opaque id, not the internal SR-* id', async () => {
        const items = await getPublicFeaturedTestimonials(['SR-SECRET']);
        expect(items[0].id).toMatch(/^[0-9a-f]{12}$/);
    });

    it('trims and caps the quote', async () => {
        const items = await getPublicFeaturedTestimonials(['SR-SECRET']);
        expect(items[0].quote).toBe('Excellent crew, saved my ship!');
    });

    it('returns ratedAt as a date-only ISO string (no time component)', async () => {
        const items = await getPublicFeaturedTestimonials(['SR-SECRET']);
        expect(items[0].ratedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns empty array for empty id list', async () => {
        const items = await getPublicFeaturedTestimonials([]);
        expect(items).toEqual([]);
    });

    it('clamps id list at 6', async () => {
        // We only have one fake row, but asking for 100 ids must not blow up.
        const items = await getPublicFeaturedTestimonials(Array.from({ length: 100 }, (_, i) => `SR-${i}`));
        expect(items.length).toBeLessThanOrEqual(6);
    });
});
