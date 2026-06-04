
import React, { useState, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface ClientApplyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ClientApplyModal: React.FC<ClientApplyModalProps> = ({ isOpen, onClose }) => {
    const { rpcAction, refreshHR } = useData();
    const { currentUser } = useAuth();
    const { addToast } = useNotification();

    const [statement, setStatement] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statement.trim()) {
            addToast("Validierungsfehler", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Bitte gib eine Interessenserklärung ab." });
            return;
        }

        setIsLoading(true);
        try {
            await rpcAction('user:submit_application', {
                name: currentUser?.name,
                rsiHandle: currentUser?.rsiHandle,
                referral: 'WEBSITE_APPLICATION',
                notes: `Client Application:\n${statement.trim()}`,
                userId: currentUser?.id,
                assignedRecruiterId: null
            });

            // Mitigate indexing latency by waiting briefly before refresh
            await new Promise(resolve => setTimeout(resolve, 500));
            await refreshHR();

            onClose();
        } catch (err) {
            console.error("Failed to submit application:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Einreichen deiner Bewerbung ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setIsLoading(false);
        }
    }, [statement, rpcAction, refreshHR, onClose, currentUser, addToast]);

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Membership Application"
            subtitle="Dem Team beitreten"
            icon="fa-solid fa-file-signature"
            color="sky"
            width="max-w-md"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="bg-sky-900/10 border border-sky-500/20 p-4 rounded-xl text-sm text-sky-200">
                        <p className="mb-2 font-bold">Senden du Deine Bewerbung an die Personalabteilung.</p>
                        <ul className="list-disc pl-4 text-xs space-y-1 opacity-80">
                            <li>Your RSI Handle and Discord ID will be automatically attached.</li>
                            <li>A Case Officer will review your file and contact you via Discord.</li>
                        </ul>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Interessenbekundung</label>
                        <textarea
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 outline-hidden transition-all resize-none"
                            placeholder="Tell us why you want to join, your experience level, and what roles you are interested in..."
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/50 hover:bg-sky-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Submit Application'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default ClientApplyModal;
