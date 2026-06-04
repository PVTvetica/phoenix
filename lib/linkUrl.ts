// Validators for user-supplied outbound link URLs (things we'll render as
// <a href="…"> on public pages). These are hyperlinks, not image sources, so
// the rules are different from lib/imageUrl.ts — any content type is OK, but
// the host must be a public internet address and the scheme must be one we
// explicitly allow.
//
// We reject localhost and private/reserved IP ranges to prevent a tenant
// admin from tricking a support agent who opens the org's public page into
// probing internal network resources from their browser.

const MAX_LEN = 500;
const ALLOWED_SCHEMES = new Set(['https:', 'discord:']);

// IPv4 private/reserved ranges we block. RFC 1918 + loopback + link-local
// + CGNAT + multicast + broadcast + reserved.
const IPV4_BLOCKLIST = [
    /^0\./,                    // 0.0.0.0/8
    /^10\./,                   // 10.0.0.0/8  (RFC 1918)
    /^127\./,                  // 127.0.0.0/8 loopback
    /^169\.254\./,             // 169.254.0.0/16 link-local
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (RFC 1918)
    /^192\.168\./,             // 192.168.0.0/16 (RFC 1918)
    /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // 100.64.0.0/10 CGNAT
    /^22[4-9]\./,              // 224.0.0.0/4 multicast
    /^23[0-9]\./,              // 224.0.0.0/4 multicast continued
    /^2[4-5][0-9]\./,          // 240.0.0.0/4 reserved + broadcast
];

function isIpv4(host: string): boolean {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

export function isPrivateIpv4(host: string): boolean {
    return IPV4_BLOCKLIST.some(re => re.test(host));
}

/**
 * True for IPv6 addresses that must not be reached by server-side fetches:
 * loopback (::1), unspecified (::), link-local (fe80::/10), unique-local
 * (fc00::/7), and IPv4-mapped (::ffff:a.b.c.d) wrapping a private v4. Used by the
 * SSRF DNS-resolution guard (lib/ssrf.ts).
 */
export function isPrivateIpv6Address(addr: string): boolean {
    const a = addr.toLowerCase().replace(/^\[|\]$/g, '');
    if (a === '::1' || a === '::') return true;
    if (a.startsWith('fe8') || a.startsWith('fe9') || a.startsWith('fea') || a.startsWith('feb')) return true; // fe80::/10
    if (a.startsWith('fc') || a.startsWith('fd')) return true; // fc00::/7 unique-local
    const mapped = a.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (mapped && isPrivateIpv4(mapped[1])) return true;
    return false;
}

function isIpv6(host: string): boolean {
    // Bracketed form when hostname came from URL.
    const stripped = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    return stripped.includes(':');
}

/**
 * Validate an outbound public link URL. Returns the trimmed URL on success,
 * or null if it should be rejected. discord:// URIs are permitted unchecked
 * (the scheme itself is not web-reachable).
 */
export function sanitizePublicLinkUrl(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_LEN) return null;

    let parsed: URL;
    try { parsed = new URL(trimmed); } catch { return null; }

    if (!ALLOWED_SCHEMES.has(parsed.protocol)) return null;
    if (parsed.protocol === 'discord:') return parsed.toString();

    if (parsed.username || parsed.password) return null;

    const host = parsed.hostname.toLowerCase();
    if (!host) return null;

    // Block obvious local hostnames.
    if (host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') return null;
    // Block internal-looking mDNS/.local names.
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.intranet')) return null;

    // Block IPv6 literals outright — hard to enumerate all reserved ranges
    // and there's no real user need for IPv6 literal links in a public page.
    if (isIpv6(host)) return null;

    // Block reserved IPv4 ranges.
    if (isIpv4(host) && isPrivateIpv4(host)) return null;

    return parsed.toString();
}
