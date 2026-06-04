// PWA install prompt capture, Service Worker registration, and stale-chunk recovery.
// Extracted from index.html so CSP can drop `script-src 'unsafe-inline'` in a later change.

(function () {
  // Capture PWA install prompt before it's dismissed by the browser
  window.__pwaInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__pwaInstallPrompt = e;
    window.dispatchEvent(new Event('pwa-install-available'));
  });
  window.addEventListener('appinstalled', function () {
    window.__pwaInstallPrompt = null;
    window.dispatchEvent(new Event('pwa-installed'));
  });

  // Register Service Worker for PWA and Push Notifications — but NOT during
  // first-run setup. While setup is incomplete (window.__SETUP_COMPLETED__ === false,
  // SSR-injected) the SW must not control navigations: it could otherwise intercept
  // the Discord OAuth ?code= return and strand the onboarding flow on the offline
  // shell. In that state we also proactively UNREGISTER any worker left over from a
  // prior visit + clear its caches, so a stale SW can't keep serving a dead shell.
  if ('serviceWorker' in navigator) {
    if (window.__SETUP_COMPLETED__ === false) {
      navigator.serviceWorker.getRegistrations()
        .then(function (regs) { regs.forEach(function (r) { r.unregister(); }); })
        .catch(function () {});
      if (typeof caches !== 'undefined') {
        caches.keys().then(function (names) { names.forEach(function (n) { caches.delete(n); }); }).catch(function () {});
      }
    } else {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(function (registration) {
            console.log('ServiceWorker registration successful');
            registration.addEventListener('updatefound', function () {
              var newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', function () {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Do NOT auto-reload mid-OAuth-callback: reloading away a ?code=/
                    // ?state= URL throws out the single-use code + CSRF nonce and
                    // dead-ends the login. And reload at most once per page-load, so a
                    // SW that changes on every server restart (dev) can't loop. The new
                    // SW still controls subsequent navigations via clients.claim().
                    var p = new URLSearchParams(window.location.search);
                    if (p.has('code') || p.has('state')) return;
                    if (window.__pwaReloadedOnce) return;
                    window.__pwaReloadedOnce = true;
                    console.log('New app version available, reloading...');
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch(function (err) {
            console.log('ServiceWorker registration failed: ', err);
          });
      });
    }
  }

  // Catch chunk/module load failures from stale caches and auto-recover.
  // sessionStorage-backed retry counter prevents infinite reloads when the
  // failure is upstream (e.g. Cloudflare 522 cached for this hostname).
  function recoverFromStaleChunks(reason) {
    if (window.__chunkErrorRecovery) return;
    window.__chunkErrorRecovery = true;
    var key = '__chunkRecoveryAttempts';
    var attempts = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (attempts >= 2) {
      console.error('Chunk recovery failed after ' + attempts + ' attempts. Showing error.');
      sessionStorage.removeItem(key);
      var root = document.getElementById('root');
      if (!root) return;
      root.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;font-family:system-ui;color:#cbd5e1">' +
        '<div><h2 style="margin-bottom:0.5em">Failed to load application</h2>' +
        '<p style="color:#94a3b8">A cached resource could not be loaded. Please hard-refresh (Ctrl+Shift+R) or clear your browser cache.</p>' +
        '<button id="__chunkRecoveryRetry" style="margin-top:1em;padding:0.5em 1.5em;background:#3b82f6;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem">Retry</button></div></div>';
      var btn = document.getElementById('__chunkRecoveryRetry');
      if (btn) {
        btn.addEventListener('click', function () {
          sessionStorage.clear();
          location.reload();
        });
      }
      return;
    }
    sessionStorage.setItem(key, String(attempts + 1));
    console.warn('Stale module detected (' + reason + '), clearing caches (attempt ' + (attempts + 1) + '/2)...');
    Promise.all([
      navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      }) : Promise.resolve(),
      typeof caches !== 'undefined' ? caches.keys().then(function (names) {
        return Promise.all(names.map(function (n) { return caches.delete(n); }));
      }) : Promise.resolve()
    ]).finally(function () { window.location.replace(window.location.href); });
  }

  window.addEventListener('error', function (e) {
    if (e.message && (e.message.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      e.message.indexOf('ChunkLoadError') !== -1 ||
      e.message.indexOf('Loading chunk') !== -1)) {
      recoverFromStaleChunks('error: ' + e.message);
    }
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var msg = e.reason && (e.reason.message || String(e.reason));
    if (msg && (msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('error loading dynamically imported module') !== -1 ||
      msg.indexOf('Unable to preload CSS') !== -1)) {
      recoverFromStaleChunks('rejection: ' + msg);
    }
  });
})();
