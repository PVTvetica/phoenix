import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sample existing rows the mocked Supabase `select(...).in('name', ...)` returns.
// We override this between tests via `setExistingRows`.
let mockedExistingRows: any[] = [];

vi.mock('../lib/db/common', () => {
    const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => Promise.resolve({ data: mockedExistingRows, error: null }),
    };
    return {
        supabase: { from: () => chain },
        handleSupabaseError: () => {},
        broadcastToOrg: () => {},
    };
});

import { previewWarehouseCatalogImport } from '../lib/db/warehouse';

const ORG_ID = '00000000-0000-4000-8000-000000000001';

function setExistingRows(rows: any[]) {
    mockedExistingRows = rows;
}

describe('previewWarehouseCatalogImport', () => {
    beforeEach(() => {
        setExistingRows([]);
    });

    it('counts brand-new items', async () => {
        const items = [
            { name: 'Iron Ore', category: 'ore', qualityLabel: '90-100', unit: 'SCU', description: null, archived: false },
            { name: 'Copper',   category: 'ore', qualityLabel: null,     unit: 'SCU', description: null, archived: false },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.newCount).toBe(2);
        expect(result.updateCount).toBe(0);
        expect(result.skipCount).toBe(0);
        expect(result.invalid).toEqual([]);
        expect(result.total).toBe(2);
    });

    it('marks items as updates when a field differs', async () => {
        setExistingRows([
            { id: 1, name: 'Iron Ore', quality_label: '90-100', category: 'ore', unit: 'SCU', description: null, archived_at: null },
        ]);
        const items = [
            { name: 'Iron Ore', category: 'refined', qualityLabel: '90-100', unit: 'SCU', description: null, archived: false },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.updateCount).toBe(1);
        expect(result.newCount).toBe(0);
        expect(result.skipCount).toBe(0);
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].name).toBe('Iron Ore');
        expect(result.conflicts[0].changes.category).toEqual({ from: 'ore', to: 'refined' });
    });

    it('marks items as skipped when every field matches', async () => {
        setExistingRows([
            { id: 1, name: 'Iron Ore', quality_label: '90-100', category: 'ore', unit: 'SCU', description: 'rocks', archived_at: null },
        ]);
        const items = [
            { name: 'Iron Ore', category: 'ore', qualityLabel: '90-100', unit: 'SCU', description: 'rocks', archived: false },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.skipCount).toBe(1);
        expect(result.newCount).toBe(0);
        expect(result.updateCount).toBe(0);
        expect(result.conflicts).toEqual([]);
    });

    it('flags missing name as invalid', async () => {
        const items = [
            { name: '', category: 'ore', qualityLabel: null, unit: 'SCU' },
            { category: 'ore' }, // no name field at all
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.invalid).toHaveLength(2);
        expect(result.invalid[0].reason).toMatch(/name/i);
        expect(result.newCount).toBe(0);
        expect(result.total).toBe(2);
    });

    it('flags invalid category as invalid', async () => {
        const items = [
            { name: 'Frob', category: 'not-a-category', qualityLabel: null, unit: 'SCU' },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.invalid).toHaveLength(1);
        expect(result.invalid[0].name).toBe('Frob');
        expect(result.invalid[0].reason).toMatch(/category/i);
        expect(result.newCount).toBe(0);
    });

    it('flags duplicate (name + quality) within import file', async () => {
        const items = [
            { name: 'Iron Ore', category: 'ore', qualityLabel: '90-100', unit: 'SCU' },
            { name: 'Iron Ore', category: 'ore', qualityLabel: '90-100', unit: 'SCU' },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.newCount).toBe(1);
        expect(result.invalid).toHaveLength(1);
        expect(result.invalid[0].reason).toMatch(/duplicate/i);
    });

    it('treats same name with different quality as distinct rows', async () => {
        const items = [
            { name: 'Iron Ore', category: 'ore', qualityLabel: '90-100', unit: 'SCU' },
            { name: 'Iron Ore', category: 'ore', qualityLabel: '80-90',  unit: 'SCU' },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.newCount).toBe(2);
        expect(result.invalid).toEqual([]);
    });

    it('matches existing rows by composite (name + quality) key', async () => {
        setExistingRows([
            { id: 1, name: 'Iron Ore', quality_label: '90-100', category: 'ore', unit: 'SCU', description: null, archived_at: null },
        ]);
        // Same name, different quality — should be NEW, not an update of the 90-100 row.
        const items = [
            { name: 'Iron Ore', category: 'ore', qualityLabel: '80-90', unit: 'SCU' },
        ];
        const result = await previewWarehouseCatalogImport(items);
        expect(result.newCount).toBe(1);
        expect(result.updateCount).toBe(0);
        expect(result.skipCount).toBe(0);
    });
});
