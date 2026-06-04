import React, { useState, useCallback } from 'react';
import { User } from '../../types';
import { useMembers } from '../../contexts/MembersContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface AdjustReputationModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const AdjustReputationModal: React.FC<AdjustReputationModalProps> = ({ isOpen, onClose, user }) => {
    const { adjustUserReputation } = useMembers();
    const { addToast } = useNotification();
    const [reputation, setReputation] = useState(user.reputation);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim()) {
            setIsLoading(true);
            try {
                await adjustUserReputation(user.id, reputation, reason.trim());
                onClose();
            } catch (err) {
                console.error("Failed to adjust reputation:", err);
                addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Anpassen des Rufs ist ein Fehler aufgetreten. Bitte versuche es erneut." });
            } finally {
                setIsLoading(false);
            }
        }
    }, [user.id, reputation, reason, adjustUserReputation, onClose, addToast]);

    if (!isOpen) return null;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={`Adjust Reputation: ${user.name}`}
            subtitle="Personaldatensatz"
            icon="fa-solid fa-scale-balanced"
            color="amber"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* Body */}
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="reputation" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Neuer Reputationswert (0-100)</label>
                        <input
                            id="reputation"
                            type="range"
                            min="0"
                            max="100"
                            value={reputation}
                            onChange={(e) => setReputation(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
                            disabled={isLoading}
                        />
                        <p className="text-center font-bold text-amber-500 text-3xl mt-2 font-mono">{reputation}</p>
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grund für die Anpassung</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="e.g., Commendation for exceptional conduct on mission SR-XXXX."
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all resize-none"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end items-center p-4 bg-slate-900/50 border-t border-white/5 rounded-b-xl shrink-0 gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none border border-amber-500/50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Save Adjustment'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default AdjustReputationModal;