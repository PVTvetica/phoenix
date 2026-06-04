import { describe, it, expect } from 'vitest';
import { isOpaqueServerError } from '../lib/errors';

describe('isOpaqueServerError', () => {
    it('flags Supabase PostgrestError shape (string code)', () => {
        expect(isOpaqueServerError({
            message: 'column "deleted_at_at" does not exist',
            code: 'PGRST204',
            details: null,
            hint: null,
        })).toBe(true);
    });

    it('flags Supabase AuthError by name', () => {
        const err = Object.assign(new Error('Invalid JWT'), { name: 'AuthError' });
        expect(isOpaqueServerError(err)).toBe(true);
    });

    it('flags AuthApiError variant', () => {
        const err = Object.assign(new Error('rate limit'), { name: 'AuthApiError' });
        expect(isOpaqueServerError(err)).toBe(true);
    });

    it('flags Node system errors (ECONNREFUSED)', () => {
        const err = Object.assign(new Error('connect ECONNREFUSED'), {
            code: 'ECONNREFUSED',
            errno: -111,
            syscall: 'connect',
        });
        expect(isOpaqueServerError(err)).toBe(true);
    });

    it('flags errors with a details string (PostgrestError variant)', () => {
        expect(isOpaqueServerError({
            message: 'duplicate key',
            details: 'Key (email)=(x@y) already exists.',
        })).toBe(true);
    });

    it('does NOT flag plain user-facing Error', () => {
        expect(isOpaqueServerError(new Error('Alliance not found'))).toBe(false);
    });

    it('does NOT flag Error with no structured fields', () => {
        expect(isOpaqueServerError(new Error('Account name is required.'))).toBe(false);
    });

    it('does NOT flag null/undefined/primitives', () => {
        expect(isOpaqueServerError(null)).toBe(false);
        expect(isOpaqueServerError(undefined)).toBe(false);
        expect(isOpaqueServerError('a string')).toBe(false);
        expect(isOpaqueServerError(42)).toBe(false);
    });

    it('does NOT flag a code field that is not a string', () => {
        expect(isOpaqueServerError({ message: 'x', code: 42 })).toBe(false);
    });

    it('does NOT flag a code field that is an empty string', () => {
        expect(isOpaqueServerError({ message: 'x', code: '' })).toBe(false);
    });
});
