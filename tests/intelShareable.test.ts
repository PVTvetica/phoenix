import { describe, it, expect } from 'vitest';
import { intelItemPasses } from '../lib/db/system';

// Pure per-item decision behind the outbound intel projection
// (collectShareableIntel / getAllianceShareableData). The DB-bound channel +
// shared_with_allies + per-peer-clearance composition is exercised by the
// two-instance E2E; this locks the core "what may leave the org" rule.
describe('intelItemPasses (outbound share predicate)', () => {
    it('never shares an item carrying a sync_restricted marker, at any level', () => {
        expect(intelItemPasses(0, true, 5)).toBe(false);
        expect(intelItemPasses(5, true, 5)).toBe(false);
    });

    it('shares at or below the clearance ceiling', () => {
        expect(intelItemPasses(0, false, 0)).toBe(true);
        expect(intelItemPasses(2, false, 3)).toBe(true);
        expect(intelItemPasses(3, false, 3)).toBe(true);
    });

    it('withholds above the clearance ceiling', () => {
        expect(intelItemPasses(4, false, 3)).toBe(false);
        expect(intelItemPasses(1, false, 0)).toBe(false);
    });

    it('treats null/undefined classification as level 0', () => {
        expect(intelItemPasses(null, false, 0)).toBe(true);
        expect(intelItemPasses(undefined, false, 0)).toBe(true);
        expect(intelItemPasses(undefined, false, -1)).toBe(false);
    });
});
