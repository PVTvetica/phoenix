// Activity context — owns the user's idle/heartbeat lifecycle.
//
// Two intervals run on a 60s tick:
//   - HEARTBEAT: posts user:heartbeat to the server if the user has interacted
//     within the last 5 minutes AND it's been ≥4.5 minutes since the last
//     heartbeat. The server returns force_logout_timestamp; if it's newer
//     than this session started, we log out (platform-admin kill switch).
//   - IDLE: increments idleTime by 1 every minute; reset to 0 on any of
//     mousemove/keydown/click/touchstart.
//
// Carved out of AuthContext in Phase 2 because its lifecycle (mount-time
// interval + window listeners) is independent of OAuth/permissions. The
// heartbeat needs Session's `logout` for the force-logout path, so this
// provider must mount INSIDE SessionProvider. Force-logout used to be
// duplicated at two sites (heartbeat path + refreshUser path on init); the
// helper now lives in SessionContext so both sites share it.

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import apiService from '../services/apiService';
import { useSession } from './SessionContext';

export interface ActivityContextValue {
    /** Minutes since the user's last keyboard/mouse/touch input. Consumed by
     *  presence indicators (e.g. Sidebar's "you've been idle" hint) and the
     *  HID PTT context's auto-release. */
    idleTime: number;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, sessionStartTime, logout } = useSession();
    const [idleTime, setIdleTime] = useState(0);

    const lastHeartbeat = useRef<number>(Date.now());
    const lastInteraction = useRef<number>(Date.now());

    // Heartbeat loop — checks every minute whether a heartbeat is due.
    useEffect(() => {
        if (!currentUser) return;

        const heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastHeartbeat = now - lastHeartbeat.current;
            const timeSinceLastInteraction = now - lastInteraction.current;

            // Send heartbeat if:
            // 1. It's been at least 4.5 minutes since the last one (buffer for 5m limit)
            // 2. The user has interacted recently (within last 5 minutes)
            if (timeSinceLastHeartbeat > 4.5 * 60 * 1000 && timeSinceLastInteraction < 5 * 60 * 1000) {
                lastHeartbeat.current = now;
                apiService.rpc('user:heartbeat', { userId: currentUser.id }).then((result: any) => {
                    // Force-logout enforcement. The check is duplicated in
                    // SessionContext.refreshUser for the page-load path; both
                    // sites compare against `sessionStartTime.current` (Session
                    // owns the ref so the two compare the same baseline).
                    if (result?.force_logout_timestamp && result.force_logout_timestamp > sessionStartTime.current) {
                        console.warn('[Auth] Force logout triggered by platform admin');
                        logout();
                    }
                }).catch(err => {
                    console.warn("Heartbeat failed", err);
                });
            }
        }, 60 * 1000); // Check every minute

        return () => clearInterval(heartbeatInterval);
    }, [currentUser, sessionStartTime, logout]);

    // Idle counter + interaction listeners.
    useEffect(() => {
        const timer = setInterval(() => setIdleTime(prev => prev + 1), 60000);

        const resetIdle = () => {
            setIdleTime(0);
            lastInteraction.current = Date.now();
        };

        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('keydown', resetIdle);
        window.addEventListener('click', resetIdle);
        window.addEventListener('touchstart', resetIdle);
        return () => {
            clearInterval(timer);
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('keydown', resetIdle);
            window.removeEventListener('click', resetIdle);
            window.removeEventListener('touchstart', resetIdle);
        };
    }, []);

    const value: ActivityContextValue = { idleTime };

    return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
};

export const useActivity = (): ActivityContextValue => {
    const ctx = useContext(ActivityContext);
    if (!ctx) throw new Error('useActivity must be used within an ActivityProvider');
    return ctx;
};
