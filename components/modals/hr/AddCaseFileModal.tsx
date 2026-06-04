
import React, { useState, useCallback, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useMembers } from '../../../contexts/MembersContext';
import { useAuth } from '../../../contexts/AuthContext';

import WindowFrame from '../../layout/WindowFrame';
import { useNotification } from '../../../contexts/NotificationContext';

interface AddCaseFileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddCaseFileModal: React.FC<AddCaseFileModalProps> = ({ isOpen, onClose }) => {
    const { rpcAction, refreshHR } = useData();
    const { allUsers } = useMembers();
    const { currentUser } = useAuth();
    const { addToast } = useNotification();

    const [rsiHandle, setRsiHandle] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [linkedUser, setLinkedUser] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setRsiHandle('');
            setSubjectName('');
            setNotes('');
            setLinkedUser(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleRsiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRsiHandle(e.target.value);
        if (linkedUser) setLinkedUser(null);
    };

    const handleRsiBlur = () => {
        if (!rsiHandle.trim()) {
            setLinkedUser(null);
            return;
        }
        const existingUser = allUsers.find(u => u.rsiHandle.toLowerCase() === rsiHandle.trim().toLowerCase());
        if (existingUser) {
            setLinkedUser(existingUser);
            setSubjectName(existingUser.name);
        } else {
            setLinkedUser(null);
        }
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rsiHandle.trim() || !subjectName.trim()) {
            addToast("Validierungsfehler", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Pflichtfelder fehlen." });
            return;
        }

        setIsLoading(true);
        try {
            await rpcAction('hr:create_application', {
                name: subjectName.trim(),
                rsiHandle: rsiHandle.trim(),
                referral: 'INTERNAL_CASE',
                notes: notes.trim(),
                userId: currentUser?.id
            });

            // UX Optimization: Close immediately, refresh in background
            onClose();
            addToast("Falldatei erstellt", <i className="fa-solid fa-folder-closed"></i>, "bg-emerald-500/10 text-emerald-400 border-emerald-500/50", { description: "Interne Akte erfolgreich eröffnet." });
            refreshHR();
        } catch (err) {
            console.error(err);
            addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Fehler beim Erstellen der Akte." });
            setIsLoading(false);
        }
    }, [rsiHandle, subjectName, notes, rpcAction, refreshHR, onClose, currentUser, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Create Case File"
            subtitle="Interne Angelegenheiten"
            icon="fa-solid fa-folder-closed"
            color="amber"
            width="max-w-md"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-5">
                    <div className="bg-amber-900/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-200">
                        <i className="fa-solid fa-circle-info mr-2"></i>
                        For internal investigations, disciplinary actions, or incident reports.
                    </div>

                    <div>
                        <label className={labelClass}>Betreff RSI Handle<span className="text-red-400">*</span></label>
                        <div className="relative">
                            <input
                                type="text"
                                value={rsiHandle}
                                onChange={handleRsiChange}
                                onBlur={handleRsiBlur}
                                placeholder="e.g. SuspectHandle"
                                className={inputClass}
                                required
                                disabled={isLoading}
                            />
                            {linkedUser && (
                                <i className="fa-solid fa-link absolute right-3 top-3 text-green-400" title="Verlinkt"></i>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Betreffname/Alias<span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="Anzeigename"
                            className={`${inputClass} ${linkedUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                            required
                            disabled={isLoading || !!linkedUser}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Vorfallbericht</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={5}
                            className={`${inputClass} resize-none`}
                            placeholder="Details..."
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Create Case'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default AddCaseFileModal;
