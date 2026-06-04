import {
    User,
    HydratedServiceRequest,
    HydratedWarrant,
    HydratedOperation,
    HydratedIntelligenceReport,
    HydratedHRApplication,
    HydratedHRInterview,
    JobPosting,
    WikiPage,
    WarrantStatus,
    OperationStatus,
    IntelThreatLevel,
    ApplicationStatus,
} from '../../../../types';

export type SearchType = 'personnel' | 'mission' | 'warrant' | 'operation' | 'intel' | 'hr' | 'wiki';

export type HrSubtype = 'application' | 'interview' | 'posting';

export type SearchResult =
    | { type: 'personnel'; sortTimestamp: number; id: string; data: User }
    | { type: 'mission'; sortTimestamp: number; id: string; data: HydratedServiceRequest }
    | { type: 'warrant'; sortTimestamp: number; id: string; data: HydratedWarrant }
    | { type: 'operation'; sortTimestamp: number; id: string; data: HydratedOperation }
    | { type: 'intel'; sortTimestamp: number; id: string; data: HydratedIntelligenceReport }
    | { type: 'hr'; subtype: 'application'; sortTimestamp: number; id: string; data: HydratedHRApplication }
    | { type: 'hr'; subtype: 'interview'; sortTimestamp: number; id: string; data: HydratedHRInterview }
    | { type: 'hr'; subtype: 'posting'; sortTimestamp: number; id: string; data: JobPosting }
    | { type: 'wiki'; sortTimestamp: number; id: string; data: WikiPage }
    | { type: 'intel-loading'; sortTimestamp: number; id: string };

export interface PersonnelSubFilters {
    tier: 'all' | 'staff' | 'clients';
    onlyOnDuty: boolean;
}

export interface MissionSubFilters {
    status: 'all' | 'pending' | 'active' | 'completed';
}

export interface WarrantSubFilters {
    status: 'all' | WarrantStatus.Active | WarrantStatus.Standing | 'closed';
}

export interface OperationSubFilters {
    status: 'all' | OperationStatus;
    classifiedOnly: boolean;
}

export interface IntelSubFilters {
    threat: 'all' | IntelThreatLevel;
    classifiedOnly: boolean;
}

export interface HrSubFilters {
    subtype: 'all' | HrSubtype;
    status: 'all' | ApplicationStatus | string;
}

export interface WikiSubFilters {
    classifiedOnly: boolean;
}

export interface SearchFiltersState {
    types: Record<SearchType, boolean>;
    personnel: PersonnelSubFilters;
    mission: MissionSubFilters;
    warrant: WarrantSubFilters;
    operation: OperationSubFilters;
    intel: IntelSubFilters;
    hr: HrSubFilters;
    wiki: WikiSubFilters;
}

export const DEFAULT_FILTERS: SearchFiltersState = {
    types: {
        personnel: true,
        mission: true,
        warrant: true,
        operation: true,
        intel: true,
        hr: true,
        wiki: true,
    },
    personnel: { tier: 'all', onlyOnDuty: false },
    mission: { status: 'all' },
    warrant: { status: 'all' },
    operation: { status: 'all', classifiedOnly: false },
    intel: { threat: 'all', classifiedOnly: false },
    hr: { subtype: 'all', status: 'all' },
    wiki: { classifiedOnly: false },
};

export const ALL_SEARCH_TYPES: SearchType[] = [
    'personnel',
    'mission',
    'warrant',
    'operation',
    'intel',
    'hr',
    'wiki',
];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
    personnel: 'Personnel',
    mission: 'Missions',
    warrant: 'Caution Notes',
    operation: 'Operations',
    intel: 'Intel',
    hr: 'HR',
    wiki: 'Wiki',
};

export const SEARCH_TYPE_ICONS: Record<SearchType, string> = {
    personnel: 'fa-users',
    mission: 'fa-list-check',
    warrant: 'fa-triangle-exclamation',
    operation: 'fa-sitemap',
    intel: 'fa-database',
    hr: 'fa-id-badge',
    wiki: 'fa-book',
};
