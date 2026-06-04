
import React from 'react';
import { GovernmentBranch, GovernmentPosition, GovernmentPositionHolder } from '../../../types';
import GovernmentBranchCard from './GovernmentBranchCard';

interface GovernmentOverviewProps {
    branches: GovernmentBranch[];
    positions: GovernmentPosition[];
    holders: GovernmentPositionHolder[];
    canManage: boolean;
}

const GovernmentOverview: React.FC<GovernmentOverviewProps> = ({ branches, positions, holders, canManage }) => {
    // Positions not assigned to any branch
    const unbranchedPositions = positions.filter(p => !p.branchId);

    if (branches.length === 0 && positions.length === 0) {
        return (
            <div className="text-center py-12">
                <i className="fa-solid fa-sitemap text-3xl text-slate-600 mb-3"></i>
                <p className="text-sm text-slate-400">Es wurde noch keine Regierungsstruktur definiert.</p>
                <p className="text-xs text-slate-500 mt-1">Richte Filialen und Positionen über das Admin-Panel ein.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Branch Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {branches.map(branch => (
                    <GovernmentBranchCard
                        key={branch.id}
                        branch={branch}
                        canManage={canManage}
                    />
                ))}
            </div>

            {/* Unbranched Positions */}
            {unbranchedPositions.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Unabhängige Positionen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unbranchedPositions.map(pos => (
                            <PositionCard key={pos.id} position={pos} />
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon="fa-solid fa-building-columns" label="Zweige" value={branches.length} color="amber" />
                <StatCard icon="fa-solid fa-chair" label="Positionen" value={positions.length} color="sky" />
                <StatCard icon="fa-solid fa-user-tie" label="Active Holders" value={holders.length} color="emerald" />
                <StatCard icon="fa-solid fa-chair" label="Frei" value={positions.reduce((acc, p) => acc + Math.max(0, p.maxHolders - (p.currentHolders?.length || 0)), 0)} color="orange" />
            </div>
        </div>
    );
};

// Inline PositionCard for unbranched positions
const PositionCard: React.FC<{ position: GovernmentPosition }> = ({ position }) => {
    const filledCount = position.currentHolders?.length || 0;
    const isFull = filledCount >= position.maxHolders;

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
                <i className={`${position.icon || 'fa-solid fa-user'} text-amber-400 text-sm`}></i>
                <span className="text-sm font-medium text-white">{position.name}</span>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-sm ${isFull ? 'bg-emerald-500/10 text-emerald-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {filledCount}/{position.maxHolders}
                </span>
            </div>
            {position.currentHolders && position.currentHolders.length > 0 ? (
                <div className="space-y-1">
                    {position.currentHolders.map(holder => (
                        <div key={holder.id} className="flex items-center gap-2 text-xs text-slate-300">
                            {holder.user?.avatarUrl && (
                                <img src={holder.user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                            )}
                            <span>{holder.user?.name || 'Unknown'}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-500 italic">Frei</p>
            )}
            <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-700/50 text-slate-400">
                    {position.fillMethod}
                </span>
                {position.termLengthDays && (
                    <span className="text-[10px] text-slate-500">{position.termLengthDays}d term</span>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: string; label: string; value: number; color: string }> = ({ icon, label, value, color }) => {
    const colorClasses: Record<string, string> = {
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };
    const cls = colorClasses[color] || colorClasses.amber;

    return (
        <div className={`rounded-lg border p-3 ${cls}`}>
            <div className="flex items-center gap-2">
                <i className={`${icon} text-sm`}></i>
                <span className="text-xs font-medium opacity-80">{label}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
    );
};

export default GovernmentOverview;
