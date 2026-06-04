import React from 'react';
import type { HydratedWarrant, IntelThreatLevel, User } from '../../../../types';

interface Props {
    activeWarrants: HydratedWarrant[];
    highestThreat: IntelThreatLevel | null;
    subject: User | undefined;
}

/**
 * Prominent alert bar above the RAP sheet body. Surfaces the three flags a
 * dispatcher absolutely needs to clock before approving/dispatching anything:
 *   - Active warrant against the subject
 *   - Elevated intel threat level (Critical or High)
 *   - Low reputation on a registered subject (≤ 15)
 */
export default function RapSheetAlerts({ activeWarrants, highestThreat, subject }: Props) {
    const showWarrant = activeWarrants.length > 0;
    const showThreat = highestThreat === 'Critical' || highestThreat === 'High';
    const showLowTrust = !!subject && (subject.reputation ?? 100) <= 15;

    if (!showWarrant && !showThreat && !showLowTrust) return null;

    return (
        <div className="space-y-2">
            {showWarrant && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center gap-3 animate-pulse-slow">
                    <div className="w-8 h-8 rounded-sm bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-triangle-exclamation text-red-300"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-red-300">
                            Active Caution{activeWarrants.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-sm text-white truncate">
                            {activeWarrants.length} outstanding
                            {activeWarrants[0]?.action ? ` · ${activeWarrants[0].action}` : ''}
                            {activeWarrants[0]?.uecReward ? ` · ${activeWarrants[0].uecReward.toLocaleString()} aUEC reward` : ''}
                        </div>
                    </div>
                </div>
            )}

            {showThreat && (
                <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
                    highestThreat === 'Critical'
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-amber-500/40 bg-amber-500/10'
                }`}>
                    <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                        highestThreat === 'Critical'
                            ? 'bg-red-500/20 border-red-500/40'
                            : 'bg-amber-500/20 border-amber-500/40'
                    }`}>
                        <i className={`fa-solid fa-radiation ${highestThreat === 'Critical' ? 'text-red-300' : 'text-amber-300'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${highestThreat === 'Critical' ? 'text-red-300' : 'text-amber-300'}`}>Erhöhte Bedrohung</div>
                        <div className="text-sm text-white">Intel Berichte bewerten dieses Thema mit<strong>{highestThreat}</strong>. Approach with caution.
                        </div>
                    </div>
                </div>
            )}

            {showLowTrust && (
                <div className="rounded-lg border border-slate-500/30 bg-slate-500/10 px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-slate-500/20 border border-slate-500/40 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-scale-unbalanced text-slate-300"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300">Geringes Vertrauen</div>
                        <div className="text-sm text-white">
                            Reputation {subject?.reputation ?? 0}/100 — consider verifying intent before committing units.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
