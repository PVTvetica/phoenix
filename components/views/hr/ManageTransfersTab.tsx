
import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useHR } from '../../../contexts/HRContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';

import { TransferRequestStatus } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

const ManageTransfersTab: React.FC = () => {
    const { rpcAction, refreshHR } = useData();
    const { hrTransfers } = useHR();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();
    const { addToast } = useNotification();
    const [processingState, setProcessingState] = useState<Record<string, 'approve' | 'deny'>>({});

    const sortedTransfers = useMemo(() => {
        return [...hrTransfers].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [hrTransfers]);

    const pending = sortedTransfers.filter(t => t.status === TransferRequestStatus.Pending);
    const history = sortedTransfers.filter(t => t.status !== TransferRequestStatus.Pending);

    const processTransfer = async (id: string, status: TransferRequestStatus, notes: string) => {
        const action = status === TransferRequestStatus.Approved ? 'approve' : 'deny';
        setProcessingState(prev => ({ ...prev, [id]: action }));

        try {
            await rpcAction('hr:process_transfer', { id, status, notes });
            await refreshHR();
        } catch (error) {
            console.error("Transfer processing failed:", error);
            addToast("Übertragung fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Versetzungsanfrage konnte nicht verarbeitet werden." });
        } finally {
            setProcessingState(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    }

    return (
         <div className="space-y-8 animate-fade-in">
             <div className="space-y-4">
                 <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Ausstehende Anfragen</h2>
                        <p className="text-slate-400 text-sm">Für Einheitenübertragungsanträge sind Maßnahmen erforderlich.</p>
                    </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold">Mitglied</th>
                                <th className="p-4 font-bold">Aktuelle Einheit</th>
                                <th className="p-4 font-bold">Angeforderte Einheit</th>
                                <th className="p-4 font-bold">Grund</th>
                                <th className="p-4 font-bold text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {pending.map(tr => {
                                const isProcessing = !!processingState[tr.id];
                                const currentAction = processingState[tr.id];

                                return (
                                <tr key={tr.id} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="p-4 font-bold text-white">{(tr as any).user.name}</td>
                                    <td className="p-4 text-sm text-slate-400">{(tr as any).user?.unit?.name || 'Unassigned'}</td>
                                    <td className="p-4 text-sm text-sky-400 font-bold">{(tr as any).targetUnit.name}</td>
                                    <td className="p-4 text-sm text-slate-300 italic max-w-xs truncate">{tr.reason}</td>
                                    <td className="p-4 text-right">
                                         <div className="flex justify-end space-x-2">
                                            <button 
                                                onClick={() => processTransfer(tr.id, TransferRequestStatus.Approved, `Approved by ${currentUser?.name}`)}
                                                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-sm shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed w-8 h-8 flex items-center justify-center transition-all" 
                                                title="Genehmigen"
                                                disabled={isProcessing}
                                            >
                                                {currentAction === 'approve' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                                            </button>
                                            <button 
                                                onClick={() => processTransfer(tr.id, TransferRequestStatus.Denied, `Denied by ${currentUser?.name}`)}
                                                className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-sm shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed w-8 h-8 flex items-center justify-center transition-all" 
                                                title="Leugnen"
                                                disabled={isProcessing}
                                            >
                                                {currentAction === 'deny' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-xmark"></i>}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                             {pending.length === 0 && (
                                <tr><td colSpan={5} className="p-10 text-center text-slate-500 italic">Keine ausstehenden Übertragungsanfragen.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-4">
                 <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                    <div>
                        <h2 className="text-xl font-bold text-white text-opacity-80">Übertragungsverlauf</h2>
                        <p className="text-slate-500 text-sm">Zuvor genehmigte oder abgelehnte Anfragen.</p>
                    </div>
                </div>
                <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold">Mitglied</th>
                                <th className="p-4 font-bold">Zieleinheit</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Notizen / Genehmiger</th>
                                <th className="p-4 font-bold text-right">Entscheidungsdatum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {history.map(tr => (
                                <tr key={tr.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 text-sm text-slate-300 font-bold">{(tr as any).user.name}</td>
                                    <td className="p-4 text-sm text-slate-400">{(tr as any).targetUnit.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                            tr.status === TransferRequestStatus.Approved ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            tr.status === TransferRequestStatus.Denied ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            'bg-slate-500/10 text-slate-400'
                                        }`}>
                                            {tr.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-slate-500 italic max-w-xs truncate">{tr.adminNotes || '-'}</td>
                                    <td className="p-4 text-right text-xs text-slate-600 font-mono">{fmt(tr.updatedAt || tr.createdAt)}</td>
                                </tr>
                            ))}
                             {history.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-600 italic">Keine Übertragungshistorie gefunden.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageTransfersTab;
