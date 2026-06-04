// HRContext owns the HR domain slices that were previously embedded in
// DataContext. This is Phase 3e of the context refactor — a behavior-preserving
// extraction. The shim invariant is: useData() still exposes every HR field
// with identical names and types, so the 220 consumer files that import
// useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > IntelProvider > HRProvider > DataProvider. HR must
// mount OUTSIDE Data so DataContext can call useHR() inside its body and
// re-expose the HR fields on its own context value.
//
// State slices owned here (6):
//   hrApplicants, hrInterviews, hrJobs, hrTemplates, hrTransfers, hrPositions
//
// Methods owned here:
//   refreshHR — exposed for HR-internal use after CRUD operations. Currently
//   there are NO local HR CRUD methods here; HR mutations come through other
//   action paths (AuthContext simpleAction wrappers pending the Phase 4 sweep).
//   refreshHR is also defined locally in DataContext and registered with HR
//   via registerRefreshHR so future HR-owned CRUD methods can chain post-RPC
//   refreshes without depending on useData() (which would create a context
//   cycle — HR is mounted OUTSIDE Data). Matches the pattern used by Members /
//   Config / Operations / Intel.
//
// Realtime / state hydration: HR registers a SINGLE slice setter with DataCore
// under the key 'hr' that handles all 6 HR fields if data.hr is present.
// This mirrors the original DataContext.setStateFromData behavior line-for-line
// (the server payload nests HR fields under a `hr` object). When DataContext
// (or any caller) invokes applyStateData(data) on DataCore, that registered
// setter runs and populates HR state from the response of a 'main' / 'hr'
// subset fetch. This replaces the nested-block inline assignments that used to
// live in DataContext's setStateFromData() for these fields.
//
// Cross-context optimistic updates: DataContext's optimisticUpdate has
// 'hr_applications' and 'hr_interviews' branches that write to setHrApplicants
// / setHrInterviews. Those setters now live here and are exposed on the
// context value; DataContext destructures them and uses them in its
// optimisticUpdate. Matches the MembersContext / OperationsContext approach.
//
// setHrJobs is exposed directly on the useData() public value per the
// DataContextType interface; DataContext destructures it from useHR() and
// forwards it on its own value object to preserve the public shape.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    HydratedHRApplication, HydratedHRInterview, JobPosting,
    HRInterviewTemplate, TransferRequest, PersonnelPosition,
} from '../types';

// Re-exports — see types/hr.ts for the canonical list. Mirrors the
// MembersContext / ConfigContext / OperationsContext / IntelContext convention
// so domain consumers can import either from '../contexts/HRContext' or
// '../types/hr' interchangeably during the migration.
export type {
    HydratedHRApplication,
    HydratedHRInterview,
    JobPosting,
    HRInterviewTemplate,
    TransferRequest,
    PersonnelPosition,
} from '../types';

export interface HRContextValue {
    // --- State slices (6) ---
    hrApplicants: HydratedHRApplication[];
    hrInterviews: HydratedHRInterview[];
    hrJobs: JobPosting[];
    hrTemplates: HRInterviewTemplate[];
    hrTransfers: TransferRequest[];
    hrPositions: PersonnelPosition[];

    // --- State setters (exposed for DataContext's optimisticUpdate branches
    //     that handle 'hr_applications' and 'hr_interviews', and for the
    //     setHrJobs forward on the useData() public value per
    //     DataContextType). DataContext is INSIDE HR, so it consumes these
    //     setters via useHR(). ---
    setHrApplicants: React.Dispatch<React.SetStateAction<HydratedHRApplication[]>>;
    setHrInterviews: React.Dispatch<React.SetStateAction<HydratedHRInterview[]>>;
    setHrJobs: React.Dispatch<React.SetStateAction<JobPosting[]>>;
    setHrTemplates: React.Dispatch<React.SetStateAction<HRInterviewTemplate[]>>;
    setHrTransfers: React.Dispatch<React.SetStateAction<TransferRequest[]>>;
    setHrPositions: React.Dispatch<React.SetStateAction<PersonnelPosition[]>>;

    // --- Refresh ---
    refreshHR: () =>Promise<void> | void;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshHR` callback
     *  is defined. Future HR-owned CRUD methods will invoke the registered fn
     *  after their RPC completes so consumers see the new state without
     *  waiting for a realtime broadcast (websocket-reconnect fallback, same
     *  intent as the existing chained fetchDataSubset('hr') pattern). */
    registerRefreshHR: (fn: () =>Promise<void> | void) => () => void;
}

const HRContext = createContext<HRContextValue | null>(null);

export const HRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { registerSliceSetter } = useDataCore();

    // --- 6 state slices ---
    const [hrApplicants, setHrApplicants] = useState<HydratedHRApplication[]>([]);
    const [hrInterviews, setHrInterviews] = useState<HydratedHRInterview[]>([]);
    const [hrJobs, setHrJobs] = useState<JobPosting[]>([]);
    const [hrTemplates, setHrTemplates] = useState<HRInterviewTemplate[]>([]);
    const [hrTransfers, setHrTransfers] = useState<TransferRequest[]>([]);
    const [hrPositions, setHrPositions] = useState<PersonnelPosition[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshHR and registers it here on mount; future
    // HR-owned CRUD methods will call the registered fn via ref to avoid
    // re-creating callbacks on every Data render. Same pattern as
    // MembersContext / ConfigContext / OperationsContext / IntelContext.
    const refreshHRRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshHR = useCallback((fn: () =>Promise<void> | void) => {
        refreshHRRef.current = fn;
        return () => {
            if (refreshHRRef.current === fn) refreshHRRef.current = null;
        };
    }, []);

    const refreshHR = useCallback(async () => {
        const fn = refreshHRRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Register a SINGLE slice setter under key 'hr' that handles all 6 HR
    // fields if data.hr is present. This mirrors the original
    // DataContext.setStateFromData nested-block:
    //
    //   if (data.hr) {
    //       if (data.hr.applicants) setHrApplicants(data.hr.applicants);
    //       if (data.hr.interviews) setHrInterviews(data.hr.interviews);
    //       if (data.hr.jobs) setHrJobs(data.hr.jobs);
    //       if (data.hr.templates) setHrTemplates(data.hr.templates);
    //       if (data.hr.transfers) setHrTransfers(data.hr.transfers);
    //       if (data.hr.positions) setHrPositions(data.hr.positions);
    //   }
    //
    // Single-setter approach matches the server payload shape (HR fields are
    // nested under a `hr` object) and is simpler than registering 6 separate
    // setters that each re-check `data.hr`.
    useEffect(() => {
        const unreg = registerSliceSetter('hr', (data: any) => {
            if (data.hr) {
                if (data.hr.applicants) setHrApplicants(data.hr.applicants);
                if (data.hr.interviews) setHrInterviews(data.hr.interviews);
                if (data.hr.jobs) setHrJobs(data.hr.jobs);
                if (data.hr.templates) setHrTemplates(data.hr.templates);
                if (data.hr.transfers) setHrTransfers(data.hr.transfers);
                if (data.hr.positions) setHrPositions(data.hr.positions);
            }
        });
        return unreg;
    }, [registerSliceSetter]);

    const value = useMemo<HRContextValue>(() => ({
        // State
        hrApplicants, hrInterviews, hrJobs, hrTemplates, hrTransfers, hrPositions,
        // Setters (consumed by DataContext.optimisticUpdate + setHrJobs forward)
        setHrApplicants, setHrInterviews, setHrJobs,
        setHrTemplates, setHrTransfers, setHrPositions,
        // Refresh + registration
        refreshHR,
        registerRefreshHR,
    }), [
        hrApplicants, hrInterviews, hrJobs, hrTemplates, hrTransfers, hrPositions,
        refreshHR,
        registerRefreshHR,
    ]);

    return <HRContext.Provider value={value}>{children}</HRContext.Provider>;
};

export const useHR = (): HRContextValue => {
    const ctx = useContext(HRContext);
    if (!ctx) throw new Error('useHR must be used within an HRProvider');
    return ctx;
};
