// OperationsContext owns the Operations domain slices and template/refresh
// methods that were previously embedded in DataContext. This is Phase 3c of
// the context refactor — a behavior-preserving extraction. The shim invariant
// is: useData() still exposes every Operations field with identical names and
// types, so the 220 consumer files that import useData() continue to work
// without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider >
// OperationsProvider > DataProvider. Operations must mount OUTSIDE Data so
// DataContext can call useOperations() inside its body and re-expose the
// Operations fields on its own context value.
//
// State slices owned here (3):
//   operations, operationTemplates, warrants
//
// (radioChannels was originally listed for this phase but Phase 3b moved it
// into ConfigContext alongside the other admin-managed reference data — so
// it's NOT owned here. Sourced from useConfig() at the DataContext layer.)
//
// Methods owned here (5 templates + 2 refresh helpers):
//   createOperationTemplate, updateOperationTemplate, deleteOperationTemplate,
//   extractTemplateFromOperation, importOperationTemplate
//   refreshOperations, refreshWarrants
//
// Phase 4a landed the full operation-CRUD surface (create, update, status
// changes, participant management, payouts, readiness, timeline, RSVP) into
// this context — see the "Operation CRUD methods" block below. Consumers
// migrated to useOperations() in Phase 4b.
//
// Realtime / state hydration: Operations registers a slice setter with
// DataCore for each of its 3 slices (Phase 0b plumbing). When DataContext
// calls applyStateData(data) after fetching the 'main' / 'operations' /
// 'warrants' subset, those registered setters fire and populate Operations's
// local state. This replaces the per-slice inline assignments that used to
// live in DataContext's setStateFromData() switch for these fields.
//
// Refresh callbacks: the 5 template methods chain fetchDataSubset('operations')
// after their RPC succeeds (templates ship in the operations subset bundle).
// Since Operations lives OUTSIDE Data, it can't read useData() directly
// (would cycle). Instead, DataContext registers its refreshOperations and
// refreshWarrants functions with Operations at mount via registerRefreshOperations
// / registerRefreshWarrants, and Operations's methods call them via ref after
// the RPC completes. Same registration pattern as MembersContext (Phase 3a)
// and ConfigContext (Phase 3b).
//
// Cross-context optimistic updates: DataContext's optimisticUpdate has
// 'operations' and 'warrants' branches that write to setOperations /
// setWarrants. Those setters now live here and are exposed on the context
// value; DataContext destructures them and uses them in its optimisticUpdate.
// Matches the MembersContext approach (setRanks / setUnits exposed for the
// same reason).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    HydratedOperation, HydratedWarrant, OperationTemplate, OperationTemplatePayload,
} from '../types';

// Re-exports — see types/operations.ts for the canonical list. Mirrors the
// ConfigContext convention so domain consumers can import either from
// '../contexts/OperationsContext' or '../types/operations' interchangeably
// during the migration.
export type {
    HydratedOperation,
    HydratedOperationTeam,
    HydratedOperationPosition,
    HydratedWarrant,
    OperationTemplate,
    OperationTemplatePayload,
} from '../types';

export interface OperationsContextValue {
    // --- State slices (3) ---
    operations: HydratedOperation[];
    operationTemplates: OperationTemplate[];
    warrants: HydratedWarrant[];

    // --- State setters (exposed for DataContext's optimisticUpdate branches
    //     that handle 'operations' and 'warrants'; DataContext is INSIDE
    //     Operations, so it consumes these setters via useOperations().) ---
    setOperations: React.Dispatch<React.SetStateAction<HydratedOperation[]>>;
    setOperationTemplates: React.Dispatch<React.SetStateAction<OperationTemplate[]>>;
    setWarrants: React.Dispatch<React.SetStateAction<HydratedWarrant[]>>;

    // --- Template methods (5) ---
    createOperationTemplate: (data: { name: string; description?: string; payload: OperationTemplatePayload }) =>Promise<OperationTemplate>;
    updateOperationTemplate: (id: number, updates: { name?: string; description?: string; payload?: OperationTemplatePayload }) =>Promise<OperationTemplate>;
    deleteOperationTemplate: (id: number) =>Promise<void>;
    extractTemplateFromOperation: (operationId: string) =>Promise<OperationTemplatePayload>;
    importOperationTemplate: (data: { name: string; description?: string; payload: OperationTemplatePayload }) =>Promise<OperationTemplate>;

    // --- Operation CRUD methods (Phase 4a — moved from SessionContext) ---
    createOperation: (data: any) =>Promise<any>;
    deleteOperation: (id: string) =>Promise<void>;
    updateOperationStatus: (id: string, status: string) =>Promise<void>;
    updateOperationDetails: (id: string, updates: any) =>Promise<any>;
    joinOperation: (id: string, code?: string) =>Promise<void>;
    joinOperationWithShip: (id: string, opts: { joinCode?: string; roleRequested?: string; shipUtilized?: string; shipId?: number; userShipId?: number }) =>Promise<void>;
    acceptOperationInvite: (operationId: string) =>Promise<void>;
    declineOperationInvite: (operationId: string) =>Promise<void>;
    leaveOperation: (id: string) =>Promise<void>;
    addOperationParticipant: (opId: string, userId: number) =>Promise<void>;
    updateOperationParticipant: (opId: string, userId: number, data: any) =>Promise<void>;
    removeOperationParticipant: (opId: string, userId: number) =>Promise<void>;
    addOperationUec: (opId: string, amount: number, reason: string) =>Promise<void>;
    addOperationCost: (opId: string, amount: number, category: string, description?: string) =>Promise<void>;
    setOperationPayoutMode: (opId: string, mode: 'equal' | 'weighted' | 'custom') =>Promise<void>;
    setOperationPayoutSplits: (opId: string, splits: Array<{ userId: number; percent: number }>) =>Promise<void>;
    toggleParticipantPayoutPaid: (opId: string, targetUserId: number, paid: boolean) =>Promise<void>;
    toggleParticipantReady: (opId: string) =>Promise<void>;
    updateParticipantLiveStatus: (opId: string, liveStatus: string) =>Promise<void>;
    resetOperationReadiness: (opId: string) =>Promise<void>;
    addOperationTimelineEntry: (opId: string, entry: string) =>Promise<void>;
    rsvpOperation: (opId: string, rsvpStatus: string, shipId?: number, userShipId?: number) =>Promise<void>;

    // --- Warrant CRUD methods (Phase 4e — moved from SessionContext) ---
    createWarrant: (data: any) =>Promise<void>;
    updateWarrant: (id: string, data: any) =>Promise<void>;
    deleteWarrant: (id: string) =>Promise<void>;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshOperations`
     *  callback is defined. Operations's template methods invoke the registered
     *  fn after their RPC completes so consumers see the new state without
     *  waiting for a realtime broadcast (websocket-reconnect fallback, same
     *  intent as the existing chained fetchDataSubset('operations') pattern). */
    registerRefreshOperations: (fn: () =>Promise<void> | void) => () => void;
    /** Same pattern, but for the 'warrants' subset. Phase 4e moved the
     *  warrant CRUD methods (createWarrant/updateWarrant/deleteWarrant) into
     *  this context, so the registered refreshWarrants is now actively used
     *  alongside the optimisticUpdate('warrants', ...) routing through
     *  setWarrants. */
    registerRefreshWarrants: (fn: () =>Promise<void> | void) => () => void;
}

const OperationsContext = createContext<OperationsContextValue | null>(null);

export const OperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { rpcAction, registerSliceSetter } = useDataCore();

    // --- 3 state slices ---
    const [operations, setOperations] = useState<HydratedOperation[]>([]);
    const [operationTemplates, setOperationTemplates] = useState<OperationTemplate[]>([]);
    const [warrants, setWarrants] = useState<HydratedWarrant[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshOperations / refreshWarrants and registers
    // them here on mount; Operations's template methods call the registered
    // fn via ref to avoid re-creating callbacks on every Data render. Same
    // pattern as MembersContext / ConfigContext.
    const refreshOperationsRef = useRef<(() =>Promise<void> | void) | null>(null);
    const refreshWarrantsRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshOperations = useCallback((fn: () =>Promise<void> | void) => {
        refreshOperationsRef.current = fn;
        return () => {
            if (refreshOperationsRef.current === fn) refreshOperationsRef.current = null;
        };
    }, []);
    const registerRefreshWarrants = useCallback((fn: () =>Promise<void> | void) => {
        refreshWarrantsRef.current = fn;
        return () => {
            if (refreshWarrantsRef.current === fn) refreshWarrantsRef.current = null;
        };
    }, []);

    const refreshOperationsFn = useCallback(async () => {
        const fn = refreshOperationsRef.current;
        if (fn) await fn();
    }, []);

    const refreshWarrantsFn = useCallback(async () => {
        const fn = refreshWarrantsRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Each setter applies its slice of a bulk-state payload. When DataContext
    // (or any caller) invokes applyStateData(data) on DataCore, every
    // registered setter runs — populating Operations state from the response of
    // a 'main' / 'operations' / 'warrants' subset fetch. This replaces the
    // per-slice inline assignments that used to live in DataContext's
    // setStateFromData() for these fields.
    useEffect(() => {
        const cleanups = [
            registerSliceSetter('operations', (data: any) => { if (data.operations) setOperations(data.operations); }),
            registerSliceSetter('operationTemplates', (data: any) => { if (data.operationTemplates) setOperationTemplates(data.operationTemplates); }),
            registerSliceSetter('warrants', (data: any) => { if (data.warrants) setWarrants(data.warrants); }),
        ];
        return () => cleanups.forEach(unreg => unreg());
    }, [registerSliceSetter]);

    // --- Template methods (5) ---
    // Mirror the originals 1:1: same RPC action, same payload shape, same
    // post-call refresh. The only structural change is that they call
    // refreshOperationsFn() (registered by DataContext) instead of an in-scope
    // fetchDataSubset('operations') — semantically equivalent.
    const createOperationTemplate = useCallback((data: { name: string; description?: string; payload: OperationTemplatePayload }) =>
        rpcAction('operation:template:create', data).then((tpl) => { void refreshOperationsFn(); return tpl as OperationTemplate; }),
    [rpcAction, refreshOperationsFn]);

    const updateOperationTemplate = useCallback((id: number, updates: { name?: string; description?: string; payload?: OperationTemplatePayload }) =>
        rpcAction('operation:template:update', { id, ...updates }).then((tpl) => { void refreshOperationsFn(); return tpl as OperationTemplate; }),
    [rpcAction, refreshOperationsFn]);

    const deleteOperationTemplate = useCallback((id: number) =>
        rpcAction('operation:template:delete', { id }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    // Builds a payload from an existing op without persisting; the caller
    // typically follows up with createOperationTemplate to save it. No refresh
    // needed — this is a pure read of the operation's structure.
    const extractTemplateFromOperation = useCallback((operationId: string) =>
        rpcAction('operation:template:from_operation', { operationId }) as Promise<OperationTemplatePayload>,
    [rpcAction]);

    const importOperationTemplate = useCallback((data: { name: string; description?: string; payload: OperationTemplatePayload }) =>
        rpcAction('operation:template:import', data).then((tpl) => { void refreshOperationsFn(); return tpl as OperationTemplate; }),
    [rpcAction, refreshOperationsFn]);

    // --- Operation CRUD methods (Phase 4a) ---
    // Moved verbatim from SessionContext. Semantics preserved 1:1: same RPC
    // action, same payload shape, same post-call refresh, same optimistic
    // updates. The two changes are mechanical:
    //   1. simpleAction(...) → rpcAction(...) — equivalent when no refresh
    //      callback is passed (both resolve to apiService.rpc → res.data,
    //      both log+rethrow on error).
    //   2. refreshOperations() → refreshOperationsFn() — DataContext
    //      registers its fetchDataSubset('operations') callback at mount.
    // For deleteOperation and updateOperationStatus, the optimistic write
    // goes directly through setOperations here instead of routing through
    // DataContext.optimisticUpdate('operations', ...) — which itself just
    // calls setOperations via the cross-context wiring, so the behavior is
    // identical and one indirection layer is removed.

    const createOperation = useCallback((data: any) =>
        rpcAction('operation:create', data).then(async (res) => { await refreshOperationsFn(); return res; }),
    [rpcAction, refreshOperationsFn]);

    const deleteOperation = useCallback((id: string) => {
        setOperations(prev => prev.filter(op => op.id !== id));
        return rpcAction('operation:delete', { operationId: id }).then(() => { void refreshOperationsFn(); });
    }, [rpcAction, refreshOperationsFn]);

    const updateOperationStatus = useCallback((id: string, status: string) => {
        setOperations(prev => prev.map(op => op.id === id ? { ...op, status: status as HydratedOperation['status'] } : op));
        return rpcAction('operation:update_status', { operationId: id, status }).then(() => { void refreshOperationsFn(); });
    }, [rpcAction, refreshOperationsFn]);

    const updateOperationDetails = useCallback((id: string, updates: any) =>
        rpcAction('operation:update', { operationId: id, updates }).then(async (result) => { await refreshOperationsFn(); return result; }),
    [rpcAction, refreshOperationsFn]);

    const joinOperation = useCallback((id: string, code?: string) =>
        rpcAction('operation:join', { operationId: id, joinCode: code }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const joinOperationWithShip = useCallback((id: string, opts: { joinCode?: string; roleRequested?: string; shipUtilized?: string; shipId?: number; userShipId?: number }) =>
        rpcAction('operation:join_with_role', { operationId: id, ...opts }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const acceptOperationInvite = useCallback((operationId: string) =>
        rpcAction('operation:accept_invite', { operationId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const declineOperationInvite = useCallback((operationId: string) =>
        rpcAction('operation:decline_invite', { operationId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const leaveOperation = useCallback((id: string) =>
        rpcAction('operation:leave', { operationId: id }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const addOperationParticipant = useCallback((opId: string, userId: number) =>
        rpcAction('operation:add_participant', { operationId: opId, targetUserId: userId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const updateOperationParticipant = useCallback((opId: string, userId: number, data: any) =>
        rpcAction('operation:update_participant', { operationId: opId, targetUserId: userId, updates: data }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    // Note: removeOperationParticipant uses the 'operation:leave' RPC with a
    // targetUserId override — mirroring the original SessionContext impl.
    const removeOperationParticipant = useCallback((opId: string, userId: number) =>
        rpcAction('operation:leave', { operationId: opId, targetUserId: userId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const addOperationUec = useCallback((opId: string, amount: number, reason: string) =>
        rpcAction('operation:add_uec', { operationId: opId, amount, reason }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const addOperationCost = useCallback((opId: string, amount: number, category: string, description?: string) =>
        rpcAction('operation:add_cost', { operationId: opId, amount, category, description }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const setOperationPayoutMode = useCallback((opId: string, mode: 'equal' | 'weighted' | 'custom') =>
        rpcAction('operation:set_payout_mode', { operationId: opId, mode }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const setOperationPayoutSplits = useCallback((opId: string, splits: Array<{ userId: number; percent: number }>) =>
        rpcAction('operation:set_payout_splits', { operationId: opId, splits }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const toggleParticipantPayoutPaid = useCallback((opId: string, targetUserId: number, paid: boolean) =>
        rpcAction('operation:toggle_payout_paid', { operationId: opId, targetUserId, paid }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const toggleParticipantReady = useCallback((opId: string) =>
        rpcAction('operation:toggle_ready', { operationId: opId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const updateParticipantLiveStatus = useCallback((opId: string, liveStatus: string) =>
        rpcAction('operation:update_participant_live_status', { operationId: opId, liveStatus }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const resetOperationReadiness = useCallback((opId: string) =>
        rpcAction('operation:reset_readiness', { operationId: opId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const addOperationTimelineEntry = useCallback((opId: string, entry: string) =>
        rpcAction('operation:timeline_add', { operationId: opId, entry }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    const rsvpOperation = useCallback((opId: string, rsvpStatus: string, shipId?: number, userShipId?: number) =>
        rpcAction('operation:rsvp', { operationId: opId, rsvpStatus, shipId, userShipId }).then(() => { void refreshOperationsFn(); }),
    [rpcAction, refreshOperationsFn]);

    // --- Warrant CRUD methods (Phase 4e) ---
    // Moved from SessionContext. Same RPC actions and payload shapes; the
    // optimistic writes that used to go through DataContext.optimisticUpdate
    // ('warrants', ...) now write directly through setWarrants here. Behavior
    // is identical — DataContext.optimisticUpdate's 'warrants' branch was
    // already routing through this setter via the cross-context wiring.

    const createWarrant = useCallback((data: any) =>
        rpcAction('warrant:create', data).then(() => { void refreshWarrantsFn(); }),
    [rpcAction, refreshWarrantsFn]);

    const updateWarrant = useCallback((id: string, data: any) => {
        setWarrants(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
        return rpcAction('warrant:update', { warrantId: id, updates: data }).then(() => { void refreshWarrantsFn(); });
    }, [rpcAction, refreshWarrantsFn]);

    const deleteWarrant = useCallback((id: string) => {
        setWarrants(prev => prev.filter(w => w.id !== id));
        return rpcAction('warrant:delete', { warrantId: id }).then(() => { void refreshWarrantsFn(); });
    }, [rpcAction, refreshWarrantsFn]);

    const value = useMemo<OperationsContextValue>(() => ({
        // State
        operations, operationTemplates, warrants,
        // Setters (consumed by DataContext.optimisticUpdate)
        setOperations, setOperationTemplates, setWarrants,
        // Template methods
        createOperationTemplate, updateOperationTemplate, deleteOperationTemplate,
        extractTemplateFromOperation, importOperationTemplate,
        // Operation CRUD methods (Phase 4a)
        createOperation, deleteOperation, updateOperationStatus, updateOperationDetails,
        joinOperation, joinOperationWithShip, acceptOperationInvite, declineOperationInvite,
        leaveOperation, addOperationParticipant, updateOperationParticipant,
        removeOperationParticipant, addOperationUec, addOperationCost,
        setOperationPayoutMode, setOperationPayoutSplits, toggleParticipantPayoutPaid,
        toggleParticipantReady, updateParticipantLiveStatus, resetOperationReadiness,
        addOperationTimelineEntry, rsvpOperation,
        // Warrant CRUD (Phase 4e)
        createWarrant, updateWarrant, deleteWarrant,
        // Refresh registration
        registerRefreshOperations, registerRefreshWarrants,
    }), [
        operations, operationTemplates, warrants,
        createOperationTemplate, updateOperationTemplate, deleteOperationTemplate,
        extractTemplateFromOperation, importOperationTemplate,
        createOperation, deleteOperation, updateOperationStatus, updateOperationDetails,
        joinOperation, joinOperationWithShip, acceptOperationInvite, declineOperationInvite,
        leaveOperation, addOperationParticipant, updateOperationParticipant,
        removeOperationParticipant, addOperationUec, addOperationCost,
        setOperationPayoutMode, setOperationPayoutSplits, toggleParticipantPayoutPaid,
        toggleParticipantReady, updateParticipantLiveStatus, resetOperationReadiness,
        addOperationTimelineEntry, rsvpOperation,
        createWarrant, updateWarrant, deleteWarrant,
        registerRefreshOperations, registerRefreshWarrants,
    ]);

    return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
};

export const useOperations = (): OperationsContextValue => {
    const ctx = useContext(OperationsContext);
    if (!ctx) throw new Error('useOperations must be used within an OperationsProvider');
    return ctx;
};
