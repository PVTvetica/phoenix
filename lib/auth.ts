
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { log as baseLog } from './log.js';

const log = baseLog.child({ module: 'lib.auth' });

// JWT signing secret — MUST be set via environment variable.
// A dedicated JWT_SECRET is required; do NOT reuse the Supabase service role key
// (privilege separation: a token-signing leak must not equal a DB superuser leak).
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('CRITICAL: JWT_SECRET is not configured. Set JWT_SECRET to a dedicated random value (e.g. `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`).');
    }
    // In dev, warn loudly but allow startup with a per-process random secret
    // (tokens will not survive server restarts — intentional for dev safety)
    log.error('jwt_secret not set, using ephemeral random secret (tokens invalidate on restart)', { env: 'dev' });
}

const SIGNING_KEY = SECRET || randomBytes(32).toString('hex');

const TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthToken {
    userId: number;
    roleId: number;
    exp: number;
}

/** Derive when the token was issued (exp minus lifetime) */
export function tokenIssuedAt(token: AuthToken): Date {
    return new Date(token.exp - TOKEN_LIFETIME_MS);
}

export function signToken(payload: Omit<AuthToken, 'exp'>): string {
    const expiry = Date.now() + TOKEN_LIFETIME_MS;
    const data = JSON.stringify({ ...payload, exp: expiry });
    const encodedData = Buffer.from(data).toString('base64');
    const signature = createHmac('sha256', SIGNING_KEY).update(encodedData).digest('hex');
    return `${encodedData}.${signature}`;
}

export function verifyToken(token: string | undefined): AuthToken | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedData, signature] = parts;
    const expectedSignature = createHmac('sha256', SIGNING_KEY).update(encodedData).digest('hex');

    // Constant-time compare to prevent timing side-channel on the HMAC signature.
    // Decode both as hex Buffers; Buffer.from silently drops invalid hex chars,
    // so an unequal-length result indicates a malformed or mismatched signature.
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encodedData, 'base64').toString());
        if (Date.now() > payload.exp) return null;
        // A session token must NOT carry a non-session purpose (e.g. an admin-setup
        // grant). This prevents a short-lived grant token from being replayed as a
        // full session token. Session tokens have no `purpose` field.
        if (payload.purpose) return null;
        return payload as AuthToken;
    } catch {
        return null;
    }
}

// --- REALTIME AUTHORIZATION TOKEN -------------------------------------------
// Supabase Realtime private channels authorize subscribers by evaluating RLS
// policies on realtime.messages against the JWT the client passed to
// realtime.setAuth(). Our session tokens are a custom HMAC format signed with
// JWT_SECRET, so the server mints a SEPARATE standards-compliant HS256 JWT
// signed with the project's SUPABASE_JWT_SECRET (Dashboard → Settings → API).
// Claims: role 'authenticated' (the RLS role) + user_id (consumed by the
// op-board visibility policy in schema.sql). Lifetime matches the 7-day
// session so realtime doesn't silently die mid-session; re-minted on every
// boot. Revocation is layered, NOT token-lifetime-bound: (a) org channels are
// id-only — content fetches require the SEPARATE session token + a LIVE
// permission re-check, and force-logout invalidates that; (b) op-board content
// is gated by a LIVE RLS join (users.deleted_at + role_permissions +
// clearance), so a demoted/deleted user loses it immediately; (c) the org
// policy additionally requires the user row to be non-deleted. Without
// SUPABASE_JWT_SECRET no token is minted and clients cannot subscribe to ANY
// channel: fail-closed (no realtime, no leak) with a loud log.

const REALTIME_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (matches the session)

const b64url = (input: Buffer | string): string =>
    Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let warnedMissingRealtimeSecret = false;

export function signRealtimeToken(userId: number): string | null {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
        if (!warnedMissingRealtimeSecret) {
            warnedMissingRealtimeSecret = true;
            log.error('SUPABASE_JWT_SECRET is not configured — realtime tokens cannot be minted, so clients cannot subscribe to the private broadcast channels (live updates disabled; data stays safe). Set it from Supabase Dashboard → Settings → API → JWT Secret.');
        }
        return null;
    }
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    // sub MUST be a valid UUID: Postgres policies call auth.uid() which casts
    // sub to uuid — a bare integer id would make every such policy throw
    // (deny). Synthetic, deterministic, never joined against (app tables key
    // on the integer user_id claim instead).
    const syntheticSub = `00000000-0000-4000-8000-${String(userId).padStart(12, '0').slice(-12)}`;
    const payload = b64url(JSON.stringify({
        role: 'authenticated',
        sub: syntheticSub,
        user_id: userId,
        iat: now,
        exp: now + Math.floor(REALTIME_TOKEN_LIFETIME_MS / 1000),
    }));
    const signature = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest());
    return `${header}.${payload}.${signature}`;
}

// --- ADMIN-SETUP GRANT (single-org first-boot) -----------------------------
// A short-lived, server-signed token proving that THIS browser completed the
// OAuth flow carrying a valid one-time admin setup code (validated + consumed
// server-side in auth:discord_callback). auth:finalize_setup derives the Admin
// grant ONLY from verifying this token against the OAuth-verified discordId —
// never from a client-supplied `isAdmin` flag. Bound to discordId so it cannot
// be replayed to finalize a different identity.
const ADMIN_SETUP_GRANT_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes

export function signAdminSetupGrant(discordId: string): string {
    const expiry = Date.now() + ADMIN_SETUP_GRANT_LIFETIME_MS;
    const data = JSON.stringify({ purpose: 'admin_setup', discordId, exp: expiry });
    const encodedData = Buffer.from(data).toString('base64');
    const signature = createHmac('sha256', SIGNING_KEY).update(encodedData).digest('hex');
    return `${encodedData}.${signature}`;
}

export function verifyAdminSetupGrant(token: string | undefined): { discordId: string } | null {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedData, signature] = parts;
    const expectedSignature = createHmac('sha256', SIGNING_KEY).update(encodedData).digest('hex');
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const payload = JSON.parse(Buffer.from(encodedData, 'base64').toString());
        if (payload.purpose !== 'admin_setup') return null;
        if (typeof payload.discordId !== 'string' || !payload.discordId) return null;
        if (Date.now() > payload.exp) return null;
        return { discordId: payload.discordId };
    } catch {
        return null;
    }
}
