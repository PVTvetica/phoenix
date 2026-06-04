// Re-exports of Intel domain types for future-PR cleanliness.
// This file establishes the import boundary for the Intel domain so consumers
// can migrate from `import { IntelBulletin, ... } from '../types'` to
// `import { IntelBulletin, ... } from '../types/intel'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    IntelBulletin,
    IntelHubStats,
    HydratedIntelligenceReport,
    IntelTargetIndexEntry,
    PaginatedIntelReports,
    BulletinDuration,
} from '../types';

export { IntelThreatLevel } from '../types';
