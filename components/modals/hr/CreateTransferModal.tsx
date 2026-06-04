
import React, { useState, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useMembers } from '../../../contexts/MembersContext';
import { useAuth } from '../../../contexts/AuthContext';

import WindowFrame from '../../layout/WindowFrame';
import { useNotification } from '../../../contexts/NotificationContext';

interface CreateTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateTransferModal: React.FC<CreateTransferModalProps> = ({ isOpen, onClose }) => {
    const { rpcAction, refreshHR } = useData();
    const { units } = useMembers();
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [targetUnitId, setTargetUnitId] = useState('');
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetUnitId || !reason.trim() || !currentUser) return;

        setIsLoading(true);
        try {
            await rpcAction('hr:request_transfer', {
                userId: currentUser.id,
                currentUnitId: currentUser.unit?.id || null,
                targetUnitId: parseInt(targetUnitId),
                reason: reason.trim()
            });

            const targetUnit = units.find(u => u.id === parseInt(targetUnitId));
            const unitName = targetUnit ? targetUnit.name : 'Unknown Unit';

            await rpcAction('hr:create_application', {
                name: currentUser.name,
                rsiHandle: currentUser.rsiHandle,
                referral: 'INTERNAL_TRANSFER',
                notes: `Requesting transfer to ${unitName}.\n\nReason: ${reason.trim()}`,
                userId: currentUser.id,
                assignedRecruiterId: null
            });

            // UX Optimization: Close immediately, refresh in background
            onClose();
            addToast("Übertragung eingereicht", <i className="fa-solid fa-right-left"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Deine Versetzungsanfrage wurde zur Prüfung eingereicht." });
            refreshHR();
        } catch (err) {
            console.error("Failed to submit transfer request:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Ein Fehler ist aufgetreten. Bitte versuche es erneut." });
            setIsLoading(false);
        }
    }, [targetUnitId, reason, currentUser, rpcAction, refreshHR, onClose, units, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Internal Transfer Request"
            subtitle="Personalbewegung"
            icon="fa-solid fa-right-left"
            color="amber"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-6">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Aktueller Auftrag</p>
                        <p className="text-xl font-bold text-white">{currentUser?.unit?.name || 'Unassigned'}</p>
                    </div>

                    <div>
                        <label className={labelClass}>Zieleinheit</label>
                        <select
                            value={targetUnitId}
                            onChange={(e) => setTargetUnitId(e.target.value)}
                            className={inputClass}
                            required
                            disabled={isLoading}
                        >
                            <option value="">- Select Unit -</option>
                            {[...units].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name)).filter(u => u.id !== currentUser?.unit?.id).map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Grund für die Übertragung</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className={`${inputClass} resize-none`}
                            placeholder="State your reasons for requesting this transfer..."
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <p className="text-[10px] text-amber-500/60 italic mt-2 bg-amber-900/10 p-3 rounded-sm border border-amber-500/20">
                        <i className="fa-solid fa-circle-info mr-2"></i>
                        Submitting this request will automatically open a personnel case file to facilitate the review process.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Submit Request'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default CreateTransferModal;
