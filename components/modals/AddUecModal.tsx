
import React, { useState, useCallback } from 'react';
import { HydratedOperation } from '../../types';
import { useOperations } from '../../contexts/OperationsContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface AddUecModalProps {
    isOpen: boolean;
    onClose: () => void;
    operation: HydratedOperation;
}

const AddUecModal: React.FC<AddUecModalProps> = ({ isOpen, onClose, operation }) => {
    const { addOperationUec } = useOperations();
    const { addToast } = useNotification();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseInt(amount);
        if (!reason.trim() || isNaN(numAmount) || numAmount <= 0) {
            addToast("Validierungsfehler", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Bitte gib einen gültigen Betrag und Grund ein." });
            return;
        }

        setIsLoading(true);
        try {
            await addOperationUec(operation.id, numAmount, reason.trim());
            onClose();
        } catch (err) {
            console.error("Failed to add aUEC:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Hinzufügen von aUEC ist ein Fehler aufgetreten. Bitte versuche es erneut." });
            setIsLoading(false);
        }
    }, [amount, reason, operation, addOperationUec, onClose, addToast]);

    const inputClass = "w-full bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-green-500/40 focus:ring-1 focus:ring-green-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Deposit Funds"
            subtitle="Ledger-Eintrag"
            icon="fa-solid fa-coins"
            color="green"
            width="max-w-sm"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-6">
                    <div>
                        <label className={labelClass}>aUEC Amount</label>
                        <div className="relative">
                            <i className="fa-solid fa-plus absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-xs"></i>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g., 500000"
                                className={`${inputClass} pl-8 font-mono`}
                                required
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Grund/Quelle</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g., Contract Payout"
                            className={inputClass}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white border border-green-500/40 shadow-lg shadow-green-900/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Add to Pool'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default AddUecModal;
