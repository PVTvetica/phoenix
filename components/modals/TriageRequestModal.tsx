
import React, { useState, useMemo } from 'react';
import { HydratedServiceRequest, UrgencyLevel } from '../../types';
import { useRequests } from '../../contexts/RequestsContext';
import { useMembers } from '../../contexts/MembersContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface TriageRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: HydratedServiceRequest;
}

const TriageRequestModal: React.FC<TriageRequestModalProps> = ({ isOpen, onClose, request }) => {
    const { triageRequest, adminAcceptAndAssignRequest, refuseRequest } = useRequests();
    const { members } = useMembers();
    const { addToast } = useNotification();
    const [notes, setNotes] = useState('');
    const [leadResponderId, setLeadResponderId] = useState('');
    const [urgency, setUrgency] = useState<UrgencyLevel>(request.urgency);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const onDutyMembers = useMemo(() => members.filter(m => m.isDuty), [members]);

    const handleTriage = async () => {
        setLoadingAction('triage');
        try {
            await triageRequest(request.id, notes, urgency);
            onClose();
        } catch (err) {
            console.error(err);
            addToast("Triage fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Bei der Triage ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleAcceptAndAssign = async () => {
        if (!leadResponderId) return;
        setLoadingAction('accept');
        try {
            await adminAcceptAndAssignRequest(request.id, parseInt(leadResponderId), notes, urgency);
            onClose();
        } catch (err) {
            console.error(err);
            addToast("Zuweisung fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Zuweisen des Lead-Responders ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleRefuse = async () => {
        if (!notes.trim()) return;
        setLoadingAction('refuse');
        try {
            await refuseRequest(request.id, notes);
            onClose();
        } catch (err) {
            console.error(err);
            addToast("Ablehnung fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Beim Ablehnen der Anfrage ist ein Fehler aufgetreten. Bitte versuche es erneut." });
        } finally {
            setLoadingAction(null);
        }
    };

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Triage-Konsole"
            subtitle={`Review Request #${request.id.split('-')[1]}`}
            icon="fa-solid fa-filter"
            color="amber"
            width="max-w-lg"
        >
            <div className="flex flex-col h-full">
                <div className="p-6 space-y-5">
                    <div>
                        <label className={labelClass}>Dringlichkeitsstufe</label>
                        <select
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                            className={inputClass}
                            disabled={!!loadingAction}
                        >
                            {Object.values(UrgencyLevel).map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Sofortige Zuweisung (optional)</label>
                        <select
                            value={leadResponderId}
                            onChange={(e) => setLeadResponderId(e.target.value)}
                            className={inputClass}
                            disabled={!!loadingAction}
                        >
                            <option value="">- Triage for General Pickup -</option>
                            {onDutyMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Notizen des Disponenten/Ablehnungsgrund</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            placeholder="Required for refusal. Optional for acceptance."
                            className={`${inputClass} resize-none`}
                            disabled={!!loadingAction}
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex justify-between items-center rounded-b-xl">
                    <button
                        onClick={handleRefuse}
                        disabled={!notes.trim() || !!loadingAction}
                        className="px-4 py-2 text-xs font-bold uppercase text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingAction === 'refuse' ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Refuse'}
                    </button>

                    <div className="flex gap-2">
                        {!leadResponderId ? (
                            <button
                                onClick={handleTriage}
                                disabled={!!loadingAction}
                                className="px-6 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/50 hover:bg-amber-500/20 rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {loadingAction === 'triage' ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Triage to Board'}
                            </button>
                        ) : (
                            <button
                                onClick={handleAcceptAndAssign}
                                disabled={!!loadingAction}
                                className="px-6 py-2 bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20 rounded-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                            >
                                {loadingAction === 'accept' ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Assign Lead'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </WindowFrame>
    );
};

export default TriageRequestModal;
