

import React, { useState, useEffect } from 'react';
import { HydratedHRApplication, ApplicationStatus } from '../../../types';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import { useFormatDate } from '../../../contexts/AuthContext';

interface CaseDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    caseFile: HydratedHRApplication;
}

const getStatusColor = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.Hired || status === ApplicationStatus.Accepted) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (status === ApplicationStatus.Rejected) return 'text-red-400 bg-red-500/10 border-red-500/30';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
}

const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({ isOpen, onClose, caseFile }) => {
    const { rpcAction } = useData();
    const fmt = useFormatDate();
    const [localLogs, setLocalLogs] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && caseFile.id) {
            const fetchLogs = async () => {
                try {
                    const logs = await rpcAction('hr:get_application_logs', { applicationId: caseFile.id });
                    setLocalLogs(logs || []);
                } catch (e) {
                    console.error("Failed to fetch logs", e);
                }
            };
            fetchLogs();
        }
    }, [isOpen, caseFile.id, rpcAction]);

    const notesList = localLogs.filter(l => l.actionType === 'NOTE');

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Internal Investigation"
            subtitle={`CASE: ${caseFile.id.split('-')[0]}`}
            icon="fa-solid fa-folder-closed"
            color="amber"
            width="max-w-2xl"
        >
            <div className="flex flex-col h-full">
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Thema</p>
                            <p className="text-white font-bold text-lg">{caseFile.applicantName}</p>
                            <p className="text-xs text-slate-500 font-mono">{caseFile.rsiHandle}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Status</p>
                            <span className={`px-2 py-1 rounded-sm border text-xs font-black uppercase tracking-wider ${getStatusColor(caseFile.status)}`}>
                                {caseFile.status}
                            </span>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-sm border border-slate-800">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Erster Bericht</p>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{caseFile.notes}</p>
                    </div>

                    {notesList.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Ermittlungsnotizen</p>
                            <div className="space-y-3">
                                {notesList.map(note => (
                                    <div key={note.id} className="bg-slate-800/30 p-3 rounded-sm border border-slate-700/30 text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-slate-300 text-xs">{note.user?.name || 'Officer'}</span>
                                            <span className="font-mono text-[10px] text-slate-500">{fmt(note.createdAt)}</span>
                                        </div>
                                        <p className="text-slate-400 leading-snug">{note.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Geöffnet</p>
                            <p className="text-sm text-slate-300 font-mono">{fmt(caseFile.createdAt)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Zugewiesener Offizier</p>
                            <p className="text-sm text-slate-300">{caseFile.assignedRecruiter?.name || 'Unassigned'}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end rounded-b-xl">
                    <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-amber-600 hover:bg-amber-500 border border-amber-500/40 rounded-lg shadow-lg shadow-amber-900/30 transition">
                        <i className="fa-solid fa-xmark"></i>Datei schließen</button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default CaseDetailsModal;