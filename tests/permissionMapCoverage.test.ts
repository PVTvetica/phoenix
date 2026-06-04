import { describe, it, expect } from 'vitest';
import {
    actions,
    fullPermissionMap,
    PUBLIC_ACTIONS,
    PROTECTED_PREFIXES,
    validatePermissionMap,
} from '../api/services';

describe('permission map coverage', () => {
    it('every protected, non-public action has a permission entry', () => {
        const missing = Object.keys(actions).filter(a =>
            !PUBLIC_ACTIONS.includes(a) &&
            PROTECTED_PREFIXES.some(p => a.startsWith(p)) &&
            !(a in fullPermissionMap)
        );
        expect(missing, `Actions missing fullPermissionMap entry: ${missing.join(', ')}`).toEqual([]);
    });

    it('no stale entries in fullPermissionMap (every entry maps to a real action)', () => {
        const stale = Object.keys(fullPermissionMap).filter(k => !(k in actions));
        expect(stale, `Stale fullPermissionMap entries (action not registered): ${stale.join(', ')}`).toEqual([]);
    });

    it('validatePermissionMap() returns empty missing + stale lists', () => {
        const result = validatePermissionMap();
        expect(result.missing).toEqual([]);
        expect(result.stale).toEqual([]);
    });
});
