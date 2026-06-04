import React from 'react';
import type { HydratedWarrant, WarrantAction, WarrantStatus } from '../../../../types';
import { useFormatDate } from '../../../../contexts/AuthContext';

interface Props {
    warrant: HydratedWarrant;
}

const STATUS_STYLE: Record<string, string> = {
    Active:    'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    Standing:  'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse',
    Claimed:   'bg-sky-500/10 text-sky-300 border-sky-500/30',
    Cancelled: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

const ACTION_STYLE: Record<WarrantAction | string, { icon: string; className: string }> = {
    'Extreme Caution': { icon: 'fa-triangle-exclamation', className: 'text-red-400' },
    'High Caution':    { icon: 'fa-circle-exclamation',   className: 'text-amber-400' },
    Caution:           { icon: 'fa-eye',                  className: 'text-sky-400' },
};

export default function MdtWarrantRow({ warrant }: Props) {
    const fmt = useFormatDate();
    const status = warrant.status as WarrantStatus;
    const action = ACTION_STYLE[warrant.action as string] || ACTION_STYLE['Caution'];
    const statusClass = STATUS_STYLE[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';

    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-500/20 bg-red-950/10">
            <div className={`w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 ${action.className}`}>
                <i className={`fa-solid ${action.icon}`}></i>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{warrant.action}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${statusClass}`}>
                        {status}
                    </span>
                    {warrant.uecReward > 0 && (
                        <span className="text-[10px] text-amber-300 font-mono uppercase tracking-widest">
                            · {warrant.uecReward.toLocaleString()} aUEC
                        </span>
                    )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {warrant.reason || 'No reason provided'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Issued {fmt.date(warrant.issuedAt)}
                    {warrant.sourceFeedLabel && <span className="ml-2 text-sky-400/80">· {warrant.sourceFeedLabel}</span>}
                </div>
            </div>
        </div>
    );
}
