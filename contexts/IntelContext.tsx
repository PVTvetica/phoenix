// IntelContext owns the Intel domain slices and bulletin CRUD methods that
// were previously embedded in DataContext. This is Phase 3d of the context
// refactor — a behavior-preserving extraction. The shim invariant is: useData()
// still exposes every Intel field with identical names and types, so the 220
// consumer files that import useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > IntelProvider > DataProvider. Intel must mount OUTSIDE
// Data so DataContext can call useIntel() inside its body and re-expose the
// Intel fields on its own context value.
//
// State slices owned here (4):
//   intelTargetIndex (Map<string, IntelThreatLevel>),
//   intelHubStats, intelDataVersion, activeBulletins
//
// Methods owned here (3):
//   createBulletin, deleteBulletin, refreshIntel
//
// Notes:
//
// - intelTargetIndex is a Map keyed by lowercase targetId. Its slice setter
//   constructs the Map from data.intelTargetIndex (an array of
//   { targetId, threatLevel }), preserving the original normalization that
//   used to live in DataContext.setStateFromData / fetchDataSubset('intel').
//
// - intelDataVersion is a client-side cache buster (no server-driven setter).
//   It increments every time the 'intel' subset is fetched — same behavior as
//   the prior `setIntelDataVersion(v => v + 1)` line at the end of
//   DataContext's `fetchDataSubset('intel')` branch. Intel doesn't register a
//   slice setter for it; instead the slice setter for `activeBulletins` /
//   `intelTargetIndex` is what fires when applyStateData runs from a bulk
//   payload, and the version bump rides on the registered subset fetcher
//   (see registerSubsetFetcher below) so it fires for both the targeted
//   `fetchDataSubset('intel')` path and any future bulk payload that arrives
//   with fresh intel data.
//
// - The other 3 slice setters (intelTargetIndex, intelHubStats, activeBulletins)
//   register with DataCore so when DataContext calls applyStateData(data) after
//   a 'main' subset fetch (which includes activeBulletins / intelTargetIndex /
//   intelHubStats), Intel state populates without DataContext touching it.
//
// Refresh-callback registration: Intel exposes registerRefreshIntel so
// DataContext (which owns `fetchDataSubset`) can register its
// `refreshIntel = useCallback(() => fetchDataSubset('intel'), ...)` here.
// Intel's bulletin CRUD methods call the registered fn after their RPC
// completes. Matches the pattern used by Members / Config / Operations.
//
// Realtime broadcasts (intel_update, bulletin_update) already route through
// DataCore's channel handlers into the DataContext-registered
// fetchDataSubset('intel') call — those handlers don't change here; the
// fetcher still lives in DataContext and writes through Intel's setters via
// the destructured-setters pattern (same as Operations writes through
// setOpsOperations / setOpsWarrants).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    IntelBulletin, IntelHubStats, IntelThreatLevel,
} from '../types';

// Re-exports — see types/intel.ts for the canonical list. Mirrors the
// MembersContext / ConfigContext / OperationsContext convention so domain
// consumers can import either from '../contexts/IntelContext' or
// '../types/intel' interchangeably during the migration.
export type {
    IntelBulletin,
    IntelHubStats,
    HydratedIntelligenceReport,
} from '../types';
export { IntelThreatLevel } from '../types';

export interface IntelContextValue {
    // --- State slices (4) ---
    intelTargetIndex: Map<string, IntelThreatLevel>;
    intelHubStats: IntelHubStats;
    intelDataVersion: number;
    activeBulletins: IntelBulletin[];

    // --- State setters (exposed for DataContext's fetchDataSubset('intel')
    //     branch which still owns the subset-fetch dispatch table; it writes
    //     through these setters so the fetched payload lands in canonical
    //     state. Same approach as Operations.setOpsOperations / setOpsWarrants. ---
    setIntelTargetIndex: React.Dispatch<React.SetStateAction<Map<string, IntelThreatLevel>>>;
    setIntelHubStats: React.Dispatch<React.SetStateAction<IntelHubStats>>;
    setIntelDataVersion: React.Dispatch<React.SetStateAction<number>>;
    setActiveBulletins: React.Dispatch<React.SetStateAction<IntelBulletin[]>>;

    // --- CRUD methods (3 bulletin + 1 report) ---
    createBulletin: (data: any) =>Promise<void>;
    deleteBulletin: (id: string) =>Promise<void>;
    /** Phase 4f — moved from SessionContext. The original wrapper called
     *  optimisticUpdate('intel_reports', ...) before the RPC, but DataContext
     *  has no branch for that table, so the optimistic call was a no-op. The
     *  effective behaviour is RPC then refreshIntel, preserved exactly here. */
    deleteIntelReport: (id: string) =>Promise<void>;
    refreshIntel: () =>Promise<void> | void;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshIntel` callback
     *  is defined. Intel's bulletin CRUD methods invoke the registered fn after
     *  their RPC completes so consumers see the new state without waiting for a
     *  realtime broadcast (websocket-reconnect fallback, same intent as the
     *  existing chained fetchDataSubset('intel') pattern). */
    registerRefreshIntel: (fn: () =>Promise<void> | void) => () => void;
}

const IntelContext = createContext<IntelContextValue | null>(null);

export const IntelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { rpcAction, registerSliceSetter } = useDataCore();

    // --- 4 state slices ---
    const [intelTargetIndex, setIntelTargetIndex] = useState<Map<string, IntelThreatLevel>>(new Map());
    const [intelHubStats, setIntelHubStats] = useState<IntelHubStats>({ totalReports: 0, criticalCount: 0, recentCount7d: 0 });
    const [intelDataVersion, setIntelDataVersion] = useState<number>(0);
    const [activeBulletins, setActiveBulletins] = useState<IntelBulletin[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshIntel and registers it here on mount;
    // Intel's bulletin CRUD methods call the registered fn via ref to avoid
    // re-creating callbacks on every Data render. Same pattern as
    // MembersContext / ConfigContext / OperationsContext.
    const refreshIntelRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshIntel = useCallback((fn: () =>Promise<void> | void) => {
        refreshIntelRef.current = fn;
        return () => {
            if (refreshIntelRef.current === fn) refreshIntelRef.current = null;
        };
    }, []);

    const refreshIntel = useCallback(async () => {
        const fn = refreshIntelRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Each setter applies its slice of a bulk-state payload. When DataContext
    // (or any caller) invokes applyStateData(data) on DataCore, every
    // registered setter runs — populating Intel state from the response of
    // a 'main' / 'intel' subset fetch. This replaces the per-slice inline
    // assignments that used to live in DataContext.setStateFromData() for
    // these fields.
    //
    // intelTargetIndex is special: the payload is an array of
    // { targetId, threatLevel } that must be converted to a Map keyed by
    // lowercase targetId. Preserves the original DataContext.setStateFromData
    // behavior line-for-line.
    //
    // intelDataVersion is NOT registered as a slice setter — it's a
    // client-side cache buster with no server-driven value.
    useEffect(() => {
        const cleanups = [
            registerSliceSetter('intelTargetIndex', (data: any) => {
                if (data.intelTargetIndex) {
                    const m = new Map<string, IntelThreatLevel>();
                    for (const e of data.intelTargetIndex as { targetId: string; threatLevel: IntelThreatLevel }[]) {
                        m.set(e.targetId.toLowerCase(), e.threatLevel);
                    }
                    setIntelTargetIndex(m);
                }
            }),
            registerSliceSetter('intelHubStats', (data: any) => { if (data.intelHubStats) setIntelHubStats(data.intelHubStats); }),
            registerSliceSetter('activeBulletins', (data: any) => { if (data.activeBulletins) setActiveBulletins(data.activeBulletins); }),
        ];
        return () => cleanups.forEach(unreg => unreg());
    }, [registerSliceSetter]);

    // --- CRUD methods (3) ---
    // Mirror the originals 1:1: same RPC action, same payload shape, same
    // post-call refresh. The only structural change is that they call
    // refreshIntel() (which dispatches through the DataContext-registered fn)
    // instead of an in-scope fetchDataSubset('intel') — semantically equivalent.
    const createBulletin = useCallback((data: any) =>
        rpcAction('intel:create_bulletin', data).then(() => { void refreshIntel(); }),
    [rpcAction, refreshIntel]);

    const deleteBulletin = useCallback((id: string) =>
        rpcAction('intel:delete_bulletin', { bulletinId: id }).then(() => { void refreshIntel(); }),
    [rpcAction, refreshIntel]);

    const deleteIntelReport = useCallback((id: string) =>
        rpcAction('intel:delete_report', { reportId: id }).then(() => { void refreshIntel(); }),
    [rpcAction, refreshIntel]);

    const value = useMemo<IntelContextValue>(() => ({
        // State
        intelTargetIndex, intelHubStats, intelDataVersion, activeBulletins,
        // Setters (consumed by DataContext.fetchDataSubset('intel'))
        setIntelTargetIndex, setIntelHubStats, setIntelDataVersion, setActiveBulletins,
        // CRUD + refresh
        createBulletin, deleteBulletin, deleteIntelReport, refreshIntel,
        // Refresh registration
        registerRefreshIntel,
    }), [
        intelTargetIndex, intelHubStats, intelDataVersion, activeBulletins,
        createBulletin, deleteBulletin, deleteIntelReport, refreshIntel,
        registerRefreshIntel,
    ]);

    return <IntelContext.Provider value={value}>{children}</IntelContext.Provider>;
};

export const useIntel = (): IntelContextValue => {
    const ctx = useContext(IntelContext);
    if (!ctx) throw new Error('useIntel must be used within an IntelProvider');
    return ctx;
};
