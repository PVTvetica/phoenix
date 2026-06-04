import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted expand/collapse state for sidebar groups.
 *
 * - State lives in localStorage under `sidebar-group-state-v1` so group state
 *   survives page reloads and deploys.
 * - Each group id maps to a boolean (true = expanded).
 * - Groups not yet in the map use the `defaultExpanded` passed to the hook
 *   per-call — so default behaviour is the caller's to decide.
 */

const STORAGE_KEY = 'sidebar-group-state-v1';

type GroupState = Record<string, boolean>;

function readInitial(): GroupState {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeState(state: GroupState) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* storage unavailable — silently drop */
    }
}

export function useSidebarGroups() {
    const [state, setState] = useState<GroupState>(readInitial);

    // Keep localStorage in sync on every change.
    useEffect(() => { writeState(state); }, [state]);

    const isExpanded = useCallback(
        (id: string, defaultExpanded: boolean = true) => {
            return state[id] === undefined ? defaultExpanded : state[id];
        },
        [state],
    );

    const toggle = useCallback((id: string, defaultExpanded: boolean = true) => {
        setState((prev) => {
            const current = prev[id] === undefined ? defaultExpanded : prev[id];
            return { ...prev, [id]: !current };
        });
    }, []);

    /**
     * Force-expand a group (e.g. on mount when the active view lives inside
     * it, so users don't have to hunt for the current page).
     */
    const ensureExpanded = useCallback((id: string) => {
        setState((prev) => (prev[id] === true ? prev : { ...prev, [id]: true }));
    }, []);

    return { isExpanded, toggle, ensureExpanded };
}
