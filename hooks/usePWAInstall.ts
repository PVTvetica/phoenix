import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
    interface Window {
        __pwaInstallPrompt: BeforeInstallPromptEvent | null;
    }
}

export function usePWAInstall() {
    const [canInstall, setCanInstall] = useState(!!window.__pwaInstallPrompt);
    const [isInstalled, setIsInstalled] = useState(
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true
    );

    useEffect(() => {
        const onAvailable = () => setCanInstall(true);
        const onInstalled = () => { setCanInstall(false); setIsInstalled(true); };

        window.addEventListener('pwa-install-available', onAvailable);
        window.addEventListener('pwa-installed', onInstalled);
        return () => {
            window.removeEventListener('pwa-install-available', onAvailable);
            window.removeEventListener('pwa-installed', onInstalled);
        };
    }, []);

    const promptInstall = useCallback(async () => {
        const event = window.__pwaInstallPrompt;
        if (!event) return false;
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (outcome === 'accepted') {
            window.__pwaInstallPrompt = null;
            setCanInstall(false);
        }
        return outcome === 'accepted';
    }, []);

    return { canInstall, isInstalled, promptInstall };
}
