import React, { useState } from 'react';
import { User } from '../../types';
import { useMembers } from '../../contexts/MembersContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface AwardSingleCommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const AwardSingleCommendationModal: React.FC<AwardSingleCommendationModalProps> = ({ isOpen, onClose, user }) => {
    const { commendations, awardCommendation } = useMembers();
    const { addToast } = useNotification();
    const [selectedCommendId, setSelectedCommendId] = useState('');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!selectedCommendId || !reason.trim()) return;
        setIsLoading(true);
        try {
            await awardCommendation(user.id, parseInt(selectedCommendId), reason.trim());
            onClose();
        } catch (err) {
            console.error("Failed to award commendation:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Verleihen der Auszeichnung ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={`Award Commendation: ${user.name}`}
            subtitle="Personalakte"
            icon="fa-solid fa-medal"
            color="amber"
            width="max-w-lg"
        >
            <div className="flex flex-col h-full">
                {/* Body */}
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="commendation" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Wähle „Belobigung“ aus</label>
                        <select
                            id="commendation"
                            value={selectedCommendId}
                            onChange={(e) => setSelectedCommendId(e.target.value)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all"
                            disabled={isLoading}
                        >
                            <option value="">- Choose a commendation -</option>
                            {commendations.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grund für die Auszeichnung</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="e.g., For exceptional bravery during mission SR-XXXX."
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all resize-none"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end p-4 bg-slate-900/50 border-t border-white/5 rounded-b-xl gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="w-32 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none border border-amber-500/50"
                        disabled={isLoading || !selectedCommendId || !reason.trim()}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Award'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default AwardSingleCommendationModal;