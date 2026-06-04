// AnnouncementsContext owns the announcements domain — the announcements
// slice (previously in DataContext) plus the 3 announcement-CRUD methods
// (previously in SessionContext). Mirrors RequestsContext: combines a
// Phase-3-style state extraction with a Phase-4-style method move.
//
// Provider order:
//   ...> RequestsProvider > AnnouncementsProvider > DataProvider > AuthProvider
// Announcements must mount OUTSIDE Data so DataContext can call
// useAnnouncements() in its body and re-expose `announcements` on the
// useData() value, preserving the public API for the many read-consumers
// (NoticesManagementTab, DashboardApp login-screen filter, etc.).
//
// State slice owned here (1):
//   announcements
//
// CRUD methods owned here (3):
//   addAnnouncement, updateAnnouncement, deleteAnnouncement
//
// Side effects: the original SessionContext bodies carried no inline toasts
// or sounds for these three — they relied on the post-RPC refresh — so none
// are added here. AnnouncementsContext mounts inside both
// NotificationProvider (via UIProvider) and ConfigProvider, matching
// RequestsContext, even though it currently uses neither.
//
// Realtime / state hydration: Announcements registers a slice setter on
// 'announcements' with DataCore. When applyStateData(data) fires (initial
// state hydrate, any 'main'/'announcements' subset response, realtime
// resync), the setter populates announcements. Replaces the inline
// assignment that used to live in DataContext.setStateFromData() and the
// explicit fetchDataSubset('announcements') branch's setAnnouncements call.
//
// Refresh registration: DataContext registers its
// refreshAnnouncements = useCallback(() => fetchDataSubset('announcements'), ...)
// here at mount. Announcements's CRUD methods call refreshAnnouncementsFn
// after their RPC completes. Matches Requests / Operations / Members / Intel.
//
// Optimistic updates: deleteAnnouncement previously called DataContext's
// optimisticUpdate('announcements', ...) before its RPC; it now writes
// directly through setAnnouncements here. The DataContext optimisticUpdate
// branch is rewired to call this setter via the cross-context destructuring
// pattern (same as setReqsHydrated / setOpsOperations), so external callers
// of optimisticUpdate('announcements', ...) keep the same effect.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import { Announcement } from '../types';

export type { Announcement } from '../types';

export interface AnnouncementsContextValue {
    // --- State slice (1) ---
    announcements: Announcement[];

    // --- State setter (exposed for DataContext's optimisticUpdate
    //     ('announcements') branch + slice population; DataContext is INSIDE
    //     Announcements, so it consumes the setter via useAnnouncements().) ---
    setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;

    // --- CRUD methods (3) ---
    addAnnouncement: (data: any) =>Promise<void>;
    updateAnnouncement: (data: any) =>Promise<void>;
    deleteAnnouncement: (id: string) =>Promise<void>;

    // --- Refresh registration ---
    /** DataContext registers its refreshAnnouncements callback here at mount. */
    registerRefreshAnnouncements: (fn: () =>Promise<void> | void) => () => void;
}

const AnnouncementsContext = createContext<AnnouncementsContextValue | null>(null);

export const AnnouncementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { rpcAction, registerSliceSetter } = useDataCore();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    // --- Refresh-callback registration plumbing ---
    const refreshAnnouncementsRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshAnnouncements = useCallback((fn: () =>Promise<void> | void) => {
        refreshAnnouncementsRef.current = fn;
        return () => { if (refreshAnnouncementsRef.current === fn) refreshAnnouncementsRef.current = null; };
    }, []);

    const refreshAnnouncementsFn = useCallback(async () => {
        const fn = refreshAnnouncementsRef.current;
        if (fn) await fn();
    }, []);

    // --- Slice-setter registration ---
    useEffect(() => {
        const unreg = registerSliceSetter('announcements', (data: any) => {
            if (data.announcements) setAnnouncements(data.announcements);
        });
        return unreg;
    }, [registerSliceSetter]);

    // --- CRUD methods ---
    // Behaviour preserved 1:1 from the SessionContext originals. The original
    // used simpleAction(...) (no refresh-true flag) which is equivalent to a
    // plain rpcAction POST. The optimistic delete previously went through
    // DataContext.optimisticUpdate('announcements', ..., 'delete') — that
    // indirection routed through this same setter via the cross-context
    // wiring, so writing setAnnouncements directly here is identical.

    const addAnnouncement = useCallback((data: any) =>
        rpcAction('admin:add_announcement', { noticeData: data }).then(() => refreshAnnouncementsFn()),
    [rpcAction, refreshAnnouncementsFn]);

    const updateAnnouncement = useCallback((data: any) =>
        rpcAction('admin:update_announcement', { noticeData: data }).then(() => refreshAnnouncementsFn()),
    [rpcAction, refreshAnnouncementsFn]);

    const deleteAnnouncement = useCallback((id: string) => {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        return rpcAction('admin:delete_announcement', { noticeId: id }).then(() => refreshAnnouncementsFn());
    }, [rpcAction, refreshAnnouncementsFn]);

    const value = useMemo<AnnouncementsContextValue>(() => ({
        announcements, setAnnouncements,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        registerRefreshAnnouncements,
    }), [
        announcements,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        registerRefreshAnnouncements,
    ]);

    return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
};

export const useAnnouncements = (): AnnouncementsContextValue => {
    const ctx = useContext(AnnouncementsContext);
    if (!ctx) throw new Error('useAnnouncements must be used within an AnnouncementsProvider');
    return ctx;
};
