
import * as db from '../../lib/db.js';
import * as ai from '../../lib/ai.js';
import * as discord from '../../lib/discord.js';
import { sendPushToStaff } from '../../lib/push.js';
import { IntelThreatLevel } from '../../types.js';
import type {
    IntelBulletin,
    IntelSubjectType,
    DossierData,
    DiscordConfig,
    BrandingConfig,
} from '../../types.js';
import { log as baseLog } from '../../lib/log.js';

const log = baseLog.child({ module: 'actions.intel' });

// The org settings rows we read for bulletin notifications. Both values are
// stored as JSON blobs keyed by settings.key.
interface IntelNotificationSettings {
    discordConfig?: DiscordConfig;
    brandingConfig?: BrandingConfig;
}

// Minimal shape of a Discord embed used for the bulletin notification.
interface DiscordEmbedField {
    name: string;
    value: string;
    inline?: boolean;
}
interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields: DiscordEmbedField[];
    timestamp: string;
    footer: {
        text: string;
        icon_url?: string;
    };
}

// --- Payload interfaces (dispatcher types handlers as (payload: any, ...)) ---

// The dispatcher injects the authenticated user onto every payload. Intel reads
// use it for server-side clearance/limiting-marker filtering (SECURITY H3/M4).
type ActorUser = { user?: { clearanceLevel?: { level?: number } | null; limitingMarkers?: unknown[]; role?: string; permissions?: string[] } };

interface WarrantCreatePayload {
    userId?: number;
    [key: string]: unknown;
}
interface WarrantUpdatePayload {
    warrantId: string;
    [key: string]: unknown;
}
interface WarrantIdPayload {
    warrantId: string;
}
interface WarrantGenerateReportPayload {
    warrantId: string;
    userId: number;
}
interface WarrantAddNotePayload {
    warrantId: string;
    content: string;
    userId: number;
}

interface IntelCreateReportPayload {
    [key: string]: unknown;
}
interface IntelUpdateReportPayload {
    id: string;
    updates: Record<string, unknown>;
}
interface IntelTargetPayload {
    targetId: string;
}
interface IntelRecentPayload {
    subjectType?: IntelSubjectType;
}
interface IntelListPayload {
    limit?: number;
    cursor?: string | null;
    threatLevel?: IntelThreatLevel;
    subjectType?: IntelSubjectType;
    tag?: string;
    warrantsOnly?: boolean;
    q?: string;
}
interface IntelDeleteReportPayload {
    reportId: string;
}
interface IntelSearchPayload {
    query: string;
    subjectType?: IntelSubjectType;
}
interface IntelUpdateAffiliationPayload {
    targetId: string;
    affiliatedOrg: string;
}
interface IntelBulkUpdateAffiliationPayload {
    reportIds: string[];
    affiliatedOrg: string;
}
interface IntelBulkAddTagsPayload {
    reportIds: string[];
    tags: string[];
}
interface IntelBulkDeletePayload {
    reportIds: string[];
}
interface IntelSyncFeedsPayload {
    adminId?: number;
    force?: boolean;
}
interface IntelGenerateSummaryPayload {
    dossier: DossierData;
    userId?: number;
}

interface IntelCreateBulletinPayload {
    sharedWithAllies?: boolean;
    [key: string]: unknown;
}
interface BulletinIdPayload {
    bulletinId: string;
}

interface TrustedFeedFilterOptions {
    syncReports?: boolean;
    syncWarrants?: boolean;
    syncBulletins?: boolean;
    inboundMaxClearance?: number;
}
interface AdminAddTrustedFeedPayload {
    label: string;
    url: string;
    apiKey: string;
}
interface AdminTrustedFeedIdPayload {
    feedId: string;
}
interface AdminUpdateTrustedFeedPayload {
    feedId: string;
    updates: TrustedFeedFilterOptions;
}
interface AdminSyncWarrantsPayload {
    adminId: number;
}

/**
 * Sends a Discord embed notification for a new intel bulletin.
 */
async function notifyDiscordIntelBulletin(
    // The created bulletin is mapped to IntelBulletin; the legacy snake_case
    // `duration_minutes` read below is intentionally preserved (undefined at
    // runtime) so this types-only pass changes no behavior.
    bulletin: IntelBulletin & { duration_minutes?: number },
) {
    try {
        const { data: settingsData } = await db.supabase.from('settings').select('key, value').in('key', ['discordConfig', 'brandingConfig']);
        const settings: IntelNotificationSettings = settingsData?.reduce(
            (acc: IntelNotificationSettings, curr: { key: string; value: unknown }) =>
                ({ ...acc, [curr.key]: curr.value }),
            {} as IntelNotificationSettings,
        ) || {};

        const channelId = settings.discordConfig?.intelChannelId;
        const branding: BrandingConfig = settings.brandingConfig || { name: 'Organization', iconUrl: '' };

        if (!channelId) return;

        const threatColorMap: Record<string, number> = {
            [IntelThreatLevel.Critical]: 0xef4444, // red
            [IntelThreatLevel.High]: 0xf97316,     // orange
            [IntelThreatLevel.Medium]: 0xf59e0b,   // amber
            [IntelThreatLevel.Low]: 0x38bdf8,      // sky blue
        };

        const safeValue = (val: unknown, fallback = 'N/A', maxLength = 1024) => {
            if (val === null || val === undefined) return fallback;
            const str = String(val).trim();
            if (str.length === 0) return fallback;
            return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
        };

        // SECURITY (L4): a Discord channel can be visible to members who lack the
        // clearance/markers required to read a CLASSIFIED bulletin in-app. Never
        // post the title/body/location of a classified bulletin to Discord — only
        // a generic "view it in the terminal" notice. Unclassified bulletins
        // (classificationLevel 0) post in full.
        const isClassified = (bulletin.classificationLevel ?? 0) > 0;
        const embed: DiscordEmbed = isClassified
            ? {
                title: '📡 CLASSIFIED INTEL BULLETIN',
                description: `A Level ${bulletin.classificationLevel} intel bulletin was posted. Access it in the operations terminal (clearance required).`,
                color: threatColorMap[bulletin.threatLevel] || 0x64748b,
                fields: [
                    { name: 'Classification', value: `Level ${bulletin.classificationLevel}`, inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: `${branding.name || 'Organization'} Intel Division`,
                    ...(branding.iconUrl && branding.iconUrl.startsWith('http') ? { icon_url: branding.iconUrl } : {}),
                },
            }
            : {
                title: `📡 INTEL BULLETIN: ${safeValue(bulletin.title, 'Untitled')}`,
                description: safeValue(bulletin.body, 'No details provided.'),
                color: threatColorMap[bulletin.threatLevel] || 0x64748b,
                fields: [
                    { name: 'Threat Level', value: safeValue(bulletin.threatLevel), inline: true },
                    ...(bulletin.location ? [{ name: 'Location', value: safeValue(bulletin.location), inline: true }] : []),
                    { name: 'Classification', value: 'Unclassified', inline: true },
                    { name: 'Duration', value: bulletin.duration_minutes === 0 ? 'Indefinite (Pinned)' : bulletin.expiresAt ? `Expires ${new Date(bulletin.expiresAt).toUTCString()}` : 'No expiry', inline: false },
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: `${branding.name || 'Organization'} Intel Division`,
                    ...(branding.iconUrl && branding.iconUrl.startsWith('http') ? { icon_url: branding.iconUrl } : {}),
                },
            };

        await discord.sendDiscordChannelMessage(channelId, { embeds: [embed] });
    } catch (err) {
        log.error('intel bulletin discord notification failed', { err });
    }
}

export const intelActions = {
    // --- WARRANT ACTIONS ---
    'warrant:create': (payload: WarrantCreatePayload) => db.createWarrant(payload, payload.userId),
    'warrant:update': (payload: WarrantUpdatePayload) => db.updateWarrant(payload.warrantId, payload),
    'warrant:delete': ({ warrantId }: WarrantIdPayload) => db.deleteWarrant(warrantId),
    'warrant:generate_report': ({ warrantId, userId }: WarrantGenerateReportPayload) => db.generateReportFromWarrant(warrantId, userId),
    // #11: append-only notes thread with author attribution.
    'warrant:add_note': ({ warrantId, content, userId }: WarrantAddNotePayload) => db.addWarrantNote(warrantId, content, userId),
    'warrant:get_notes': ({ warrantId }: WarrantIdPayload) => db.getWarrantNotes(warrantId),

    // --- INTEL ACTIONS ---
    'intel:create_report': (reportData: IntelCreateReportPayload) =>
        db.createIntelReport({ ...reportData }),
    'intel:update_report': ({ id, updates }: IntelUpdateReportPayload) => db.updateIntelReport(id, updates),
    'intel:get_reports': ({ targetId, user }: IntelTargetPayload & ActorUser) =>
        db.getIntelReportsForTarget(targetId).then((r) => db.filterIntelByClearance(r, user)),
    'intel:get_dossier': async ({ targetId, user }: IntelTargetPayload & ActorUser) => {
        const dossier = await db.getDossier(targetId);
        // M4: warrant/KOS records require warrant:view — they must NOT ride the
        // dossier under intel:view alone. H3: reports filtered by clearance.
        const canViewWarrants = user?.role === 'Admin' || (Array.isArray(user?.permissions) && user.permissions.includes('warrant:view'));
        return {
            ...dossier,
            reports: db.filterIntelByClearance(dossier.reports, user),
            warrants: canViewWarrants ? dossier.warrants : [],
        };
    },
    'intel:get_recent': (payload: IntelRecentPayload & ActorUser) =>
        db.getRecentIntelReports(payload?.subjectType).then((r) => db.filterIntelByClearance(r, payload?.user)),
    'intel:list': async (payload: IntelListPayload & ActorUser) => {
        const result = await db.listIntelReports({
            limit: payload.limit,
            cursor: payload.cursor,
            threatLevel: payload.threatLevel,
            subjectType: payload.subjectType,
            tag: payload.tag,
            warrantsOnly: payload.warrantsOnly,
            q: payload.q,
        });
        return { ...result, items: db.filterIntelByClearance(result.items, payload?.user) };
    },
    'intel:hub_stats': ({ user }: ActorUser) => db.getIntelHubStats(user),
    // 'intel:get_top_entities' removed — dead action calling a non-existent RPC
    // (get_intel_analytics), no client caller. See lib/db/intel.ts note.
    'intel:delete_report': ({ reportId }: IntelDeleteReportPayload) => db.deleteIntelReport(reportId),
    'intel:search': ({ query, subjectType, user }: IntelSearchPayload & ActorUser) =>
        db.searchIntelReports(query, subjectType).then((r) => db.filterIntelByClearance(r, user)),
    'intel:update_affiliation': ({ targetId, affiliatedOrg }: IntelUpdateAffiliationPayload) => db.updateIntelAffiliation(targetId, affiliatedOrg),
    'intel:bulk_update_affiliation': ({ reportIds, affiliatedOrg }: IntelBulkUpdateAffiliationPayload) => db.bulkUpdateIntelAffiliation(reportIds, affiliatedOrg),
    'intel:bulk_add_tags': ({ reportIds, tags }: IntelBulkAddTagsPayload) => db.bulkAddIntelTags(reportIds, tags),
    'intel:bulk_delete_reports': ({ reportIds }: IntelBulkDeletePayload) => db.bulkDeleteIntelReports(reportIds),
    'intel:get_stats': () => db.getIntelStats(),
    'intel:sync_feeds': (payload: IntelSyncFeedsPayload) => db.syncTrustedFeeds(payload?.adminId, payload?.force),
    'intel:generate_summary': async ({ dossier }: IntelGenerateSummaryPayload) => {
        return ai.generateDossierSummary(dossier);
    },

    // --- BULLETIN ACTIONS ---
    'intel:create_bulletin': async (payload: IntelCreateBulletinPayload) => {
        const bulletin = await db.createIntelBulletin(payload);
        try {
            // SECURITY (L4): sendPushToStaff fans out to ALL staff with no clearance
            // filter, and push payloads surface on lock screens. Never put a
            // classified bulletin's title/body in the push — send a generic notice
            // and let the recipient open the clearance-gated terminal.
            const isClassified = (bulletin.classificationLevel ?? 0) > 0;
            await sendPushToStaff({
                title: isClassified ? 'New Classified Intel Bulletin' : `Intel Bulletin: ${bulletin.title}`,
                body: isClassified ? 'A classified bulletin was posted — view it in the terminal (clearance required).' : bulletin.body.substring(0, 120),
                tag: `bulletin-${bulletin.id}`,
                data: { type: 'bulletin', bulletinId: bulletin.id }
            });
        } catch (err) {
            log.error('bulletin push notification failed', { err });
        }
        // Discord notification (non-blocking)
        notifyDiscordIntelBulletin(bulletin).catch(err => {
            log.error('bulletin discord notification failed', { err });
        });
        return bulletin;
    },
    'intel:delete_bulletin': ({ bulletinId }: BulletinIdPayload) => db.deleteIntelBulletin(bulletinId),
    'intel:get_bulletins': ({ user }: ActorUser) =>
        db.getActiveBulletins().then((b) => db.filterIntelByClearance(b, user)),

    // --- ADMIN INTEL ---
    'admin:get_trusted_feeds': () => db.getTrustedFeeds(),
    'admin:add_trusted_feed': ({ label, url, apiKey }: AdminAddTrustedFeedPayload) => db.addTrustedFeed(label, url, apiKey),
    'admin:delete_trusted_feed': ({ feedId }: AdminTrustedFeedIdPayload) => db.deleteTrustedFeed(feedId),
    'admin:update_trusted_feed': ({ feedId, updates }: AdminUpdateTrustedFeedPayload) => db.updateTrustedFeed(feedId, updates),
    'admin:sync_warrants_to_reports': ({ adminId }: AdminSyncWarrantsPayload) => db.syncWarrantsToReports(adminId),
    'admin:deduplicate_warrants': () => db.deduplicateWarrants(),
    'admin:deduplicate_intel': () => db.deduplicateIntelReports(),
};
