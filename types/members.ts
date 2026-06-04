// Re-exports of Members domain types for future-PR cleanliness.
// This file establishes the import boundary for the Members domain so consumers
// can migrate from `import { User, Rank, ... } from '../types'` to
// `import { User, Rank, ... } from '../types/members'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    User,
    Rank,
    OrganizationalUnit,
    Role,
    SecurityClearance,
    LimitingMarker,
    SpecializationTag,
    Certification,
    Commendation,
    DiscordRole,
} from '../types';

export { UserRole } from '../types';
