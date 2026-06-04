// Re-exports of Warehouse domain types for future-PR cleanliness.
// This file establishes the import boundary for the Warehouse domain so consumers
// can migrate from `import { WarehouseCatalogItem, ... } from '../types'` to
// `import { WarehouseCatalogItem, ... } from '../types/warehouse'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    WarehouseCatalogItem,
    WarehouseStock,
    WarehouseRequest,
} from '../types';
