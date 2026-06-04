
import React, { useState, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';

import { JobPosting } from '../../../types';
import WindowFrame from '../../layout/WindowFrame';
import { useNotification } from '../../../contexts/NotificationContext';

interface ApplyJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: JobPosting;
}

const ApplyJobModal: React.FC<ApplyJobModalProps> = ({ isOpen, onClose, job }) => {
    const { rpcAction, refreshHR } = useData();
    const { currentUser } = useAuth();
    const { addToast } = useNotification();
    const [statement, setStatement] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!statement.trim() || !currentUser) return;

        setIsLoading(true);
        try {
            await rpcAction('user:apply_job', {
                jobId: job.id,
                userId: currentUser.id,
                statement: statement.trim()
            });

            // UX Optimization: Close immediately, refresh in background
            onClose();
            addToast("Antrag eingereicht", <i className="fa-solid fa-check"></i>, "bg-green-500/10 text-green-400 border-green-500/50", { description: "Deine Bewerbung wurde zur Prüfung eingereicht." });
            refreshHR();
        } catch (err) {
            console.error("Failed to submit application:", err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Ein Fehler ist aufgetreten. Bitte versuche es erneut." });
            setIsLoading(false); // Only stop loading if error, otherwise component unmounts
        }
    }, [statement, job, currentUser, rpcAction, refreshHR, onClose, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/50 outline-hidden transition-all resize-none";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Apply for Position"
            subtitle={job.title}
            icon="fa-solid fa-file-signature"
            color="emerald"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="bg-emerald-500/5 border border-emerald-500/30 p-4 rounded-xl">
                        <p className="mb-1 font-black text-white uppercase tracking-tight">{job.title}</p>
                        <p className="text-[10px] text-emerald-300 uppercase font-black tracking-widest">Department · {job.department}</p>
                    </div>

                    <div>
                        <label className={labelClass}>Interessenbekundung</label>
                        <textarea
                            value={statement}
                            onChange={(e) => setStatement(e.target.value)}
                            rows={6}
                            className={inputClass}
                            placeholder="Why are you interested in this position?"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <p className="text-xs text-slate-500 italic bg-slate-900/30 p-3 rounded-sm border border-slate-700/50">
                        <i className="fa-solid fa-circle-info mr-2 text-emerald-300"></i>
                        By submitting this application, a record will be created in the Case Management System for review by HR.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-paper-plane"></i>Bewerbung einreichen</>}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default ApplyJobModal;
