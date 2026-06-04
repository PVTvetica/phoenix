// ConfigContext owns the Config domain slices and CRUD methods that were
// previously embedded in DataContext. This is Phase 3b of the context refactor
// — a behavior-preserving extraction. The shim invariant is: useData() still
// exposes every Config field with identical names and types, so the 220
// consumer files that import useData() continue to work without changes.
//
// Provider order: DataCoreProvider > MembersProvider > ConfigProvider > DataProvider.
// Config must mount OUTSIDE Data so DataContext can call useConfig() inside its
// body and re-expose the Config fields on its own context value.
//
// State slices owned here (13):
//   brandingConfig, discordConfig, heroCardConfig, openGraphConfig, radioConfig,
//   aiConfig, wikiHomeConfig, hrConfig, publicPageConfig, serviceTypes,
//   externalTools, locations, radioChannels
//
// Notes on grouping:
//   - externalTools / locations / radioChannels aren't strictly "configs" but
//     they share the admin-managed reference-data lifecycle (server-validated,
//     globally scoped, low write rate). Grouping here keeps the admin domain
//     cohesive.
//   - aiConfig is the org-level global AI toggle/model setting.
//
// CRUD methods (18): see the inline groupings below. updateDiscordConfig and
// reorderExternalTool refresh non-'main' subsets ('discord' and
// 'external_tools' respectively) — DataContext registers both refresh callbacks.
//
// Realtime / state hydration: Config registers a slice setter with DataCore
// for each of its 13 slices (Phase 0b plumbing). When DataContext calls
// applyStateData(data) after fetching the 'main' / 'discord' / 'external_tools'
// subset, those registered setters fire and populate Config's local state.
// This replaces the per-slice inline assignments that used to live in
// DataContext's setStateFromData() switch for these fields.
//
// Refresh callback: CRUD methods need to call fetchDataSubset('main') or
// ('discord') / ('external_tools') after their RPC succeeds. Since Config
// lives OUTSIDE Data, it can't read useData() directly (would cycle).
// Instead, DataContext registers its refreshMainState/refreshDiscord/
// refreshExternalTools functions with Config at mount via the register*
// callbacks, and Config's CRUD methods call them via ref after the RPC
// completes. Same registration pattern as MembersContext (Phase 3a).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataCore } from './DataCoreContext';
import {
    BrandingConfig, DiscordConfig, HeroCardConfig, OpenGraphConfig, RadioConfig,
    AIConfig, WikiHomeConfig, HRConfig, PublicPageConfig, ServiceTypeConfig,
    ExternalTool, RadioChannel, TestimonialCandidate,
} from '../types';

// Re-exports — see types/config.ts for the canonical list. Keeping these here
// as well lets domain consumers do `import { BrandingConfig } from '../contexts/ConfigContext'`
// without juggling two import paths when migrating later.
export type {
    BrandingConfig, DiscordConfig, HeroCardConfig, OpenGraphConfig, RadioConfig,
    AIConfig, WikiHomeConfig, HRConfig, PublicPageConfig, ServiceTypeConfig,
    ExternalTool, RadioChannel, TestimonialCandidate,
} from '../types';

// Default branding icon — mirrors DataContext.defaultIconUrl. Kept duplicated
// (not imported) to avoid a Config → Data import cycle.
const defaultIconUrl = '/media/cross-swords.png';

export interface ConfigContextValue {
    // --- State slices (13) ---
    brandingConfig: BrandingConfig;
    discordConfig: DiscordConfig;
    heroCardConfig: HeroCardConfig;
    openGraphConfig: OpenGraphConfig;
    radioConfig: RadioConfig;
    aiConfig: AIConfig;
    wikiHomeConfig: WikiHomeConfig;
    hrConfig: HRConfig;
    publicPageConfig: PublicPageConfig;
    serviceTypes: ServiceTypeConfig[];
    externalTools: ExternalTool[];
    locations: any[];
    radioChannels: RadioChannel[];

    // --- State setters (exposed for parity with MembersContext;
    //     DataContext may consume these from optimisticUpdate or similar
    //     callers in future phases.) ---
    setBrandingConfig: React.Dispatch<React.SetStateAction<BrandingConfig>>;
    setDiscordConfig: React.Dispatch<React.SetStateAction<DiscordConfig>>;
    setHeroCardConfig: React.Dispatch<React.SetStateAction<HeroCardConfig>>;
    setOpenGraphConfig: React.Dispatch<React.SetStateAction<OpenGraphConfig>>;
    setRadioConfig: React.Dispatch<React.SetStateAction<RadioConfig>>;
    setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
    setWikiHomeConfig: React.Dispatch<React.SetStateAction<WikiHomeConfig>>;
    setHrConfig: React.Dispatch<React.SetStateAction<HRConfig>>;
    setPublicPageConfig: React.Dispatch<React.SetStateAction<PublicPageConfig>>;
    setServiceTypes: React.Dispatch<React.SetStateAction<ServiceTypeConfig[]>>;
    setExternalTools: React.Dispatch<React.SetStateAction<ExternalTool[]>>;
    setLocations: React.Dispatch<React.SetStateAction<any[]>>;
    setRadioChannels: React.Dispatch<React.SetStateAction<RadioChannel[]>>;

    // --- CRUD: Locations (4) ---
    addLocation: (data: any) =>Promise<void>;
    updateLocation: (data: any) =>Promise<void>;
    deleteLocation: (id: number) =>Promise<void>;
    seedDefaultLocations: () =>Promise<any>;

    // --- CRUD: Service Types (3) ---
    addServiceType: (data: any) =>Promise<void>;
    updateServiceType: (data: any) =>Promise<void>;
    deleteServiceType: (id: number) =>Promise<void>;

    // --- CRUD: External Tools (4) ---
    addExternalTool: (data: any) =>Promise<void>;
    updateExternalTool: (data: any) =>Promise<void>;
    deleteExternalTool: (id: number) =>Promise<void>;
    reorderExternalTool: (id: number, sortOrder: number) =>Promise<void>;

    // --- CRUD: Radio Channels (1) ---
    deleteRadioChannel: (channelId: string) =>Promise<void>;

    // --- Config update methods (10) ---
    updateDiscordConfig: (config: any) =>Promise<void>;
    updateHeroCardConfig: (config: HeroCardConfig) =>Promise<void>;
    updateBrandingConfig: (config: any) =>Promise<void>;
    updateOpenGraphConfig: (config: OpenGraphConfig) =>Promise<void>;
    updateRadioConfig: (config: any) =>Promise<void>;
    updateAIConfig: (config: any) =>Promise<void>;
    updateWikiHomeConfig: (config: WikiHomeConfig) =>Promise<void>;
    updateSystemConfig: (appUrl: string) =>Promise<void>;
    updatePublicPageConfig: (config: PublicPageConfig) =>Promise<void>;
    updateOrgFeatures: (patch: Record<string, any>) =>Promise<void>;

    // --- Query (1) ---
    listTestimonialCandidates: (params: { search?: string; limit?: number; offset?: number }) =>Promise<{ items: TestimonialCandidate[]; total: number }>;

    // --- Refresh registration ---
    /** DataContext calls this in a useEffect once its `refreshMainState` is
     *  defined. Config's CRUD methods invoke the registered fn after their
     *  RPC completes so consumers see the new state without waiting for a
     *  realtime broadcast (websocket-reconnect fallback, same intent as the
     *  existing chained fetchDataSubset('main') pattern). */
    registerRefreshMainState: (fn: () =>Promise<void> | void) => () => void;
    /** Same pattern, but for the 'discord' subset — used by updateDiscordConfig
     *  which historically refreshed the discord subset (separate fetch path
     *  because it pulls additional joined data not in the 'main' bundle). */
    registerRefreshDiscord: (fn: () =>Promise<void> | void) => () => void;
    /** Same pattern, but for the 'external_tools' subset — used by the four
     *  external-tool CRUD methods. External tools are fetched as their own
     *  subset (separate from 'main') because the realtime postgres_changes
     *  listener on the external_tools table dispatches to this subset. */
    registerRefreshExternalTools: (fn: () =>Promise<void> | void) => () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { rpcAction, registerSliceSetter } = useDataCore();

    // --- 13 state slices ---
    const [brandingConfig, setBrandingConfig] = useState<BrandingConfig>({ name: '', iconUrl: defaultIconUrl });
    const [discordConfig, setDiscordConfig] = useState<DiscordConfig>({});
    const [heroCardConfig, setHeroCardConfig] = useState<HeroCardConfig>({ backgroundImageUrl: '', discordUrl: '', organizationUrl: '', title: '', subtitle: '' });
    const [openGraphConfig, setOpenGraphConfig] = useState<OpenGraphConfig>({ title: '', description: '', imageUrl: '' });
    const [radioConfig, setRadioConfig] = useState<RadioConfig>({ channelName: '' });
    const [aiConfig, setAiConfig] = useState<AIConfig>({ enabled: false, model: 'gemini-2.5-flash' });
    const [wikiHomeConfig, setWikiHomeConfig] = useState<WikiHomeConfig>({});
    const [hrConfig, setHrConfig] = useState<HRConfig>({});
    const [publicPageConfig, setPublicPageConfig] = useState<PublicPageConfig>({
        enabled: false,
        motto: '',
        blurb: '',
        heroImageUrl: '',
        profileImageUrl: '',
        modules: { stats: false, testimonials: false, services: false, links: false },
        links: [],
        featuredTestimonialIds: [],
    });
    const [serviceTypes, setServiceTypes] = useState<ServiceTypeConfig[]>([]);
    const [externalTools, setExternalTools] = useState<ExternalTool[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [radioChannels, setRadioChannels] = useState<RadioChannel[]>([]);

    // --- Refresh-callback registration plumbing ---
    // DataContext defines refreshMainState/refreshDiscord/refreshExternalTools
    // and registers them here on mount; Config's CRUD methods call the
    // registered fn via ref to avoid re-creating callbacks on every Data
    // render. Same pattern as MembersContext.
    const refreshMainStateRef = useRef<(() =>Promise<void> | void) | null>(null);
    const refreshDiscordRef = useRef<(() =>Promise<void> | void) | null>(null);
    const refreshExternalToolsRef = useRef<(() =>Promise<void> | void) | null>(null);

    const registerRefreshMainState = useCallback((fn: () =>Promise<void> | void) => {
        refreshMainStateRef.current = fn;
        return () => {
            if (refreshMainStateRef.current === fn) refreshMainStateRef.current = null;
        };
    }, []);
    const registerRefreshDiscord = useCallback((fn: () =>Promise<void> | void) => {
        refreshDiscordRef.current = fn;
        return () => {
            if (refreshDiscordRef.current === fn) refreshDiscordRef.current = null;
        };
    }, []);
    const registerRefreshExternalTools = useCallback((fn: () =>Promise<void> | void) => {
        refreshExternalToolsRef.current = fn;
        return () => {
            if (refreshExternalToolsRef.current === fn) refreshExternalToolsRef.current = null;
        };
    }, []);

    const refreshMain = useCallback(async () => {
        const fn = refreshMainStateRef.current;
        if (fn) await fn();
    }, []);
    const refreshDiscord = useCallback(async () => {
        const fn = refreshDiscordRef.current;
        if (fn) await fn();
    }, []);
    const refreshExternalTools = useCallback(async () => {
        const fn = refreshExternalToolsRef.current;
        if (fn) await fn();
    }, []);
    // --- Slice-setter registration (Phase 0b plumbing) ---
    // Each setter applies its slice of a bulk-state payload. When DataContext
    // (or any caller) invokes applyStateData(data) on DataCore, every
    // registered setter runs — populating Config state from the response of
    // a 'main' / 'discord' / 'external_tools' subset fetch. This replaces the
    // per-slice inline assignments that used to live in DataContext.setStateFromData().
    //
    // The keys here match the field names returned by getInitialState /
    // getStateSubset on the server — verified against DataContext's original
    // setStateFromData() switch lines for each Config slice.
    useEffect(() => {
        const cleanups = [
            registerSliceSetter('brandingConfig', (data: any) => { if (data.brandingConfig) setBrandingConfig(data.brandingConfig); }),
            registerSliceSetter('discordConfig', (data: any) => { if (data.discordConfig) setDiscordConfig(data.discordConfig); }),
            registerSliceSetter('heroCardConfig', (data: any) => { if (data.heroCardConfig) setHeroCardConfig(data.heroCardConfig); }),
            registerSliceSetter('openGraphConfig', (data: any) => { if (data.openGraphConfig) setOpenGraphConfig(data.openGraphConfig); }),
            registerSliceSetter('radioConfig', (data: any) => { if (data.radioConfig) setRadioConfig(data.radioConfig); }),
            registerSliceSetter('aiConfig', (data: any) => { if (data.aiConfig) setAiConfig(data.aiConfig); }),
            registerSliceSetter('wikiHomeConfig', (data: any) => { if (data.wikiHomeConfig) setWikiHomeConfig(data.wikiHomeConfig); }),
            registerSliceSetter('hrConfig', (data: any) => { if (data.hrConfig) setHrConfig(data.hrConfig); }),
            registerSliceSetter('publicPageConfig', (data: any) => { if (data.publicPageConfig) setPublicPageConfig(data.publicPageConfig); }),
            registerSliceSetter('serviceTypes', (data: any) => { if (data.serviceTypes) setServiceTypes(data.serviceTypes); }),
            registerSliceSetter('externalTools', (data: any) => { if (data.externalTools) setExternalTools(data.externalTools); }),
            registerSliceSetter('locations', (data: any) => { if (data.locations) setLocations(data.locations); }),
            registerSliceSetter('radioChannels', (data: any) => { if (data.radioChannels) setRadioChannels(data.radioChannels); }),
        ];
        return () => cleanups.forEach(unreg => unreg());
    }, [registerSliceSetter]);

    // --- CRUD: Locations ---
    const addLocation = useCallback((data: any) =>
        rpcAction('admin:add_location', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateLocation = useCallback((data: any) =>
        rpcAction('admin:update_location', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteLocation = useCallback((id: number) =>
        rpcAction('admin:delete_location', { locationId: id }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const seedDefaultLocations = useCallback(() =>
        rpcAction('admin:seed_default_locations', {}).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- CRUD: Service Types ---
    const addServiceType = useCallback((data: any) =>
        rpcAction('admin:add_service_type', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateServiceType = useCallback((data: any) =>
        rpcAction('admin:update_service_type', data).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const deleteServiceType = useCallback((id: number) =>
        rpcAction('admin:delete_service_type', { id }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- CRUD: External Tools (refresh the 'external_tools' subset) ---
    const addExternalTool = useCallback((toolData: any) =>
        rpcAction('admin:add_tool', { toolData }).then(() => refreshExternalTools()),
    [rpcAction, refreshExternalTools]);

    const updateExternalTool = useCallback((toolData: any) =>
        rpcAction('admin:update_tool', { toolData }).then(() => refreshExternalTools()),
    [rpcAction, refreshExternalTools]);

    const deleteExternalTool = useCallback((id: number) =>
        rpcAction('admin:delete_tool', { toolId: id }).then(() => refreshExternalTools()),
    [rpcAction, refreshExternalTools]);

    const reorderExternalTool = useCallback((id: number, sortOrder: number) =>
        rpcAction('admin:reorder_tool', { toolId: id, sortOrder }).then(() => refreshExternalTools()),
    [rpcAction, refreshExternalTools]);

    // --- CRUD: Radio Channels ---
    const deleteRadioChannel = useCallback((channelId: string) =>
        rpcAction('admin:delete_radio_channel', { channelId }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    // --- Config update methods ---
    const updateDiscordConfig = useCallback((config: any) =>
        rpcAction('admin:update_discord_config', config).then(() => refreshDiscord()),
    [rpcAction, refreshDiscord]);

    const updateHeroCardConfig = useCallback((config: HeroCardConfig) =>
        rpcAction('admin:update_hero_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateBrandingConfig = useCallback((config: any) =>
        rpcAction('admin:update_branding_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateOpenGraphConfig = useCallback((config: OpenGraphConfig) =>
        rpcAction('admin:update_opengraph_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateRadioConfig = useCallback((config: any) =>
        rpcAction('admin:update_radio_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateAIConfig = useCallback((config: any) =>
        rpcAction('admin:update_ai_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateWikiHomeConfig = useCallback((config: WikiHomeConfig) =>
        rpcAction('admin:update_wiki_home_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updateSystemConfig = useCallback((appUrl: string) =>
        rpcAction('admin:update_system_config', { appUrl }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const updatePublicPageConfig = useCallback((config: PublicPageConfig) =>
        rpcAction('admin:update_public_page_config', config).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    /**
     * Toggle / merge-update the org's optional-module flags (government, finances,
     * quartermaster, warehouse, ...). Patch is deep-merged server-side so sibling
     * flags under the same feature are preserved.
     * Example: updateOrgFeatures({ quartermaster: { enabled: true } }) leaves any
     *          sibling quartermaster flags untouched.
     */
    const updateOrgFeatures = useCallback((patch: Record<string, any>) =>
        rpcAction('admin:update_features', { patch }).then(() => refreshMain()),
    [rpcAction, refreshMain]);

    const listTestimonialCandidates = useCallback(
        (params: { search?: string; limit?: number; offset?: number }) =>
            rpcAction('admin:list_testimonial_candidates', params) as Promise<{ items: TestimonialCandidate[]; total: number }>,
        [rpcAction],
    );

    const value = useMemo<ConfigContextValue>(() => ({
        // State
        brandingConfig, discordConfig, heroCardConfig, openGraphConfig, radioConfig,
        aiConfig, wikiHomeConfig, hrConfig, publicPageConfig,
        serviceTypes, externalTools, locations, radioChannels,
        // Setters
        setBrandingConfig, setDiscordConfig, setHeroCardConfig, setOpenGraphConfig, setRadioConfig,
        setAiConfig, setWikiHomeConfig, setHrConfig, setPublicPageConfig,
        setServiceTypes, setExternalTools, setLocations, setRadioChannels,
        // CRUD
        addLocation, updateLocation, deleteLocation, seedDefaultLocations,
        addServiceType, updateServiceType, deleteServiceType,
        addExternalTool, updateExternalTool, deleteExternalTool, reorderExternalTool,
        deleteRadioChannel,
        // Config update
        updateDiscordConfig, updateHeroCardConfig, updateBrandingConfig, updateOpenGraphConfig,
        updateRadioConfig, updateAIConfig, updateWikiHomeConfig, updateSystemConfig,
        updatePublicPageConfig, updateOrgFeatures,
        // Query
        listTestimonialCandidates,
        // Refresh registration
        registerRefreshMainState, registerRefreshDiscord, registerRefreshExternalTools,
    }), [
        brandingConfig, discordConfig, heroCardConfig, openGraphConfig, radioConfig,
        aiConfig, wikiHomeConfig, hrConfig, publicPageConfig,
        serviceTypes, externalTools, locations, radioChannels,
        addLocation, updateLocation, deleteLocation, seedDefaultLocations,
        addServiceType, updateServiceType, deleteServiceType,
        addExternalTool, updateExternalTool, deleteExternalTool, reorderExternalTool,
        deleteRadioChannel,
        updateDiscordConfig, updateHeroCardConfig, updateBrandingConfig, updateOpenGraphConfig,
        updateRadioConfig, updateAIConfig, updateWikiHomeConfig, updateSystemConfig,
        updatePublicPageConfig, updateOrgFeatures,
        listTestimonialCandidates,
        registerRefreshMainState, registerRefreshDiscord, registerRefreshExternalTools,
    ]);

    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = (): ConfigContextValue => {
    const ctx = useContext(ConfigContext);
    if (!ctx) throw new Error('useConfig must be used within a ConfigProvider');
    return ctx;
};
