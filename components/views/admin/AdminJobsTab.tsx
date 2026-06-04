
import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useHR } from '../../../contexts/HRContext';
import { JobPostingStatus } from '../../../types';
import EmptyState from '../../shared/ui/EmptyState';
import { useNotification } from '../../../contexts/NotificationContext';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const getStatusChip = (status: JobPostingStatus) => {
    if (status === JobPostingStatus.Open) return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (status === JobPostingStatus.Draft) return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    if (status === JobPostingStatus.Closed) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (status === JobPostingStatus.Filled) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
};

const AdminJobsTab: React.FC = () => {
    const { rpcAction } = useData();
    const { hrJobs, setHrJobs } = useHR();
    const { confirm } = useNotification();
    const { openCreateJobModal } = useModalRegistry();
    const [isSaving, setIsSaving] = useState(false);

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Job Posting',
            message: 'Are you sure you want to delete this job posting?',
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        setIsSaving(true);
        try {
            await rpcAction('hr:delete_job', { id });
            setHrJobs(prev => prev.filter(j => j.id !== id));
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: JobPostingStatus) => {
        setIsSaving(true);
        try {
            await rpcAction('hr:update_job_status', { id, status });
            setHrJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-pen-to-square text-emerald-300"></i>Stellenangebote verwalten</h2>
                    <p className="text-sm text-slate-400 mt-1">Rekrutierung & Leerstandskontrolle.</p>
                </div>
                <button
                    onClick={() => openCreateJobModal()}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-plus"></i>Stellenangebot erstellen</button>
            </div>

            {hrJobs.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    {hrJobs.map(job => (
                        <div key={job.id} className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 pl-6 flex flex-col md:flex-row justify-between gap-4 group hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/20 transition-all">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${job.status === JobPostingStatus.Open ? 'bg-green-500' : job.status === JobPostingStatus.Draft ? 'bg-slate-500' : job.status === JobPostingStatus.Closed ? 'bg-red-500' : 'bg-sky-500'}`}></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-sm">{job.department}</span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${getStatusChip(job.status as JobPostingStatus)}`}>{job.status}</span>
                                </div>
                                <h3 className="text-base font-black text-white group-hover:text-emerald-200 transition-colors truncate uppercase tracking-tight">{job.title}</h3>
                                <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{job.description}</p>
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-center w-full md:w-auto shrink-0">
                                <select
                                    value={job.status}
                                    onChange={(e) => handleStatusUpdate(job.id, e.target.value as JobPostingStatus)}
                                    className="flex-1 md:flex-none bg-slate-900/60 border border-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-lg px-3 py-2 outline-hidden focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-all"
                                    disabled={isSaving}
                                >
                                    {Object.values(JobPostingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button onClick={() => openCreateJobModal(job)} className="p-2 text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors" disabled={isSaving} title="Bearbeiten"><i className="fa-solid fa-pencil"></i></button>
                                <button onClick={() => handleDelete(job.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" disabled={isSaving} title="Löschen"><i className="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-pen-to-square"
                        accent="emerald"
                        heading="Noch keine Vakanzen"
                        description="Erstelle eine Stellenausschreibung, um den Rekrutierungszyklus zu starten."
                    />
                </div>
            )}
        </div>
    );
};

export default AdminJobsTab;
