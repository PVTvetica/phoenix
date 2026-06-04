// WarehouseContext owns the warehouse domain slices (catalog, stock, requests)
// that were previously embedded in DataContext. This is Phase 3f of the context
// refactor — a behavior-preserving extraction. The shim invariant is: useData()
// still exposes every warehouse field with identical names and types, so the
// 220 consumer files that import useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > IntelProvider > HRProvider > WarehouseProvider >
// DataProvider. Warehouse must mount OUTSIDE Data so DataContext can call
// useWarehouse() inside its body and re-expose the warehouse fields on its own
// context value.
//
// State slices owned here (3):
//   warehouseCatalog, warehouseStock, warehouseRequests
//
// Methods owned here:
//   refreshWarehouse — exposed for warehouse-internal use after CRUD operations.
//   Currently there are NO local warehouse CRUD methods here; warehouse
//   mutations come through other action paths (warehouse views call apiService
//   directly, and the slice updates come via realtime broadcast +
//   fetchDataSubset('warehouse')). refreshWarehouse is also defined locally in
//   DataContext and registered with Warehouse via registerRefreshWarehouse so
//   future warehouse-owned CRUD methods can chain post-RPC refreshes without
//   depending on useData() (which would create a context cycle — Warehouse is
//   mounted OUTSIDE Data). Matches the pattern used by Members / Config /
//   Operations / Intel / HR.
//
// Feature gating: warehouse is feature-gated per-org via
// orgMeta.features.warehouse.enabled. The realtime channel only registers
// warehouse:* broadcast listeners when the flag is on (logic lives in
// DataCoreContext.warehouseEnabledRef and is mirrored in by DataContext via
// registerFeatureFlags). The slice setters here fire regardless — they just
// won't be invoked if the feature is off and the 'warehouse' subset is never
// fetched. No gating logic needs to live in this context.
//
// Realtime / state hydration: Warehouse registers THREE slice setters with
// DataCore, one per top-level field (warehouseCatalog, warehouseStock,
// warehouseRequests). Unlike HR (which nests under data.hr.*), the warehouse
// server payload puts these fields at the top level — so individual setters
// keyed by their data-payload key match the existing setStateFromData behavior
// line-for-line. When DataContext (or any caller) invokes applyStateData(data)
// on DataCore, the registered setters run and populate warehouse state from
// the response of a 'main' / 'warehouse' subset fetch. This replaces the inline
// assignments that used to live in DataContext's setStateFromData() and in the
// 'warehouse' branch of fetchDataSubset.
//
// Cross-context optimistic updates: DataContext's optimisticUpdate has NO
// branches for warehouse tables currently — confirmed by inspection. If
// warehouse-specific optimistic updates land later, they should be added as
// new branches in DataContext.optimisticUpdate and use setters destructured
// from useWarehouse() (matching the HR / Operations pattern).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    WarehouseCatalogItem, WarehouseStock, WarehouseRequest,
} from '../types';

// Re-exports — see types/warehouse.ts for the canonical list. Mirrors the
// MembersContext / ConfigContext / OperationsContext / IntelContext /
// HRContext convention so domain consumers can import either from
// '../contexts/WarehouseContext' or '../types/warehouse' interchangeably during
// the migration.
export type {
    WarehouseCatalogItem,
    WarehouseStock,
    WarehouseRequest,
} from '../types';

export interface WarehouseContextValue {
    // --- State slices (3) ---
    warehouseCatalog: WarehouseCatalogItem[];
    warehouseStock: WarehouseStock[];
    warehouseRequests: WarehouseRequest[];

    // --- State setters (exposed so DataContext / future warehouse CRUD can
    //     write through to the canonical state without going through the
    //     slice-setter registry). DataContext is INSIDE Warehouse, so it
    //     consumes these via useWarehouse() if it ever needs to. ---
    setWarehouseCatalog: React.Dispatch<React.SetStateAction<WarehouseCatalogItem[]>>;
    setWarehouseStock: React.Dispatch<React.SetStateAction<WarehouseStock[]>>;
    setWarehouseRequests: React.Dispatch<React.SetStateAction<WarehouseRequest[]>>;

    // --- Refresh ---
    refreshWarehouse: () =>Promise<void> | void;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshWarehouse`
     *  callback is defined. Future warehouse-owned CRUD methods will invoke
     *  the registered fn after their RPC completes so consumers see the new
     *  state without waiting for a realtime broadcast (websocket-reconnect
     *  fallback, same intent as the existing chained fetchDataSubset('warehouse')
     *  pattern). */
    registerRefreshWarehouse: (fn: () =>Promise<void> | void) => () => void;
}

const WarehouseContext = createContext<WarehouseContextValue | null>(null);

export const WarehouseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { registerSliceSetter } = useDataCore();

    // --- 3 state slices ---
    const [warehouseCatalog, setWarehouseCatalog] = useState<WarehouseCatalogItem[]>([]);
    const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
    const [warehouseRequests, setWarehouseRequests] = useState<WarehouseRequest[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshWarehouse and registers it here on mount;
    // future warehouse-owned CRUD methods will call the registered fn via ref
    // to avoid re-creating callbacks on every Data render. Same pattern as
    // MembersContext / ConfigContext / OperationsContext / IntelContext /
    // HRContext.
    const refreshWarehouseRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshWarehouse = useCallback((fn: () =>Promise<void> | void) => {
        refreshWarehouseRef.current = fn;
        return () => {
            if (refreshWarehouseRef.current === fn) refreshWarehouseRef.current = null;
        };
    }, []);

    const refreshWarehouse = useCallback(async () => {
        const fn = refreshWarehouseRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Register THREE slice setters keyed by their data-payload field name.
    // Unlike HR (which nests fields under data.hr.*), the warehouse server
    // payload puts these fields at the top level (data.warehouseCatalog,
    // data.warehouseStock, data.warehouseRequests). Three separate setters
    // mirror the original DataContext.setStateFromData inline assignments
    // line-for-line:
    //
    //   if (data.warehouseCatalog) setWarehouseCatalog(data.warehouseCatalog);
    //   if (data.warehouseStock) setWarehouseStock(data.warehouseStock);
    //   if (data.warehouseRequests) setWarehouseRequests(data.warehouseRequests);
    useEffect(() => {
        const unregCatalog = registerSliceSetter('warehouseCatalog', (data: any) => {
            if (data.warehouseCatalog) setWarehouseCatalog(data.warehouseCatalog);
        });
        const unregStock = registerSliceSetter('warehouseStock', (data: any) => {
            if (data.warehouseStock) setWarehouseStock(data.warehouseStock);
        });
        const unregRequests = registerSliceSetter('warehouseRequests', (data: any) => {
            if (data.warehouseRequests) setWarehouseRequests(data.warehouseRequests);
        });
        return () => {
            unregCatalog();
            unregStock();
            unregRequests();
        };
    }, [registerSliceSetter]);

    const value = useMemo<WarehouseContextValue>(() => ({
        // State
        warehouseCatalog, warehouseStock, warehouseRequests,
        // Setters
        setWarehouseCatalog, setWarehouseStock, setWarehouseRequests,
        // Refresh + registration
        refreshWarehouse,
        registerRefreshWarehouse,
    }), [
        warehouseCatalog, warehouseStock, warehouseRequests,
        refreshWarehouse,
        registerRefreshWarehouse,
    ]);

    return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
};

export const useWarehouse = (): WarehouseContextValue => {
    const ctx = useContext(WarehouseContext);
    if (!ctx) throw new Error('useWarehouse must be used within a WarehouseProvider');
    return ctx;
};
