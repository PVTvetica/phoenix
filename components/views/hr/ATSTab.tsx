import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useHR } from '../../../contexts/HRContext';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { ApplicationStatus, HydratedHRApplication, formatReferralSource } from '../../../types';
import EmptyState from '../../shared/ui/EmptyState';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const getDisplayStatus = (app: HydratedHRApplication) => {
    const isSecurity = app.referralSource === 'SECURITY_VETTING' ||
        (app.referralSource && app.referralSource.toLowerCase().includes('security clearance'));
    const isInternal = app.referralSource === 'INTERNAL_CASE' ||
        (app.referralSource && app.referralSource.toLowerCase().includes('internal investigation'));
    const isTransfer = app.referralSource === 'INTERNAL_TRANSFER';
    const isJob = app.referralSource === 'INTERNAL_JOB' || (app.referralSource && app.referralSource.includes('Internal Application:'));

    if (isSecurity) {
        if (app.status === ApplicationStatus.Hired) return 'GRANTED';
        if (app.status === ApplicationStatus.Rejected) return 'DENIED';
        if (app.status === ApplicationStatus.Accepted) return 'APPROVED';
        if (app.status === ApplicationStatus.Offered) return 'PENDING SIGN-OFF';
        if (app.status === ApplicationStatus.Applied) return 'REQUESTED';
    } else if (isInternal) {
        if (app.status === ApplicationStatus.Hired) return 'RESOLVED';
        if (app.status === ApplicationStatus.Rejected) return 'DISMISSED';
        if (app.status === ApplicationStatus.Offered) return 'FINDING ISSUED';
        if (app.status === ApplicationStatus.Applied) return 'OPEN';
    } else if (isTransfer) {
        if (app.status === ApplicationStatus.Hired) return 'TRANSFERRED';
        if (app.status === ApplicationStatus.Rejected) return 'DENIED';
        if (app.status === ApplicationStatus.Applied) return 'PENDING';
    } else if (isJob) {
        if (app.status === ApplicationStatus.Hired) return 'PROMOTED';
    }
    return app.status;
};

const getStatusChip = (status: ApplicationStatus) => {
    if (status === ApplicationStatus.Hired || status === ApplicationStatus.Accepted) return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (status === ApplicationStatus.Rejected || status === ApplicationStatus.Withdrawn) return 'bg-red-500/10 text-red-400 border-red-500/30';
    if (status === ApplicationStatus.Interviewing) return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (status === ApplicationStatus.OnHold) return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    if (status === ApplicationStatus.Offered) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (status === ApplicationStatus.Screening) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
};

const ATSTab: React.FC = () => {
    const { refreshHR, isFetching } = useData();
    const { hrApplicants } = useHR();
    const { hasPermission } = useAuth();
    const fmt = useFormatDate();
    const { setSelectedCaseFile, setActiveView } = useNavigation();
    const { openAddProspectModal, openAddCaseFileModal } = useModalRegistry();

    const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'All'>('All');
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Recruitment' | 'Vetting' | 'Internal' | 'Transfer' | 'Jobs'>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const canAccess = hasPermission('hr:recruiter') || hasPermission('hr:admin') || hasPermission('hr:manager');

    useEffect(() => {
        if (canAccess) {
            refreshHR();
        }
    }, [refreshHR, canAccess]);

    const filteredApplicants = useMemo(() => {
        let result = hrApplicants || [];

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(a =>
                (a.applicantName || '').toLowerCase().includes(lowerTerm) ||
                (a.rsiHandle || '').toLowerCase().includes(lowerTerm) ||
                (a.notes || '').toLowerCase().includes(lowerTerm) ||
                (a.referralSource || '').toLowerCase().includes(lowerTerm)
            );
        }

        if (categoryFilter !== 'All') {
            if (categoryFilter === 'Recruitment') {
                result = result.filter(a => !['SECURITY_VETTING', 'INTERNAL_CASE', 'INTERNAL_TRANSFER', 'INTERNAL_JOB'].includes(a.referralSource || '') && !a.referralSource?.includes('Internal Application:'));
            } else if (categoryFilter === 'Vetting') {
                result = result.filter(a => a.referralSource === 'SECURITY_VETTING');
            } else if (categoryFilter === 'Internal') {
                result = result.filter(a => a.referralSource === 'INTERNAL_CASE');
            } else if (categoryFilter === 'Transfer') {
                result = result.filter(a => a.referralSource === 'INTERNAL_TRANSFER');
            } else if (categoryFilter === 'Jobs') {
                result = result.filter(a => a.referralSource === 'INTERNAL_JOB' || (a.referralSource && a.referralSource.includes('Internal Application:')));
            }
        }

        if (statusFilter !== 'All') {
            result = result.filter(a => a.status === statusFilter);
        }

        return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }, [hrApplicants, statusFilter, categoryFilter, searchTerm]);

    const handleViewApplication = (applicant: HydratedHRApplication) => {
        setSelectedCaseFile(applicant);
        setActiveView('case-file-detail');
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshHR();
        setIsRefreshing(false);
    };

    if (!canAccess) {
        return (
            <div className="flex items-center justify-center py-20 animate-fade-in">
                <div className="rounded-xl border border-dashed border-red-500/30 bg-red-950/20 max-w-md w-full">
                    <EmptyState
                        icon="fa-lock"
                        accent="red"
                        heading="Zugriff verweigert"
                        description="Du hast nicht die nötigen Berechtigungen (Recruiter oder Admin) für das Case Management System."
                    />
                </div>
            </div>
        );
    }

    const categoryTabs: Array<{ key: 'All' | 'Recruitment' | 'Vetting' | 'Internal' | 'Transfer' | 'Jobs'; label: string; icon: string }> = [
        { key: 'All', label: 'Alle', icon: 'fa-list-ul' },
        { key: 'Recruitment', label: 'Recruitment', icon: 'fa-user-plus' },
        { key: 'Vetting', label: 'Vetting', icon: 'fa-shield-halved' },
        { key: 'Internal', label: 'Intern', icon: 'fa-folder-closed' },
        { key: 'Transfer', label: 'Überweisen', icon: 'fa-right-left' },
        { key: 'Jobs', label: 'Jobs', icon: 'fa-briefcase' },
    ];

    return (
        <div className="space-y-4 md:space-y-6 animate-fade-in flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                <div className="flex-1">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-folder-tree text-emerald-300"></i>Fallmanagement</h2>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                        Centralized pipeline for recruitment, vetting, transfers, and internal affairs.
                        {isFetching['hr'] && (
                            <span className="text-emerald-300 animate-pulse text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                <i className="fa-solid fa-arrows-rotate fa-spin"></i>Synchronisierung</span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs" />
                        <input
                            type="search"
                            placeholder="Search cases..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-slate-500 font-mono text-sm focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 outline-hidden transition-all"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}
                        title="Aktualisieren"
                    >
                        <i className={`fa-solid fa-rotate ${isRefreshing ? 'animate-spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* Category tabs */}
            <div className="relative flex gap-0 -mb-px overflow-x-auto custom-scrollbar border-b border-white/5 shrink-0">
                {categoryTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setCategoryFilter(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${categoryFilter === tab.key
                            ? 'text-emerald-300 border-emerald-400'
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                            }`}
                    >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sub-filters + actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'All')}
                    className="bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 font-black uppercase tracking-wider outline-hidden focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-all"
                >
                    <option value="All">Alle Status</option>
                    {Object.values(ApplicationStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <div className="flex gap-2">
                    <button
                        onClick={openAddCaseFileModal}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors shadow-lg shadow-amber-900/20"
                    >
                        <i className="fa-solid fa-file-circle-plus"></i> <span className="hidden sm:inline">Neuer Fall</span>
                    </button>
                    <button
                        onClick={openAddProspectModal}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                    >
                        <i className="fa-solid fa-user-plus"></i> <span className="hidden sm:inline">Neuer Bewerber</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700/50 overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredApplicants.length > 0 ? (
                        <>
                            <table className="w-full text-left hidden md:table">
                                <thead className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xs border-b border-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <tr>
                                        <th className="px-5 py-3 w-16 text-center">Typ</th>
                                        <th className="px-5 py-3">Betreff / Handle</th>
                                        <th className="px-5 py-3 max-w-[150px]">Kontext</th>
                                        <th className="px-5 py-3">Sachbearbeiter</th>
                                        <th className="px-5 py-3">Geöffnet</th>
                                        <th className="px-5 py-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {filteredApplicants.map(app => {
                                        const isVetting = app.referralSource === 'SECURITY_VETTING';
                                        const isInternal = app.referralSource === 'INTERNAL_CASE';
                                        const isTransfer = app.referralSource === 'INTERNAL_TRANSFER';
                                        const isJob = app.referralSource === 'INTERNAL_JOB' || (app.referralSource && app.referralSource.includes('Internal Application:'));

                                        let icon = <i className="fa-solid fa-user-plus text-emerald-300"></i>;
                                        if (isVetting) icon = <i className="fa-solid fa-shield-halved text-purple-300"></i>;
                                        if (isInternal) icon = <i className="fa-solid fa-folder-closed text-amber-300"></i>;
                                        if (isTransfer) icon = <i className="fa-solid fa-right-left text-orange-300"></i>;
                                        if (isJob) icon = <i className="fa-solid fa-briefcase text-sky-300"></i>;

                                        return (
                                            <tr key={app.id} onClick={() => handleViewApplication(app)} className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                                                <td className="px-5 py-3 text-center">{icon}</td>
                                                <td className="px-5 py-3">
                                                    <p className="text-white font-bold group-hover:text-emerald-200 transition-colors text-sm">{app.applicantName}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono uppercase tracking-widest">{app.rsiHandle}</p>
                                                </td>
                                                <td className="px-5 py-3 max-w-[150px]">
                                                    <div className="truncate text-xs text-slate-300" title={formatReferralSource(app.referralSource)}>
                                                        {formatReferralSource(app.referralSource)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-400">
                                                    {app.assignedRecruiter ? (
                                                        <div className="flex items-center gap-2">
                                                            <img src={app.assignedRecruiter.avatarUrl} className="h-5 w-5 rounded-full border border-slate-700 object-cover shrink-0" />
                                                            <span className="text-xs font-semibold">{app.assignedRecruiter.name}</span>
                                                        </div>
                                                    ) : <span className="italic text-slate-500 text-xs">Nicht zugewiesen</span>}
                                                </td>
                                                <td className="px-5 py-3 text-[10px] text-slate-500 font-mono">{fmt(app.createdAt)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border ${getStatusChip(app.status as ApplicationStatus)}`}>
                                                        {getDisplayStatus(app)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <div className="md:hidden divide-y divide-slate-800">
                                {filteredApplicants.map(app => {
                                    const isVetting = app.referralSource === 'SECURITY_VETTING';
                                    const isInternal = app.referralSource === 'INTERNAL_CASE';
                                    const isTransfer = app.referralSource === 'INTERNAL_TRANSFER';
                                    const isJob = app.referralSource === 'INTERNAL_JOB' || (app.referralSource && app.referralSource.includes('Internal Application:'));

                                    let icon = <i className="fa-solid fa-user-plus text-emerald-300"></i>;
                                    if (isVetting) icon = <i className="fa-solid fa-shield-halved text-purple-300"></i>;
                                    if (isInternal) icon = <i className="fa-solid fa-folder-closed text-amber-300"></i>;
                                    if (isTransfer) icon = <i className="fa-solid fa-right-left text-orange-300"></i>;
                                    if (isJob) icon = <i className="fa-solid fa-briefcase text-sky-300"></i>;

                                    return (
                                        <div key={app.id} onClick={() => handleViewApplication(app)} className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer active:bg-slate-800/60">
                                            <div className="flex justify-between items-start mb-2 gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                                        {icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{app.applicantName}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{app.rsiHandle}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-wider border shrink-0 ${getStatusChip(app.status as ApplicationStatus)}`}>
                                                    {getDisplayStatus(app)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 pl-11 uppercase tracking-widest">
                                                <span>{isVetting ? 'Security' : isInternal ? 'Internal' : isTransfer ? 'Transfer' : isJob ? 'Job App' : 'Recruit'}</span>
                                                <span className="font-mono">{fmt.date(app.createdAt)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            icon="fa-folder-open"
                            accent="emerald"
                            heading="Keine Akten gefunden"
                            description={searchTerm ? 'Try a different search term or clear filters.' : 'Cases will appear here as prospects apply, transfers are requested, or vetting is initiated.'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ATSTab;
