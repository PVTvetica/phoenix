// Re-exports of Operations domain types for future-PR cleanliness.
// This file establishes the import boundary for the Operations domain so
// consumers can migrate from `import { HydratedOperation, ... } from '../types'`
// to `import { HydratedOperation, ... } from '../types/operations'` over time.
// No types are moved yet — these are pure re-exports from the canonical types.ts.
//
// Note: RadioChannel is already re-exported from types/config.ts (Phase 3b
// owns the radioChannels slice in ConfigContext). It's NOT included here.

export type {
    HydratedOperation,
    HydratedOperationTeam,
    HydratedOperationPosition,
    HydratedWarrant,
    OperationTemplate,
    OperationTemplatePayload,
} from '../types';
