// MembersContext owns the Members domain slices and CRUD methods that were
// previously embedded in DataContext. This is Phase 3a of the context refactor
// — a behavior-preserving extraction. The shim invariant is: useData() still
// exposes every Members field with identical names and types, so the 220
// consumer files that import useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > DataProvider.
// Members must mount OUTSIDE Data so DataContext can call useMembers() inside
// its body and re-expose the Members fields on its own context value.
//
// State slices owned here (12):
//   allUsers, ranks, units, roles, securityClearances, limitingMarkers,
//   specializationTags, certifications, commendations, syncedDiscordRoles,
//   rankMappings, roleMappings
//
// Derived value:
//   members = filter(allUsers, role in {Member, Dispatcher, Admin})
//
// CRUD methods (21): see the inline groupings below.
//
// Realtime / state hydration: Members registers a slice setter with DataCore
// for each of its 12 slices (Phase 0b plumbing). When DataContext calls
// applyStateData(data) after fetching the 'main' / 'discord' / etc subset,
// those registered setters fire and populate Members's local state. This
// replaces the per-slice inline assignments that used to live in DataContext's
// setStateFromData() switch for these fields.
//
// Refresh callback: CRUD methods need to call fetchDataSubset('main') after
// their RPC succeeds. Since Members lives OUTSIDE Data, it can't read
// useData() directly (would cycle). Instead, DataContext registers its
// refreshMainState function with Members at mount via registerRefreshMainState,
// and Members's CRUD methods call refreshMainStateRef.current?.() after the
// RPC completes. This matches DataCore's registration pattern.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    User, UserRole, Rank, OrganizationalUnit, Role,
    SecurityClearance, LimitingMarker, SpecializationTag, Certification, Commendation,
    DiscordRole,
} from '../types';

export interface MembersContextValue {
    // --- State slices (12) ---
    allUsers: User[];
    ranks: Rank[];
    units: OrganizationalUnit[];
    roles: Role[];
    securityClearances: SecurityClearance[];
    limitingMarkers: LimitingMarker[];
    specializationTags: SpecializationTag[];
    certifications: Certification[];
    commendations: Commendation[];
    syncedDiscordRoles: DiscordRole[];
    rankMappings: Record<string, string>;
    roleMappings: Record<string, string>;

    // --- Derived ---
    members: User[];

    // --- State setters (exposed for DataContext's optimisticUpdate branches
    //     that handle 'ranks' and 'organizational_units'; DataContext is INSIDE
    //     Members, so it consumes these setters via useMembers().) ---
    setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
    setRanks: React.Dispatch<React.SetStateAction<Rank[]>>;
    setUnits: React.Dispatch<React.SetStateAction<OrganizationalUnit[]>>;
    setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
    setSecurityClearances: React.Dispatch<React.SetStateAction<SecurityClearance[]>>;
    setLimitingMarkers: React.Dispatch<React.SetStateAction<LimitingMarker[]>>;
    setSpecializationTags: React.Dispatch<React.SetStateAction<SpecializationTag[]>>;
    setCertifications: React.Dispatch<React.SetStateAction<Certification[]>>;
    setCommendations: React.Dispatch<React.SetStateAction<Commendation[]>>;
    setSyncedDiscordRoles: React.Dispatch<React.SetStateAction<DiscordRole[]>>;
    setRankMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setRoleMappings: React.Dispatch<React.SetStateAction<Record<string, string>>>;

    // --- CRUD methods (21) ---
    addUnit: (data: any) =>Promise<void>;
    updateUnit: (data: any) =>Promise<void>;
    deleteUnit: (id: number) =>Promise<void>;

    addRank: (data: any) =>Promise<void>;
    updateRank: (data: any) =>Promise<void>;
    deleteRank: (id: number) =>Promise<void>;

    addRole: (data: any) =>Promise<void>;
    updateRole: (data: any) =>Promise<void>;
    deleteRole: (id: number) =>Promise<void>;
    getRoleDetails: (id: number) =>Promise<any>;
    updateRolePermissions: (id: number, perms: string[]) =>Promise<void>;

    addSpecializationTag: (data: any) =>Promise<void>;
    updateSpecializationTag: (data: any) =>Promise<void>;
    deleteSpecializationTag: (id: number) =>Promise<void>;

    addCertification: (data: any) =>Promise<void>;
    updateCertification: (data: any) =>Promise<void>;
    deleteCertification: (id: number) =>Promise<void>;

    addCommendation: (data: any) =>Promise<void>;
    updateCommendation: (data: any) =>Promise<void>;
    deleteCommendation: (id: number) =>Promise<void>;

    syncDiscordRoles: () =>Promise<void>;
    updateRankMapping: (discordRoleId: string, rankId: string, roleId?: string) =>Promise<void>;
    /** Fetch the (admin-gated) 'discord' subset. The role-sync maps no longer
     *  ride the boot payload — DiscordSettingsTab calls this on mount. */
    refreshDiscord: () =>Promise<void>;

    // --- User admin methods (Phase 4d — moved from SessionContext) ---
    updateUserRecord: (id: number, data: any) =>Promise<void>;
    adjustUserReputation: (id: number, amount: number, reason: string) =>Promise<void>;
    awardCertification: (userId: number, certId: number) =>Promise<void>;
    awardCommendation: (userId: number, commendId: number, reason: string) =>Promise<void>;
    addConductEntry: (userId: number, type: string, reason: string) =>Promise<void>;
    revokeCertification: (userId: number, certId: number) =>Promise<void>;
    revokeCommendation: (commendId: number) =>Promise<void>;
    updateUserClearance: (userId: number, levelId: number | null, markerIds: number[]) =>Promise<void>;
    promoteUserToMember: (id: number) =>Promise<void>;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshMainState` is
     *  defined. Members's CRUD methods invoke the registered fn after their
     *  RPC completes so consumers see the new state without waiting for a
     *  realtime broadcast (websocket-reconnect fallback, same intent as the
     *  existing chained fetchDataSubset('main') pattern). */
    registerRefreshMainState: (fn: () =>Promise<void> | void) => () => void;
    /** Same pattern, but for the 'discord' subset — used by syncDiscordRoles
     *  and updateRankMapping which historically refreshed the discord subset. */
    registerRefreshDiscord: (fn: () =>Promise<void> | void) => () => void;
}

const MembersContext = createContext<MembersContextValue | null>(null);

export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { rpcAction, registerSliceSetter } = useDataCore();

    // --- 12 state slices ---
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [units, setUnits] = useState<OrganizationalUnit[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [securityClearances, setSecurityClearances] = useState<SecurityClearance[]>([]);
    const [limitingMarkers, setLimitingMarkers] = useState<LimitingMarker[]>([]);
    const [specializationTags, setSpecializationTags] = useState<SpecializationTag[]>([]);
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [commendations, setCommendations] = useState<Commendation[]>([]);
    const [syncedDiscordRoles, setSyncedDiscordRoles] = useState<DiscordRole[]>([]);
    const [rankMappings, setRankMappings] = useState<Record<string, string>>({});
    const [roleMappings, setRoleMappings] = useState<Record<string, string>>({});

    // Derived list of staff users (Member, Dispatcher, Admin). Used widely as
    // the "internal org members" dropdown / picker source vs the broader
    // allUsers which includes Clients.
    const members = useMemo(
        () => allUsers.filter(u => u.role === UserRole.Member || u.role === UserRole.Dispatcher || u.role === UserRole.Admin),
        [allUsers],
    );

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshMainState/refreshDiscord and registers them
    // here on mount; Members's CRUD methods call the registered fn via ref to
    // avoid re-creating callbacks on every Data render. Using a ref also lets
    // CRUD method identities stay stable across refresh-fn changes.
    const refreshMainStateRef = useRef<(() =>Promise<void> | void) | null>(null);
    const refreshDiscordRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshMainState = useCallback((fn: () =>Promise<void> | void) => {
        refreshMainStateRef.current = fn;
        return () => {
            if (refreshMainStateRef.current === fn) refreshMainStateRef.current = null;
        };
    }, []);
    const registerRefreshDiscord = useCallback((fn: () =>Promise<void> | void) => {
        refreshDiscordRef.current = fn;
        return () => {
            if (refreshDiscordRef.current === fn) refreshDiscordRef.current = null;
        };
    }, []);

    const refreshMain = useCallback(async () => {
        const fn = refreshMainStateRef.current;
        if (fn) await fn();
    }, []);
    const refreshDiscord = useCallback(async () => {
        const fn = refreshDiscordRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Each setter applies its slice of a bulk-state payload. When DataContext
    // (or any caller) invokes applyStateData(data) on DataCore, every
    // registered setter runs — populating Members state from the response of
    // a 'main' / 'discord' / etc subset fetch. This replaces the per-slice
    // inline assignments that used to live in DataContext.setStateFromData().
    useEffect(() => {
        const cleanups = [
            registerSliceSetter('users', (data: any) => { if (data.users) setAllUsers(data.users); }),
            registerSliceSetter('ranks', (data: any) => { if (data.ranks) setRanks(data.ranks); }),
            registerSliceSetter('units', (data: any) => { if (data.units) setUnits(data.units); }),
            registerSliceSetter('roles', (data: any) => { if (data.roles) setRoles(data.roles); }),
            registerSliceSetter('securityClearances', (data: any) => { if (data.securityClearances) setSecurityClearances(data.securityClearances); }),
            registerSliceSetter('limitingMarkers', (data: any) => { if (data.limitingMarkers) setLimitingMarkers(data.limitingMarkers); }),
            registerSliceSetter('specializationTags', (data: any) => { if (data.specializationTags) setSpecializationTags(data.specializationTags); }),
            registerSliceSetter('certifications', (data: any) => { if (data.certifications) setCertifications(data.certifications); }),
            registerSliceSetter('commendations', (data: any) => { if (data.commendations) setCommendations(data.commendations); }),
            registerSliceSetter('syncedDiscordRoles', (data: any) => { if (data.syncedDiscordRoles) setSyncedDiscordRoles(data.syncedDiscordRoles); }),
            registerSliceSetter('rankMappings', (data: any) => { if (data.rankMappings) setRankMappings(data.rankMappings); }),
            registerSliceSetter('roleMappings', (data: any) => { if (data.roleMappings) setRoleMappings(data.roleMappings); }),
        ];
        return () => cleanups.forEach(unreg => unreg());
    }, [registerSliceSetter]);

    // --- CRUD methods (21) ---
    // These mirror the originals 1:1: same RPC action, same payload shape,
    // same post-call refresh. The only structural change is that they call
    // refreshMain() (registered by DataContext) instead of an in-scope
    // fetchDataSubset('main') — semantically equivalent.
    //
    // Note: optimistic updates for ranks/units were previously called via
    // DataContext's optimisticUpdate('ranks'|'organizational_units', ...).
    // We DON'T do those optimistic writes here because DataContext's
    // optimisticUpdate still wraps these CRUD methods at the call sites
    // (updateUnit/deleteUnit/updateRank/deleteRank). DataContext's
    // optimisticUpdate gets the relevant setters (setRanks, setUnits) from
    // useMembers() and writes through them directly. See DataContext.tsx
    // optimisticUpdate for the post-refactor wiring.
    //
    // Wait — that's NOT correct. The original DataContext CRUD methods called
    // optimisticUpdate(...) INSIDE the CRUD body before the RPC. If we leave
    // those calls in DataContext (where they were), DataContext's optimisticUpdate
    // would no longer be called because the CRUD methods now live here. So
    // the optimistic-write logic for ranks/units MUST live here (in the CRUD
    // body) and use the local setters directly. The DataContext.optimisticUpdate
    // branches for ranks/organizational_units remain as a public utility but
    // are no longer the one driving the optimistic write inside these CRUDs.

    // --- Units ---
    const addUnit = useCallback((data: any) =>
        rpcAction('admin:add_unit', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateUnit = useCallback((data: any) => {
        // Optimistic write: mirror the prior optimisticUpdate('organizational_units', id, data, 'update') behavior.
        setUnits(prev => prev.map(item => item.id === data.id ? { ...item, ...data } : item));
        return rpcAction('admin:update_unit', data).then(() => refreshMain());
    }, [rpcAction, refreshMain]);

    const deleteUnit = useCallback((id: number) => {
        // Optimistic delete; on RPC failure, refreshMain() in catch reverts.
        setUnits(prev => prev.filter(item => item.id !== id));
        return rpcAction('admin:delete_unit', { unitId: id })
            .then(() => refreshMain())
            .catch(err => { void refreshMain(); throw err; });
    }, [rpcAction, refreshMain]);

    // --- Ranks ---
    const addRank = useCallback((data: any) =>
        rpcAction('admin:add_rank', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateRank = useCallback((data: any) => {
        setRanks(prev => prev.map(item => item.id === data.id ? { ...item, ...data } : item));
        return rpcAction('admin:update_rank', data).then(() => refreshMain());
    }, [rpcAction, refreshMain]);

    const deleteRank = useCallback((id: number) => {
        setRanks(prev => prev.filter(item => item.id !== id));
        return rpcAction('admin:delete_rank', { rankId: id }).then(() => refreshMain());
    }, [rpcAction, refreshMain]);

    // --- Roles ---
    const addRole = useCallback((data: any) =>
        rpcAction('admin:add_role', { roleData: data }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateRole = useCallback((data: any) =>
        rpcAction('admin:update_role', { roleData: data }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteRole = useCallback((id: number) =>
        rpcAction('admin:delete_role', { roleId: id }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const getRoleDetails = useCallback((id: number) =>
        rpcAction('admin:get_role_details', { roleId: id }),
    [rpcAction]);

    const updateRolePermissions = useCallback((id: number, perms: string[]) =>
        rpcAction('admin:update_role_permissions', { roleId: id, permissionNames: perms }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- Specialization Tags ---
    const addSpecializationTag = useCallback((tagData: any) =>
        rpcAction('admin:add_specialization', { tagData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateSpecializationTag = useCallback((tagData: any) =>
        rpcAction('admin:update_specialization', { tagData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteSpecializationTag = useCallback((tagId: number) =>
        rpcAction('admin:delete_specialization', { tagId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- Certifications ---
    const addCertification = useCallback((certData: any) =>
        rpcAction('admin:add_certification', { certData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateCertification = useCallback((certData: any) =>
        rpcAction('admin:update_certification', { certData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteCertification = useCallback((certId: number) =>
        rpcAction('admin:delete_certification', { certId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- Commendations ---
    const addCommendation = useCallback((commendData: any) =>
        rpcAction('admin:add_commendation', { commendData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateCommendation = useCallback((commendData: any) =>
        rpcAction('admin:update_commendation', { commendData }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteCommendation = useCallback((commendId: number) =>
        rpcAction('admin:delete_commendation', { commendId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- Discord sync ---
    const syncDiscordRoles = useCallback(async () => {
        await rpcAction('admin:sync_discord_roles', {});
        await refreshDiscord();
    }, [rpcAction, refreshDiscord]);

    // updateRankMapping is special: it does an optimistic LOCAL write (to
    // both rankMappings AND roleMappings if a roleId was provided) BEFORE
    // dispatching the RPC, then refreshes on success OR failure. The
    // local-write/refresh-on-error pattern preserves the original behavior
    // line-for-line — now using the natively-owned setters here.
    const updateRankMapping = useCallback(async (discordRoleId: string, rankId: string, roleId?: string) => {
        setRankMappings(prev => ({ ...prev, [discordRoleId]: rankId }));
        if (roleId !== undefined) setRoleMappings(prev => ({ ...prev, [discordRoleId]: roleId }));
        try {
            await rpcAction('admin:update_rank_mapping', { discordRoleId, rankId, roleId });
            await refreshDiscord();
        } catch (e) {
            console.error('Failed to update rank mapping', e);
            void refreshDiscord();
        }
    }, [rpcAction, refreshDiscord]);

    // --- User admin methods (Phase 4d) ---
    // Moved from SessionContext. Each is a thin simpleAction wrapper that the
    // server-side admin handler implements, followed by a 'main' subset
    // refresh — semantically identical to the originals, with simpleAction →
    // rpcAction (equivalent when no refresh arg is passed).

    const updateUserRecord = useCallback((userId: number, data: any) =>
        rpcAction('admin:update_user', { targetUserId: userId, ...data }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const adjustUserReputation = useCallback((userId: number, amount: number, reason: string) =>
        rpcAction('admin:adjust_rep', { targetUserId: userId, newReputation: amount, reason }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const awardCertification = useCallback((userId: number, certId: number) =>
        rpcAction('admin:award_certification', { targetUserId: userId, certificationId: certId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const awardCommendation = useCallback((userId: number, commendId: number, reason: string) =>
        rpcAction('admin:award_commendation', { targetUserId: userId, commendationId: commendId, reason }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const addConductEntry = useCallback((userId: number, type: string, reason: string) =>
        rpcAction('admin:add_conduct_entry', { targetUserId: userId, type, reason }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const revokeCertification = useCallback((userId: number, certId: number) =>
        rpcAction('admin:revoke_certification', { targetUserId: userId, certificationId: certId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const revokeCommendation = useCallback((commendId: number) =>
        rpcAction('admin:revoke_commendation', { awardedCommendationId: commendId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateUserClearance = useCallback((userId: number, levelId: number | null, markerIds: number[]) =>
        rpcAction('admin:update_user_clearance', { targetUserId: userId, levelId, markerIds }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // Note: the original simpleAction passed `true` as the third arg, which
    // triggered SessionContext.refreshUser() (a full getInitialState). For
    // the realistic use case (admin promotes another user from Client to
    // Member), refreshMain() pulls the updated allUsers list and is the same
    // effective behavior at a lighter cost. Self-promotion isn't a real
    // scenario — admins are already at the top role.
    const promoteUserToMember = useCallback((id: number) =>
        rpcAction('admin:promote_user', { targetUserId: id }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const value = useMemo<MembersContextValue>(() => ({
        // State
        allUsers, ranks, units, roles,
        securityClearances, limitingMarkers, specializationTags, certifications, commendations,
        syncedDiscordRoles, rankMappings, roleMappings,
        members,
        // Setters (consumed by DataContext.optimisticUpdate)
        setAllUsers, setRanks, setUnits, setRoles,
        setSecurityClearances, setLimitingMarkers, setSpecializationTags, setCertifications, setCommendations,
        setSyncedDiscordRoles, setRankMappings, setRoleMappings,
        // CRUD
        addUnit, updateUnit, deleteUnit,
        addRank, updateRank, deleteRank,
        addRole, updateRole, deleteRole, getRoleDetails, updateRolePermissions,
        addSpecializationTag, updateSpecializationTag, deleteSpecializationTag,
        addCertification, updateCertification, deleteCertification,
        addCommendation, updateCommendation, deleteCommendation,
        syncDiscordRoles, updateRankMapping, refreshDiscord,
        // User admin methods (Phase 4d)
        updateUserRecord, adjustUserReputation,
        awardCertification, awardCommendation, addConductEntry,
        revokeCertification, revokeCommendation,
        updateUserClearance, promoteUserToMember,
        // Refresh registration
        registerRefreshMainState, registerRefreshDiscord,
    }), [
        allUsers, ranks, units, roles,
        securityClearances, limitingMarkers, specializationTags, certifications, commendations,
        syncedDiscordRoles, rankMappings, roleMappings,
        members,
        addUnit, updateUnit, deleteUnit,
        addRank, updateRank, deleteRank,
        addRole, updateRole, deleteRole, getRoleDetails, updateRolePermissions,
        addSpecializationTag, updateSpecializationTag, deleteSpecializationTag,
        addCertification, updateCertification, deleteCertification,
        addCommendation, updateCommendation, deleteCommendation,
        syncDiscordRoles, updateRankMapping, refreshDiscord,
        updateUserRecord, adjustUserReputation,
        awardCertification, awardCommendation, addConductEntry,
        revokeCertification, revokeCommendation,
        updateUserClearance, promoteUserToMember,
        registerRefreshMainState, registerRefreshDiscord,
    ]);

    return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>;
};

export const useMembers = (): MembersContextValue => {
    const ctx = useContext(MembersContext);
    if (!ctx) throw new Error('useMembers must be used within a MembersProvider');
    return ctx;
};
