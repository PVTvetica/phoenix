// GovernmentContext owns the government domain slices (governmentConfig,
// governmentBranches, governmentPositions, governmentPositionHolders,
// governmentElections, governmentLegislation, governmentMotions,
// governmentsFeatureConfig) that were previously embedded in DataContext. This
// is Phase 3i of the context refactor — a behavior-preserving extraction and the
// LAST Phase 3 extraction. The shim invariant is: useData() still exposes every
// government field with identical names and types, so the 220 consumer files
// that import useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > IntelProvider > HRProvider > WarehouseProvider >
// FleetProvider > AlliancesProvider > GovernmentProvider > DataProvider.
// Government must mount OUTSIDE Data so DataContext can call useGovernment()
// inside its body and re-expose the government fields on its own context value.
// It mounts INSIDE AlliancesProvider for sibling ordering consistency with the
// other Phase 3 domain providers.
//
// State slices owned here (8):
//   governmentConfig, governmentBranches, governmentPositions,
//   governmentPositionHolders, governmentElections, governmentLegislation,
//   governmentMotions, governmentsFeatureConfig
//
// Note: governmentConfig is `GovernmentConfig | null` (per-org config that may
// not exist). governmentsFeatureConfig is the FEATURE flag config with a
// default of `{ enabled: false }`. The server payload field names are:
//   data.governmentsConfig  → setGovernmentsFeatureConfig (FEATURE config)
//   data.governmentConfig   → setGovernmentConfig          (per-org config, null-valid)
// — note the field-name mismatch between "governmentsConfig" (server) and
// "governmentsFeatureConfig" (state). Preserved here line-for-line to match the
// existing DataContext behavior.
//
// Methods owned here:
//   refreshGovernment — exposed for government-internal use after CRUD operations.
//   Currently there are NO local government CRUD methods here; government
//   mutations come through other action paths (government views call apiService
//   directly, and the slice updates come via realtime broadcast +
//   fetchDataSubset('government')). refreshGovernment is also defined locally in
//   DataContext and registered with Government via registerRefreshGovernment so
//   future government-owned CRUD methods can chain post-RPC refreshes without
//   depending on useData() (which would create a context cycle — Government is
//   mounted OUTSIDE Data). Matches the pattern used by Members / Config /
//   Operations / Intel / HR / Warehouse / Fleet / Alliances.
//
// Realtime / state hydration: Government registers EIGHT slice setters with
// DataCore — one per top-level field. Like Warehouse, Fleet, and Alliances (and
// unlike HR which nests under data.hr.*), the government server payload puts
// these fields at the top level. The setters mirror the original DataContext
// fetchDataSubset('government') inline assignments line-for-line, including the
// `!== undefined` check on governmentConfig (because null IS a valid value for
// that slice — see preservation note in the slice-setter useEffect below).
//
// Cross-context dependency: governmentsFeatureConfig is read by DataContext to
// set `governmentsEnabled` via registerFeatureFlags. After move, DataContext
// destructures it from useGovernment() and continues to call registerFeatureFlags
// as before. The useEffect that watches governmentsFeatureConfig and calls
// registerFeatureFlags continues to work — it just reads the destructured value.
// The realtime channel only registers the government_update handler when the
// flag is on; that gating lives in DataCoreContext (governmentsEnabledRef) and
// doesn't change.
//
// Cross-context optimistic updates: DataContext's optimisticUpdate has NO
// branches for government tables currently — confirmed by inspection. If
// government-specific optimistic updates land later, they should be added as new
// branches in DataContext.optimisticUpdate and use setters destructured from
// useGovernment() (matching the HR / Operations pattern).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    GovernmentConfig, GovernmentBranch, GovernmentPosition, GovernmentPositionHolder,
    GovernmentElection, GovernmentLegislation, GovernmentMotion, GovernmentsFeatureConfig,
} from '../types';

// Re-exports — see types/government.ts for the canonical list. Mirrors the
// MembersContext / ConfigContext / OperationsContext / IntelContext /
// HRContext / WarehouseContext / FleetContext / AlliancesContext convention so
// domain consumers can import either from '../contexts/GovernmentContext' or
// '../types/government' interchangeably during the migration.
export type {
    GovernmentConfig,
    GovernmentBranch,
    GovernmentPosition,
    GovernmentPositionHolder,
    GovernmentElection,
    GovernmentLegislation,
    GovernmentMotion,
    GovernmentsFeatureConfig,
} from '../types';

export interface GovernmentContextValue {
    // --- State slices (8) ---
    governmentConfig: GovernmentConfig | null;
    governmentBranches: GovernmentBranch[];
    governmentPositions: GovernmentPosition[];
    governmentPositionHolders: GovernmentPositionHolder[];
    governmentElections: GovernmentElection[];
    governmentLegislation: GovernmentLegislation[];
    governmentMotions: GovernmentMotion[];
    governmentsFeatureConfig: GovernmentsFeatureConfig;

    // --- State setters (exposed so DataContext / future government CRUD can
    //     write through to the canonical state without going through the
    //     slice-setter registry). DataContext is INSIDE Government, so it
    //     consumes these via useGovernment() if it ever needs to. ---
    setGovernmentConfig: React.Dispatch<React.SetStateAction<GovernmentConfig | null>>;
    setGovernmentBranches: React.Dispatch<React.SetStateAction<GovernmentBranch[]>>;
    setGovernmentPositions: React.Dispatch<React.SetStateAction<GovernmentPosition[]>>;
    setGovernmentPositionHolders: React.Dispatch<React.SetStateAction<GovernmentPositionHolder[]>>;
    setGovernmentElections: React.Dispatch<React.SetStateAction<GovernmentElection[]>>;
    setGovernmentLegislation: React.Dispatch<React.SetStateAction<GovernmentLegislation[]>>;
    setGovernmentMotions: React.Dispatch<React.SetStateAction<GovernmentMotion[]>>;
    setGovernmentsFeatureConfig: React.Dispatch<React.SetStateAction<GovernmentsFeatureConfig>>;

    // --- Refresh ---
    refreshGovernment: () =>Promise<void> | void;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshGovernment`
     *  callback is defined. Future government-owned CRUD methods will invoke
     *  the registered fn after their RPC completes so consumers see the new
     *  state without waiting for a realtime broadcast (websocket-reconnect
     *  fallback, same intent as the existing chained fetchDataSubset('government')
     *  pattern). */
    registerRefreshGovernment: (fn: () =>Promise<void> | void) => () => void;
}

const GovernmentContext = createContext<GovernmentContextValue | null>(null);

export const GovernmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { registerSliceSetter } = useDataCore();

    // --- 8 state slices ---
    const [governmentConfig, setGovernmentConfig] = useState<GovernmentConfig | null>(null);
    const [governmentBranches, setGovernmentBranches] = useState<GovernmentBranch[]>([]);
    const [governmentPositions, setGovernmentPositions] = useState<GovernmentPosition[]>([]);
    const [governmentPositionHolders, setGovernmentPositionHolders] = useState<GovernmentPositionHolder[]>([]);
    const [governmentElections, setGovernmentElections] = useState<GovernmentElection[]>([]);
    const [governmentLegislation, setGovernmentLegislation] = useState<GovernmentLegislation[]>([]);
    const [governmentMotions, setGovernmentMotions] = useState<GovernmentMotion[]>([]);
    const [governmentsFeatureConfig, setGovernmentsFeatureConfig] = useState<GovernmentsFeatureConfig>({ enabled: false });

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshGovernment and registers it here on mount;
    // future government-owned CRUD methods will call the registered fn via ref
    // to avoid re-creating callbacks on every Data render. Same pattern as
    // MembersContext / ConfigContext / OperationsContext / IntelContext /
    // HRContext / WarehouseContext / FleetContext / AlliancesContext.
    const refreshGovernmentRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshGovernment = useCallback((fn: () =>Promise<void> | void) => {
        refreshGovernmentRef.current = fn;
        return () => {
            if (refreshGovernmentRef.current === fn) refreshGovernmentRef.current = null;
        };
    }, []);

    const refreshGovernment = useCallback(async () => {
        const fn = refreshGovernmentRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Register EIGHT slice setters keyed by their data-payload field name.
    // Like Warehouse, Fleet, and Alliances (and unlike HR which nests under
    // data.hr.*), the government server payload puts these fields at the top
    // level. Eight separate setters mirror the original DataContext
    // fetchDataSubset('government') inline assignments line-for-line:
    //
    //   if (data.governmentsConfig) setGovernmentsFeatureConfig(data.governmentsConfig);
    //   if (data.governmentConfig !== undefined) setGovernmentConfig(data.governmentConfig);
    //   if (data.governmentBranches) setGovernmentBranches(data.governmentBranches);
    //   if (data.governmentPositions) setGovernmentPositions(data.governmentPositions);
    //   if (data.governmentPositionHolders) setGovernmentPositionHolders(data.governmentPositionHolders);
    //   if (data.governmentElections) setGovernmentElections(data.governmentElections);
    //   if (data.governmentLegislation) setGovernmentLegislation(data.governmentLegislation);
    //   if (data.governmentMotions) setGovernmentMotions(data.governmentMotions);
    //
    // Note the field-name mapping for the FEATURE config: server payload uses
    // "governmentsConfig" but the state slice name is "governmentsFeatureConfig".
    // The setter is keyed under 'governmentsConfig' (server payload key) so the
    // applyStateData(data) fan-out matches the existing DataContext behavior at
    // both the 'government' subset-fetch path AND the setStateFromData
    // (data.governmentsConfig) bulk-state path.
    //
    // Note the `!== undefined` check on governmentConfig: null IS a valid value
    // for that slice (an org that hasn't configured a government yet), so the
    // setter must run when the server explicitly sends null. Preserved here
    // line-for-line.
    useEffect(() => {
        const unregFeature = registerSliceSetter('governmentsConfig', (data: any) => {
            if (data.governmentsConfig) setGovernmentsFeatureConfig(data.governmentsConfig);
        });
        const unregConfig = registerSliceSetter('governmentConfig', (data: any) => {
            if (data.governmentConfig !== undefined) setGovernmentConfig(data.governmentConfig);
        });
        const unregBranches = registerSliceSetter('governmentBranches', (data: any) => {
            if (data.governmentBranches) setGovernmentBranches(data.governmentBranches);
        });
        const unregPositions = registerSliceSetter('governmentPositions', (data: any) => {
            if (data.governmentPositions) setGovernmentPositions(data.governmentPositions);
        });
        const unregPositionHolders = registerSliceSetter('governmentPositionHolders', (data: any) => {
            if (data.governmentPositionHolders) setGovernmentPositionHolders(data.governmentPositionHolders);
        });
        const unregElections = registerSliceSetter('governmentElections', (data: any) => {
            if (data.governmentElections) setGovernmentElections(data.governmentElections);
        });
        const unregLegislation = registerSliceSetter('governmentLegislation', (data: any) => {
            if (data.governmentLegislation) setGovernmentLegislation(data.governmentLegislation);
        });
        const unregMotions = registerSliceSetter('governmentMotions', (data: any) => {
            if (data.governmentMotions) setGovernmentMotions(data.governmentMotions);
        });
        return () => {
            unregFeature();
            unregConfig();
            unregBranches();
            unregPositions();
            unregPositionHolders();
            unregElections();
            unregLegislation();
            unregMotions();
        };
    }, [registerSliceSetter]);

    const value = useMemo<GovernmentContextValue>(() => ({
        // State
        governmentConfig, governmentBranches, governmentPositions, governmentPositionHolders,
        governmentElections, governmentLegislation, governmentMotions, governmentsFeatureConfig,
        // Setters
        setGovernmentConfig, setGovernmentBranches, setGovernmentPositions, setGovernmentPositionHolders,
        setGovernmentElections, setGovernmentLegislation, setGovernmentMotions, setGovernmentsFeatureConfig,
        // Refresh + registration
        refreshGovernment,
        registerRefreshGovernment,
    }), [
        governmentConfig, governmentBranches, governmentPositions, governmentPositionHolders,
        governmentElections, governmentLegislation, governmentMotions, governmentsFeatureConfig,
        refreshGovernment,
        registerRefreshGovernment,
    ]);

    return <GovernmentContext.Provider value={value}>{children}</GovernmentContext.Provider>;
};

export const useGovernment = (): GovernmentContextValue => {
    const ctx = useContext(GovernmentContext);
    if (!ctx) throw new Error('useGovernment must be used within a GovernmentProvider');
    return ctx;
};
