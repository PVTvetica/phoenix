import { describe, it, expect } from 'vitest';
import { parseRadioChannelId } from '../lib/radio';

describe('parseRadioChannelId', () => {
    it('parses matrix channel ids', () => {
        expect(parseRadioChannelId('dispatch-global')).toEqual({ kind: 'matrix', channelId: 'dispatch-global' });
        expect(parseRadioChannelId('tac-1')).toEqual({ kind: 'matrix', channelId: 'tac-1' });
    });

    it('parses unit tactical channels', () => {
        expect(parseRadioChannelId('unit-42')).toEqual({ kind: 'unit', unitId: 42 });
    });

    it('parses mission ops channels with hyphenated request ids', () => {
        expect(parseRadioChannelId('req-f5bf590a-b97b-4dce-ba2b-1c7b3e78cb67')).toEqual({
            kind: 'request',
            requestId: 'f5bf590a-b97b-4dce-ba2b-1c7b3e78cb67',
        });
    });

    it('returns null for empty ids', () => {
        expect(parseRadioChannelId('')).toBeNull();
        expect(parseRadioChannelId('req-')).toBeNull();
    });
});
