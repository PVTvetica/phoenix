import React from 'react';
import { HydratedWarrant, WarrantStatus } from '../../../../../types';
import { AccentKey } from '../../../../shared/ui/accents';
import SearchResultCard from '../SearchResultCard';
import { timeAgoShort } from '../../../intel/intelStyles';

interface Props {
    warrant: HydratedWarrant;
    onClick: () => void;
    isSelected?: boolean;
}

const warrantAccent = (s: WarrantStatus): AccentKey => {
    switch (s) {
        case WarrantStatus.Active: return 'red';
        case WarrantStatus.Standing: return 'rose';
        case WarrantStatus.Claimed: return 'emerald';
        case WarrantStatus.Cancelled: return 'slate';
        default: return 'red';
    }
};

const WarrantRowContent: React.FC<Props> = ({ warrant, onClick, isSelected }) => {
    const accent = warrantAccent(warrant.status);
    const isActive = warrant.status === WarrantStatus.Active;
    return (
        <SearchResultCard
            accent={accent}
            pulseRail={isActive}
            icon="fa-triangle-exclamation"
            onClick={onClick}
            isSelected={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded-sm border bg-red-500/10 border-red-500/30 text-red-300 font-black text-[9px] uppercase tracking-widest shrink-0">
                    Warnhinweis
                </span>
                <h3 className="text-white font-black font-mono text-sm uppercase truncate">{warrant.targetRsiHandle}</h3>
                <span className="text-slate-700 shrink-0">·</span>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    <i className="fa-regular fa-clock mr-1" aria-hidden />
                    {timeAgoShort(warrant.issuedAt)}
                </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-[11px] text-slate-300 truncate min-w-0 flex-1">
                    {warrant.reason}
                </p>
                <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/60 border-white/10 text-slate-400 font-mono text-[10px] uppercase tracking-wider shrink-0">
                    {warrant.action}
                </span>
                <span className="px-1.5 py-0.5 rounded-sm border bg-amber-500/10 border-amber-500/30 text-amber-300 font-mono text-[10px] shrink-0">
                    {warrant.uecReward.toLocaleString()} aUEC
                </span>
                <span className={`px-1.5 py-0.5 rounded border font-black text-[9px] uppercase tracking-widest shrink-0 ${
                    isActive
                        ? 'bg-red-500/10 border-red-500/30 text-red-300'
                        : 'bg-slate-900/60 border-white/10 text-slate-400'
                }`}>
                    {warrant.status}
                </span>
            </div>
        </SearchResultCard>
    );
};

export default React.memo(WarrantRowContent);
