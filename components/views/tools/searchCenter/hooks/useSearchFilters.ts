import { useCallback, useMemo, useState } from 'react';
import {
    SearchFiltersState,
    SearchType,
    DEFAULT_FILTERS,
    ALL_SEARCH_TYPES,
} from '../types';

export interface SearchFiltersApi {
    filters: SearchFiltersState;
    activeCount: number;
    selectedTypeCount: number;
    toggleType: (t: SearchType) => void;
    setAllTypes: (enabled: boolean) => void;
    setSubFilter: <K extends Exclude<keyof SearchFiltersState, 'types'>>(
        type: K,
        patch: Partial<SearchFiltersState[K]>,
    ) => void;
    clearAll: () => void;
}

/**
 * Counts a sub-filter slice as "active" when any of its values has
 * drifted from the default. Used to show a badge on the filter button.
 */
const countActiveSubFilters = (filters: SearchFiltersState): number => {
    let n = 0;
    if (filters.personnel.tier !== 'all') n++;
    if (filters.personnel.onlyOnDuty) n++;
    if (filters.mission.status !== 'all') n++;
    if (filters.warrant.status !== 'all') n++;
    if (filters.operation.status !== 'all') n++;
    if (filters.operation.classifiedOnly) n++;
    if (filters.intel.threat !== 'all') n++;
    if (filters.intel.classifiedOnly) n++;
    if (filters.hr.subtype !== 'all') n++;
    if (filters.hr.status !== 'all') n++;
    if (filters.wiki.classifiedOnly) n++;
    return n;
};

export const useSearchFilters = (): SearchFiltersApi => {
    const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);

    const toggleType = useCallback((t: SearchType) => {
        setFilters(prev => ({
            ...prev,
            types: { ...prev.types, [t]: !prev.types[t] },
        }));
    }, []);

    const setAllTypes = useCallback((enabled: boolean) => {
        setFilters(prev => ({
            ...prev,
            types: ALL_SEARCH_TYPES.reduce(
                (acc, t) => ({ ...acc, [t]: enabled }),
                {} as Record<SearchType, boolean>,
            ),
        }));
    }, []);

    const setSubFilter = useCallback(<K extends Exclude<keyof SearchFiltersState, 'types'>>(
        type: K,
        patch: Partial<SearchFiltersState[K]>,
    ) => {
        setFilters(prev => ({
            ...prev,
            [type]: { ...(prev[type] as object), ...patch },
        }));
    }, []);

    const clearAll = useCallback(() => setFilters(DEFAULT_FILTERS), []);

    const selectedTypeCount = useMemo(
        () => ALL_SEARCH_TYPES.filter(t => filters.types[t]).length,
        [filters.types],
    );

    const activeCount = useMemo(() => {
        const typeDeselect = ALL_SEARCH_TYPES.length - selectedTypeCount;
        return typeDeselect + countActiveSubFilters(filters);
    }, [filters, selectedTypeCount]);

    return {
        filters,
        activeCount,
        selectedTypeCount,
        toggleType,
        setAllTypes,
        setSubFilter,
        clearAll,
    };
};
