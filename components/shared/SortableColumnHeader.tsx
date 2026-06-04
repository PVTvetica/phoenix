import React from 'react';

export type SortDir = 'asc' | 'desc';

interface Props<K extends string> {
    label: string;
    sortKey: K;
    activeKey: K;
    sortDir: SortDir;
    onSort: (key: K) => void;
    /** Tailwind colour token used for the active state. Default 'slate'. */
    accent?: 'emerald' | 'slate';
    /** When true, shows a faint sort icon on inactive headers (Duty Roster style). Default false. */
    showInactiveIndicator?: boolean;
    className?: string;
}

const ACTIVE_COLOR: Record<NonNullable<Props<string>['accent']>, string> = {
    emerald: 'text-emerald-300',
    slate: 'text-slate-100',
};

/**
 * Sortable column-header button used by the Duty Roster and admin Member
 * Roster flat-mode tables. Generic over the sort-key string-literal type
 * so each caller can use its own enum (e.g. `'name' | 'rank' | 'isDuty'`).
 *
 * Click → calls `onSort(sortKey)`. The caller decides whether that means
 * "toggle direction if same key" or "reset to asc on key change".
 *
 * Two visual variants via props so both consumers keep their existing
 * look: Duty Roster uses the emerald accent + always-on inactive sort
 * indicator (fa-sort), Member Roster uses the slate accent and only
 * shows a caret when the column is active.
 */
function SortableColumnHeader<K extends string>({
    label,
    sortKey,
    activeKey,
    sortDir,
    onSort,
    accent = 'slate',
    showInactiveIndicator = false,
    className = '',
}: Props<K>) {
    const isActive = sortKey === activeKey;
    return (
        <button
            type="button"
            onClick={() => onSort(sortKey)}
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                isActive ? ACTIVE_COLOR[accent] : 'text-slate-500 hover:text-slate-300'
            } ${className}`}
        >
            <span>{label}</span>
            {isActive
                ? <i className={`fa-solid fa-chevron-${sortDir === 'asc' ? 'up' : 'down'} text-[8px]`}></i>
                : showInactiveIndicator
                    ? <i className="fa-solid fa-sort text-[8px] opacity-30"></i>
                    : null}
        </button>
    );
}

export default SortableColumnHeader;
