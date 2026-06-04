import React, { useState, useCallback } from 'react';
import { User, ConductRecordType } from '../../types';
import { useMembers } from '../../contexts/MembersContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface AddConductEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const AddConductEntryModal: React.FC<AddConductEntryModalProps> = ({ isOpen, onClose, user }) => {
    const { addConductEntry } = useMembers();
    const { addToast } = useNotification();
    const [type, setType] = useState<ConductRecordType>(ConductRecordType.Observation);
    const [reason, setReason] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (reason.trim()) {
            setIsLoading(true);
            try {
                await addConductEntry(user.id, type, reason.trim());
                onClose();
            } catch (err) {
                console.error("Failed to add conduct entry:", err);
                addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Hinzufügen des Eintrags ist ein Fehler aufgetreten. Bitte versuche es erneut." });
            } finally {
                setIsLoading(false);
            }
        }
    }, [user.id, type, reason, addConductEntry, onClose, addToast]);

    if (!isOpen) return null;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={`Add Conduct Entry: ${user.name}`}
            subtitle="Personalakte"
            icon="fa-solid fa-file-pen"
            color="indigo"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                {/* Body */}
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="conductType" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verhaltenstyp</label>
                        <select
                            id="conductType"
                            value={type}
                            onChange={(e) => setType(e.target.value as ConductRecordType)}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all"
                            disabled={isLoading}
                        >
                            {Object.values(ConductRecordType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reason" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Grund / Beobachtung</label>
                        <textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            placeholder="Detail the observation or reason for this entry..."
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all resize-none"
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
                        className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none border border-sky-500/50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Add Entry'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default AddConductEntryModal;