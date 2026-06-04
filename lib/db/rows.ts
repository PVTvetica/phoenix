import type { Database } from '../database.types.js';

/** Flat Row type for a public table, keyed by table name. */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/** Postgres enum union type, keyed by enum name. */
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

/**
 * Type-level helper: rewrite every `null` in a row's column types to
 * `undefined`. Many legacy mappers read columns with bare reads / `|| default`
 * guards into domain fields that are `T | undefined` (never `T | null`). The
 * DB-generated Row types model nullable columns as `T | null`, so passing them
 * straight through trips strict-null checks even though the runtime value is
 * untouched. Applying this to a mapper's INPUT type re-expresses the same value
 * with `undefined` where the domain expects optionality — a pure type-level
 * assertion that changes no runtime behavior. Use ONLY for mappers whose domain
 * fields are `| undefined` optionals; mappers that preserve `| null` (e.g.
 * marketplace / ledger / quartermaster) keep the raw Row.
 */
export type NullToUndefined<T> = {
    [K in keyof T]: null extends T[K] ? Exclude<T[K], null> | undefined : T[K];
};
