import React, { useMemo } from 'react';
import { NotificationProvider, useNotification } from './NotificationContext';
import { NavigationProvider, useNavigation } from './NavigationContext';
import { ModalRegistryProvider, useModalRegistry } from './ModalRegistryContext';
import type { ConfirmOptions } from './NotificationContext';

export type { ConfirmOptions };

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <NotificationProvider>
        <NavigationProvider>
            <ModalRegistryProvider>{children}</ModalRegistryProvider>
        </NavigationProvider>
    </NotificationProvider>
);

export const useUI = () => {
    const notif = useNotification();
    const nav = useNavigation();
    const modal = useModalRegistry();
    return useMemo(() => ({ ...notif, ...nav, ...modal }), [notif, nav, modal]);
};
