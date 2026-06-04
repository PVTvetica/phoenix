import React from 'react';
import type { User } from '../../../../types';
import { useFormatDate } from '../../../../contexts/AuthContext';

interface Props {
    handle: string;
    subject: User | undefined;
    onChangeTarget: (handle: string) => void;
}

/**
 * Subject identity header for the RAP sheet. Populates from the matched User
 * record when the handle belongs to a registered member; otherwise renders
 * a minimal "unregistered handle" card.
 */
export default function RapSheetHeader({ handle, subject, onChangeTarget }: Props) {
    const fmt = useFormatDate();
    const repTier = subject ? reputationTier(subject.reputation ?? 50) : null;
    const tenureStartIso = subject?.tenureStartDate || subject?.createdAt;
    const memberSince = tenureStartIso ? fmt.date(tenureStartIso) : null;

    return (
        <div className="rounded-2xl border border-cyan-500/20 bg-linear-to-br from-cyan-500/5 via-slate-900/60 to-slate-900/60 p-5 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" aria-hidden />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                {subject?.avatarUrl ? (
                    <img src={subject.avatarUrl} alt="" className="w-16 h-16 rounded-xl border-2 border-cyan-500/30 shrink-0" />
                ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500 text-2xl shrink-0">
                        <i className="fa-solid fa-user-secret" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-black text-cyan-300 uppercase tracking-[0.25em]">Thema</span>
                        {!subject && (
                            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded-sm">Nicht registriert</span>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                        {subject?.name || handle}
                    </h2>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400 font-mono flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-at text-cyan-400/70"></i>
                            {handle}
                        </span>
                        {subject && (
                            <>
                                {repTier && (
                                    <span className={`flex items-center gap-1.5 ${repTier.className}`}>
                                        <i className="fa-solid fa-scale-balanced"></i>
                                        {subject.reputation ?? 50} · {repTier.label}
                                    </span>
                                )}
                                {subject.clearanceLevel && (
                                    <span className="flex items-center gap-1.5 text-purple-300">
                                        <i className="fa-solid fa-user-shield"></i>
                                        {subject.clearanceLevel.name}
                                    </span>
                                )}
                                {memberSince && (
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <i className="fa-solid fa-calendar"></i>
                                        since {memberSince}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => onChangeTarget('')}
                    title="Clear and run another handle"
                    className="self-start sm:self-center text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
                >
                    <i className="fa-solid fa-rotate-left mr-1"></i>Neue Abfrage</button>
            </div>
        </div>
    );
}

function reputationTier(rep: number): { label: string; className: string } {
    if (rep <= 15) return { label: 'Geringes Vertrauen', className: 'text-rose-300' };
    if (rep <= 35) return { label: 'Unproven', className: 'text-amber-300' };
    if (rep >= 75) return { label: 'Trusted', className: 'text-emerald-300' };
    return { label: 'Standard', className: 'text-slate-400' };
}
