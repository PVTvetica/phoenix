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

type WriteOffOutcome = 'lost' | 'destroyed_in_action';

export default function WriteOffIssuanceModal({ issuance, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();
    const [outcome, setOutcome] = useState<WriteOffOutcome>('lost');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const itemName = issuance.inventory?.catalog?.name || issuance.inventory?.customName || 'Item';

    const submit = async () => {
        if (submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('qm:write_off_issuance', {
                issuanceId: issuance.id,
                outcome,
                notes: notes.trim() || undefined,
            });
            addToast("Ausgabe abgeschrieben", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Die Abschreibung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
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
            title="Write Off Issuance"
            subtitle={`${issuance.quantity}× ${itemName}`}
            icon="fa-solid fa-ban"
            color="red"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-sm border border-slate-800 leading-relaxed">
                    The stock never comes back. No return movement is recorded — the issuance closes with the chosen outcome and the overall quantity on hand is permanently reduced by the issued amount.
                </p>

                <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Ergebnis</span>
                    <div className="mt-1 grid grid-cols-1 gap-2">
                        {(['lost', 'destroyed_in_action'] as WriteOffOutcome[]).map((o) => (
                            <button
                                key={o}
                                type="button"
                                onClick={() => setOutcome(o)}
                                className={`text-left px-3 py-2 rounded-lg border text-[11px] font-bold uppercase tracking-widest ${
                                    outcome === o
                                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-100'
                                        : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
                                }`}
                            >
                                {o.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Notizen</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        maxLength={400}
                        placeholder="Circumstances, op reference, etc."
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white">Abbrechen</button>
                    <button
                        onClick={submit}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Writing off…' : 'Confirm Write-Off'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
