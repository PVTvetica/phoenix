// Push-notification context — owns the browser-side push subscription
// lifecycle (permission prompt, VAPID key fetch, ServiceWorker register/
// subscribe). Carved out of AuthContext in Phase 2 because the push lifecycle
// has nothing to do with auth state — the only reason it lived there was
// historical co-location. Tiny by design (~70 LOC).
//
// Public shape preserved on the `useAuth()` shim:
//   - isPushActive
//   - subscribeToPush
//   - checkPushSubscription
// Consumers: DashboardApp.tsx (PushNotificationBanner) and
// components/views/personnel/ProfileView.tsx (diagnostics card).

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiService from '../services/apiService';
import { urlBase64ToUint8Array } from '../utils/pushUtils';

export interface PushNotificationContextValue {
    /** True iff the browser currently has an active push subscription. Polled
     *  once at mount via checkPushSubscription, then set true on a successful
     *  subscribeToPush. NOT updated if the user revokes the permission via
     *  browser settings — callers can re-run checkPushSubscription on demand. */
    isPushActive: boolean;
    /** Prompts for notification permission, registers the ServiceWorker if
     *  needed, fetches the org's VAPID public key, subscribes the browser,
     *  and persists the subscription server-side via user:subscribe_push.
     *  Re-throws on failure so the UI can surface "permission denied" /
     *  "VAPID missing" toasts. */
    subscribeToPush: () =>Promise<void>;
    /** Reads the current ServiceWorker subscription (without prompting) and
     *  syncs isPushActive. Returns the active flag for one-shot callers
     *  (ProfileView's diagnostics). */
    checkPushSubscription: () =>Promise<boolean>;
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null);

export const PushNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isPushActive, setIsPushActive] = useState(false);

    const checkPushSubscription = useCallback(async () => {
        if (!('serviceWorker' in navigator)) return false;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const active = !!sub;
        setIsPushActive(active);
        return active;
    }, []);

    const subscribeToPush = useCallback(async () => {
        if (!('serviceWorker' in navigator)) return;
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error("Notification permission denied");

            // 5s timeout guard: Safari occasionally hangs on .ready when the
            // SW is in an "installing/redundant" state. A real failure is
            // better UX than an infinite spinner.
            const reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Service Worker timeout")), 5000))
            ]) as ServiceWorkerRegistration;

            const response = await apiService.rpc('system:get_push_config', {});
            const publicKey = response?.data?.publicKey;
            if (!publicKey) throw new Error("VAPID Public Key could not be retrieved");

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
            await apiService.rpc('user:subscribe_push', sub);
            setIsPushActive(true);
        } catch (e: any) {
            console.error("Push subscription failed", e);
            throw e; // Re-throw so UI can handle it
        }
    }, []);

    // Initial check on mount. Mirrors the previous AuthContext init() which
    // called checkPushSubscription() once OAuth/refresh settled. Running it
    // here at mount is equivalent because the provider mounts inside
    // AuthProvider, which mounts inside DataProvider — i.e. after the same
    // initial DOM/SW availability.
    useEffect(() => {
        void checkPushSubscription();
    }, [checkPushSubscription]);

    const value: PushNotificationContextValue = {
        isPushActive,
        subscribeToPush,
        checkPushSubscription,
    };

    return <PushNotificationContext.Provider value={value}>{children}</PushNotificationContext.Provider>;
};

export const usePushNotification = (): PushNotificationContextValue => {
    const ctx = useContext(PushNotificationContext);
    if (!ctx) throw new Error('usePushNotification must be used within a PushNotificationProvider');
    return ctx;
};
