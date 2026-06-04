import React, { useMemo } from 'react';
import { useGovernment } from '../../../../../contexts/GovernmentContext';

import { EmptyState } from '../../../../shared/ui';
import { useNavigation } from '../../../../../contexts/NavigationContext';

export default function GovernmentPanel() {
    const { governmentElections, governmentLegislation, governmentPositionHolders } = useGovernment();
    const { setActiveView } = useNavigation();

    const openElections = useMemo(() => (governmentElections || []).filter((e: any) =>
        ['Candidacy', 'Voting', 'Runoff'].includes(e.status),
    ).slice(0, 5), [governmentElections]);

    const openLegislation = useMemo(() => (governmentLegislation || []).filter((l: any) =>
        ['Proposed', 'Debate', 'Voting'].includes(l.status),
    ).slice(0, 5), [governmentLegislation]);

    const officialsCount = (governmentPositionHolders || []).filter((p: any) => !p.ended_at && !p.endedAt).length;

    const nothing = openElections.length === 0 && openLegislation.length === 0;
    if (nothing) {
        return (
            <EmptyState
                icon="fa-landmark"
                heading="Keine offene Regierungsarbeit"
                description={officialsCount > 0 ? `${officialsCount} officials in post. Nothing up for debate right now.` : 'No active elections or legislation.'}
                accent="indigo"
                action={
                    <button
                        onClick={() => setActiveView('government')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                        <i className="fa-solid fa-landmark" />Offene Regierung</button>
                }
            />
        );
    }

    return (
        <div className="divide-y divide-white/5">
            {openElections.length > 0 && (
                <>
                    <div className="px-3 py-2 bg-slate-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Wahlen</span>
                        <span className="text-[10px] font-mono text-slate-600">{openElections.length}</span>
                    </div>
                    {openElections.map((e: any) => (
                        <button
                            key={e.id}
                            onClick={() => setActiveView('government')}
                            className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-check-to-slot text-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-white truncate">{e.title || e.name || 'Election'}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                                        {e.status}
                                    </span>
                                </div>
                            </div>
                            <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                        </button>
                    ))}
                </>
            )}
            {openLegislation.length > 0 && (
                <>
                    <div className="px-3 py-2 bg-slate-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Gesetzgebung</span>
                        <span className="text-[10px] font-mono text-slate-600">{openLegislation.length}</span>
                    </div>
                    {openLegislation.map((l: any) => (
                        <button
                            key={l.id}
                            onClick={() => setActiveView('government')}
                            className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-scroll text-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-white truncate">{l.title || 'Proposed legislation'}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                                        {l.status}
                                    </span>
                                </div>
                            </div>
                            <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                        </button>
                    ))}
                </>
            )}
            <div className="p-2">
                <button
                    onClick={() => setActiveView('government')}
                    className="w-full text-center text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-indigo-300 transition-colors py-1"
                >Regierung anzeigen →</button>
            </div>
        </div>
    );
}
