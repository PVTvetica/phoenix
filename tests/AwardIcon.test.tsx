import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import AwardIcon from '../components/common/AwardIcon';
import { sanitizeImageUrl, isSafeImageUrl, sanitizeImageUrlOrLocalPath } from '../lib/imageUrl';

describe('AwardIcon', () => {
    it('renders an <img> when a valid https image URL is supplied', () => {
        const { container } = render(
            <AwardIcon imageUrl="https://cdn.example.com/medal.png" icon="fa-solid fa-star" fallbackIcon="fa-solid fa-medal" alt="medal" />
        );
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        expect(img?.getAttribute('src')).toBe('https://cdn.example.com/medal.png');
        expect(img?.getAttribute('alt')).toBe('medal');
        expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
    });

    it('falls back to the FA icon when the image fails to load', () => {
        const { container } = render(
            <AwardIcon imageUrl="https://cdn.example.com/missing.png" icon="fa-solid fa-star" fallbackIcon="fa-solid fa-medal" alt="x" />
        );
        const img = container.querySelector('img');
        expect(img).not.toBeNull();
        fireEvent.error(img!);
        const i = container.querySelector('i');
        expect(i).not.toBeNull();
        expect(i?.className).toContain('fa-solid fa-star');
    });

    it('falls back to fallbackIcon when neither imageUrl nor icon are given', () => {
        const { container } = render(
            <AwardIcon fallbackIcon="fa-solid fa-medal" />
        );
        const i = container.querySelector('i');
        expect(i).not.toBeNull();
        expect(i?.className).toContain('fa-solid fa-medal');
    });

    it('ignores an unsafe imageUrl (non-https or wrong extension) and uses the FA icon', () => {
        const { container } = render(
            <AwardIcon imageUrl="http://cdn.example.com/medal.png" icon="fa-solid fa-star" fallbackIcon="fa-solid fa-medal" />
        );
        expect(container.querySelector('img')).toBeNull();
        const i = container.querySelector('i');
        expect(i?.className).toContain('fa-solid fa-star');
    });
});

describe('sanitizeImageUrl', () => {
    it('accepts https URLs ending in permitted image extensions', () => {
        expect(sanitizeImageUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
        expect(sanitizeImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
        expect(sanitizeImageUrl('https://cdn.example.com/a.JPEG')).toBe('https://cdn.example.com/a.JPEG');
        expect(sanitizeImageUrl('https://cdn.example.com/dir/a.webp')).toBe('https://cdn.example.com/dir/a.webp');
    });

    it('rejects non-https schemes', () => {
        expect(sanitizeImageUrl('http://cdn.example.com/a.png')).toBeNull();
        expect(sanitizeImageUrl('ftp://cdn.example.com/a.png')).toBeNull();
        expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
        expect(sanitizeImageUrl('data:image/png;base64,AAAA')).toBeNull();
    });

    it('rejects SVG and unknown extensions', () => {
        expect(sanitizeImageUrl('https://cdn.example.com/a.svg')).toBeNull();
        expect(sanitizeImageUrl('https://cdn.example.com/a.html')).toBeNull();
        expect(sanitizeImageUrl('https://cdn.example.com/a')).toBeNull();
    });

    it('rejects URLs with embedded credentials', () => {
        expect(sanitizeImageUrl('https://user:pass@cdn.example.com/a.png')).toBeNull();
    });

    it('rejects non-string, empty, or too-long input', () => {
        expect(sanitizeImageUrl(undefined)).toBeNull();
        expect(sanitizeImageUrl(null)).toBeNull();
        expect(sanitizeImageUrl(123 as any)).toBeNull();
        expect(sanitizeImageUrl('')).toBeNull();
        expect(sanitizeImageUrl('   ')).toBeNull();
        const tooLong = 'https://cdn.example.com/' + 'a'.repeat(2100) + '.png';
        expect(sanitizeImageUrl(tooLong)).toBeNull();
    });

    it('isSafeImageUrl is a convenience boolean wrapper', () => {
        expect(isSafeImageUrl('https://cdn.example.com/a.png')).toBe(true);
        expect(isSafeImageUrl('http://cdn.example.com/a.png')).toBe(false);
    });
});

describe('sanitizeImageUrlOrLocalPath', () => {
    it('accepts same-origin static asset paths with image extensions', () => {
        expect(sanitizeImageUrlOrLocalPath('/media/rank-2.png')).toBe('/media/rank-2.png');
        expect(sanitizeImageUrlOrLocalPath('/assets/badge.webp')).toBe('/assets/badge.webp');
        expect(sanitizeImageUrlOrLocalPath('/icons/foo.jpg')).toBe('/icons/foo.jpg');
    });

    it('rejects paths outside the allowed prefixes', () => {
        expect(sanitizeImageUrlOrLocalPath('/etc/passwd.png')).toBeNull();
        expect(sanitizeImageUrlOrLocalPath('/api/query.png')).toBeNull();
        expect(sanitizeImageUrlOrLocalPath('/uploads/a.png')).toBeNull();
    });

    it('rejects protocol-relative and traversal attempts', () => {
        expect(sanitizeImageUrlOrLocalPath('//evil.example/a.png')).toBeNull();
        expect(sanitizeImageUrlOrLocalPath('/media/../../etc/passwd.png')).toBeNull();
        expect(sanitizeImageUrlOrLocalPath('/media\\..\\evil.png')).toBeNull();
    });

    it('still routes external URLs through the strict https sanitizer', () => {
        expect(sanitizeImageUrlOrLocalPath('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
        expect(sanitizeImageUrlOrLocalPath('http://cdn.example.com/a.png')).toBeNull();
        expect(sanitizeImageUrlOrLocalPath('https://cdn.example.com/a.svg')).toBeNull();
    });
});
