// One-off RLS dump tool. Queries pg_policies + pg_class on the live Supabase
// project and writes migrations/rls-policies.sql in CREATE-POLICY form.
// The live RLS policies should be version-controlled rather than
// dashboard-only, and `supabase db dump` requires Docker on Windows — this
// script is the Docker-free alternative.
//
// Prereqs:
//   1. supabase CLI logged in + linked to the project (only needed to mint
//      a fresh `cli_login_postgres.<ref>` credential — `supabase link`
//      stores it in ~/.supabase/access-token).
//   2. The `pg` package available. It's NOT in package.json (single-purpose
//      tool). Install transiently before running:
//        npm install --no-save pg
//      and remove after:
//        npm uninstall pg
//
// Usage:
//   $env:SUPABASE_DB_URL = "postgresql://USER:PASS@HOST:5432/postgres"
//   node --no-warnings scripts/dump-rls-policies.mjs
//
// To get a connection string fast: `supabase db dump --linked --dry-run`
// prints the PGUSER/PGPASSWORD/PGHOST/PGDATABASE the CLI is using. Format
// them as a postgresql:// URI and feed via SUPABASE_DB_URL.
//
// Rerun whenever a migration adds or changes RLS in the dashboard. Diff the
// generated file to verify the intended change landed.

import pg from 'pg';
import fs from 'fs';

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
    console.error('SUPABASE_DB_URL env var is required. See header comment for how to obtain.');
    process.exit(1);
}

const { Client } = pg;
const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

await client.connect();

const rlsEnabled = await client.query(`
    SELECT n.nspname AS schemaname, c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
    ORDER BY c.relname;
`);

const policies = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
`);

await client.end();

const banner = `-- =============================================================================
-- RLS POLICIES — extracted from the live Supabase project (public schema)
-- =============================================================================
-- Source: live dump via pg_policies + pg_class on ${new Date().toISOString()}.
-- Regenerate with scripts/dump-rls-policies.mjs (see header for prereqs).
--
-- This file is the canonical reference for the deny-by-default RLS in the
-- public schema. Policies live here, not just in the Supabase dashboard, so
-- they're reviewable + diff-able across deploys.
--
-- Coverage: ${rlsEnabled.rows.length} RLS-enabled tables, ${policies.rows.length} policies (public schema only —
-- internal schemas auth/realtime/storage/etc. are Supabase-managed).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
`;

let out = banner;
for (const row of rlsEnabled.rows) {
    out += `ALTER TABLE "${row.schemaname}"."${row.tablename}" ENABLE ROW LEVEL SECURITY;\n`;
}

out += `\n-- -----------------------------------------------------------------------------\n`;
out += `-- POLICIES (grouped by table)\n`;
out += `-- -----------------------------------------------------------------------------\n\n`;

let prevTable = '';
for (const row of policies.rows) {
    if (row.tablename !== prevTable) {
        out += `-- ${row.tablename}\n`;
        prevTable = row.tablename;
    }
    // pg returns name[] as either an array or a "{a,b,c}" literal depending on
    // parser registration. Handle both.
    let roleList;
    if (Array.isArray(row.roles)) roleList = row.roles;
    else if (typeof row.roles === 'string') {
        const inner = row.roles.replace(/^\{|\}$/g, '');
        roleList = inner ? inner.split(',') : [];
    } else roleList = [];
    const roles = roleList.map(r => `"${r}"`).join(', ');
    out += `CREATE POLICY "${row.policyname}" ON "${row.schemaname}"."${row.tablename}"\n`;
    out += `    AS ${row.permissive}\n`;
    out += `    FOR ${row.cmd}\n`;
    out += `    TO ${roles || 'PUBLIC'}\n`;
    if (row.qual) out += `    USING (${row.qual})\n`;
    if (row.with_check) out += `    WITH CHECK (${row.with_check})\n`;
    out += `;\n\n`;
}

fs.writeFileSync('migrations/rls-policies.sql', out);
console.log(`Wrote migrations/rls-policies.sql: ${rlsEnabled.rows.length} RLS-enabled tables, ${policies.rows.length} policies`);
