import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing the SUT. `updatePublicPageConfig`
// calls `verifyFeaturedTestimonialIdsBelongToOrg` (via dynamic import of
// public.js) and `supabase.from('settings').upsert(...)` directly. We stub
// both so we can assert pure validation behavior without a live DB.

const upsertMock = vi.fn();
const broadcastMock = vi.fn();

vi.mock('../lib/db/common', () => ({
    supabase: {
        from: () => ({
            upsert: (...args: any[]) => upsertMock(...args),
            select: () => ({
                eq: () => ({ in: () => ({ eq: () => ({ eq: () => ({ not: () => ({ not: () => ({}) }) }) }) }) }),
            }),
        }),
    },
    handleSupabaseError: () => {},
    safeFetch: async () => [],
    broadcastToOrg: (...args: any[]) => broadcastMock(...args),
    getSystemRoles: async () => ({}),
}));

// Stub the public.js cross-org check to "always valid" when ids are provided.
vi.mock('../lib/db/public', async () => {
    const actual = await vi.importActual<any>('../lib/db/public');
    return {
        ...actual,
        verifyFeaturedTestimonialIdsBelongToOrg: async (_org: string, ids: string[]) => ({
            ok: ids.every((id) => id.startsWith('SR-')),
            invalidIds: ids.filter((id) => !id.startsWith('SR-')),
        }),
    };
});

// Prevent module side-effects that reach out to the network.
vi.mock('../lib/push', () => ({ sendPushToAll: async () => {}, sendPushToStaff: async () => {}, sendPushToUsers: async () => {} }));

import { updatePublicPageConfig } from '../lib/db/system';

describe('updatePublicPageConfig validation', () => {
    beforeEach(() => {
        upsertMock.mockReset();
        upsertMock.mockReturnValue({ error: null });
        broadcastMock.mockReset();
    });

    it('rejects unknown top-level fields', async () => {
        await expect(
            updatePublicPageConfig({ enabled: true, evilField: 'x' }),
        ).rejects.toThrow(/Unknown public page config field/);
    });

    it('rejects non-https and non-discord URLs', async () => {
        await expect(
            updatePublicPageConfig(
                { enabled: true, links: [{ id: 'a', label: 'Bad', url: 'http://example.com' }] },
            ),
        ).rejects.toThrow(/Link URL/);
    });

    it('rejects javascript: protocol URLs', async () => {
        await expect(
            updatePublicPageConfig(
                { enabled: true, links: [{ id: 'a', label: 'XSS', url: 'javascript:alert(1)' }] },
            ),
        ).rejects.toThrow(/Link URL/);
    });

    it('strips HTML tags from motto and blurb', async () => {
        await updatePublicPageConfig(
            { enabled: true, motto: '<script>alert(1)</script>Hi', blurb: '<b>Bold</b>' },
        );
        expect(upsertMock).toHaveBeenCalledOnce();
        const payload = upsertMock.mock.calls[0][0];
        expect(payload.value.motto).toBe('alert(1)Hi');
        expect(payload.value.blurb).toBe('Bold');
    });

    it('caps links at 10', async () => {
        const links = Array.from({ length: 11 }, (_, i) => ({ id: `l${i}`, label: `L${i}`, url: 'https://x.com' }));
        await expect(updatePublicPageConfig({ enabled: true, links })).rejects.toThrow(/At most 10/);
    });

    it('caps featured testimonials at 6', async () => {
        const ids = ['SR-1', 'SR-2', 'SR-3', 'SR-4', 'SR-5', 'SR-6', 'SR-7'];
        await expect(
            updatePublicPageConfig({ enabled: true, featuredTestimonialIds: ids }),
        ).rejects.toThrow(/At most 6/);
    });

    it('rejects duplicate featured testimonial ids', async () => {
        await expect(
            updatePublicPageConfig({ enabled: true, featuredTestimonialIds: ['SR-1', 'SR-1'] }),
        ).rejects.toThrow(/unique/);
    });

    it('saves a valid minimal config', async () => {
        await updatePublicPageConfig({ enabled: false });
        expect(upsertMock).toHaveBeenCalledOnce();
        const payload = upsertMock.mock.calls[0][0];
        expect(payload.key).toBe('publicPageConfig');
        expect(payload.value.enabled).toBe(false);
        expect(payload.value.modules).toEqual({ stats: false, testimonials: false, services: false, links: false });
        expect(payload.value.links).toEqual([]);
        expect(payload.value.featuredTestimonialIds).toEqual([]);
    });
});
