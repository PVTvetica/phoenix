import React, { useState } from 'react';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import type { TreasuryAccount } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    accounts: TreasuryAccount[];
    onClose: () => void;
    onSubmitted: () => void;
}

export default function RecordAdjustmentModal({ accounts, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();
    const [accountId, setAccountId] = useState<number>(accounts[0]?.id ?? 0);
    const [direction, setDirection] = useState<'credit' | 'debit'>('credit');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const magnitude = Math.trunc(Number(amount));
    const signed = direction === 'credit' ? magnitude : -magnitude;
    const valid = accountId > 0 && magnitude > 0 && reason.trim().length > 0;

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('finance:record_adjustment', {
                accountId,
                amount: signed,
                reason: reason.trim(),
            });
            addToast("Anpassung aufgezeichnet", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Die Anpassung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
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
            title="Record Adjustment"
            subtitle="Direkteingabe durch Offizier"
            icon="fa-solid fa-wrench"
            color="slate"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-sm border border-slate-800 leading-relaxed">
                    Adjustments apply immediately and bypass the pending queue. Use this to correct balances, seed a new account with an opening value, or book a one-off payout that didn't go through a request.
                </p>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Konto</span>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                        {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name} · {a.balanceCached.toLocaleString()} aUEC
                            </option>
                        ))}
                    </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setDirection('credit')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border ${
                            direction === 'credit'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                    >
                        <i className="fa-solid fa-plus mr-1" />Kredit</button>
                    <button
                        type="button"
                        onClick={() => setDirection('debit')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border ${
                            direction === 'debit'
                                ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                                : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                    >
                        <i className="fa-solid fa-minus mr-1" />Lastschrift</button>
                </div>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Betrag (aUEC)</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Grund</span>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        maxLength={500}
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
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Recording…' : 'Record Adjustment'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
