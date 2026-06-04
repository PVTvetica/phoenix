// Re-exports of Fleet domain types for future-PR cleanliness.
// This file establishes the import boundary for the Fleet domain so consumers
// can migrate from `import { PlatformShip, ... } from '../types'` to
// `import { PlatformShip, ... } from '../types/fleet'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    PlatformShip,
    UserShip,
    FleetGroup,
} from '../types';
