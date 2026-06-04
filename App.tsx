import React, { useEffect } from 'react';
import BootSplash, { dismissSSRSplash } from './components/shared/BootSplash';

// Retry wrapper for lazy imports — handles transient network failures.
// If a chunk fails to load, retry once after a short delay. Full page reloads
// for stale hashes are handled by the vite:preloadError listener in index.tsx.
function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType }>) {
    return React.lazy(() =>
        importFn().catch(() => new Promise<void>((resolve) => setTimeout(resolve, 1500)).then(() => importFn()))
    );
}

// Single-org standalone app: the root domain serves the dashboard directly.
// No subdomain routing, no marketing landing, no customer portal.
const DashboardApp = lazyWithRetry(() => import('./DashboardApp'));

const App = () => {
    // Once React has painted, remove the SSR-injected splash placeholder.
    useEffect(() => {
        dismissSSRSplash();
    }, []);

    // BootSplash reads window.__BRANDING__ (SSR-injected) for an instant branded paint.
    return (
        <React.Suspense fallback={<BootSplash />}>
            <DashboardApp />
        </React.Suspense>
    );
};

export default App;
