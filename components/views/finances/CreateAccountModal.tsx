import React, { useState } from 'react';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import type { TreasuryAccount } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    onClose: () => void;
    onSubmitted: () => void;
}

const TYPE_OPTIONS: readonly { value: TreasuryAccount['type']; label: string; hint: string }[] = [
    { value: 'general', label: 'General',    hint: 'The main org bank — most orgs only have this one.' },
    { value: 'reserve', label: 'Reserve',    hint: 'Safety buffer kept separately from day-to-day funds.' },
    { value: 'project', label: 'Project',    hint: 'Earmarked for a specific project or acquisition.' },
    { value: 'ops',     label: 'Operationen', hint: 'Funds allocated to ongoing ops and payouts.' },
];

export default function CreateAccountModal({ onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();
    const [name, setName] = useState('');
    const [type, setType] = useState<TreasuryAccount['type']>('general');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const valid = name.trim().length > 0;

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('finance:create_account', {
                name: name.trim(),
                type,
                description: description.trim() || undefined,
            });
            addToast("Konto erstellt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Erstellen ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
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
            title="New Treasury Account"
            subtitle="Schatzkammer"
            icon="fa-solid fa-vault"
            color="amber"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Main Bank"
                        maxLength={80}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                </label>

                <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Typ</span>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                        {TYPE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setType(opt.value)}
                                className={`text-left px-3 py-2 rounded-lg border text-[11px] ${
                                    type === opt.value
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-100'
                                        : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
                                }`}
                            >
                                <div className="font-bold uppercase tracking-widest">{opt.label}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{opt.hint}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Beschreibung (optional)</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
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
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Creating…' : 'Create Account'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
