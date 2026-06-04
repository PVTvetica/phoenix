// Re-exports of Config domain types for future-PR cleanliness.
// This file establishes the import boundary for the Config domain so consumers
// can migrate from `import { BrandingConfig, ... } from '../types'` to
// `import { BrandingConfig, ... } from '../types/config'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    BrandingConfig,
    DiscordConfig,
    HeroCardConfig,
    OpenGraphConfig,
    RadioConfig,
    AIConfig,
    WikiHomeConfig,
    HRConfig,
    PublicPageConfig,
    ServiceTypeConfig,
    ExternalTool,
    RadioChannel,
    Location,
    TestimonialCandidate,
} from '../types';
