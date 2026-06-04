import React, { useState, useEffect, useRef } from 'react';

/**
 * Click-outside-dismissed multi-select chip popover used by the Duty Roster
 * filter chips and the MemberPicker. Originally inlined in DutyRosterView;
 * extracted here when MemberPicker grew the same need.
 */
export interface FilterPopoverProps {
    label: string;
    icon: string;
    options: { id: number; name: string }[];
    selected: Set<number>;
    onToggle: (id: number) => void;
    onClear: () => void;
    /** Tailwind colour token used for the active state border/text. */
    accent?: 'emerald' | 'amber' | 'sky';
}

const ACCENT_CLASSES: Record<NonNullable<FilterPopoverProps['accent']>, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    sky: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
};

const FilterPopover: React.FC<FilterPopoverProps> = ({ label, icon, options, selected, onToggle, onClear, accent = 'emerald' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const count = selected.size;
    const allSummary = label === 'Einheit' ? 'Alle Einheiten' : label === 'Rang' ? 'Alle Ränge' : `Alle ${label}`;
    const summary = count === 0 ? allSummary : count === 1
        ? options.find(o => selected.has(o.id))?.name || `1 ${label}`
        : `${count} ${label === 'Einheit' ? 'Einheiten' : label === 'Rang' ? 'Ränge' : label}`;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    count > 0
                        ? ACCENT_CLASSES[accent]
                        : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
            >
                <i className={`fa-solid ${icon} text-[10px]`}></i>
                <span className="truncate max-w-[140px]">{summary}</span>
                <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} text-[8px] opacity-60`}></i>
            </button>
            {open && (
                <div className="absolute z-30 top-full left-0 mt-1 w-56 max-h-72 overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50 p-2 animate-fade-in">
                    {count > 0 && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="w-full text-left text-[10px] font-bold text-slate-500 hover:text-amber-300 uppercase tracking-wider px-2 py-1 rounded-sm hover:bg-slate-800/50 transition-colors mb-1"
                        >
                            <i className="fa-solid fa-xmark mr-1"></i>Alles löschen</button>
                    )}
                    {options.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic p-2">
                            {label === 'Einheit' ? 'Keine Einheiten definiert.' : label === 'Rang' ? 'Keine Ränge definiert.' : `Keine ${label} definiert.`}
                        </p>
                    ) : options.map(opt => (
                        <label key={opt.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white p-1.5 rounded-sm hover:bg-slate-800/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={selected.has(opt.id)}
                                onChange={() => onToggle(opt.id)}
                                className="rounded-sm bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
                            />
                            <span className="truncate">{opt.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FilterPopover;
