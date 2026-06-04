import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface BulkAction {
    key: string;
    label: string;
    icon: string;
    /** If set, action is filtered out for users without this permission. Admins always see all actions. */
    permission?: string;
    variant?: 'default' | 'danger';
    onClick: () => void;
}

interface Props {
    selectedCount: number;
    onClear: () => void;
    actions: BulkAction[];
}

/**
 * Sticky toolbar shown above a list when at least one row is selected.
 * Renders the selected count + Clear button on the left, action buttons
 * on the right.
 *
 * Permission gating: actions whose `permission` the current user lacks
 * are filtered out before render — they are not in the DOM at all.
 * Per project convention, gated UI is hidden, not disabled. Admin users
 * (currentUser.role === 'Admin') see every action regardless.
 *
 * Beyond four visible actions the right-aligned cluster overflows into
 * a "More" dropdown, keeping the toolbar tidy on the Member Roster's
 * six-action set.
 */
const BulkSelectToolbar: React.FC<Props> = ({ selectedCount, onClear, actions }) => {
    const { currentUser } = useAuth();
    const [overflowOpen, setOverflowOpen] = React.useState(false);

    if (selectedCount === 0) return null;

    const isAdmin = currentUser?.role === 'Admin';
    const visibleActions = actions.filter((a) => {
        if (!a.permission) return true;
        if (isAdmin) return true;
        return currentUser?.permissions?.includes(a.permission) ?? false;
    });

    // Show first 4 inline; overflow the rest into a More dropdown.
    const inline = visibleActions.slice(0, 4);
    const overflow = visibleActions.slice(4);

    return (
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 shadow-lg shadow-black/30">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-bold text-white whitespace-nowrap">
                    <span className="text-amber-300">{selectedCount}</span> selected
                </span>
                <button
                    onClick={onClear}
                    className="text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap"
                >Klar</button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {inline.map((a) => (
                    <button
                        key={a.key}
                        onClick={a.onClick}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 ${
                            a.variant === 'danger'
                                ? 'bg-red-600/15 text-red-300 hover:bg-red-600/25 border border-red-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                        }`}
                    >
                        <i className={`fa-solid ${a.icon}`} />
                        <span>{a.label}</span>
                    </button>
                ))}
                {overflow.length > 0 && (
                    <div className="relative">
                        <button
                            onClick={() => setOverflowOpen((v) => !v)}
                            className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        >Mehr<i className="fa-solid fa-chevron-down text-[10px]" />
                        </button>
                        {overflowOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOverflowOpen(false)}
                                    aria-hidden
                                />
                                <div className="absolute right-0 mt-1.5 w-56 rounded-md border border-white/10 bg-slate-900 shadow-xl z-20 overflow-hidden">
                                    {overflow.map((a) => (
                                        <button
                                            key={a.key}
                                            onClick={() => { setOverflowOpen(false); a.onClick(); }}
                                            className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 transition-colors ${
                                                a.variant === 'danger'
                                                    ? 'text-red-300 hover:bg-red-600/15'
                                                    : 'text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <i className={`fa-solid ${a.icon} w-4 text-center`} />
                                            <span>{a.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkSelectToolbar;
