
import React, { useState, useEffect } from 'react';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { ClearanceHistoryEntry } from '../../../types';
import { getClearanceColor } from '../../shared/ui';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const MyClearancesTab: React.FC = () => {
    const { currentUser } = useAuth();
    const fmt = useFormatDate();
    const { rpcAction } = useData();
    const { brandingConfig } = useConfig();
    const { openRequestClearanceModal } = useModalRegistry();
    const [history, setHistory] = useState<ClearanceHistoryEntry[]>([]);

    useEffect(() => {
        if (currentUser) {
            rpcAction('user:get_clearance_history', { userId: currentUser.id })
                .then((data) => setHistory(data))
                .catch(console.error);
        }
    }, [currentUser, rpcAction]);

    if (!currentUser) return null;

    const level = currentUser.clearanceLevel?.level || 0;
    const levelName = currentUser.clearanceLevel?.name || 'No Clearance';
    const description = currentUser.clearanceLevel?.description || 'You do not have a security clearance.';
    const markers = currentUser.limitingMarkers || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-user-shield text-emerald-300"></i>Meine Freigabe</h2>
                    <p className="text-slate-400 text-sm mt-1">Zugriffsebenen und Informationskontrollmarkierungen.</p>
                </div>
                <button
                    onClick={openRequestClearanceModal}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-arrow-up-right-dots"></i>Änderung anfordern</button>
            </div>

            {/* ID Card */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden relative shadow-lg">
                <div className={`h-2 ${getClearanceColor(level)}`}></div>

                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-1">Aktuelle Klassifizierung</p>
                            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">{levelName}</h1>
                        </div>
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center text-xl md:text-2xl font-black text-white shadow-lg border-2 border-slate-900 ${getClearanceColor(level)}`}>
                            {level}
                        </div>
                    </div>

                    <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-700/50 mb-6">
                        <p className="text-sm text-slate-300 leading-relaxed font-mono">{description}</p>
                    </div>

                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black mb-3">Begrenzungsmarkierungen</p>
                        {markers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {markers.map(m => (
                                    <div key={m.id} className="bg-amber-500/10 border border-amber-500/30 rounded-sm px-3 py-1.5 flex flex-col" title={m.description}>
                                        <span className="text-xs font-black text-amber-300 tracking-wider">{m.code}</span>
                                        <span className="text-[10px] text-amber-400/80">{m.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">Es wurden keine einschränkenden Markierungen angewendet.</p>
                        )}
                    </div>
                </div>

                <div className="bg-slate-950/60 p-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 font-mono uppercase gap-2 tracking-widest">
                    <span>AUTH: {currentUser.id}</span>
                    <span>{brandingConfig.name ? `${brandingConfig.name.toUpperCase()} SECURE DATABASE` : 'SECURE DATABASE'}</span>
                </div>
            </div>

            {/* History */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                        <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Clearance-Historie</h3>
                </div>
                <div className="p-5">
                    {history.length > 0 ? (
                        <div className="space-y-4">
                            {history.map(entry => (
                                <div key={entry.id} className="relative pl-4 border-l border-slate-700 pb-4 last:pb-0">
                                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></div>
                                    <div className="text-[10px] text-slate-500 font-mono mb-1 uppercase tracking-widest">{fmt(entry.createdAt)}</div>
                                    <div className="text-sm text-white font-bold mb-1">
                                        {entry.oldLevelId === entry.newLevelId ? 'Update' : (
                                            <>
                                                {entry.oldLevelName || 'None'} <i className="fa-solid fa-arrow-right text-xs text-slate-500 mx-1"></i> <span className="text-emerald-300">{entry.newLevelName}</span>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 leading-snug">{entry.changesDescription}</p>
                                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">Auth: {entry.adminName}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic text-center py-6">Keine Verlaufsdatensätze gefunden.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyClearancesTab;
