import React from 'react';
import type { HydratedServiceRequest } from '../../../../types';
import { useFormatDate } from '../../../../contexts/AuthContext';

interface Props {
    request: HydratedServiceRequest;
    onClick?: () => void;
}

const STATUS_STYLE: Record<string, string> = {
    Submitted:    'bg-purple-500/10 text-purple-300 border-purple-500/30',
    Triaged:      'bg-amber-500/10 text-amber-300 border-amber-500/30',
    Accepted:     'bg-sky-500/10 text-sky-300 border-sky-500/30',
    'In-Progress':'bg-sky-500/10 text-sky-300 border-sky-500/30',
    Success:      'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    Failed:       'bg-rose-500/10 text-rose-300 border-rose-500/30',
    Cancelled:    'bg-slate-500/10 text-slate-300 border-slate-500/30',
    Refused:      'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

export default function MdtRequestRow({ request, onClick }: Props) {
    const fmt = useFormatDate();
    const statusClass = STATUS_STYLE[request.status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';

    return (
        <button
            onClick={onClick}
            disabled={!onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-white/10 bg-slate-900/40 text-left transition ${onClick ? 'hover:border-cyan-500/30 hover:bg-slate-900/60 cursor-pointer' : 'cursor-default'}`}
        >
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-file-invoice text-sky-400"></i>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{request.serviceType}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${statusClass}`}>
                        {request.status}
                    </span>
                    {request.urgency && (
                        <span className="text-[10px] font-mono text-slate-500 uppercase">· {request.urgency}</span>
                    )}
                    {request.rated && request.clientRating && (
                        <span className="text-[10px] text-amber-300 flex items-center gap-0.5">
                            <i className="fa-solid fa-star text-[9px]"></i>
                            {request.clientRating}/5
                        </span>
                    )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {request.location && <span><i className="fa-solid fa-map-pin mr-1"></i>{request.location} · </span>}
                    {fmt.date(request.createdAt)}
                </div>
            </div>
            {onClick && <i className="fa-solid fa-arrow-right text-slate-500 text-xs shrink-0"></i>}
        </button>
    );
}
