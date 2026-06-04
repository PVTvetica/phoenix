import { describe, it, expect, vi } from 'vitest';

// The streamed import (powering the onboarding wizard + admin console progress bar)
// emits ordered ImportProgressEvent callbacks, and the final 'done' result must
// equal the function's return value. Pins that contract against future drift.

vi.mock('../lib/db/common', () => {
    const make = () => {
        const b: any = {
            select: () => b,
            delete: () => b,
            neq: () => Promise.resolve({ error: null }),
            insert: () => Promise.resolve({ error: null }),
            update: () => b,
            eq: () => Promise.resolve({ error: null }),
            // assertDatabaseEmpty's count query awaits the builder → empty DB.
            then: (resolve: any) => Promise.resolve({ count: 0, error: null, data: [] }).then(resolve),
        };
        return b;
    };
    return {
        supabase: { from: () => make(), rpc: () => Promise.resolve({ error: null }) },
        handleSupabaseError: () => {},
    };
});

import { importOrgData, type ImportProgressEvent } from '../lib/db/importer';

const NDJSON = [
    '{"kind":"header","version":1,"tableOrder":["roles"],"manifest":{"roles":2}}',
    '{"kind":"row","t":"roles","r":{"id":10,"name":"Custom1"}}',
    '{"kind":"row","t":"roles","r":{"id":11,"name":"Custom2"}}',
].join('\n');

describe('importOrgData onProgress streaming', () => {
    it('emits start → table → done in order, with totals matching the return value', async () => {
        const events: ImportProgressEvent[] = [];
        const result = await importOrgData(NDJSON, (e) => { events.push(e); });

        const types = events.map((e) => e.type);
        expect(types).toContain('start');
        expect(types).toContain('table');
        expect(types[types.length - 1]).toBe('done');
        expect(types.indexOf('start')).toBeLessThan(types.indexOf('table'));
        expect(types.indexOf('table')).toBeLessThan(types.indexOf('done'));

        const start = events.find((e) => e.type === 'start') as Extract<ImportProgressEvent, { type: 'start' }>;
        expect(start.totalTables).toBe(1);
        expect(start.totalRows).toBe(2);

        const tableEvt = events.find((e) => e.type === 'table') as Extract<ImportProgressEvent, { type: 'table' }>;
        expect(tableEvt.table).toBe('roles');
        expect(tableEvt.inserted).toBe(2);

        const done = events.find((e) => e.type === 'done') as Extract<ImportProgressEvent, { type: 'done' }>;
        expect(done.result.rowsInserted).toBe(2);
        expect(done.result.tablesProcessed).toBe(1);
        expect(result).toEqual(done.result);
    });
});
