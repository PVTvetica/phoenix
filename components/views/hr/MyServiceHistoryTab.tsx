
import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { ServiceRequestStatus } from '../../../types';
import EmptyState from '../../shared/ui/EmptyState';
import { useNavigation } from '../../../contexts/NavigationContext';

const getStatusChipClass = (status: ServiceRequestStatus) => {
    switch (status) {
        case ServiceRequestStatus.Success: return 'bg-green-500/10 text-green-400 border-green-500/30';
        case ServiceRequestStatus.Failed:
        case ServiceRequestStatus.Cancelled:
        case ServiceRequestStatus.Refused:
        case ServiceRequestStatus.Aborted:
        case ServiceRequestStatus.GameError:
            return 'bg-red-500/10 text-red-400 border-red-500/30';
        default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
};

const MyServiceHistoryTab: React.FC = () => {
    const { hydratedServiceRequests } = useData();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();
    const { viewRequestDetails } = useNavigation();

    const myReqs = hydratedServiceRequests.filter(req =>
        req.assignedMemberIds.includes(currentUser?.id || 0)
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-truck-medical text-emerald-300"></i>Responder-Protokoll</h2>
                    <p className="text-slate-400 text-sm mt-1">Service-Anfragen und Missionen, auf die du reagiert hast.</p>
                </div>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden">
                {myReqs.length > 0 ? (
                    <>
                        <table className="w-full text-left hidden md:table">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-5 py-3">ID anfordern</th>
                                    <th className="px-5 py-3">Typ</th>
                                    <th className="px-5 py-3">Letztes Update</th>
                                    <th className="px-5 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {myReqs.map(req => (
                                    <tr key={req.id} onClick={() => viewRequestDetails(req)} className="hover:bg-slate-800/40 transition-colors cursor-pointer">
                                        <td className="px-5 py-3 font-mono text-emerald-300 font-bold text-sm">{req.id}</td>
                                        <td className="px-5 py-3 text-sm text-white">{req.serviceType}</td>
                                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">{fmt(req.updatedAt)}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border ${getStatusChipClass(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="md:hidden divide-y divide-slate-800">
                            {myReqs.map(req => (
                                <div key={req.id} onClick={() => viewRequestDetails(req)} className="p-4 space-y-2 cursor-pointer active:bg-slate-800/40 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <span className="font-mono text-emerald-300 font-bold text-sm block">{req.id}</span>
                                            <span className="text-sm text-white font-bold">{req.serviceType}</span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border shrink-0 ${getStatusChipClass(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-mono text-right">{fmt(req.updatedAt)}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon="fa-truck-medical"
                        accent="emerald"
                        heading="Keine Diensthistorie"
                        description="Anfragen, auf die du reagierst, erscheinen hier."
                        compact
                    />
                )}
            </div>
        </div>
    );
};

export default MyServiceHistoryTab;
