// Union-coalescer for realtime slice fetches.
//
// A burst of broadcasts for the same slice family (users_slice ids,
// operation/warrant/wiki row ids) must not fan out into one HTTP fetch per
// event. Each coalescer instance accumulates keys into a pending set while a
// single drain loop is in flight: N near-simultaneous events cost at most one
// in-flight fetch plus one trailing catch-up fetch with the unioned keys.
//
// On error the pending set is dropped and `onError` runs (callers fall back
// to a full-subset refetch there); the in-flight flag is always cleared.
//
// Pure + dependency-free (dual-tsconfig, unit-testable) — state lives in the
// closure, so create one instance per slice family and keep it in a ref.

export type SliceCoalescer<K> = (keys: K[]) => Promise<void>;

/**
 * Monotonic generation guard for one client-side array that is written by
 * BOTH full-subset refetches and per-row slice patches. Every fetch calls
 * begin() at start; a response only applies if no later-started fetch has
 * applied first — so a SLOW full refetch (reconnect/visibility resync)
 * resolving after a fresher slice patch cannot clobber it with stale data.
 */
export interface GenGuard {
    begin(): number;
    /** Returns true (and records the gen) if this response may apply. */
    tryApply(gen: number): boolean;
}

export function makeGenGuard(): GenGuard {
    let fetchGen = 0;
    let appliedGen = 0;
    return {
        begin: () => ++fetchGen,
        tryApply: (gen: number) => {
            if (gen >= appliedGen) {
                appliedGen = gen;
                return true;
            }
            return false;
        },
    };
}

export function makeSliceCoalescer<K>(
    runBatch: (batch: K[]) => Promise<void>,
    onError: (err: unknown) => void,
): SliceCoalescer<K> {
    const pending = new Set<K>();
    let inFlight = false;
    return async (keys: K[]) => {
        for (const k of keys) pending.add(k);
        if (pending.size === 0 || inFlight) return; // coalesce into the in-flight drain loop
        inFlight = true;
        try {
            while (pending.size > 0) {
                const batch = [...pending];
                pending.clear();
                await runBatch(batch);
            }
        } catch (err) {
            pending.clear();
            onError(err);
        } finally {
            inFlight = false;
        }
    };
}
