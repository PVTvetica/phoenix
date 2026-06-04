import { describe, it, expect } from 'vitest';
import { stripActorFields, ACTOR_ID_FIELDS } from '../api/services';

describe('stripActorFields', () => {
    it('removes every ACTOR_ID_FIELDS entry plus user and interviewerId', () => {
        const payload: Record<string, any> = {
            // actor fields (all 13 from ACTOR_ID_FIELDS)
            userId: 'u',
            adminId: 'a',
            creatorId: 'c',
            createdById: 'cb',
            authorId: 'au',
            issuedById: 'ib',
            issuerId: 'is',
            reporterId: 'r',
            senderId: 's',
            requesterId: 'rq',
            actorId: 'ac',
            performedById: 'pb',
            appointedById: 'ap',
            // plumbing
            user: { id: 'u', name: 'X' },
            interviewerId: 'iv',
            // payload data (must survive)
            organizationId: 'org-1',
            name: 'My Org',
            settings: { foo: 'bar' },
        };

        const result = stripActorFields(payload) as Record<string, any>;

        // Stripped
        for (const f of ACTOR_ID_FIELDS) {
            expect(result, `should strip ${f}`).not.toHaveProperty(f);
        }
        expect(result).not.toHaveProperty('user');
        expect(result).not.toHaveProperty('interviewerId');

        // Preserved
        expect(result.organizationId).toBe('org-1');
        expect(result.name).toBe('My Org');
        expect(result.settings).toEqual({ foo: 'bar' });
    });

    it('does not mutate the input', () => {
        const payload = { userId: 'u', name: 'X' };
        const snapshot = { ...payload };
        stripActorFields(payload);
        expect(payload).toEqual(snapshot);
    });

    it('returns a new object even when nothing needs stripping', () => {
        const payload = { name: 'X', data: 1 };
        const result = stripActorFields(payload);
        expect(result).not.toBe(payload); // different reference
        expect(result).toEqual(payload);  // same shape
    });

    it('handles an empty payload', () => {
        expect(stripActorFields({})).toEqual({});
    });
});
