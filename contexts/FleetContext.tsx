// FleetContext owns the fleet domain slices (shipCatalog, userShips,
// fleetGroups) that were previously embedded in DataContext. This is Phase 3g
// of the context refactor — a behavior-preserving extraction. The shim
// invariant is: useData() still exposes every fleet field with identical names
// and types, so the 220 consumer files that import useData() continue to work
// without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > IntelProvider > HRProvider > WarehouseProvider >
// FleetProvider > DataProvider. Fleet must mount OUTSIDE Data so DataContext
// can call useFleet() inside its body and re-expose the fleet fields on its
// own context value. It mounts INSIDE WarehouseProvider for sibling ordering
// consistency with the other Phase 3 domain providers.
//
// State slices owned here (3):
//   shipCatalog, userShips, fleetGroups
//
// Methods owned here:
//   refreshFleet — exposed for fleet-internal use after CRUD operations.
//   Currently there are NO local fleet CRUD methods here; fleet mutations
//   come through other action paths (fleet views call apiService directly,
//   and the slice updates come via realtime broadcast +
//   fetchDataSubset('fleet')). refreshFleet is also defined locally in
//   DataContext and registered with Fleet via registerRefreshFleet so future
//   fleet-owned CRUD methods can chain post-RPC refreshes without depending
//   on useData() (which would create a context cycle — Fleet is mounted
//   OUTSIDE Data). Matches the pattern used by Members / Config / Operations /
//   Intel / HR / Warehouse.
//
// ensureFleetLoaded lives in DataContext (not here) because it's the
// DataContext value's method per DataContextType. It reads shipCatalog.length
// (which is now in Fleet) via the destructured useFleet() value in
// DataContext, so its existing definition keeps working line-for-line after
// the move.
//
// Realtime / state hydration: Fleet registers THREE slice setters with
// DataCore, one per top-level field (shipCatalog, userShips, fleetGroups).
// Unlike HR (which nests under data.hr.*), the fleet server payload puts
// these fields at the top level — so individual setters keyed by their
// data-payload key match the existing setStateFromData / fetchDataSubset
// behavior line-for-line. When DataContext (or any caller) invokes
// applyStateData(data) on DataCore, the registered setters run and populate
// fleet state from the response of a 'main' / 'fleet' subset fetch. This
// replaces the inline assignments that used to live in DataContext's
// 'fleet' branch of fetchDataSubset.
//
// Cross-context optimistic updates: DataContext's optimisticUpdate has NO
// branches for fleet tables currently — confirmed by inspection. If
// fleet-specific optimistic updates land later, they should be added as new
// branches in DataContext.optimisticUpdate and use setters destructured from
// useFleet() (matching the HR / Operations pattern).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    PlatformShip, UserShip, FleetGroup,
} from '../types';

// Re-exports — see types/fleet.ts for the canonical list. Mirrors the
// MembersContext / ConfigContext / OperationsContext / IntelContext /
// HRContext / WarehouseContext convention so domain consumers can import
// either from '../contexts/FleetContext' or '../types/fleet' interchangeably
// during the migration.
export type {
    PlatformShip,
    UserShip,
    FleetGroup,
} from '../types';

export interface FleetContextValue {
    // --- State slices (3) ---
    shipCatalog: PlatformShip[];
    userShips: UserShip[];
    fleetGroups: FleetGroup[];

    // --- State setters (exposed so DataContext / future fleet CRUD can
    //     write through to the canonical state without going through the
    //     slice-setter registry). DataContext is INSIDE Fleet, so it
    //     consumes these via useFleet() if it ever needs to. ---
    setShipCatalog: React.Dispatch<React.SetStateAction<PlatformShip[]>>;
    setUserShips: React.Dispatch<React.SetStateAction<UserShip[]>>;
    setFleetGroups: React.Dispatch<React.SetStateAction<FleetGroup[]>>;

    // --- Refresh ---
    refreshFleet: () =>Promise<void> | void;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshFleet`
     *  callback is defined. Future fleet-owned CRUD methods will invoke
     *  the registered fn after their RPC completes so consumers see the new
     *  state without waiting for a realtime broadcast (websocket-reconnect
     *  fallback, same intent as the existing chained fetchDataSubset('fleet')
     *  pattern). */
    registerRefreshFleet: (fn: () =>Promise<void> | void) => () => void;
}

const FleetContext = createContext<FleetContextValue | null>(null);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { registerSliceSetter } = useDataCore();

    // --- 3 state slices ---
    const [shipCatalog, setShipCatalog] = useState<PlatformShip[]>([]);
    const [userShips, setUserShips] = useState<UserShip[]>([]);
    const [fleetGroups, setFleetGroups] = useState<FleetGroup[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshFleet and registers it here on mount;
    // future fleet-owned CRUD methods will call the registered fn via ref
    // to avoid re-creating callbacks on every Data render. Same pattern as
    // MembersContext / ConfigContext / OperationsContext / IntelContext /
    // HRContext / WarehouseContext.
    const refreshFleetRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshFleet = useCallback((fn: () =>Promise<void> | void) => {
        refreshFleetRef.current = fn;
        return () => {
            if (refreshFleetRef.current === fn) refreshFleetRef.current = null;
        };
    }, []);

    const refreshFleet = useCallback(async () => {
        const fn = refreshFleetRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Register THREE slice setters keyed by their data-payload field name.
    // Unlike HR (which nests fields under data.hr.*), the fleet server
    // payload puts these fields at the top level (data.shipCatalog,
    // data.userShips, data.fleetGroups). Three separate setters mirror the
    // original DataContext fetchDataSubset('fleet') inline assignments
    // line-for-line:
    //
    //   if (data.shipCatalog) setShipCatalog(data.shipCatalog);
    //   if (data.userShips) setUserShips(data.userShips);
    //   if (data.fleetGroups) setFleetGroups(data.fleetGroups);
    useEffect(() => {
        const unregCatalog = registerSliceSetter('shipCatalog', (data: any) => {
            if (data.shipCatalog) setShipCatalog(data.shipCatalog);
        });
        const unregUserShips = registerSliceSetter('userShips', (data: any) => {
            if (data.userShips) setUserShips(data.userShips);
        });
        const unregGroups = registerSliceSetter('fleetGroups', (data: any) => {
            if (data.fleetGroups) setFleetGroups(data.fleetGroups);
        });
        return () => {
            unregCatalog();
            unregUserShips();
            unregGroups();
        };
    }, [registerSliceSetter]);

    const value = useMemo<FleetContextValue>(() => ({
        // State
        shipCatalog, userShips, fleetGroups,
        // Setters
        setShipCatalog, setUserShips, setFleetGroups,
        // Refresh + registration
        refreshFleet,
        registerRefreshFleet,
    }), [
        shipCatalog, userShips, fleetGroups,
        refreshFleet,
        registerRefreshFleet,
    ]);

    return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
};

export const useFleet = (): FleetContextValue => {
    const ctx = useContext(FleetContext);
    if (!ctx) throw new Error('useFleet must be used within a FleetProvider');
    return ctx;
};
