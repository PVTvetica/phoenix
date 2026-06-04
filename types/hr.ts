// Re-exports of HR domain types for future-PR cleanliness.
// This file establishes the import boundary for the HR domain so consumers
// can migrate from `import { HydratedHRApplication, ... } from '../types'` to
// `import { HydratedHRApplication, ... } from '../types/hr'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.

export type {
    HydratedHRApplication,
    HydratedHRInterview,
    JobPosting,
    HRInterviewTemplate,
    TransferRequest,
    PersonnelPosition,
} from '../types';
