import React, { useEffect, useRef, useState } from 'react';
import { ServiceRequestStatus } from '../../../../types';
import { useRequests } from '../../../../contexts/RequestsContext';
import { ACCENTS } from '../../../shared/ui/accents';
import { StatusPill } from './pills';
import { nextValidStatuses, statusAccent, statusLabel, statusIcon } from './requestStyles';

interface Props {
    requestId: string;
    currentStatus: ServiceRequestStatus;
    /** Called when the user picks "More options" — parent should open the full modal. */
    onMoreOptions: () => void;
    className?: string;
}

/**
 * Inline status-advance affordance. Renders the current status as a button that
 * toggles a small popover listing the most likely next statuses. Clicking one
 * calls the existing `request:update_status` RPC via AuthContext.
 */
export default function StatusAdvancePopover({ requestId, currentStatus, onMoreOptions, className = '' }: Props) {
    const { updateRequestStatus } = useRequests();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState<ServiceRequestStatus | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const options = nextValidStatuses(currentStatus);
    const hasQuickOptions = options.length > 0;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const handlePick = async (e: React.MouseEvent, status: ServiceRequestStatus) => {
        e.stopPropagation();
        if (loading) return;
        setLoading(status);
        try {
            await updateRequestStatus(requestId, status);
            setOpen(false);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div ref={ref} className={`relative ${className}`}>
            <StatusPill
                status={currentStatus}
                onClick={hasQuickOptions ? (e) => { e.stopPropagation(); setOpen(o => !o); } : undefined}
            />
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 z-20 min-w-[180px] rounded-lg border border-white/10 bg-slate-950/95 backdrop-blur-md shadow-xl shadow-black/40 p-1.5 animate-fade-in"
                >
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-2 py-1">Weiter zu</div>
                    {options.map(s => {
                        const a = ACCENTS[statusAccent(s)];
                        const isLoading = loading === s;
                        return (
                            <button
                                key={s}
                                onClick={(e) => handlePick(e, s)}
                                disabled={!!loading}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-xs font-bold uppercase tracking-wider ${a.text} hover:${a.bg} transition-colors disabled:opacity-50`}
                            >
                                {isLoading
                                    ? <i className="fa-solid fa-spinner animate-spin w-4 text-center" aria-hidden />
                                    : <i className={`fa-solid ${statusIcon(s)} w-4 text-center`} aria-hidden />}
                                <span>{statusLabel(s)}</span>
                            </button>
                        );
                    })}
                    <div className="border-t border-white/5 my-1" />
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onMoreOptions(); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-800/60 transition-colors"
                    >
                        <i className="fa-solid fa-ellipsis w-4 text-center" aria-hidden />
                        <span>Weitere Optionen…</span>
                    </button>
                </div>
            )}
        </div>
    );
}
