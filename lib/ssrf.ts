// Server-side SSRF guard for OUTBOUND fetches to operator/peer-supplied URLs
// (alliance federation). SECURITY (M7): sanitizePublicLinkUrl() blocks LITERAL
// private IPs and local hostnames, but a hostname like `internal.evil.example`
// can still RESOLVE to 10.0.0.1 (or ::1). Before we fetch a peer URL — a request
// that carries our outbound API key — resolve the host and reject any private /
// reserved address.
//
// Caveat: this is a resolve-then-fetch (TOCTOU) check; a determined attacker
// could DNS-rebind between the check and the fetch. It raises the bar
// substantially for the federation threat model (a misconfigured/typo'd peer URL
// or a peer probing our internal network); pinning the resolved IP into the
// fetch is a possible future hardening.

import { lookup } from 'node:dns/promises';
import { isPrivateIpv4, isPrivateIpv6Address } from './linkUrl.js';

/** Dev-only escape hatch matching validatePeerBaseUrl()'s loopback bypass. */
function devLoopbackAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.ALLIANCE_DEV_ALLOW_LOOPBACK === '1';
}

/**
 * Throws if `urlOrOrigin`'s hostname resolves to a private/reserved address.
 * No-op when the dev loopback bypass is enabled (local two-instance testing).
 */
export async function assertResolvesToPublicHost(urlOrOrigin: string): Promise<void> {
    if (devLoopbackAllowed()) return;

    let host: string;
    try {
        host = new URL(urlOrOrigin).hostname;
    } catch {
        throw new Error('Invalid peer URL');
    }
    const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

    let results: Array<{ address: string; family: number }>;
    try {
        results = await lookup(bare, { all: true });
    } catch {
        throw new Error('Peer host did not resolve');
    }
    if (results.length === 0) throw new Error('Peer host did not resolve');

    for (const r of results) {
        if (r.family === 4 && isPrivateIpv4(r.address)) {
            throw new Error('Peer host resolves to a private/reserved address');
        }
        if (r.family === 6 && isPrivateIpv6Address(r.address)) {
            throw new Error('Peer host resolves to a private/reserved address');
        }
    }
}
