
import React, { useMemo } from 'react';
import { useHR } from '../../../contexts/HRContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { ApplicationStatus, formatReferralSource } from '../../../types';
import EmptyState from '../../shared/ui/EmptyState';

const getStatusChip = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.Hired || status === ApplicationStatus.Accepted) return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (status === ApplicationStatus.Rejected || status === ApplicationStatus.Withdrawn) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (status === ApplicationStatus.Interviewing) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (status === ApplicationStatus.OnHold) return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    if (status === ApplicationStatus.Offered) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (status === ApplicationStatus.Screening) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
};

const getDisplayName = formatReferralSource;

const MyApplicationsTab: React.FC = () => {
    const { hrApplicants, hrInterviews } = useHR();
    const { currentUser } = useAuth();
    const fmt = useFormatDate();

    const myApplications = useMemo(() => {
        if (!currentUser) return [];
        return hrApplicants
            .filter(app => app.linkedUserId === currentUser.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [hrApplicants, currentUser]);

    const myInterviews = useMemo(() => {
        const myAppIds = new Set(myApplications.map(a => a.id));
        return hrInterviews
            .filter(int => myAppIds.has(int.applicationId))
            .map(int => ({
                ...int,
                context: getDisplayName(myApplications.find(a => a.id === int.applicationId)?.referralSource)
            }))
            .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
    }, [myApplications, hrInterviews]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-file-signature text-emerald-300"></i>Meine Bewerbungen</h2>
                    <p className="text-slate-400 text-sm mt-1">Status of your open case files, vetting requests, and job applications.</p>
                </div>
            </div>

            <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-sky-300 mt-0.5"></i>
                <div>
                    <p className="text-sm text-sky-200 font-bold mb-1">Nur Statusverfolgung</p>
                    <p className="text-xs text-sky-200/70 leading-relaxed">
                        This view is read-only. You cannot edit applications once submitted.
                        If you need to provide additional information, please contact your assigned Case Officer via Discord.
                    </p>
                </div>
            </div>

            {/* Applications List */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                        <i className="fa-solid fa-folder-open text-sm"></i>
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Aktive Dateien</h3>
                </div>

                {myApplications.length > 0 ? (
                    <>
                        <table className="w-full text-left hidden md:table">
                            <thead>
                                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-5 py-3">Datei / Kontext</th>
                                    <th className="px-5 py-3">Datum der Eröffnung</th>
                                    <th className="px-5 py-3">Zugewiesener Offizier</th>
                                    <th className="px-5 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {myApplications.map(app => (
                                    <tr key={app.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="text-white font-bold text-sm">{getDisplayName(app.referralSource)}</p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">REF: {app.id.substring(0, 8).toUpperCase()}</p>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-slate-400 font-mono">{fmt(app.createdAt)}</td>
                                        <td className="px-5 py-3 text-sm text-slate-300">
                                            {app.assignedRecruiter ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={app.assignedRecruiter.avatarUrl} className="h-5 w-5 rounded-full border border-slate-700 object-cover shrink-0" alt="" />
                                                    <span>{app.assignedRecruiter.name}</span>
                                                </div>
                                            ) : <span className="italic text-slate-500">Ausstehende Zuweisung</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border ${getStatusChip(app.status as ApplicationStatus)}`}>
                                                {app.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="md:hidden divide-y divide-slate-800">
                            {myApplications.map(app => (
                                <div key={app.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-sm truncate">{getDisplayName(app.referralSource)}</p>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest">REF: {app.id.substring(0, 8).toUpperCase()}</p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border shrink-0 ${getStatusChip(app.status as ApplicationStatus)}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs gap-3">
                                        <div className="text-slate-400 min-w-0">
                                            {app.assignedRecruiter ? (
                                                <div className="flex items-center gap-2">
                                                    <img src={app.assignedRecruiter.avatarUrl} className="h-4 w-4 rounded-full border border-slate-700 object-cover shrink-0" alt="" />
                                                    <span className="truncate">{app.assignedRecruiter.name}</span>
                                                </div>
                                            ) : <span className="italic text-slate-500">Ausstehend</span>}
                                        </div>
                                        <span className="text-slate-500 font-mono text-[10px] shrink-0">{fmt(app.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon="fa-folder-open"
                        accent="emerald"
                        heading="Noch keine Bewerbungen"
                        description="Deine Akten erscheinen hier, sobald du dich bewirbst oder die Überprüfung startet."
                        compact
                    />
                )}
            </div>

            {/* Interviews List */}
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                        <i className="fa-solid fa-calendar-check text-sm"></i>
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">Meine Interviews</h3>
                </div>

                {myInterviews.length > 0 ? (
                    <>
                        <table className="w-full text-left hidden md:table">
                            <thead>
                                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-5 py-3">Verwandte Anwendung</th>
                                    <th className="px-5 py-3">Geplante Zeit</th>
                                    <th className="px-5 py-3">Interviewer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {myInterviews.map(int => (
                                    <tr key={int.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="text-white font-bold text-sm">{int.context}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">{int.template.name}</p>
                                        </td>
                                        <td className="px-5 py-3 text-xs text-emerald-300 font-mono font-bold">
                                            {fmt(int.scheduledAt)}
                                        </td>
                                        <td className="px-5 py-3 text-sm text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <img src={int.interviewer.avatarUrl} className="h-5 w-5 rounded-full border border-slate-700 object-cover shrink-0" alt="" />
                                                <span>{int.interviewer.name}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="md:hidden divide-y divide-slate-800">
                            {myInterviews.map(int => (
                                <div key={int.id} className="p-4 space-y-2">
                                    <div>
                                        <p className="text-white font-bold text-sm">{int.context}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">{int.template.name}</p>
                                    </div>
                                    <div className="flex justify-between items-center gap-3">
                                        <p className="text-xs text-emerald-300 font-mono font-bold">{fmt(int.scheduledAt)}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
                                            <img src={int.interviewer.avatarUrl} className="h-4 w-4 rounded-full border border-slate-700 object-cover shrink-0" alt="" />
                                            <span className="truncate">{int.interviewer.name}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon="fa-calendar-xmark"
                        accent="emerald"
                        heading="Keine Interviews geplant"
                        description="Interview-Einladungen erscheinen hier, sobald ein Recruiter dich einplant."
                        compact
                    />
                )}
            </div>
        </div>
    );
};

export default MyApplicationsTab;
