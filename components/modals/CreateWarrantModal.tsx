
import React, { useState, useCallback } from 'react';
import { WarrantAction, WarrantStatus } from '../../types';
import { useOperations } from '../../contexts/OperationsContext';

import WindowFrame from '../layout/WindowFrame';
import { useNotification } from '../../contexts/NotificationContext';

interface CreateWarrantModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CreateWarrantModal: React.FC<CreateWarrantModalProps> = ({ isOpen, onClose }) => {
    const { createWarrant } = useOperations();
    const { addToast } = useNotification();
    const [targetRsiHandle, setTargetRsiHandle] = useState('');
    const [reason, setReason] = useState('');
    const [action, setAction] = useState<WarrantAction>(WarrantAction.Caution);
    const [uecReward, setUecReward] = useState('');
    const [isStanding, setIsStanding] = useState(false);
    const [autoFileReport, setAutoFileReport] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const reward = parseInt(uecReward);
        if (targetRsiHandle.trim() && reason.trim() && !isNaN(reward) && reward > 0) {
            setIsLoading(true);
            try {
                await createWarrant({
                    targetRsiHandle: targetRsiHandle.trim(),
                    reason: reason.trim(),
                    action,
                    uecReward: reward,
                    status: isStanding ? WarrantStatus.Standing : WarrantStatus.Active,
                    autoFileReport
                });
                onClose();
            } catch (err) {
                console.error(err);
                addToast("Fehler", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Vorsichtshinweis konnte nicht hinterlegt werden. Bitte versuche es erneut." });
            } finally {
                setIsLoading(false);
            }
        }
    }, [createWarrant, targetRsiHandle, reason, action, uecReward, isStanding, autoFileReport, onClose, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="File Caution Note"
            subtitle="Vorsichts-Hinweiseintrag"
            icon="fa-solid fa-triangle-exclamation"
            color="red"
            width="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
                <div className="p-6 space-y-5 bg-red-950/5">
                    {/* Code-of-conduct compliance notice */}
                    <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <i className="fa-solid fa-circle-info text-amber-400 mt-0.5 shrink-0"></i>
                        <p className="text-[11px] leading-relaxed text-amber-100/90">
                            Caution notes are only for alerting service request responders to potential risks. Using this feature for kill-on-sight lists, targeted attacks, or griefing is against CIG's{' '}
                            <a
                                href="https://support.robertsspaceindustries.com/hc/en-us/articles/4409491235351-Rules-of-Conduct"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-amber-300 underline hover:text-amber-200"
                            >Verhaltensregeln</a>.
                        </p>
                    </div>
                    <div>
                        <label className={labelClass}>Ziel-RSI-Handle</label>
                        <input
                            type="text"
                            value={targetRsiHandle}
                            onChange={(e) => setTargetRsiHandle(e.target.value)}
                            placeholder="e.g., Pirate_Pete"
                            className={inputClass}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Aktion</label>
                            <select
                                value={action}
                                onChange={(e) => setAction(e.target.value as WarrantAction)}
                                className={inputClass}
                                disabled={isLoading}
                            >
                                {Object.values(WarrantAction).map(act => <option key={act} value={act}>{act}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>UEC Belohnung</label>
                            <input
                                type="number"
                                value={uecReward}
                                onChange={(e) => setUecReward(e.target.value)}
                                placeholder="e.g., 100000"
                                className={inputClass}
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Grund</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Detail the reason for caution..."
                            className={`${inputClass} resize-none`}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-3 pt-2 border-t border-red-900/20">
                        <label className="flex items-center space-x-3 text-slate-300 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={isStanding}
                                onChange={(e) => setIsStanding(e.target.checked)}
                                className="h-4 w-4 rounded-sm bg-slate-900 border-slate-700 text-red-500 focus:ring-red-500 transition-colors"
                                disabled={isLoading}
                            />
                            <span className="text-xs">Ständige Verwarnung (permanent)</span>
                        </label>
                        <label className="flex items-center space-x-3 text-slate-300 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={autoFileReport}
                                onChange={(e) => setAutoFileReport(e.target.checked)}
                                className="h-4 w-4 rounded-sm bg-slate-900 border-slate-700 text-red-500 focus:ring-red-500 transition-colors"
                                disabled={isLoading}
                            />
                            <span className="text-xs font-bold text-red-400">Intelligence-Bericht automatisch einreichen</span>
                        </label>
                    </div>
                </div>

                <div className="p-4 border-t border-red-900/20 bg-red-950/20 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/30 disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'File Caution Note'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};
export default CreateWarrantModal;
