// Pure row-merge helpers for the realtime slice-update path.
//
// When a user_update / operation_update broadcast carries the affected row
// id(s), the client fetches ONLY those rows (users_slice / operation_slice
// query subsets) and splices them into the arrays it already holds, instead
// of refetching the whole 'main' / 'operations' bundle. These helpers
// implement the splice semantics; DataContext owns the fetching/coalescing.
//
// Pure + dependency-free so they compile under BOTH tsconfigs (server tsc
// includes lib/**) and unit-test trivially — same pattern as commsPlanLinks.

import type { User } from '../types.js';

/**
 * Merge freshly-fetched lite roster rows into the previous users array.
 *  - rows present in `fetched` replace their previous versions (or append,
 *    e.g. a newly created member — getMainState's roster has no server-side
 *    ordering, so append matches it);
 *  - ids that were REQUESTED but are absent from `fetched` are removed —
 *    the server filters deleted users, so absence means deleted.
 *
 * Callers must only invoke this on a successful fetch: the server slice
 * endpoint throws (HTTP 500) on query errors precisely so a transient
 * failure can never masquerade as "these users no longer exist".
 *
 * Note: replaced rows intentionally do NOT preserve the client-merged
 * presence field (lastActiveAt from the users_presence subset) — identical
 * semantics to the full 'main' refetch this path replaces; the next
 * duty_update re-merges it.
 */
export function mergeUsersSlice(prev: User[], fetched: User[], requestedIds: number[]): User[] {
    const fetchedById = new Map<number, User>(fetched.map((u) => [u.id, u]));
    const requested = new Set<number>(requestedIds);
    const replaced = new Set<number>();
    const next: User[] = [];
    for (const u of prev) {
        const replacement = fetchedById.get(u.id);
        if (replacement) {
            next.push(replacement);
            replaced.add(u.id);
        } else if (!requested.has(u.id)) {
            next.push(u);
        }
        // requested but absent from fetched → deleted: drop the row
    }
    for (const u of fetched) {
        if (!replaced.has(u.id)) next.push(u);
    }
    return next;
}

/**
 * Insert-position helper for lists the server returns createdAt-descending
 * (operations, warrants, bulletins): first index whose row is older than the
 * incoming one, else append.
 */
export function byCreatedAtDesc<T extends { createdAt: string }>(prev: T[], row: T): number {
    const createdAt = new Date(row.createdAt).getTime();
    const idx = prev.findIndex((o) => new Date(o.createdAt).getTime() < createdAt);
    return idx === -1 ? prev.length : idx;
}

/**
 * Merge a freshly-fetched single list-shaped row into the previous array
 * (operations, warrants, wiki pages, bulletins — any id-keyed list slice).
 *  - `row === null` means the server says "absent or not visible to you"
 *    (deleted, or clearance/markers raised above the viewer) → remove the
 *    row, mirroring what a full list refetch would have done;
 *  - an existing row is replaced in place;
 *  - a new row is inserted at `findInsertIndex(prev, row)` (pass
 *    byCreatedAtDesc for createdAt-descending lists; defaults to append).
 *
 * Returns `prev` unchanged (same reference) when a null result matches no
 * row, so React state setters skip a pointless re-render.
 */
export function mergeRowSlice<T extends { id: string | number }>(
    prev: T[],
    row: T | null,
    requestedId: string | number,
    findInsertIndex?: (prev: T[], row: T) => number,
): T[] {
    if (!row) {
        const without = prev.filter((o) => o.id !== requestedId);
        return without.length === prev.length ? prev : without;
    }
    const idx = prev.findIndex((o) => o.id === row.id);
    if (idx !== -1) {
        const next = prev.slice();
        next[idx] = row;
        return next;
    }
    const insertAt = findInsertIndex ? findInsertIndex(prev, row) : prev.length;
    const next = prev.slice();
    next.splice(insertAt, 0, row);
    return next;
}
