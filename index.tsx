import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { installAvatarFallback } from './lib/avatarFallback';
import { printConsoleBanner } from './lib/consoleBanner';

// Handle stale chunk errors after deployments.
// Vite fires this event when a dynamic import (React.lazy) fails to preload.
// Instead of auto-reloading (which is jarring and can loop on Safari),
// let the error propagate to the ErrorBoundary which gives the user control
// via the "Reinitialize System" button. The lazyWithRetry wrappers in
// DashboardApp and App already handle transient preload failures automatically.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
});

installAvatarFallback();
printConsoleBanner();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);