import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiProxyFirst } from './vite-api-proxy-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [apiProxyFirst(apiTarget), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './tests/setup.ts',
      coverage: {
        // Regression floor, not an aspiration. Scope is the
        // server / business-logic surface (lib + api) where unit testing is most
        // valuable and where the planned auth/dispatcher/mapper tests will
        // land; the 96K-line untested UI is intentionally out of the denominator
        // so the gate isn't dominated by component churn. `all: true` counts
        // untested files too, so the baseline is honest (~6% lines today).
        // Thresholds sit ~1 point under the measured baseline: they pass now and
        // catch a drop (e.g. mass test deletion) without failing normal PRs.
        // Ratchet these up as coverage grows — do not let them drift down.
        provider: 'v8',
        all: true,
        include: ['lib/**', 'api/**'],
        exclude: ['**/*.d.ts'],
        reporter: ['text-summary'],
        thresholds: {
          lines: 5,
          statements: 5,
          functions: 3,
          branches: 3,
        },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('livekit')) return 'vendor-livekit';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('@google') || id.includes('genai')) return 'vendor-genai';
              return 'vendor';
            }
            // Bundle supabaseClient wrapper with the @supabase vendor chunk.
            // Prevents Vite from creating a standalone 'supabaseClient-HASH.js'
            // chunk that Cloudflare's edge optimization (Auto-Minify/Rocket Loader)
            // fails to proxy — returning 522 instead of the file.
            if (id.includes('lib/supabaseClient')) return 'vendor-supabase';
          }
        }
      },
      chunkSizeWarningLimit: 1000
    }
  };
});
