import { describe, it, expect } from 'vitest';
import { stripHtml, stripHtmlSingleLine } from '../lib/textSanitize';
import { requireUuid, requireIntId } from '../lib/pgrest';
import { sanitizePublicLinkUrl } from '../lib/linkUrl';

describe('stripHtml', () => {
    it('removes all HTML tags', () => {
        expect(stripHtml('<script>alert(1)</script>hello', 1000)).toBe('alert(1)hello');
        expect(stripHtml('<b>bold</b>', 1000)).toBe('bold');
        expect(stripHtml('<img src=x onerror=y>', 1000)).toBe('');
    });

    it('preserves newlines and tabs but drops other control chars', () => {
        expect(stripHtml('line 1\nline 2\ttab', 1000)).toBe('line 1\nline 2\ttab');
        expect(stripHtml('a\x00\x01\x7fb', 1000)).toBe('ab');
    });

    it('caps length', () => {
        expect(stripHtml('x'.repeat(500), 100).length).toBe(100);
    });

    it('coerces non-strings to empty string', () => {
        expect(stripHtml(undefined, 100)).toBe('');
        expect(stripHtml(null, 100)).toBe('');
        expect(stripHtml(42 as any, 100)).toBe('');
    });
});

describe('stripHtmlSingleLine', () => {
    it('collapses whitespace to single spaces', () => {
        expect(stripHtmlSingleLine('a\n\nb\t\tc', 100)).toBe('a b c');
        expect(stripHtmlSingleLine('  many   spaces  ', 100)).toBe('many spaces');
    });

    it('strips HTML and control chars like stripHtml', () => {
        expect(stripHtmlSingleLine('<b>title</b>\n', 100)).toBe('title');
    });

    it('caps length after normalisation', () => {
        expect(stripHtmlSingleLine('x'.repeat(500), 50).length).toBe(50);
    });
});

describe('requireUuid', () => {
    it('accepts canonical UUIDs', () => {
        expect(requireUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('rejects PostgREST-injection payloads', () => {
        expect(() => requireUuid('abc},target_id.eq.victim,x.{')).toThrow();
        expect(() => requireUuid('not-a-uuid')).toThrow();
        expect(() => requireUuid('')).toThrow();
        expect(() => requireUuid(null)).toThrow();
        expect(() => requireUuid(42 as any)).toThrow();
    });
});

describe('requireIntId', () => {
    it('accepts safe integers (number and string form)', () => {
        expect(requireIntId(42)).toBe('42');
        expect(requireIntId('1234')).toBe('1234');
        expect(requireIntId(0)).toBe('0');
    });

    it('rejects injection payloads and bad values', () => {
        expect(() => requireIntId('1,2')).toThrow();
        expect(() => requireIntId('1 OR 1=1')).toThrow();
        expect(() => requireIntId(-1)).toThrow();
        expect(() => requireIntId(1.5)).toThrow();
        expect(() => requireIntId(NaN)).toThrow();
        expect(() => requireIntId(Infinity)).toThrow();
    });
});

describe('sanitizePublicLinkUrl', () => {
    it('accepts public https URLs', () => {
        expect(sanitizePublicLinkUrl('https://example.com/path')).toBe('https://example.com/path');
        expect(sanitizePublicLinkUrl('https://discord.com/invite/abc')).toBe('https://discord.com/invite/abc');
    });

    it('accepts discord:// URIs', () => {
        expect(sanitizePublicLinkUrl('discord://invite/abc')).toBe('discord://invite/abc');
    });

    it('rejects non-allowed schemes', () => {
        expect(sanitizePublicLinkUrl('http://example.com')).toBeNull();
        expect(sanitizePublicLinkUrl('javascript:alert(1)')).toBeNull();
        expect(sanitizePublicLinkUrl('data:text/html,<script>')).toBeNull();
        expect(sanitizePublicLinkUrl('file:///etc/passwd')).toBeNull();
    });

    it('rejects localhost and .local hostnames', () => {
        expect(sanitizePublicLinkUrl('https://localhost/admin')).toBeNull();
        expect(sanitizePublicLinkUrl('https://foo.localhost/admin')).toBeNull();
        expect(sanitizePublicLinkUrl('https://router.local/admin')).toBeNull();
        expect(sanitizePublicLinkUrl('https://nas.internal/')).toBeNull();
    });

    it('rejects private IPv4 ranges', () => {
        expect(sanitizePublicLinkUrl('https://127.0.0.1/')).toBeNull();
        expect(sanitizePublicLinkUrl('https://10.0.0.1/')).toBeNull();
        expect(sanitizePublicLinkUrl('https://192.168.1.1/')).toBeNull();
        expect(sanitizePublicLinkUrl('https://172.16.5.5/')).toBeNull();
        expect(sanitizePublicLinkUrl('https://169.254.169.254/')).toBeNull(); // AWS metadata
        expect(sanitizePublicLinkUrl('https://0.0.0.0/')).toBeNull();
    });

    it('rejects IPv6 literals', () => {
        expect(sanitizePublicLinkUrl('https://[::1]/')).toBeNull();
        expect(sanitizePublicLinkUrl('https://[fe80::1]/')).toBeNull();
    });

    it('rejects URLs with embedded credentials', () => {
        expect(sanitizePublicLinkUrl('https://user:pass@example.com/')).toBeNull();
    });

    it('rejects overlong and empty input', () => {
        expect(sanitizePublicLinkUrl('')).toBeNull();
        expect(sanitizePublicLinkUrl('https://example.com/' + 'a'.repeat(1000))).toBeNull();
        expect(sanitizePublicLinkUrl(null)).toBeNull();
    });
});
