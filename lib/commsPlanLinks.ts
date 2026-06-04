import type { CommsPlanEntry } from '../types.js';

export interface JoinLink {
    /** Native protocol URI (discord://, ts3server://, mumble://) — opens the desktop client. */
    primary?: string;
    /** Browser fallback (https://). Use after a short delay if the native handler doesn't catch. */
    fallback?: string;
    /** Plain text the user can copy-paste when no handler is available. */
    copyText?: string;
}

function encode(value: string | undefined | null): string {
    return encodeURIComponent(value || '');
}

/**
 * Builds the deep-link / copy-text payload for a comms plan entry. Pure
 * function — does not perform any IO or click-through. The caller is
 * responsible for presenting the buttons / fallback timing.
 */
export function buildJoinLink(entry: CommsPlanEntry, guildId: string | null | undefined): JoinLink {
    if (!entry || !entry.provider) return {};

    switch (entry.provider) {
        case 'discord_voice':
        case 'discord_text': {
            if (!guildId || !entry.discordChannelId) return {};
            return {
                primary: `discord://discord.com/channels/${guildId}/${entry.discordChannelId}`,
                fallback: `https://discord.com/channels/${guildId}/${entry.discordChannelId}`,
            };
        }

        case 'teamspeak': {
            if (!entry.address) return {};
            const params: string[] = [];
            if (entry.port) params.push(`port=${entry.port}`);
            if (entry.label) params.push(`channel=${encode(entry.label)}`);
            const query = params.length ? `?${params.join('&')}` : '';
            const portSuffix = entry.port ? `:${entry.port}` : '';
            return {
                primary: `ts3server://${entry.address}${query}`,
                copyText: `${entry.address}${portSuffix}`,
            };
        }

        case 'mumble': {
            if (!entry.address) return {};
            const portSegment = entry.port ? `:${entry.port}` : '';
            // Mumble URI scheme: mumble://[user@]host[:port]/[channel]
            // Channel path is optional; we encode the label if present.
            const channelPath = entry.label ? `/${encode(entry.label)}` : '';
            return {
                primary: `mumble://${entry.address}${portSegment}${channelPath}`,
                copyText: `${entry.address}${portSegment}`,
            };
        }

        case 'simple_radio':
        case 'dcs_srs': {
            // No URI scheme exists for these — they're configured inside the
            // game client. Surface a copy-friendly summary instead.
            const parts: string[] = [];
            if (entry.address) parts.push(entry.address + (entry.port ? `:${entry.port}` : ''));
            if (entry.frequency) parts.push(`Freq ${entry.frequency}`);
            if (entry.callsign) parts.push(`Callsign ${entry.callsign}`);
            return parts.length ? { copyText: parts.join(' · ') } : {};
        }

        case 'external': {
            if (!entry.url) return {};
            // Only allow http(s) and a curated set of known voice schemes — never
            // arbitrary URI schemes the user might paste. The browser would
            // refuse most others anyway, but this keeps obvious foot-guns out.
            const url = entry.url.trim();
            if (/^(https?:|ts3server:|mumble:|discord:)/i.test(url)) {
                return { primary: url, copyText: url };
            }
            return { copyText: url };
        }

        case 'op_radio':
        case 'other':
        default:
            return {};
    }
}
