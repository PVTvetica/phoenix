
import React, { useMemo } from 'react';
import { useHR } from '../../../contexts/HRContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { TransferRequestStatus } from '../../../types';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const getStatusChip = (status: TransferRequestStatus) => {
    if (status === TransferRequestStatus.Approved) return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (status === TransferRequestStatus.Denied) return 'bg-red-500/10 text-red-400 border-red-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
};

const MyTransfersTab: React.FC = () => {
    const { hrTransfers } = useHR();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();
    const { openTransferModal } = useModalRegistry();

    const myTransfers = useMemo(() => {
        return hrTransfers.filter(t => t.userId === currentUser?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [hrTransfers, currentUser]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-map-location-dot text-emerald-300"></i>Mein Beitrag</h2>
                    <p className="text-slate-400 text-sm mt-1">Verlauf der Einheitenzuweisungen und Übertragungsanfragen.</p>
                </div>
                <button
                    onClick={openTransferModal}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-right-left"></i>Transfer anfordern</button>
            </div>

            {/* Current Assignment */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Aktueller Auftrag</p>
                    <p className="text-xl font-black text-white">{currentUser?.unit?.name || 'Unassigned'}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-300">
                    <i className="fa-solid fa-map-pin text-lg"></i>
                </div>
            </div>

            {/* History */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                        <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Übertragungsverlauf</h3>
                </div>

                {myTransfers.length > 0 ? (
                    <>
                        <table className="w-full text-left hidden md:table">
                            <thead>
                                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-5 py-3">Zieleinheit</th>
                                    <th className="px-5 py-3">Datum</th>
                                    <th className="px-5 py-3">Grund</th>
                                    <th className="px-5 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {myTransfers.map(tr => (
                                    <tr key={tr.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-3 text-white font-bold">{(tr as any).targetUnit?.name || 'Unknown Unit'}</td>
                                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">{fmt(tr.createdAt)}</td>
                                        <td className="px-5 py-3 text-sm text-slate-300 italic max-w-xs truncate">{tr.reason}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`px-2.5 py-0.5 rounded-sm border text-[10px] font-black uppercase tracking-wider ${getStatusChip(tr.status as TransferRequestStatus)}`}>
                                                {tr.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="md:hidden divide-y divide-slate-800">
                            {myTransfers.map(tr => (
                                <div key={tr.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Zieleinheit</p>
                                            <p className="text-white font-bold">{(tr as any).targetUnit?.name || 'Unknown Unit'}</p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-sm border text-[10px] font-black uppercase tracking-wider ${getStatusChip(tr.status as TransferRequestStatus)}`}>
                                            {tr.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Grund</p>
                                        <p className="text-sm text-slate-300 italic bg-slate-950/40 p-2 rounded-lg border border-slate-700/50">{tr.reason}</p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono">{fmt(tr.createdAt)}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="p-10 text-center">
                        <i className="fa-solid fa-inbox text-3xl text-emerald-400 opacity-40 mb-3"></i>
                        <p className="text-sm text-slate-500 italic">Noch keine Transferhistorie.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyTransfersTab;
