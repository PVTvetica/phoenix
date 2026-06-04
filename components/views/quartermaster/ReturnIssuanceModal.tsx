import React, { useState } from 'react';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import type { QmIssuance } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    issuance: QmIssuance;
    onClose: () => void;
    onSubmitted: () => void;
}

type ReturnOutcome = 'returned_on_time' | 'returned_late' | 'returned_damaged';

export default function ReturnIssuanceModal({ issuance, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();

    const defaultOutcome: ReturnOutcome = issuance.isOverdue ? 'returned_late' : 'returned_on_time';
    const [outcome, setOutcome] = useState<ReturnOutcome>(defaultOutcome);
    const [returnedQty, setReturnedQty] = useState(String(issuance.quantity));
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const qty = Math.trunc(Number(returnedQty));
    const valid = Number.isFinite(qty) && qty >= 0 && qty <= issuance.quantity;
    const itemName = issuance.inventory?.catalog?.name || issuance.inventory?.customName || 'Item';

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('qm:return_issuance', {
                issuanceId: issuance.id,
                returnedQuantity: qty,
                outcome,
                notes: notes.trim() || undefined,
            });
            addToast("Ausgabe geschlossen", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Die Rückgabe ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
                description: err?.message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <WindowFrame
            isOpen
            onClose={onClose}
            title="Return Issuance"
            subtitle={`${issuance.quantity}× ${itemName}`}
            icon="fa-solid fa-rotate-left"
            color="green"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Ergebnis</span>
                    <div className="mt-1 grid grid-cols-1 gap-2">
                        {(['returned_on_time', 'returned_late', 'returned_damaged'] as ReturnOutcome[]).map((o) => (
                            <button
                                key={o}
                                type="button"
                                onClick={() => setOutcome(o)}
                                className={`text-left px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-widest ${
                                    outcome === o
                                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
                                        : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
                                }`}
                            >
                                {o.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Retournierte Menge</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={issuance.quantity}
                        value={returnedQty}
                        onChange={(e) => setReturnedQty(e.target.value)}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                        {qty < issuance.quantity
                            ? `${issuance.quantity - qty} of ${issuance.quantity} not returned — track via notes.`
                            : 'Full quantity returned.'}
                    </span>
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Notizen (optional)</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        maxLength={400}
                        placeholder="Anything relevant about condition, timing, damage?"
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white">Abbrechen</button>
                    <button
                        onClick={submit}
                        disabled={!valid || submitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Closing…' : 'Close Issuance'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
