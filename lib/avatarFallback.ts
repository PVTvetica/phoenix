// Global fallback for broken Discord avatar <img> elements.
//
// Discord avatar URLs embed a hash (e.g. `.../avatars/{userId}/{hash}.png`) that
// rotates whenever a user changes or removes their avatar. Because we cache the
// full URL in `users.avatar_url`, a stale hash produces a 404 and the browser
// renders a broken-image icon in the UI.
//
// Rather than wrap every one of the 50+ render sites in an onError handler,
// this module installs a single capture-phase listener that intercepts image
// load failures, identifies Discord avatar URLs by pattern, extracts the
// Discord user ID, and swaps the src to Discord's default avatar — a CDN URL
// that never 404s and is the same asset Discord shows natively when a user
// has no avatar set. The server-side refresh path (see lib/db/users.ts
// `updateUserHeartbeat`) eventually repairs the stored URL; this handler just
// keeps the UI from breaking in the meantime.

// Match: https://cdn.discordapp.com/avatars/{userId}/{hash}.{ext}
const GLOBAL_AVATAR_RE = /cdn\.discordapp\.com\/avatars\/(\d{15,25})\//;
// Match: https://cdn.discordapp.com/guilds/{guildId}/users/{userId}/avatars/{hash}.{ext}
const GUILD_AVATAR_RE = /cdn\.discordapp\.com\/guilds\/\d{15,25}\/users\/(\d{15,25})\/avatars\//;

function defaultAvatarUrlForDiscordId(discordId: string): string {
    try {
        const idx = Number((BigInt(discordId) >> 22n) % 6n);
        return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
    } catch {
        return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
}

export function installAvatarFallback() {
    if (typeof window === 'undefined') return;
    if ((window as any).__avatarFallbackInstalled) return;
    (window as any).__avatarFallbackInstalled = true;

    window.addEventListener(
        'error',
        (event) => {
            const target = event.target as HTMLElement | null;
            if (!(target instanceof HTMLImageElement)) return;
            if (target.dataset.avatarFallback === 'applied') return;

            const src = target.currentSrc || target.src;
            if (!src) return;

            const match = src.match(GLOBAL_AVATAR_RE) || src.match(GUILD_AVATAR_RE);
            if (!match) return;

            const discordId = match[1];
            target.dataset.avatarFallback = 'applied';
            target.src = defaultAvatarUrlForDiscordId(discordId);
        },
        true,
    );
}
