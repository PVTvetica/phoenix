import React from 'react';
import type { QmIssuance, QmIssuanceStatus } from '../../../types';
import { ACCENTS, AccentKey } from '../../shared/ui/accents';
import { useFormatDate } from '../../../contexts/AuthContext';
import { formatRelativeTime } from '../../../lib/time';

const STATUS_ACCENT: Record<QmIssuanceStatus, AccentKey> = {
    requested:   'amber',
    active:      'sky',
    returned:    'emerald',
    written_off: 'slate',
};

const STATUS_LABEL: Record<QmIssuanceStatus, string> = {
    requested:   'Requested',
    active:      'On Issue',
    returned:    'Returned',
    written_off: 'Written Off',
};

interface Props {
    issuance: QmIssuance;
    onFulfil?: () => void;
    onReturn?: () => void;
    onWriteOff?: () => void;
}

export default function IssuanceRow({ issuance, onFulfil, onReturn, onWriteOff }: Props) {
    const fmt = useFormatDate();
    const formatRelative = (iso: string | null): string =>
        iso ? formatRelativeTime(iso, fmt.prefs) : '—';
    const accent = issuance.isOverdue ? 'rose' : STATUS_ACCENT[issuance.status];
    const a = ACCENTS[accent];
    const itemName = issuance.inventory?.catalog?.name || issuance.inventory?.customName || `Item #${issuance.inventoryId}`;
    const who = issuance.issuedTo?.name || `User ${issuance.issuedToUserId}`;

    return (
        <div className={`relative rounded-lg border ${a.border} bg-slate-900/40 flex items-stretch overflow-hidden`}>
            <div className={`w-1 shrink-0 ${a.dot}`} aria-hidden />
            <div className="flex-1 min-w-0 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg ${a.bg} flex items-center justify-center shrink-0`}>
                        <i className={`fa-solid fa-people-carry-box ${a.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${a.text}`}>
                                {issuance.isOverdue ? 'Overdue' : STATUS_LABEL[issuance.status]}
                            </span>
                            {issuance.outcome && (
                                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                                    · {issuance.outcome.replace(/_/g, ' ')}
                                </span>
                            )}
                            {issuance.inventory?.catalog?.category && (
                                <span className="text-[10px] font-mono text-slate-500 truncate">
                                    · {issuance.inventory.catalog.category}
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-white mt-0.5 truncate">
                            <span className="font-bold">{issuance.quantity}× {itemName}</span>
                            <span className="text-slate-400"> · to <span className="font-bold text-slate-200">{who}</span></span>
                        </div>
                        {issuance.notes && <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{issuance.notes}</div>}
                    </div>
                </div>
                <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                    <div className="text-right">
                        {issuance.status === 'active' && issuance.dueBackAt && (
                            <div className={`text-xs font-mono ${issuance.isOverdue ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>
                                Due {formatRelative(issuance.dueBackAt)}
                            </div>
                        )}
                        {issuance.status === 'requested' && issuance.requestedAt && (
                            <div className="text-xs font-mono text-slate-400">
                                Requested {formatRelative(issuance.requestedAt)}
                            </div>
                        )}
                        {issuance.status === 'returned' && issuance.returnedAt && (
                            <div className="text-xs font-mono text-emerald-300">
                                Returned {formatRelative(issuance.returnedAt)}
                            </div>
                        )}
                        {issuance.status === 'written_off' && issuance.returnedAt && (
                            <div className="text-xs font-mono text-slate-400">
                                Closed {formatRelative(issuance.returnedAt)}
                            </div>
                        )}
                    </div>
                    {(onFulfil || onReturn || onWriteOff) && (
                        <div className="flex items-center gap-1.5">
                            {onFulfil && (
                                <button
                                    onClick={onFulfil}
                                    className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 rounded-sm border border-sky-500/40 text-[10px] font-bold uppercase tracking-widest"
                                >Erfüllen</button>
                            )}
                            {onReturn && (
                                <button
                                    onClick={onReturn}
                                    className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-sm border border-emerald-500/40 text-[10px] font-bold uppercase tracking-widest"
                                >Zurückkehren</button>
                            )}
                            {onWriteOff && (
                                <button
                                    onClick={onWriteOff}
                                    className="px-2.5 py-1.5 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 rounded-sm border border-slate-600/50 text-[10px] font-bold uppercase tracking-widest"
                                >Abschreiben</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
