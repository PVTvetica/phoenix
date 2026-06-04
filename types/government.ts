// Re-exports of Government domain types for future-PR cleanliness.
// This file establishes the import boundary for the Government domain so consumers
// can migrate from `import { GovernmentConfig, ... } from '../types'` to
// `import { GovernmentConfig, ... } from '../types/government'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    GovernmentConfig,
    GovernmentBranch,
    GovernmentPosition,
    GovernmentPositionHolder,
    GovernmentElection,
    GovernmentLegislation,
    GovernmentMotion,
    GovernmentsFeatureConfig,
} from '../types';
