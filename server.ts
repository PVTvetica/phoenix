
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { randomBytes } from 'node:crypto';
import { getClientIp } from './lib/clientIp.js';
import { pruneAuthRateLimitBuckets } from './lib/authRateLimit.js';
import { log as baseLog } from './lib/log.js';

const log = baseLog.child({ module: 'server' });

// =============================================================================
// Security: scanner-path early 404 + per-IP abuse blackhole. Lives at the top
// of the middleware stack so probes never reach body parsing, static, or any
// downstream handler. Client IP extraction is in lib/clientIp.ts (shared with
// the services dispatcher's per-action rate limit).
// =============================================================================

/**
 * Paths matched here are returned 404 immediately with no logging beyond a
 * deduped one-liner per IP per minute. They are scanner / probe paths that
 * have no legitimate use on this site (we don't run WordPress, expose .git,
 * etc.). Update sparingly — false positives cost less than false negatives
 * here, but adding a path that overlaps a real route would 404 real users.
 */
const SCANNER_PATH_RE = /^\/(wp-|wordpress|xmlrpc\.php|\.git\b|\.env\b|\.aws\b|\.svn\b|cgi-bin|phpmyadmin|phpMyAdmin|admin\.php|setup\.php|server-status|server-info|wp\d*\/|blog\/wp-|web\/wp-|website\/wp-|news\/wp-|shop\/wp-|cms\/wp-|sito\/wp-|test\/wp-|site\/wp-|wp\/wp-|\d{4}\/wp-)/i;

interface AbuseTracker {
    count: number;        // total bad requests in the current sliding window
    firstSeen: number;    // window start
    blockedUntil: number; // epoch ms; 0 if not blocked
}
const ipAbuseTracker = new Map<string, AbuseTracker>();
const ABUSE_WINDOW_MS = 60_000;       // sliding window for counting
const ABUSE_THRESHOLD = 20;           // bad requests to trip blackhole
const BLOCK_DURATION_MS = 5 * 60_000; // 5 minutes
const MAX_TRACKER_ENTRIES = 5_000;    // hard cap; sheds new entries when full to prevent memory blowup from spray attacks

const lastScannerLog = new Map<string, number>();
const SCANNER_LOG_DEDUPE_MS = 60_000;

// Periodic cleanup of expired trackers. .unref() so this timer doesn't keep
// the process alive on shutdown.
setInterval(() => {
    const now = Date.now();
    for (const [ip, t] of ipAbuseTracker) {
        if (t.blockedUntil < now && (now - t.firstSeen) > ABUSE_WINDOW_MS * 5) {
            ipAbuseTracker.delete(ip);
        }
    }
    for (const [ip, ts] of lastScannerLog) {
        if (now - ts > SCANNER_LOG_DEDUPE_MS * 5) lastScannerLog.delete(ip);
    }
    pruneAuthRateLimitBuckets(now);
}, 60_000).unref?.();

function bumpAbuseCounter(ip: string): void {
    if (ip === 'unknown') return;
    const now = Date.now();
    let t = ipAbuseTracker.get(ip);
    if (!t) {
        // Evict the oldest entry to make room when the cap is hit. Previously we
        // returned early, which silently stopped tracking *every* new IP for up
        // to 60s — an attacker could fill the map with spray traffic and pin
        // out everyone else's protection. Map iteration order is insertion
        // order, so the first key is the oldest. Prefer evicting an entry whose
        // block has already expired so an actively-blocked IP isn't released
        // simply because it happens to be the oldest.
        if (ipAbuseTracker.size >= MAX_TRACKER_ENTRIES) {
            let evicted = false;
            for (const [oldIp, oldT] of ipAbuseTracker) {
                if (oldT.blockedUntil < now) {
                    ipAbuseTracker.delete(oldIp);
                    evicted = true;
                    break;
                }
            }
            if (!evicted) {
                const oldest = ipAbuseTracker.keys().next().value;
                if (oldest) ipAbuseTracker.delete(oldest);
            }
        }
        t = { count: 0, firstSeen: now, blockedUntil: 0 };
        ipAbuseTracker.set(ip, t);
    }
    if (now - t.firstSeen > ABUSE_WINDOW_MS) {
        t.count = 0;
        t.firstSeen = now;
    }
    t.count += 1;
    if (t.count >= ABUSE_THRESHOLD && t.blockedUntil < now) {
        t.blockedUntil = now + BLOCK_DURATION_MS;
        log.info('ip blackholed', { ip, blockSeconds: BLOCK_DURATION_MS / 1000, badRequests: t.count, windowSeconds: ABUSE_WINDOW_MS / 1000 });
    }
}

function isBlocked(ip: string): boolean {
    const t = ipAbuseTracker.get(ip);
    return !!t && t.blockedUntil > Date.now();
}

// Import Handlers
// Note: We need to import the built versions or ensure ts-node is used. 
// Since we are compiling to dist-server, these relative imports will be resolved relative to dist-server/server.js
// api/index -> ./api/index.js
import handlerFn from './api/index.js';
import servicesFn, { validatePermissionMap } from './api/services.js';
import queryFn from './api/query.js';
import swFn from './api/sw.js';
import publicFn from './api/public.js';
import { respondToPair as allianceRespondToPair, getAllianceSelfProfile as allianceGetSelfProfile, verifyApiKey as allianceVerifyApiKey, getAlliancePeerByInboundKey as allianceGetPeerByInboundKey, getAllianceShareableData as allianceGetShareableData,
    getOperationSnapshotForPeer, acceptInviteForPeer, declineInviteForPeer, upsertAlliedParticipant,
    receiveMirrorInvite, receiveMirrorPush, receiveMirrorRevoke,
    getAllyRosterProjection, getAllyFleetProjection, getUserById, importOrgData } from './lib/db.js';
import { runFirstBootCheck } from './lib/firstBoot.js';
import { verifyToken, signToken } from './lib/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fail fast at startup if required config is missing in production — catches
// misconfig on boot instead of on the first DB query / first token verify.
// Single-org self-hosted: no Stripe/billing — the server just needs its
// Supabase connection. (JWT_SECRET is validated separately in lib/auth.ts.)
if (process.env.NODE_ENV === 'production') {
    const requiredEnvVars: Array<[string, string]> = [
        ['SUPABASE_URL', 'The Supabase project URL — the server cannot reach the database without it.'],
        ['SUPABASE_SERVICE_ROLE_KEY', 'The Supabase service-role key — required for all server-side database access.'],
        // SECURITY: encryption-at-rest for admin-entered secrets
        // (Discord/LiveKit/Gemini keys) is mandatory. encryptSecret() now fails
        // closed without this key, so boot would otherwise defer the failure to the
        // first secret save — surface it at startup instead.
        ['SECRETS_ENCRYPTION_KEY', 'Required to encrypt admin-entered secrets at rest. Generate with `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`.'],
    ];
    const missing = requiredEnvVars.filter(([name]) => !process.env[name]);
    if (missing.length > 0) {
        for (const [name, hint] of missing) {
            log.error('required env var not set', { name, hint });
        }
        throw new Error(`Startup aborted: missing required env vars: ${missing.map(m => m[0]).join(', ')}`);
    }
}

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3000;

// --- Early scanner / blackhole gate ---
// First middleware in the chain so blocked IPs and known-scanner paths
// never trigger body parsing, static lookup, or any downstream handler.
// Stashes the resolved client IP on req for downstream use.
app.use((req, res, next) => {
    const ip = getClientIp(req);
    (req as any)._clientIp = ip;

    if (isBlocked(ip)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).send('Not Found');
    }
    if (SCANNER_PATH_RE.test(req.path)) {
        bumpAbuseCounter(ip);
        const now = Date.now();
        const last = lastScannerLog.get(ip) || 0;
        if (now - last > SCANNER_LOG_DEDUPE_MS) {
            log.info('scanner probe', { ip, method: req.method, path: req.path });
            lastScannerLog.set(ip, now);
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.status(404).send('Not Found');
    }
    next();
});

// Middleware to parse JSON bodies (Vercel functions expect parsed body)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Per-request CSP nonce. The SSR handler (api/index.ts) stamps this onto the
    // <script> tags it serves so script-src can drop 'unsafe-inline' — any XSS
    // sink that bypasses DOMPurify can no longer execute injected inline script.
    // HTML responses are no-store, so the nonce is always fresh per document.
    // style-src keeps 'unsafe-inline' for now: React inline styles and the boot
    // splash's many style="" attributes can't carry a nonce (CSP nonces apply to
    // <script>/<style> elements, not style attributes). The vestigial Tailwind
    // CDN allowance is dropped — Tailwind v4 is compiled via @tailwindcss/vite.
    const cspNonce = randomBytes(16).toString('base64');
    res.locals.cspNonce = cspNonce;

    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'nonce-${cspNonce}' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https: wss://*.supabase.co wss://*.livekit.cloud; font-src 'self' data: https://cdnjs.cloudflare.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://docs.google.com https://drive.google.com https://calendar.google.com https://www.google.com https://open.spotify.com https://codepen.io https://stackblitz.com; media-src 'self' blob: https:; manifest-src 'self';`);
    // Only set HSTS if using HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Request Logging
// - Production: method + status + path + tenant subdomain (no query string, avoids
//   leaking session/auth params like ?code=, ?token= to log storage).
// - Dev: full URL with query string for easier debugging.
// Tenant subdomain is derived from the Host header so faults can be traced to an org.
app.use((req, res, next) => {
    const isProd = process.env.NODE_ENV === 'production';
    const start = Date.now();
    const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '') as string;
    const cleanHost = host.split(':')[0].toLowerCase();
    const subdomain = cleanHost.split('.')[0] || '-';
    const ip = (req as any)._clientIp || getClientIp(req);
    res.on('finish', () => {
        const dur = Date.now() - start;
        // Count non-scanner 404s towards the abuse threshold so wordlist
        // scanners that don't match SCANNER_PATH_RE still trip the blackhole.
        // Scanner-path 404s are already counted by the early-block middleware.
        if (res.statusCode === 404) bumpAbuseCounter(ip);

        if (isProd) {
            // Path only, no query — avoids persisting sensitive params.
            log.info('request', { method: req.method, status: res.statusCode, path: req.path, ip, org: subdomain, durationMs: dur });
        } else {
            log.info('request', { method: req.method, status: res.statusCode, hostname: req.hostname, url: req.originalUrl, ip, durationMs: dur });
        }
    });
    next();
});

// Serve Static Frontend (Vite Build Output)
// We assume 'dist' is sibling to 'dist-server' or in root.
// If running from dist-server/server.js, root is ../
const distPath = path.resolve(__dirname, '../dist');

// CORS for media assets — allows tenant subdomains to load images from root domain
app.use('/media', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

// Serve static assets, but NOT index.html automatically for the root route,
// so we can let the SSR handler do its job.
// setHeaders ensures HTML is never cached by CDN/browser (prevents stale chunk references after deploys),
// while hashed assets (JS/CSS) get long-term caching.
app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('CDN-Cache-Control', 'no-store');
        } else if (filePath.includes('assets')) {
            // Hashed assets (JS/CSS) are content-addressed — safe to cache indefinitely.
            // This lets Cloudflare edge cache them, avoiding 522 origin timeouts.
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
            // Non-hashed static files (icon.svg, media, etc.) — short-lived cache so
            // Cloudflare doesn't permanently cache 404s or stale responses for these paths.
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Rate Limiting
const apiLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true });
app.use('/api', apiLimiter);

// Public page endpoints — unauth, GET-only, tighter per-(ip+slug) rate limit.
// The global apiLimiter already applies; this is an additional cap to deter
// scraping/abuse of the unauthenticated endpoints.
const publicLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    // ipKeyGenerator handles IPv6 properly; using raw req.ip would let IPv6
    // clients bypass the limit by varying the trailing 64 bits of their addr.
    keyGenerator: (req, res) => `${ipKeyGenerator((req as any).ip || '')}:${(req.query?.slug as string) || ''}`,
});
app.get('/api/public', publicLimiter, async (req, res) => {
    try {
        await publicFn(req, res);
    } catch (e) {
        log.error('api public error', { err: e });
        if (!res.headersSent) res.status(404).json({ error: 'not_found' });
    }
});

// Per-user, per-org dynamic data must NEVER be cached at the edge.
// Without an explicit Cache-Control, Cloudflare (and other intermediaries)
// can cache JSON GET responses based on URL alone, serving one user's data
// to another user in the same org. Apply on every dynamic RPC endpoint.
function noStore(res: express.Response): void {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vary', 'Authorization, Cookie');
}

// Auth actions (Discord OAuth callback, initial setup finalisation) ride
// the global 100 req/min/IP cap, which leaves enough headroom for
// credential-stuffing-style probing across many user accounts via the
// callback. This limiter caps auth:* dispatches at 10/min/IP — well above
// any legitimate retry pattern, well below useful probing throughput.
// Applied as a per-route middleware that inspects the parsed JSON body
// and only triggers when action.startsWith('auth:'), so non-auth RPCs are
// unaffected and continue to hit the global limiter alone.
const authActionLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    keyGenerator: (req) => ipKeyGenerator((req as any).ip || ''),
    message: { message: 'Too many authentication attempts. Please wait a minute and try again.' },
});
app.use('/api/services', (req, res, next) => {
    const action = (req as express.Request).body?.action;
    if (typeof action === 'string' && action.startsWith('auth:')) {
        return authActionLimiter(req, res, next);
    }
    next();
});

// API Routes
app.post('/api/services', async (req, res) => {
    noStore(res);
    try {
        // Adapt Express req/res to Vercel-like handler expectation
        await servicesFn(req, res);
    } catch (e) {
        log.error('api service error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/query', async (req, res) => {
    noStore(res);
    try {
        await queryFn(req, res);
    } catch (e) {
        log.error('api query error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
});

// First-run / admin STREAMED data import. Same gate as the admin:import_org RPC
// (admin:access), but streams per-table progress as NDJSON so the onboarding
// wizard + admin console render a real progress bar + live log. The body is the
// raw NDJSON export (text/*, up to 64 MB); each event is flushed through the
// compression middleware so the client sees progress incrementally.
app.post('/api/admin/import-stream', express.text({ type: () => true, limit: '64mb' }), async (req, res) => {
    noStore(res);
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        const decoded = token ? verifyToken(token) : null;
        if (!decoded) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const user = await getUserById(decoded.userId);
        const isAdmin = !!user && (user.role === 'Admin' || (Array.isArray(user.permissions) && user.permissions.includes('admin:access')));
        if (!isAdmin) { res.status(403).json({ error: 'Forbidden' }); return; }

        const ndjson = typeof req.body === 'string' ? req.body : '';
        if (!ndjson.trim()) { res.status(400).json({ error: 'No import data provided.' }); return; }
        if (ndjson.length > 64 * 1024 * 1024) { res.status(413).json({ error: 'Import file too large (max 64 MB).' }); return; }

        // Optional admin↔imported-user MERGE: the client passes the export user id
        // the admin mapped to ("this imported user is me"). The merge TARGET (the
        // acting admin's own users.id) is server-derived from the verified token,
        // never client-trusted — an admin can only re-anchor onto their own account.
        const mergeRaw = req.query.mergeUserId;
        const mergeId = Number(Array.isArray(mergeRaw) ? mergeRaw[0] : mergeRaw);
        const merge = Number.isInteger(mergeId) && mergeId > 0
            ? { importedUserId: mergeId, adminUserId: user.id }
            : undefined;

        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('X-Accel-Buffering', 'no');
        const write = (evt: unknown) => {
            res.write(JSON.stringify(evt) + '\n');
            (res as unknown as { flush?: () => void }).flush?.();
        };
        try {
            const result = await importOrgData(ndjson, (evt) => { write(evt); }, merge);
            // A merge can re-anchor the admin onto a new users.id; issue a fresh
            // session token so the client stays authenticated as the merged identity.
            if (result.reanchoredAdminUserId != null && result.reanchoredAdminUserId !== decoded.userId) {
                const token = signToken({ userId: result.reanchoredAdminUserId, roleId: result.reanchoredAdminRoleId ?? 0 });
                write({ type: 'reauth', token, userId: result.reanchoredAdminUserId });
            }
        } catch (err) {
            write({ type: 'error', message: err instanceof Error ? err.message : 'Import failed.' });
        }
        res.end();
    } catch (e) {
        log.error('import-stream error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
        else { try { res.end(); } catch { /* already streaming */ } }
    }
});

// --- Alliance federation: SERVER-TO-SERVER ONLY (never browser-facing) ---
// Peers reach these directly. /pair runs the code-authenticated ECDH handshake
// responder; /profile returns our advertised directory card to a key-verified
// peer. Dedicated 20/min/IP limiter on top of the global 100/min/IP cap.
const allianceLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    keyGenerator: (req) => ipKeyGenerator((req as any).ip || ''),
});
const ALLIANCE_PAIR_DENIED = new Set([
    'no_pending_pairing', 'pairing_expired', 'handshake_verification_failed',
    'invalid_from_url', 'malformed_request',
]);
app.post('/api/alliance/pair', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const result = await allianceRespondToPair({
            fromBaseUrl: req.body?.fromBaseUrl,
            ephemeralPub: req.body?.ephemeralPub,
            nonce: req.body?.nonce,
            codeProof: req.body?.codeProof,
        });
        res.json(result);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'pairing_failed';
        if (ALLIANCE_PAIR_DENIED.has(msg)) {
            log.warn('alliance pair rejected', { reason: msg });
            if (!res.headersSent) res.status(403).json({ error: 'forbidden' });
            return;
        }
        log.error('alliance pair error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'pairing_failed' });
    }
});
app.get('/api/alliance/profile', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const key = req.headers['x-api-key'];
        const verified = typeof key === 'string' ? await allianceVerifyApiKey(key) : null;
        if (!verified) return res.status(403).json({ error: 'forbidden' });
        res.json(await allianceGetSelfProfile());
    } catch (e) {
        log.error('alliance profile error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'profile_failed' });
    }
});
// Intel channel (Phase 2): a paired peer pulls the data we share with THEM,
// gated by that peer's enabled channels + outbound clearance. The presented
// x-api-key resolves to the calling peer (Active only).
app.get('/api/alliance/data', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const key = req.headers['x-api-key'];
        const peer = typeof key === 'string' ? await allianceGetPeerByInboundKey(key) : null;
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        const since = typeof req.query.since === 'string' ? req.query.since : undefined;
        const data = await allianceGetShareableData(peer, since);
        res.json({
            countReports: data.reports.length,
            countWarrants: data.warrants.length,
            countBulletins: data.bulletins.length,
            fetchedAt: new Date().toISOString(),
            reports: data.reports,
            warrants: data.warrants,
            bulletins: data.bulletins,
            _meta: data._meta,
        });
    } catch (e) {
        log.error('alliance data error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'data_failed' });
    }
});

// --- Joint-operation federation (alliance P3): SERVER-TO-SERVER ONLY ---
// All gated by getAlliancePeerByInboundKey (the calling peer must be an Active ally).
async function allianceCaller(req: express.Request): Promise<{ id: string } | null> {
    const key = req.headers['x-api-key'];
    return typeof key === 'string' ? await allianceGetPeerByInboundKey(key) : null;
}
const OP_FED_DENIED = new Set(['forbidden', 'malformed_request']);
function handleOpFedError(res: express.Response, e: unknown, label: string): void {
    const msg = e instanceof Error ? e.message : 'error';
    if (OP_FED_DENIED.has(msg)) { if (!res.headersSent) res.status(403).json({ error: 'forbidden' }); return; }
    log.error(`${label} error`, { err: e });
    if (!res.headersSent) res.status(500).json({ error: 'failed' });
}
// Host inbound — guests poll / accept / decline / RSVP against the host op.
app.get('/api/alliance/op/:opId', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        const since = typeof req.query.since === 'string' ? Number(req.query.since) : undefined;
        res.json(await getOperationSnapshotForPeer(req.params.opId, peer.id, Number.isFinite(since as number) ? since : undefined));
    } catch (e) { handleOpFedError(res, e, 'alliance op snapshot'); }
});
app.post('/api/alliance/op/:opId/accept', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        res.json(await acceptInviteForPeer(req.params.opId, peer.id));
    } catch (e) { handleOpFedError(res, e, 'alliance op accept'); }
});
app.post('/api/alliance/op/:opId/decline', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        await declineInviteForPeer(req.params.opId, peer.id);
        res.json({ ok: true });
    } catch (e) { handleOpFedError(res, e, 'alliance op decline'); }
});
app.post('/api/alliance/op/:opId/rsvp', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        await upsertAlliedParticipant(req.params.opId, peer.id, {
            remoteUserHandle: req.body?.remoteUserHandle,
            displayName: req.body?.displayName, avatarUrl: req.body?.avatarUrl,
            role: req.body?.role, shipText: req.body?.shipText,
            rsvpStatus: req.body?.rsvpStatus, isReady: req.body?.isReady,
        });
        res.json({ ok: true });
    } catch (e) { handleOpFedError(res, e, 'alliance op rsvp'); }
});
// Guest inbound — the host pushes invite / state / revoke to us.
app.post('/api/alliance/op-mirror/invite', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        await receiveMirrorInvite(peer, req.body);
        res.json({ ok: true });
    } catch (e) { handleOpFedError(res, e, 'alliance op-mirror invite'); }
});
app.post('/api/alliance/op-mirror/push', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        await receiveMirrorPush(peer, req.body);
        res.json({ ok: true });
    } catch (e) { handleOpFedError(res, e, 'alliance op-mirror push'); }
});
app.post('/api/alliance/op-mirror/revoke', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const peer = await allianceCaller(req);
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        await receiveMirrorRevoke(peer, req.body?.op_id);
        res.json({ ok: true });
    } catch (e) { handleOpFedError(res, e, 'alliance op-mirror revoke'); }
});

// Roster / fleet visibility (alliance P4): a paired peer pulls the minimal
// projection we've opted to share with them (channels.roster / channels.fleet).
app.get('/api/alliance/roster', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const key = req.headers['x-api-key'];
        const peer = typeof key === 'string' ? await allianceGetPeerByInboundKey(key) : null;
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        const data = await getAllyRosterProjection(peer);
        if (!data) return res.status(403).json({ error: 'forbidden' });
        res.json(data);
    } catch (e) { handleOpFedError(res, e, 'alliance roster'); }
});
app.get('/api/alliance/fleet', allianceLimiter, async (req, res) => {
    noStore(res);
    try {
        const key = req.headers['x-api-key'];
        const peer = typeof key === 'string' ? await allianceGetPeerByInboundKey(key) : null;
        if (!peer) return res.status(403).json({ error: 'forbidden' });
        const data = await getAllyFleetProjection(peer);
        if (!data) return res.status(403).json({ error: 'forbidden' });
        res.json(data);
    } catch (e) { handleOpFedError(res, e, 'alliance fleet'); }
});

// PWA Service Worker — must never be cached by Cloudflare/browser
app.get('/sw.js', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        await swFn(req, res);
    } catch (e) {
        log.error('sw error', { err: e });
        if (!res.headersSent) res.status(500).send('SW Error');
    }
});

// PWA Manifest — CORS enabled for cross-origin tenant subdomain → TLD fetches
app.options('/api/manifest', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
});
app.get('/api/manifest', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        // Express 5: req.query is an immutable getter, so inject target via URL rewrite
        const sep = req.url.includes('?') ? '&' : '?';
        req.url = req.url + sep + 'target=manifest';
        await queryFn(req, res);
    } catch (e) {
        log.error('manifest error', { err: e });
        if (!res.headersSent) res.status(500).json({ error: 'Manifest Error' });
    }
});

// SSR / Metadata Handler (The Catch-All)
// Intercept all GET requests that accept HTML
app.get(/(.*)/, async (req, res) => {
    // If it's a static file request that fell through express.static (e.g. missing asset), 404 it.
    // no-store prevents Cloudflare from caching the 404 at the edge — without this,
    // a missing asset during a deploy window can stay "stuck" as a cached 404.
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('CDN-Cache-Control', 'no-store');
        return res.status(404).send('Not Found');
    }

    try {
        await handlerFn(req, res);
    } catch (e) {
        log.error('ssr handler error', { err: e });
        // Fallback to static index.html if SSR fails
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

// Cron Jobs
//
// These run in-process here, but each is wrapped in withCronLease (a table-based
// lease, see lib/cronLock.ts) so they are safe under multi-instance deploys —
// only the instance holding the unexpired lease runs a given job per tick. The
// lease (not a separate worker process) is what provides the per-job exclusion;
// a dedicated worker process is an optional,
// ops-driven follow-up and is not required for correctness.
import cron from 'node-cron';
import { cleanupInactiveDutyUsers } from './lib/db/users.js';
import { cleanupExpiredBulletins } from './lib/db/intel.js';
import { withCronLease } from './lib/cronLock.js';

const server = app.listen(Number(port), '0.0.0.0', () => {
    log.info('server running', { port });
    log.info('deployment timestamp', { timestamp: new Date().toISOString() });
    log.info('serving static files', { distPath });

    // First-boot install: seed defaults + mint a one-time admin setup code if
    // no Admin exists yet. Non-blocking — the listener is already up so the
    // operator can reach the login page as soon as the code is printed.
    runFirstBootCheck().catch((err) => {
        log.error('first-boot check threw (unhandled)', { err });
    });

    // Validate permission-map coverage. A protected action missing from
    // fullPermissionMap silently 403s in production; surface it at boot so
    // deploy logs catch the drift immediately.
    const permCheck = validatePermissionMap();
    if (permCheck.missing.length > 0) {
        log.error('protected actions missing from permission map (will silently 403)', { count: permCheck.missing.length, actions: permCheck.missing });
    }
    if (permCheck.stale.length > 0) {
        log.warn('stale permission map entries (no matching action)', { count: permCheck.stale.length, entries: permCheck.stale });
    }
    if (permCheck.missing.length === 0 && permCheck.stale.length === 0) {
        log.info('permission map ok');
    }

    // Schedule Duty Status Cleanup (Every 1 minute)
    cron.schedule('* * * * *', async () => {
      await withCronLease('duty_cleanup', 50, async () => {
        const t0 = Date.now();
        try {
            const cleaned = await cleanupInactiveDutyUsers();
            const ms = Date.now() - t0;
            const n = cleaned?.length || 0;
            log.info('cron duty-cleanup', { usersOffDuty: n, durationMs: ms });
        } catch (e) {
            log.error('cron duty cleanup failed', { err: e });
        }
      });
    });

    // Schedule Intel Bulletin Cleanup (Every 5 minutes) - Fallback for pg_cron
    cron.schedule('*/5 * * * *', async () => {
      await withCronLease('bulletin_cleanup', 270, async () => {
        const t0 = Date.now();
        try {
            await cleanupExpiredBulletins();
            log.info('cron bulletin-cleanup done', { durationMs: Date.now() - t0 });
        } catch (e) {
            log.error('cron bulletin cleanup failed', { err: e });
        }
      });
    });

    log.info('cron jobs initialized');
});

// Graceful Shutdown
const gracefulShutdown = (signal: string) => {
    log.info('signal received, starting graceful shutdown', { signal });
    server.close(() => {
        log.info('all connections drained, server closed cleanly');
        process.exit(0);
    });
    // Force exit after 30 seconds if connections don't drain
    setTimeout(() => {
        log.error('forced shutdown after 30s timeout');
        process.exit(1);
    }, 30_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
