
import React from 'react';
import { GovernmentBranch } from '../../../types';

interface GovernmentBranchCardProps {
    branch: GovernmentBranch;
    canManage: boolean;
}

const branchTypeColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    Executive: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', accent: 'bg-amber-500/10' },
    Legislative: { bg: 'bg-sky-500/5', border: 'border-sky-500/20', text: 'text-sky-400', accent: 'bg-sky-500/10' },
    Judicial: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400', accent: 'bg-purple-500/10' },
    Custom: { bg: 'bg-slate-500/5', border: 'border-slate-500/20', text: 'text-slate-400', accent: 'bg-slate-500/10' },
};

const GovernmentBranchCard: React.FC<GovernmentBranchCardProps> = ({ branch, canManage }) => {
    const colors = branchTypeColors[branch.branchType] || branchTypeColors.Custom;
    const positions = branch.positions || [];

    return (
        <div className={`rounded-lg border ${colors.bg} ${colors.border} overflow-hidden`}>
            {/* Branch Header */}
            <div className={`px-4 py-3 ${colors.accent} border-b ${colors.border}`}>
                <div className="flex items-center gap-2">
                    <i className={`${branch.icon || 'fa-solid fa-building-columns'} ${colors.text}`}></i>
                    <h3 className="text-sm font-bold text-white">{branch.name}</h3>
                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${colors.accent} ${colors.text} font-medium uppercase tracking-wider`}>
                        {branch.branchType}
                    </span>
                </div>
                {branch.description && (
                    <p className="text-xs text-slate-400 mt-1">{branch.description}</p>
                )}
            </div>

            {/* Positions */}
            <div className="p-3 space-y-2">
                {positions.length > 0 ? (
                    positions.map(pos => {
                        const filledCount = pos.currentHolders?.length || 0;
                        const isFull = filledCount >= pos.maxHolders;
                        const isVacant = filledCount === 0;

                        return (
                            <div key={pos.id} className="bg-slate-800/40 rounded-md p-2.5">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <i className={`${pos.icon || 'fa-solid fa-user'} ${colors.text} text-xs`}></i>
                                    <span className="text-sm font-medium text-white flex-1">{pos.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        isFull ? 'bg-emerald-500/10 text-emerald-400' :
                                        isVacant ? 'bg-red-500/10 text-red-400' :
                                        'bg-orange-500/10 text-orange-400'
                                    }`}>
                                        {filledCount}/{pos.maxHolders}
                                    </span>
                                </div>
                                {pos.description && (
                                    <p className="text-[11px] text-slate-400 mb-1.5 ml-5 line-clamp-3">{pos.description}</p>
                                )}

                                {/* Current Holders */}
                                {pos.currentHolders && pos.currentHolders.length > 0 ? (
                                    <div className="space-y-1 ml-5">
                                        {pos.currentHolders.map(holder => (
                                            <div key={holder.id} className="flex items-center gap-2">
                                                {holder.user?.avatarUrl ? (
                                                    <img src={holder.user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center">
                                                        <i className="fa-solid fa-user text-[8px] text-slate-500"></i>
                                                    </div>
                                                )}
                                                <span className="text-xs text-slate-300">{holder.user?.name || 'Unknown'}</span>
                                                {holder.appointedBy && (
                                                    <span className="text-[10px] text-slate-500">
                                                        appointed by {holder.appointedBy.name}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 italic ml-5">Frei</p>
                                )}

                                {/* Position Meta */}
                                <div className="flex items-center gap-2 mt-1.5 ml-5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-700/50 text-slate-400">
                                        {pos.fillMethod}
                                    </span>
                                    {pos.termLengthDays && (
                                        <span className="text-[10px] text-slate-500">{pos.termLengthDays}d term</span>
                                    )}
                                    {pos.canProposeLegislation && (
                                        <span className="text-[10px] text-sky-500" title="Kann Gesetze vorschlagen">
                                            <i className="fa-solid fa-pen-nib"></i>
                                        </span>
                                    )}
                                    {pos.canVoteLegislation && (
                                        <span className="text-[10px] text-emerald-500" title="Kann über Gesetze abstimmen">
                                            <i className="fa-solid fa-check-to-slot"></i>
                                        </span>
                                    )}
                                    {pos.canVetoLegislation && (
                                        <span className="text-[10px] text-red-500" title="Hat ein Vetorecht">
                                            <i className="fa-solid fa-ban"></i>
                                        </span>
                                    )}
                                    {pos.canCallElections && (
                                        <span className="text-[10px] text-amber-500" title="Kann Wahlen ausrufen">
                                            <i className="fa-solid fa-bullhorn"></i>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-xs text-slate-500 text-center py-2">Keine Positionen definiert</p>
                )}
            </div>
        </div>
    );
};

export default GovernmentBranchCard;
