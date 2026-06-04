import { describe, it, expect } from 'vitest';
import { computePayouts } from '../lib/operations/payouts';
import type { HydratedOperation } from '../types';

function makeOp(partial: Partial<HydratedOperation>): HydratedOperation {
    return {
        id: 'op-1',
        name: 'Test Op',
        ownerId: 1,
        owner: { id: 1, name: 'Owner' } as any,
        status: 'Planning' as any,
        type: 'Patrol' as any,
        description: '',
        tracksUec: true,
        totalUec: 0,
        totalCosts: 0,
        payoutMode: 'equal',
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        isSpecial: false,
        clearanceLevel: 0,
        isTraining: false,
        limitingMarkers: [],
        participants: [],
        log: [],
        isJoint: false,
        commsPlan: [],
        ...partial,
    } as HydratedOperation;
}

function p(userId: number, name: string, extras: any = {}) {
    return {
        userId,
        user: { id: userId, name } as any,
        timeJoined: new Date(0).toISOString(),
        isReady: false,
        ...extras,
    };
}

describe('computePayouts', () => {
    it('equal mode splits the pool evenly across active participants', () => {
        const op = makeOp({
            payoutMode: 'equal',
            participants: [p(1, 'Alice'), p(2, 'Bob'), p(3, 'Carol'), p(4, 'Dave')],
        });
        const rows = computePayouts(op, 1_000_000);
        expect(rows).toHaveLength(4);
        for (const r of rows) {
            expect(r.amount).toBe(250_000);
            expect(r.sharePercent).toBeCloseTo(25);
        }
    });

    it('equal mode excludes participants who have already left', () => {
        const op = makeOp({
            payoutMode: 'equal',
            participants: [
                p(1, 'Alice'),
                p(2, 'Bob', { timeLeft: new Date().toISOString() }),
                p(3, 'Carol'),
            ],
        });
        const rows = computePayouts(op, 90);
        expect(rows).toHaveLength(2);
        expect(rows.map(r => r.userId).sort()).toEqual([1, 3]);
        expect(rows[0].amount).toBe(45);
    });

    it('weighted mode allocates by time spent in the op', () => {
        const start = Date.UTC(2026, 0, 1, 12, 0, 0);
        // A in for 60min, B in for 30min, C in for 30min — all ending at op end.
        const opEnd = start + 60 * 60 * 1000;
        const op = makeOp({
            payoutMode: 'weighted',
            activeStartTime: new Date(start).toISOString(),
            activeEndTime: new Date(opEnd).toISOString(),
            participants: [
                p(1, 'Alice', { timeJoined: new Date(start).toISOString() }),
                p(2, 'Bob', { timeJoined: new Date(start + 30 * 60 * 1000).toISOString() }),
                p(3, 'Carol', { timeJoined: new Date(start + 30 * 60 * 1000).toISOString() }),
            ],
        });
        const rows = computePayouts(op, 1_000_000, opEnd);
        const byId = new Map(rows.map(r => [r.userId, r]));
        expect(byId.get(1)!.amount).toBe(500_000);
        expect(byId.get(2)!.amount).toBe(250_000);
        expect(byId.get(3)!.amount).toBe(250_000);
    });

    it('custom mode uses persisted share percentages', () => {
        const op = makeOp({
            payoutMode: 'custom',
            participants: [
                p(1, 'Alice', { payoutSharePercent: 50 }),
                p(2, 'Bob', { payoutSharePercent: 30 }),
                p(3, 'Carol', { payoutSharePercent: 20 }),
            ],
        });
        const rows = computePayouts(op, 1_000_000);
        const byId = new Map(rows.map(r => [r.userId, r]));
        expect(byId.get(1)!.amount).toBe(500_000);
        expect(byId.get(2)!.amount).toBe(300_000);
        expect(byId.get(3)!.amount).toBe(200_000);
    });

    it('custom mode renormalises shares that do not sum to 100', () => {
        const op = makeOp({
            payoutMode: 'custom',
            participants: [
                p(1, 'Alice', { payoutSharePercent: 40 }),
                p(2, 'Bob', { payoutSharePercent: 40 }),
                p(3, 'Carol', { payoutSharePercent: 40 }),
            ],
        });
        const rows = computePayouts(op, 900);
        for (const r of rows) {
            expect(r.sharePercent).toBeCloseTo(33.333, 2);
            expect(r.amount).toBe(300);
        }
    });

    it('handles a negative net pool (costs exceed deposits)', () => {
        const op = makeOp({
            payoutMode: 'equal',
            participants: [p(1, 'Alice'), p(2, 'Bob')],
        });
        const rows = computePayouts(op, -100_000);
        expect(rows).toHaveLength(2);
        expect(rows[0].amount).toBe(-50_000);
        expect(rows[1].amount).toBe(-50_000);
    });

    it('returns an empty list when there are no participants', () => {
        const op = makeOp({ payoutMode: 'equal', participants: [] });
        expect(computePayouts(op, 1000)).toEqual([]);
    });

    it('weighted mode falls back to equal split when activeStartTime is missing', () => {
        const op = makeOp({
            payoutMode: 'weighted',
            participants: [p(1, 'Alice'), p(2, 'Bob')],
        });
        const rows = computePayouts(op, 1000);
        expect(rows).toHaveLength(2);
        expect(rows[0].amount).toBe(500);
        expect(rows[1].amount).toBe(500);
    });
});
