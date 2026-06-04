
import { supabase, handleSupabaseError, broadcastToOrg } from './common.js';
import { cache, TTL } from '../cache.js';
import { log as baseLog } from '../log.js';

const log = baseLog.child({ module: 'db.platform' });

// --- ORG-WIDE OPERATIONAL SETTINGS (maintenance mode + force-logout) ---
// Single-org: stored as one JSONB blob in the `settings` table under the
// 'platformSettings' key (same store as branding/discord/etc.). The org Admin
// toggles these from the Admin Console (admin:update_platform_settings /
// admin:force_logout_all); the dispatcher (api/services.ts) and read path
// (api/query.ts) enforce maintenance + force-logout on every authenticated call.
// (The former multi-tenant `platform_settings` table + `maintenance_scope` are
// gone — one org, one scope.)
const SETTINGS_KEY = 'platformSettings';

export interface PlatformSettings {
    maintenance_mode?: boolean;
    maintenance_message?: string;
    force_logout_timestamp?: string;
    support_discord_url?: string;
    [key: string]: unknown;
}

const PLATFORM_SETTINGS_DEFAULTS: PlatformSettings = {
    maintenance_mode: false,
    maintenance_message: '',
    support_discord_url: '',
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
    const cached = cache.get<PlatformSettings>('platform_settings');
    if (cached) return cached;

    try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
        if (error) throw error;
        const stored = (data?.value as Partial<PlatformSettings>) || {};
        const settings = { ...PLATFORM_SETTINGS_DEFAULTS, ...stored };
        cache.set('platform_settings', settings, TTL.PLATFORM_SETTINGS);
        return settings;
    } catch (e) {
        log.error('fetch platform settings failed', { err: e });
        return PLATFORM_SETTINGS_DEFAULTS;
    }
}

/**
 * Merge-update the org-wide operational settings (maintenance toggle/message,
 * force-logout timestamp). Admin-only — gated in api/services.ts.
 */
export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const { data } = await supabase.from('settings').select('value').eq('key', SETTINGS_KEY).maybeSingle();
    const current = (data?.value as Partial<PlatformSettings>) || {};
    const next: PlatformSettings = { ...PLATFORM_SETTINGS_DEFAULTS, ...current, ...patch };
    const { error } = await supabase.from('settings').upsert({ key: SETTINGS_KEY, value: next }, { onConflict: 'key' });
    handleSupabaseError({ error, message: 'Failed to update platform settings' });
    cache.invalidate('platform_settings');
    broadcastToOrg('settings_update', {});
    return next;
}

