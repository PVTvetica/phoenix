import React, { useMemo, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import type { WarehouseRequest, WarehouseRequestStatus } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

const STATUS_TONE: Record<WarehouseRequestStatus, string> = {
    pending: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    approved: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
    fulfilled: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    denied: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    cancelled: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const REASON_LABEL: Record<string, string> = {
    sale: 'Sale',
    craft: 'Crafting',
    transport: 'Transport',
    other: 'Other',
};

interface Props {
    requests: WarehouseRequest[];
    canManage: boolean;
    onRefresh: () => void;
}

export default function WhWithdrawalsTab({ requests, canManage, onRefresh }: Props) {
    const { rpcAction } = useData();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();
    const { addToast, confirm } = useNotification();
    const [view, setView] = useState<'pending' | 'mine' | 'history'>(canManage ? 'pending' : 'mine');
    const [busyId, setBusyId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        if (view === 'pending') return requests.filter((r) => r.status === 'pending' || r.status === 'approved');
        if (view === 'mine') return requests.filter((r) => r.requestedByUserId === currentUser?.id);
        return requests;
    }, [requests, view, currentUser?.id]);

    const handleApprove = async (req: WarehouseRequest) => {
        setBusyId(req.id);
        try {
            await rpcAction('warehouse:approve_withdrawal', { requestId: req.id });
            addToast("Genehmigt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onRefresh();
        } catch (err: any) {
            addToast("Die Genehmigung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message });
        } finally {
            setBusyId(null);
        }
    };

    const handleDeny = async (req: WarehouseRequest) => {
        const reason = window.prompt('Deny — reason (optional):', '');
        if (reason === null) return;
        setBusyId(req.id);
        try {
            await rpcAction('warehouse:deny_withdrawal', { requestId: req.id, denialReason: reason || undefined });
            addToast("Abgelehnt", <i className="fa-solid fa-check" />, 'bg-slate-500/10 text-slate-300 border-slate-500/50');
            onRefresh();
        } catch (err: any) {
            addToast("Leugnen ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message });
        } finally {
            setBusyId(null);
        }
    };

    const handleFulfil = async (req: WarehouseRequest) => {
        const s = req.stock;
        const onHand = s?.quantityOnHand;
        const qtyOk = typeof onHand === 'number' ? onHand >= req.requestedQuantity : true;
        const confirmed = await confirm({
            title: 'Fulfil withdrawal',
            message: qtyOk
                ? `Release ${req.requestedQuantity} ${s?.catalog?.unit || 'units'} of ${s?.catalog?.name || 'commodity'} from ${s?.location?.name || '—'}?`
                : `Stock has only ${onHand ?? 0} on hand — fulfilling would fail. Reduce the request quantity or restock first.`,
            confirmText: 'Fulfil',
            variant: qtyOk ? 'info' : 'warning',
        });
        if (!confirmed) return;
        setBusyId(req.id);
        try {
            await rpcAction('warehouse:fulfil_withdrawal', { requestId: req.id });
            addToast("Widerruf erfüllt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onRefresh();
        } catch (err: any) {
            addToast("Die Ausführung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message });
        } finally {
            setBusyId(null);
        }
    };

    const handleCancel = async (req: WarehouseRequest) => {
        const confirmed = await confirm({
            title: 'Cancel request',
            message: 'Cancel your withdrawal request?',
            confirmText: 'Cancel Request',
            variant: 'warning',
        });
        if (!confirmed) return;
        setBusyId(req.id);
        try {
            await rpcAction('warehouse:cancel_withdrawal', { requestId: req.id });
            addToast("Anfrage abgebrochen", <i className="fa-solid fa-check" />, 'bg-slate-500/10 text-slate-300 border-slate-500/50');
            onRefresh();
        } catch (err: any) {
            addToast("Abbrechen fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-white/10 p-1 max-w-fit">
                {canManage && (
                    <button onClick={() => setView('pending')}
                        className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition ${view === 'pending' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}>Ausstehend</button>
                )}
                <button onClick={() => setView('mine')}
                    className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition ${view === 'mine' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}>Meine Wünsche</button>
                <button onClick={() => setView('history')}
                    className={`shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition ${view === 'history' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-slate-200'}`}>Alle</button>
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-slate-900/30 p-10 text-center text-slate-500 text-sm">
                    {view === 'pending' ? 'No pending requests.' : view === 'mine' ? 'You haven\'t made any withdrawal requests.' : 'No requests yet.'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((r) => {
                        const s = r.stock;
                        const isMine = r.requestedByUserId === currentUser?.id;
                        const canActOnThis = canManage && (r.status === 'pending' || r.status === 'approved');
                        return (
                            <div key={r.id} className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border ${STATUS_TONE[r.status]}`}>
                                                {r.status}
                                            </span>
                                            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                                                · {REASON_LABEL[r.reasonCategory] || r.reasonCategory}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-600">
                                                · {fmt(r.createdAt)}
                                            </span>
                                        </div>
                                        <div className="mt-1.5 text-sm text-white">
                                            <span className="font-bold font-mono text-cyan-200">{r.requestedQuantity}</span>
                                            <span className="text-slate-500"> {s?.catalog?.unit || 'units'} of </span>
                                            <span className="font-bold">{s?.catalog?.name || 'commodity'}</span>
                                            {s?.catalog?.qualityLabel && <span className="text-slate-500 font-mono"> · {s.catalog.qualityLabel}</span>}
                                            <span className="text-slate-500"> @ {s?.location?.name || '—'}</span>
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">Angefordert von<span className="text-slate-300">{r.requestedBy?.name || `#${r.requestedByUserId}`}</span>
                                            {r.reasonNotes && <span> · {r.reasonNotes}</span>}
                                        </div>
                                        {r.denialReason && (
                                            <div className="mt-1 text-[11px] text-rose-300">Denied: {r.denialReason}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canActOnThis && r.status === 'pending' && (
                                            <button onClick={() => handleApprove(r)} disabled={busyId === r.id}
                                                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-sm transition disabled:opacity-50">Genehmigen</button>
                                        )}
                                        {canActOnThis && (
                                            <button onClick={() => handleFulfil(r)} disabled={busyId === r.id}
                                                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-sm transition disabled:opacity-50">Erfüllen</button>
                                        )}
                                        {canActOnThis && (
                                            <button onClick={() => handleDeny(r)} disabled={busyId === r.id}
                                                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-sm transition disabled:opacity-50">Leugnen</button>
                                        )}
                                        {isMine && (r.status === 'pending' || r.status === 'approved') && (
                                            <button onClick={() => handleCancel(r)} disabled={busyId === r.id}
                                                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-sm transition disabled:opacity-50">Abbrechen</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
