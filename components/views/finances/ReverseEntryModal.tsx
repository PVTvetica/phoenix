import React, { useState } from 'react';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import type { LedgerEntry } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    entry: LedgerEntry;
    onClose: () => void;
    onSubmitted: () => void;
}

export default function ReverseEntryModal({ entry, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const valid = reason.trim().length > 0;

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('finance:reverse_entry', { entryId: entry.id, reason: reason.trim() });
            addToast("Eintrag rückgängig gemacht", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Die Umkehrung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
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
            title="Reverse Entry"
            subtitle={`${entry.entryType} · ${Math.abs(entry.amount).toLocaleString()} aUEC`}
            icon="fa-solid fa-rotate-left"
            color="slate"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-sm border border-slate-800 leading-relaxed">
                    A compensating entry will be created (opposite sign, immediately confirmed) and this entry will be marked <span className="font-bold">reversed</span>. Nothing is deleted — the audit trail stays intact.
                </p>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Grund</span>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        maxLength={500}
                        placeholder="Why is this entry being reversed?"
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
                    >Abbrechen</button>
                    <button
                        onClick={submit}
                        disabled={!valid || submitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Reversing…' : 'Reverse Entry'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
