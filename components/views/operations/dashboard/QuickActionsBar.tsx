import React from 'react';
import { SectionLabel } from '../../../shared/ui';

export interface QuickAction {
    label: string;
    icon: string;
    accent: 'sky' | 'amber' | 'rose' | 'emerald' | 'purple' | 'indigo';
    onClick: () => void;
}

interface Props {
    actions: QuickAction[];
}

const ACCENT_MAP: Record<QuickAction['accent'], string> = {
    sky: 'text-sky-300 hover:text-sky-200 border-sky-500/20 hover:border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10',
    amber: 'text-amber-300 hover:text-amber-200 border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10',
    rose: 'text-rose-300 hover:text-rose-200 border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10',
    emerald: 'text-emerald-300 hover:text-emerald-200 border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10',
    purple: 'text-purple-300 hover:text-purple-200 border-purple-500/20 hover:border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10',
    indigo: 'text-indigo-300 hover:text-indigo-200 border-indigo-500/20 hover:border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10',
};

export default function QuickActionsBar({ actions }: Props) {
    if (actions.length === 0) return null;
    return (
        <div>
            <SectionLabel label="Schnellaktionen" icon="fa-bolt" />
            <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                    <button
                        key={a.label}
                        onClick={a.onClick}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${ACCENT_MAP[a.accent]}`}
                    >
                        <i className={`fa-solid ${a.icon}`} />
                        {a.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
