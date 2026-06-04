import React from 'react';

interface Props {
    title: string;
    /** Full FontAwesome class string, e.g. "fa-solid fa-bullhorn". */
    icon: string;
    /** Short helper text under the title. */
    note?: string;
    /** Right-side controls in the section header (e.g. an "Add" button). */
    actions?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Dark-glass card with an icon-badge header. The standard surface for grouping
 * related fields inside a settings or dashboard tab — one tab typically renders
 * several SectionPanels stacked vertically.
 */
const SectionPanel: React.FC<Props> = ({ title, icon, note, actions, children }) => (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0">
                    <i className={`${icon} text-slate-300 text-sm`} aria-hidden />
                </div>
                <div className="min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-200 truncate">{title}</h3>
                    {note && <p className="text-[10px] text-slate-500 mt-0.5">{note}</p>}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export default SectionPanel;
