import React, { ReactNode } from 'react';
import { ACCENTS, AccentKey } from '../shared/ui/accents';

interface Props {
    id: string;
    label: string;
    icon?: string;
    accent?: AccentKey;
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
    /** Hide the entire group (header + children) when true. Used when every
     *  NavItem inside is filtered out by permissions or feature flags. */
    hidden?: boolean;
}

export default function SidebarGroup({ id, label, icon, accent = 'slate', expanded, onToggle, children, hidden }: Props) {
    if (hidden) return null;
    const a = ACCENTS[accent];
    const sectionId = `sidebar-group-${id}`;

    return (
        <div className="mt-3 first:mt-0">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={sectionId}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                    expanded ? 'text-slate-300' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${a.dot} shrink-0`} aria-hidden />
                {icon && <i className={`fa-solid ${icon} text-[10px] ${a.text}`} aria-hidden />}
                <span className="flex-1 text-left truncate">{label}</span>
                <i className={`fa-solid fa-chevron-down text-[8px] transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} aria-hidden />
            </button>
            {expanded && (
                <div id={sectionId} className="mt-1 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}
