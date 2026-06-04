import { useCallback, useState } from 'react';

/**
 * Tracks a Set of selected ids for bulk-action UIs (Client Registry,
 * Member Roster, etc). Returns helpers for the row checkboxes plus a
 * count for the toolbar gate.
 *
 * Generic so callers can use string ids elsewhere — defaults to number
 * since the user table uses integer ids.
 */
export interface UseBulkSelectionReturn<T> {
    selected: Set<T>;
    toggle: (id: T) => void;
    isSelected: (id: T) => boolean;
    clear: () => void;
    setMany: (ids: T[]) => void;
    count: number;
}

export function useBulkSelection<T = number>(): UseBulkSelectionReturn<T> {
    const [selected, setSelected] = useState<Set<T>>(() => new Set());

    const toggle = useCallback((id: T) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const isSelected = useCallback((id: T) => selected.has(id), [selected]);
    const clear = useCallback(() => setSelected(new Set()), []);
    const setMany = useCallback((ids: T[]) => setSelected(new Set(ids)), []);

    return { selected, toggle, isSelected, clear, setMany, count: selected.size };
}
