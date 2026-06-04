import { describe, it, expect } from 'vitest';
import { opaqueId } from '../lib/publicId';

describe('opaqueId', () => {
    it('produces a 12-char hex string', () => {
        const id = opaqueId('SR-ABC123');
        expect(id).toMatch(/^[0-9a-f]{12}$/);
    });

    it('is deterministic for the same input', () => {
        expect(opaqueId('SR-ABC123')).toBe(opaqueId('SR-ABC123'));
    });

    it('produces different outputs for different inputs', () => {
        const a = opaqueId('SR-ABC123');
        const b = opaqueId('SR-ABC124');
        expect(a).not.toBe(b);
    });

    it('accepts numeric ids', () => {
        expect(opaqueId(42)).toMatch(/^[0-9a-f]{12}$/);
        expect(opaqueId(42)).toBe(opaqueId('42'));
    });
});
