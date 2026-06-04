


import React, { useState, useMemo } from 'react';
import { useHR } from '../../../contexts/HRContext';
import { useFormatDate } from '../../../contexts/AuthContext';

import { ApplicationStatus, formatReferralSource } from '../../../types';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const SecurityManagementTab: React.FC = () => {
    const { hrApplicants } = useHR();
    const fmt = useFormatDate();
    const { openSecurityVettingModal } = useModalRegistry();
    const [filter, setFilter] = useState<'Pending' | 'History'>('Pending');

    const securityApps = useMemo(() => {
        return hrApplicants.filter(a => 
            a.referralSource && (
                a.referralSource.includes('Security Clearance') || 
                a.referralSource.includes('Compartmented Access') ||
                a.referralSource === 'SECURITY_VETTING'
            )
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [hrApplicants]);

    const displayApps = useMemo(() => {
        if (filter === 'Pending') {
            return securityApps.filter(a => a.status !== ApplicationStatus.Hired && a.status !== ApplicationStatus.Rejected && a.status !== ApplicationStatus.Accepted);
        }
        return securityApps.filter(a => a.status === ApplicationStatus.Hired || a.status === ApplicationStatus.Rejected || a.status === ApplicationStatus.Accepted);
    }, [securityApps, filter]);

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
                <div>
                    <h2 className="text-2xl font-bold text-white">Sicherheitsüberprüfung</h2>
                    <p className="text-slate-400 text-sm">Anfragen zu Freigabe-Upgrades und Hintergrundüberprüfungen.</p>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={() => setFilter('Pending')} className={`px-4 py-2 rounded-sm text-xs font-bold uppercase transition-colors ${filter === 'Pending' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Aktive Anfragen</button>
                <button onClick={() => setFilter('History')} className={`px-4 py-2 rounded-sm text-xs font-bold uppercase transition-colors ${filter === 'History' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>Archivierter Verlauf</button>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-bold">Thema</th>
                            <th className="p-4 font-bold">Anfragetyp</th>
                            <th className="p-4 font-bold">Details</th>
                            <th className="p-4 font-bold">Datum der Einreichung</th>
                            <th className="p-4 font-bold text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {displayApps.map(app => (
                            <tr key={app.id} onClick={() => openSecurityVettingModal(app)} className="hover:bg-slate-700/20 transition-colors cursor-pointer group">
                                <td className="p-4">
                                    <p className="text-white font-bold group-hover:text-sky-400 transition-colors">{app.applicantName}</p>
                                    <p className="text-xs text-slate-500 font-mono">{app.rsiHandle}</p>
                                </td>
                                <td className="p-4 text-sm font-bold text-amber-400">
                                    {formatReferralSource(app.referralSource)}
                                </td>
                                <td className="p-4 text-sm text-slate-300 italic max-w-xs truncate">
                                    {app.notes}
                                </td>
                                <td className="p-4 text-sm text-slate-500 font-mono">{fmt(app.createdAt)}</td>
                                <td className="p-4 text-right">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                                        app.status === ApplicationStatus.Accepted || app.status === ApplicationStatus.Hired ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        app.status === ApplicationStatus.Rejected ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                        'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                    }`}>
                                        {app.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {displayApps.length === 0 && (
                            <tr><td colSpan={5} className="p-10 text-center text-slate-500 italic">Keine Überprüfungsanfragen gefunden.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-slate-900/30 p-4 rounded-sm border border-slate-700/50 text-xs text-slate-400 flex items-center gap-3">
                <i className="fa-solid fa-circle-info text-sky-500"></i>
                <p>Select a request to open the Security Vetting Console. Here you can schedule interviews, review the applicant's current clearance, and finalize the determination.</p>
            </div>
        </div>
    );
};

export default SecurityManagementTab;
