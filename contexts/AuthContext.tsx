// AuthContext — Phase 2 shim. The original 936-LOC monolith has been split
// into three narrow contexts:
//   - SessionContext      — currentUser, OAuth, refreshUser, realtime alert
//                           listeners, ~40 CRUD wrapper methods (those move
//                           to domain contexts in Phase 3)
//   - PushNotificationContext — isPushActive, subscribeToPush, checkPushSubscription
//   - ActivityContext     — idleTime, 60s heartbeat, idle/interaction listeners
//
// This file preserves the original public API:
//   - <AuthProvider> mounts the three new providers in dependency order
//     (Session outermost, Push, Activity innermost because Activity needs
//     Session's logout helper for force-logout enforcement).
//   - useAuth() returns the union of all three hook values, matching the
//     original AuthContextType shape so the 143 existing consumer files
//     don't have to change. Phase 4 sweeps consumers onto the narrow hooks
//     and deletes this shim.
//
// Also re-exports useFormatDate (which now lives in SessionContext) for
// consumers that import it directly from this module path.

import React, { useMemo } from 'react';
import { SessionProvider, useSession, useFormatDate, type SessionContextValue } from './SessionContext';
import { PushNotificationProvider, usePushNotification, type PushNotificationContextValue } from './PushNotificationContext';
import { ActivityProvider, useActivity, type ActivityContextValue } from './ActivityContext';

/** Canonical shape returned by useAuth() — the merged surface of the three
 *  narrow contexts the shim wraps. Exported so consumers can write
 *  `const auth: AuthContextType = useAuth()` and so TypeScript catches stale
 *  destructures of fields that have moved to domain contexts (e.g. former
 *  Operation / Member / Warrant / Intel / Request CRUD methods removed in
 *  Phase 4). */
export type AuthContextType = SessionContextValue & PushNotificationContextValue & ActivityContextValue;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SessionProvider>
        <PushNotificationProvider>
            <ActivityProvider>{children}</ActivityProvider>
        </PushNotificationProvider>
    </SessionProvider>
);

export const useAuth = (): AuthContextType => {
    const session = useSession();
    const push = usePushNotification();
    const activity = useActivity();
    // Memoise the merge so consumers that destructure stable references
    // (e.g. callbacks passed into useEffect deps) don't re-run on unrelated
    // re-renders. The merge re-creates only when one of the three context
    // values themselves changes — which is the same cadence the original
    // single-provider value object had.
    return useMemo<AuthContextType>(() => ({ ...session, ...push, ...activity }), [session, push, activity]);
};

export { useFormatDate };
