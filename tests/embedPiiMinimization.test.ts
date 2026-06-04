import { describe, it, expect } from 'vitest';
import { toHydratedWarrant } from '../lib/db/mappers';

// Regression for the warrant-data leak: a user embedded inside another row
// (here, a warrant's issuedByUser) must never carry private/security fields,
// EVEN IF a future change widens the embed's SELECT to include those columns.
describe('toMiniUser embed minimization', () => {
    it('warrant issuedByUser keeps identity but blanks private fields under a widened join', () => {
        const dbWarrant: any = {
            id: 'w1', target_rsi_handle: 'BadGuy', reason: 'x', action: 'Kill',
            uec_reward: 1, status: 'Standing', issued_by: 101, claimed_by: null,
            source_feed_id: null, external_id: null, notes: null, created_at: 'now',
            issuedBy: {
                id: 101, name: 'jenko', display_name: null,
                avatar_url: 'https://cdn.discordapp.com/avatars/123/abc.png', role_id: 2,
                // Simulate a widened join leaking sensitive columns:
                discord_id: '101953620311810048',
                admin_notes: 'secret admin note', personnel_notes: 'secret hr note',
                clearance_level: 5,
                conductRecord: [{ id: 'c1', type: 'warning', reason: 'oops', created_at: 'now' }],
                limiting_markers: [{ marker: 'NOFORN' }],
                role: { name: 'Member', role_permissions: [{ permission: { name: 'warrant:view' } }] },
            },
            feed: { label: 'Alliance: Skyhawks Security' },
        };

        const u: any = toHydratedWarrant(dbWarrant).issuedByUser;

        // Identity / role preserved
        expect(u.name).toBe('jenko');
        expect(u.role).toBe('Member');
        // Private / security fields blanked regardless of what the join selected
        expect(u.discordId).toBe('');
        expect(u.adminNotes).toBeUndefined();
        expect(u.personnelNotes).toBeUndefined();
        expect(u.clearanceLevel).toBeUndefined();
        expect(u.conductRecord).toEqual([]);
        expect(u.limitingMarkers).toEqual([]);
        expect(u.permissions).toEqual([]);
    });
});
