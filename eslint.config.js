// Flat ESLint config (ESLint v9). Project is "type": "module" so this file is ESM.
//
// Type-aware rules (typescript-eslint's `recommendedTypeChecked`) are deliberately
// skipped to avoid the per-file cost of `parserOptions.project`. Revisit if/when we
// want `no-floating-promises`, `no-misused-promises`, etc.
//
// `no-explicit-any` and `no-non-null-assertion` are off in this baseline pack —
// the codebase has ~1,500 `: any` annotations concentrated in api/actions/* and
// lib/db/*. A future pack should flip them on after a focused cleanup sweep.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
    // -------------------------------------------------------------------------
    // Ignores
    // -------------------------------------------------------------------------
    {
        ignores: [
            'dist/**',
            'dist-server/**',
            'node_modules/**',
            'legacy-portal/**',
            'supabase-reports/**',
            'coverage/**',
            '.vite/**',
            // Vite serves /public/ as static assets; not part of the TS compile.
            // Includes pwa-init.js, generated SW, etc. — ESM/browser globals don't
            // apply uniformly here.
            'public/**',
        ],
    },

    // -------------------------------------------------------------------------
    // Base layer — applies to all linted files
    // -------------------------------------------------------------------------
    js.configs.recommended,
    {
        rules: {
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'error',
            // Empty catch is allowed only when the block contains a comment
            // explaining why — `no-empty` treats commented blocks as non-empty.
            'no-empty': ['error', { allowEmptyCatch: false }],
        },
    },

    // -------------------------------------------------------------------------
    // TypeScript layer — non-type-checked recommended config
    // -------------------------------------------------------------------------
    ...tseslint.configs.recommended.map((cfg) => ({
        ...cfg,
        files: ['**/*.{ts,tsx}'],
    })),
    {
        files: ['**/*.{ts,tsx}'],
        plugins: { 'unused-imports': unusedImports },
        rules: {
            // `no-explicit-any`: ~861 annotations + ~198 `as any` casts.
            //
            // Re-enabling means proper type authoring at three trust
            // boundaries: per-action RPC payload interfaces (16 files,
            // ~340 sites), Supabase row types for the 49 mappers in
            // lib/db/mappers.ts, and lib/db function param types
            // (~150-200 sites). That's a multi-week refactor project,
            // not lint-config work.
            //
            // Until that project lands, the rule stays off. The
            // `unused-imports/no-unused-imports` rule (Pack 10) still
            // catches dead-import bugs even with `any` allowed.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'error',
            'no-unused-vars': 'off',
            // unused-imports plugin: gives us the autofix for unused IMPORTS
            // (typescript-eslint's rule doesn't autofix). The autofix in this
            // pack already swept ~88 unused imports out cleanly.
            //
            // The companion rule for unused vars/args (~86 residual sites: stale
            // destructured locals from refactors, unused callback args, dead
            // helper functions in DashboardView/UnifiedCaseFileView etc.) is
            // OFF for now — those need individual judgment per site (delete
            // dead code vs. prefix with _ vs. keep for readability) which is
            // its own focused cleanup pass.
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': 'off',
            // -- Other TS rule tweaks --
            // TS handles undeclared vars; the base rule false-positives on TS-only syntax.
            'no-undef': 'off',
            // `@typescript-eslint/no-empty-object-type`: triggers on `{}` interfaces;
            // allow for now (only 2 sites).
            '@typescript-eslint/no-empty-object-type': 'off',
            // `@typescript-eslint/no-unused-expressions`: 2 sites; allow void short-circuits.
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },

    // -------------------------------------------------------------------------
    // React layer — JSX correctness (excluding rules TS already handles)
    // -------------------------------------------------------------------------
    {
        files: ['**/*.tsx'],
        plugins: { react },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        settings: { react: { version: '19' } },
        rules: {
            ...react.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off', // React 19 / new JSX transform
            'react/prop-types': 'off',         // TypeScript handles prop typing
            // `no-unescaped-entities`: PERMANENTLY OFF.
            // 365 sites of legitimate ' and " in JSX text. Modern React's JSX
            // transform parses these unambiguously; the rule's protection
            // (avoiding ambiguous parses) doesn't apply. Re-enabling would
            // require ~365 cosmetic edits with no behavioural value.
            'react/no-unescaped-entities': 'off',
        },
    },

    // -------------------------------------------------------------------------
    // Non-null assertion overrides
    // -------------------------------------------------------------------------
    // Two cluster files use `!` structurally — FleetOrgChart's chart renderer
    // discriminates LayoutNode by `type` field at runtime but the type isn't
    // expressed as a discriminated union; OpExecutionTab does similar. Tests
    // use `!` freely on test fixtures. File-level override avoids 49 inline
    // suppressions and leaves the rule's signal on the rest of the codebase.
    {
        // The non-null-assertion rule is most useful on COMPONENT code where
        // sloppy `!` usage hides legitimate null cases. The exemption list
        // below covers two categories:
        //
        //   1. api/** + lib/** + tests/** + App.tsx — `!` here is at trust
        //      boundaries (env vars asserted at boot, Supabase row narrows
        //      after select, test fixtures, SSR-injected globals). These
        //      assertions are deliberate.
        //
        //   2. Specific component files where `!` is structural — chart
        //      renderers narrowing discriminated unions by runtime type
        //      field, post-filter type-narrowing chains, modal wrappers
        //      that have already guarded their input prop.
        //
        // The rule fires on any *new* file or any file not in this list, so
        // sloppy `!` use in fresh code still gets caught at PR time. The
        // exemption list should not grow — when adding new code, prefer
        // proper narrowing.
        files: [
            'App.tsx',
            'api/**/*.{ts,tsx}',
            'lib/**/*.{ts,tsx}',
            'tests/**/*.{ts,tsx}',
            'contexts/HIDPTTContext.tsx',
            'hooks/useTableControls.ts',
            'components/modals/CreateOperationWizard.tsx',
            'components/modals/hr/ScheduleInterviewModal.tsx',
            'components/modals/hr/SecurityVettingModal.tsx',
            'components/ui/RadioWidget.tsx',
            'components/views/admin/AdminMemberManagement.tsx',
            'components/views/admin/ExternalToolsManagementTab.tsx',
            'components/views/admin/UnitManagementTab.tsx',
            'components/views/fleet/FleetManagerView.tsx',
            'components/views/fleet/FleetOrgChart.tsx',
            'components/views/government/LegislationDetailView.tsx',
            'components/views/government/VotingBooth.tsx',
            'components/views/hr/ProbationTab.tsx',
            'components/views/hr/UnifiedCaseFileView.tsx',
            'components/views/operations/OperationsCenterView.tsx',
            'components/views/operations/tabs/OpAARTab.tsx',
            'components/views/operations/tabs/OpCommandSignalsTab.tsx',
            'components/views/operations/tabs/OpExecutionTab.tsx',
            'components/views/operations/tabs/OpOrbatNodeGraph.tsx',
            'components/views/quartermaster/AdjustStockDialog.tsx',
            'components/views/tools/ExternalToolsView.tsx',
            'components/views/tools/RadioControlView.tsx',
            'components/views/warehouse/WhStockTab.tsx',
            'components/views/warehouse/modals/WhAdjustStockDialog.tsx',
        ],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },

    // -------------------------------------------------------------------------
    // React Hooks layer — keep strict; existing eslint-disable directives are honored
    // -------------------------------------------------------------------------
    {
        files: ['**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            // `exhaustive-deps`: ON at 'error' as of the audit completion
            // (172 → 0 warnings across 13 commits). The audit added missing
            // deps, wrapped producers in useCallback, and wrapped conditional
            // `?:[]` fallbacks in useMemo to stabilise downstream identity.
            // The remaining intentional omissions each carry an
            // `// eslint-disable-next-line react-hooks/exhaustive-deps --
            // <reason>` directive at the site documenting why the omission
            // is safe. Common reason patterns:
            //   - "intentional whole-object omission" — effects keyed on
            //     specific subfields where a whole-object dep would
            //     over-trigger.
            //   - "form reset only on isOpen / id flip" — adding the prop
            //     fields would clobber user input on realtime row updates.
            //   - "loads once on mount" — producer fns defined inline that
            //     close over current state at call time.
            //   - "interval-driven tick re-eval" — memos where a tick state
            //     drives Date.now()-based timer re-evaluation.
            //   - "ref cleanup snapshot" — refs read in effect cleanup that
            //     intentionally use the live ref at unmount.
            // When a new violation appears, treat it as a real bug unless
            // you can write the reason in one line at the call site.
            'react-hooks/exhaustive-deps': 'error',
            // `rules-of-hooks`: KEEP ON — real production-crash detector.
        },
    },

    // -------------------------------------------------------------------------
    // React Refresh layer — Vite HMR safety
    // -------------------------------------------------------------------------
    {
        files: ['**/*.tsx'],
        plugins: { 'react-refresh': reactRefresh },
        rules: {
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
        },
    },
    {
        // Context and hook modules legitimately export multiple things alongside
        // their hook/provider — disable the HMR-only-components rule here.
        // Also scoped off for a handful of view files that ship constants/utils
        // alongside their component (BulletinCard threat-style helpers,
        // BootSplash boot stages). These exports are stable; HMR
        // incompatibility is theoretical.
        files: [
            'contexts/**/*.tsx',
            'hooks/**/*.{ts,tsx}',
            '**/*Context.tsx',
            'components/views/intel/BulletinCard.tsx',
            'components/shared/BootSplash.tsx',
        ],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },

    // -------------------------------------------------------------------------
    // Globals — Node for server-side, browser for client-side
    // -------------------------------------------------------------------------
    {
        files: [
            'api/**/*.{ts,tsx}',
            'lib/**/*.{ts,tsx}',
            'scripts/**/*.{js,mjs,ts}',
            'server.ts',
            '*.config.{js,ts,mjs,cjs}',
            'eslint.config.js',
        ],
        languageOptions: {
            globals: { ...globals.node },
        },
    },
    {
        files: [
            'components/**/*.{ts,tsx}',
            'contexts/**/*.{ts,tsx}',
            'hooks/**/*.{ts,tsx}',
            'services/**/*.{ts,tsx}',
            '*.tsx',
            'DashboardApp.tsx',
        ],
        languageOptions: {
            globals: { ...globals.browser },
        },
    },

    // -------------------------------------------------------------------------
    // Shared modules (run in both Node and browser contexts)
    // -------------------------------------------------------------------------
    {
        files: ['types.ts', 'index.tsx'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
    },

    // -------------------------------------------------------------------------
    // Tests overlay — vitest globals
    // -------------------------------------------------------------------------
    {
        files: ['tests/**/*.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                beforeEach: 'readonly',
                afterAll: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
            },
        },
    },

    // -------------------------------------------------------------------------
    // no-console ratchet — server areas fully migrated to the lib/log.ts
    // structured logger. Locking these globs prevents regression to raw
    // console.*. Scope is deliberately limited to the fully-migrated,
    // server-only directories: the RPC action handlers and the DB layer.
    // Broader globs still hold intentional console.* — the service-worker emit
    // (api/sw.ts ships console.* as browser code) and isomorphic/client modules
    // (lib/ai.ts, lib/audioCache.ts) that must not import the Node logger.
    // Expand this list as those areas migrate.
    // -------------------------------------------------------------------------
    {
        files: ['api/actions/**/*.ts', 'lib/db/**/*.ts'],
        rules: {
            'no-console': 'error',
        },
    },

    // -------------------------------------------------------------------------
    // no-explicit-any ratchet. The auth boundary
    // (api/actions/**) and the ENTIRE data layer (lib/db/**) are now typed:
    // RPC payload interfaces, Supabase row types (lib/db/mappers.ts + rows.ts),
    // function params, row mappers, and query results. any-freedom is enforced
    // across both to prevent backsliding. There
    // are zero remaining inline `// eslint-disable-next-line` exceptions in either
    // tree — getAllSettings, the last holdout, now returns a typed SettingsBlob.
    // The rule stays globally 'off' (see above) — the ~800 sites in
    // components/contexts/hooks are a separate, larger effort.
    // -------------------------------------------------------------------------
    {
        files: ['api/actions/**/*.ts', 'lib/db/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
];
