import React from 'react';
import { User, UserRole } from '../../../../../types';
import SearchResultCard from '../SearchResultCard';

interface Props {
    user: User;
    onClick: () => void;
    isSelected?: boolean;
}

const PersonnelRowContent: React.FC<Props> = ({ user, onClick, isSelected }) => {
    const isClient = user.role === UserRole.Client;
    const accent = isClient ? 'emerald' : 'sky';
    return (
        <SearchResultCard
            accent={accent}
            avatarUrl={user.avatarUrl}
            icon="fa-user"
            onClick={onClick}
            isSelected={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-white font-bold text-sm truncate">{user.name}</h3>
                <span className="text-slate-700">·</span>
                <span className="font-mono text-[10px] text-slate-500 truncate">{user.rsiHandle}</span>
                {user.isDuty && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Im Dienst</span>
                )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-1.5 py-0.5 rounded border font-black text-[9px] uppercase tracking-widest ${
                    isClient
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                }`}>
                    {user.role}
                </span>
                {user.rank?.name && (
                    <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/60 border-white/10 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                        {user.rank.name}
                    </span>
                )}
                {user.unit?.name && (
                    <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/40 border-white/5 text-slate-500 font-mono text-[10px] truncate max-w-[160px]">
                        {user.unit.name}
                    </span>
                )}
            </div>
        </SearchResultCard>
    );
};

export default React.memo(PersonnelRowContent);
