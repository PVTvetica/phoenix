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

export default function SubmitDepositModal({ accounts, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();
    const [accountId, setAccountId] = useState<number>(accounts[0]?.id ?? 0);
    const [amount, setAmount] = useState<string>('');
    const [memo, setMemo] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    const valid = accountId > 0 && Number(amount) > 0 && memo.trim().length > 0;

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('finance:submit_deposit', {
                accountId,
                amount: Math.trunc(Number(amount)),
                memo: memo.trim(),
                notes: notes.trim() || undefined,
            });
            addToast(
                'Deposit submitted',
                <i className="fa-solid fa-check" />,
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/50',
                { description: 'Ein Offizier bestätigt es gegen das Org-Alt-Konto.' },
            );
            onSubmitted();
        } catch (err: any) {
            addToast("Die Übermittlung ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
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
            title="Submit Deposit"
            subtitle="Schatzkammer-Ledger"
            icon="fa-solid fa-arrow-down-to-bracket"
            color="green"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-sm border border-slate-800 leading-relaxed">Überweisen du Deine aUEC auf die Bank der Organisation<span className="text-emerald-300 font-mono">in-game first</span>, using the memo below as your transfer reference. An officer will confirm the claim by matching the memo against the alt-account history.
                </p>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Konto</span>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Betrag (aUEC)</span>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Memo / Referenz im Spiel</span>
                    <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="e.g. OP-TUESDAY or HANDLE-DEPOSIT"
                        maxLength={80}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                        Use the same reference you put on your in-game transfer so the officer can match it.
                    </span>
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Notizen (optional)</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        maxLength={400}
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
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Submitting…' : 'Submit Deposit'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
