import { describe, it, expect } from 'vitest';
import { mergeUsersSlice, mergeRowSlice, byCreatedAtDesc } from '../lib/sliceMerge';
import { makeSliceCoalescer } from '../lib/sliceCoalescer';
import type { User, HydratedOperation } from '../types';

// Unit tests for the pure client-side merge semantics of the realtime
// slice-update path (user_update → users_slice, operation_update →
// operation_slice). The eviction rule (requested-but-absent → remove) is
// only safe because the server slice endpoints THROW on query errors —
// see tests/realtimeSliceDb.test.ts for that half of the contract.

const u = (id: number, name = `user-${id}`): User => ({ id, name } as unknown as User);
const op = (id: string, createdAt: string): HydratedOperation => ({ id, createdAt } as unknown as HydratedOperation);

describe('mergeUsersSlice', () => {
    it('replaces fetched rows in place and leaves others untouched', () => {
        const prev = [u(1, 'one'), u(2, 'two'), u(3, 'three')];
        const next = mergeUsersSlice(prev, [u(2, 'two-updated')], [2]);
        expect(next.map(x => x.name)).toEqual(['one', 'two-updated', 'three']);
        expect(next).not.toBe(prev); // new array ref so React effects re-fire
        expect(next[0]).toBe(prev[0]); // untouched rows keep identity
    });

    it('appends fetched rows that were not in the previous list (new member)', () => {
        const prev = [u(1), u(2)];
        const next = mergeUsersSlice(prev, [u(9, 'new')], [9]);
        expect(next.map(x => x.id)).toEqual([1, 2, 9]);
    });

    it('removes rows that were requested but absent from the response (deleted user)', () => {
        const prev = [u(1), u(2), u(3)];
        const next = mergeUsersSlice(prev, [], [2]);
        expect(next.map(x => x.id)).toEqual([1, 3]);
    });

    it('handles a mixed batch: replace + delete + insert in one merge', () => {
        const prev = [u(1, 'one'), u(2, 'two'), u(3, 'three')];
        // Requested 1 (updated), 2 (deleted), 9 (new); 3 untouched.
        const next = mergeUsersSlice(prev, [u(1, 'one-updated'), u(9, 'new')], [1, 2, 9]);
        expect(next.map(x => x.id)).toEqual([1, 3, 9]);
        expect(next.find(x => x.id === 1)?.name).toBe('one-updated');
    });

    it('never removes rows that were NOT requested, even with an empty response', () => {
        const prev = [u(1), u(2)];
        const next = mergeUsersSlice(prev, [], []);
        expect(next.map(x => x.id)).toEqual([1, 2]);
    });
});

describe('mergeRowSlice (createdAt-desc lists: operations, warrants, bulletins)', () => {
    it('replaces an existing row in place', () => {
        const prev = [op('a', '2026-01-03'), op('b', '2026-01-02')];
        const updated = { ...op('b', '2026-01-02'), name: 'fresh' } as HydratedOperation;
        const next = mergeRowSlice(prev, updated, 'b', byCreatedAtDesc);
        expect(next[1]).toBe(updated);
        expect(next[0]).toBe(prev[0]);
        expect(next).toHaveLength(2);
    });

    it('removes the row on a null result (deleted / no longer visible)', () => {
        const prev = [op('a', '2026-01-03'), op('b', '2026-01-02')];
        const next = mergeRowSlice(prev, null, 'a', byCreatedAtDesc);
        expect(next.map(x => x.id)).toEqual(['b']);
    });

    it('returns the SAME reference when a null result matches no row (skip re-render)', () => {
        const prev = [op('a', '2026-01-03')];
        expect(mergeRowSlice(prev, null, 'zz', byCreatedAtDesc)).toBe(prev);
    });

    it('inserts a new row preserving createdAt-descending order', () => {
        const prev = [op('a', '2026-01-05'), op('b', '2026-01-01')];
        const next = mergeRowSlice(prev, op('c', '2026-01-03'), 'c', byCreatedAtDesc);
        expect(next.map(x => x.id)).toEqual(['a', 'c', 'b']);
    });

    it('appends when the new row is the oldest', () => {
        const prev = [op('a', '2026-01-05'), op('b', '2026-01-03')];
        const next = mergeRowSlice(prev, op('c', '2026-01-01'), 'c', byCreatedAtDesc);
        expect(next.map(x => x.id)).toEqual(['a', 'b', 'c']);
    });

    it('inserts at the head when the new row is the newest (fresh op creation)', () => {
        const prev = [op('a', '2026-01-03')];
        const next = mergeRowSlice(prev, op('c', '2026-01-09'), 'c', byCreatedAtDesc);
        expect(next.map(x => x.id)).toEqual(['c', 'a']);
    });

    it('inserts into an empty list', () => {
        const next = mergeRowSlice([], op('c', '2026-01-09'), 'c', byCreatedAtDesc);
        expect(next.map(x => x.id)).toEqual(['c']);
    });

    it('appends by default when no insert comparator is given', () => {
        const prev = [op('a', '2026-01-01')];
        const next = mergeRowSlice(prev, op('c', '2026-01-09'), 'c');
        expect(next.map(x => x.id)).toEqual(['a', 'c']);
    });
});

describe('makeSliceCoalescer', () => {
    it('coalesces keys arriving mid-flight into one trailing batch', async () => {
        const batches: number[][] = [];
        let release: (() => void) | null = null;
        const coalescer = makeSliceCoalescer<number>(async (batch) => {
            batches.push(batch);
            if (batches.length === 1) await new Promise<void>(r => { release = r; });
        }, () => {});
        const first = coalescer([1]);
        // These arrive while batch #1 is awaiting — they must union into ONE follow-up.
        void coalescer([2]);
        void coalescer([3, 2]);
        release!();
        await first;
        expect(batches).toEqual([[1], [2, 3]]);
    });

    it('drops pending keys and calls onError on failure, then accepts new work', async () => {
        const errors: unknown[] = [];
        let calls = 0;
        const coalescer = makeSliceCoalescer<number>(async () => {
            calls++;
            if (calls === 1) throw new Error('boom');
        }, (e) => errors.push(e));
        await coalescer([1, 2]);
        expect(errors).toHaveLength(1);
        await coalescer([3]); // in-flight flag must have been cleared
        expect(calls).toBe(2);
    });

    it('ignores empty key arrays', async () => {
        let calls = 0;
        const coalescer = makeSliceCoalescer<number>(async () => { calls++; }, () => {});
        await coalescer([]);
        expect(calls).toBe(0);
    });
});
