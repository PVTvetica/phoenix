import React from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    title: string;
    /** Full FontAwesome class string, e.g. "fa-solid fa-palette". Optional. */
    icon?: string;
    /** Plain text or ReactNode (e.g. an inline count or status). */
    subtitle?: React.ReactNode;
    /** When set, the icon renders inside an accented badge. Without it, a plain icon glyph is used. */
    accent?: AccentKey;
    /** Right-side cluster — search inputs, create buttons, toggles. */
    actions?: React.ReactNode;
    /** Inline status pills or stat strips placed next to the title. Use sparingly. */
    meta?: React.ReactNode;
}

/**
 * Standard page header used by every Admin Console tab. The Admin shell
 * (AdminPanelView) renders the module-level HeroShell — this is the *content*
 * header that sits at the top of each tab body. Use exactly once per tab,
 * as the first child of the tab's outer `p-4 md:p-8 space-y-6` container.
 */
export default function TabPageHeader({ title, icon, subtitle, accent, actions, meta }: Props) {
    const a = accent ? ACCENTS[accent] : null;

    return (
        <div className="border-b border-slate-700/50 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0 flex items-start gap-3">
                {icon && (
                    a ? (
                        <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg ${a.bg} border ${a.border}`}>
                            <i className={`${icon} ${a.text}`} aria-hidden />
                        </span>
                    ) : (
                        <i className={`${icon} text-slate-300 mt-1.5`} aria-hidden />
                    )
                )}
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3 flex-wrap">
                        <span className="truncate">{title}</span>
                        {meta}
                    </h2>
                    {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}
