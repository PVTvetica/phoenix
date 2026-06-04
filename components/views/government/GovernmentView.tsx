
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useGovernment } from '../../../contexts/GovernmentContext';

import GovernmentOverview from './GovernmentOverview';
import GovernmentSetupWizard from './GovernmentSetupWizard';
import ElectionsTab from './ElectionsTab';
import ElectionDetailView from './ElectionDetailView';
import LegislationTab from './LegislationTab';
import LegislationDetailView from './LegislationDetailView';
import MotionsTab from './MotionsTab';
import OrdersTab from './OrdersTab';
import WikiEditor from '../wiki/WikiEditor';
import { GovernmentElection, GovernmentLegislation } from '../../../types';
import HeroShell from '../../shared/ui/HeroShell';
import HeroStat from '../../shared/ui/HeroStat';
import HeroActionButton from '../../shared/ui/HeroActionButton';
import { useNotification } from '../../../contexts/NotificationContext';

type GovernmentTab = 'overview' | 'elections' | 'legislation' | 'motions' | 'orders' | 'constitution';

const GovernmentView: React.FC = () => {
    const { hasPermission } = useAuth();
    const { isFetching } = useData();
    const { governmentConfig, governmentBranches, governmentPositions, governmentPositionHolders, governmentElections, governmentLegislation, governmentMotions, refreshGovernment } = useGovernment();
    const { addToast } = useNotification();

    const [activeTab, setActiveTab] = useState<GovernmentTab>('overview');
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    const [selectedElection, setSelectedElection] = useState<GovernmentElection | null>(null);
    const [selectedLegislation, setSelectedLegislation] = useState<GovernmentLegislation | null>(null);

    useEffect(() => { refreshGovernment(); }, [refreshGovernment]);

    const isLoading = isFetching['government'];
    const hasGovernment = !!governmentConfig;
    const canAdmin = hasPermission('gov:admin');
    const canManage = hasPermission('gov:manage');

    // Show setup wizard if no government configured and user has admin access
    if (!hasGovernment && !isLoading && canAdmin) {
        return <GovernmentSetupWizard onComplete={() => refreshGovernment()} />;
    }

    if (!hasGovernment && !isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                    <i className="fa-solid fa-landmark text-4xl text-slate-600 mb-4"></i>
                    <h2 className="text-xl font-bold text-white mb-2">Keine Regierung gegründet</h2>
                    <p className="text-sm text-slate-400">
                        This organisation has not yet established a government structure.
                        An administrator can set one up from the admin panel.
                    </p>
                </div>
            </div>
        );
    }

    const activeElectionCount = governmentElections.filter(e =>
        ['Draft', 'Candidacy', 'Voting', 'Runoff'].includes(e.status)
    ).length;
    const activeLegislationCount = governmentLegislation.filter(l =>
        ['Draft', 'Proposed', 'Debate', 'Voting'].includes(l.status)
    ).length;
    const activeMotionCount = governmentMotions.filter(m =>
        ['Open', 'Voting'].includes(m.status)
    ).length;

    const tabs: { id: GovernmentTab; label: string; icon: string; badge?: number }[] = [
        { id: 'overview', label: 'Überblick', icon: 'fa-solid fa-sitemap' },
        { id: 'elections', label: 'Wahlen', icon: 'fa-solid fa-check-to-slot', badge: activeElectionCount || undefined },
        { id: 'legislation', label: 'Gesetzgebung', icon: 'fa-solid fa-scroll', badge: activeLegislationCount || undefined },
        { id: 'motions', label: 'Anträge', icon: 'fa-solid fa-scale-balanced', badge: activeMotionCount || undefined },
        { id: 'orders', label: 'Bestellungen', icon: 'fa-solid fa-gavel' },
        { id: 'constitution', label: 'Verfassung', icon: 'fa-solid fa-landmark-flag' },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <HeroShell
                chipLabel="MODULE · GOVERNMENT"
                chipIcon="fa-landmark"
                chipAccent="indigo"
                title={governmentConfig?.name || 'Government'}
                subtitle={<>
                    <span className="block text-[10px] font-black text-indigo-300 uppercase tracking-[0.25em] mb-1">
                        {formatGovernmentType(governmentConfig?.governmentType || '')}
                    </span>
                    {governmentConfig?.description && (
                        <span className="italic">{governmentConfig.description}</span>
                    )}
                </>}
                actions={canAdmin && (
                    <HeroActionButton onClick={() => setShowSetupWizard(true)} accent="slate" icon="fa-gear">Umstrukturieren</HeroActionButton>
                )}
                stats={<>
                    <HeroStat icon="fa-sitemap" label="Zweige" value={governmentBranches.length} accent="indigo" />
                    <HeroStat icon="fa-user-tie" label="Positionen" value={governmentPositions.length} accent="indigo" />
                    <HeroStat icon="fa-people-group" label="Officials" value={governmentPositionHolders.filter((h: any) => !h.endDate && !h.end_date).length} accent="indigo" />
                    <HeroStat
                        icon="fa-bolt"
                        label="Aktiv"
                        value={activeElectionCount + activeLegislationCount + activeMotionCount}
                        accent="amber"
                        emphasize={activeElectionCount + activeLegislationCount + activeMotionCount > 0}
                    />
                </>}
                tabs={tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setSelectedElection(null); setSelectedLegislation(null); }}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'text-indigo-300 border-indigo-400'
                                : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                    >
                        <i className={tab.icon}></i>
                        {tab.label}
                        {tab.badge && (
                            <span className="ml-1 min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center">{tab.badge}</span>
                        )}
                    </button>
                ))}
            />

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                    </div>
                )}

                {!isLoading && activeTab === 'overview' && (
                    <GovernmentOverview
                        branches={governmentBranches}
                        positions={governmentPositions}
                        holders={governmentPositionHolders}
                        canManage={canManage}
                    />
                )}

                {!isLoading && activeTab === 'elections' && !selectedElection && (
                    <ElectionsTab
                        onViewElection={(election) => setSelectedElection(election)}
                    />
                )}

                {!isLoading && activeTab === 'elections' && selectedElection && (
                    <ElectionDetailView
                        election={governmentElections.find(e => e.id === selectedElection.id) || selectedElection}
                        onBack={() => setSelectedElection(null)}
                    />
                )}

                {!isLoading && activeTab === 'legislation' && !selectedLegislation && (
                    <LegislationTab
                        onViewLegislation={(leg) => setSelectedLegislation(leg)}
                    />
                )}

                {!isLoading && activeTab === 'legislation' && selectedLegislation && (
                    <LegislationDetailView
                        legislation={governmentLegislation.find(l => l.id === selectedLegislation.id) || selectedLegislation}
                        onBack={() => setSelectedLegislation(null)}
                    />
                )}

                {!isLoading && activeTab === 'motions' && (
                    <MotionsTab />
                )}

                {!isLoading && activeTab === 'orders' && (
                    <OrdersTab />
                )}

                {!isLoading && activeTab === 'constitution' && (
                    <ConstitutionTab
                        governmentConfig={governmentConfig}
                        canAdmin={canAdmin}
                    />
                )}
            </div>

            {/* Setup Wizard Modal */}
            {showSetupWizard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                    <div className="relative max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowSetupWizard(false)}
                            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white"
                        >
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                        <GovernmentSetupWizard onComplete={() => { setShowSetupWizard(false); refreshGovernment(); }} />
                    </div>
                </div>
            )}
        </div>
    );
};

const EMPTY_CONSTITUTION: Record<string, never> = {};

const ConstitutionTab: React.FC<{ governmentConfig: any; canAdmin: boolean }> = ({ governmentConfig, canAdmin }) => {
    const { rpcAction } = useData();
    const { refreshGovernment } = useGovernment();
    const { addToast } = useNotification();
    const [isEditing, setIsEditing] = useState(false);

    const hasConstitution = governmentConfig?.constitutionContent
        && Object.keys(governmentConfig.constitutionContent).length > 0;

    const save = async (json: any) => {
        try {
            await rpcAction('gov:update_constitution', { content: json });
            setIsEditing(false);
            addToast("Verfassung gerettet", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50', { description: 'Verfassung aktualisiert.' });
            await refreshGovernment();
        } catch (err: any) {
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-circle-exclamation" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err.message || 'Failed to update constitution.' });
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {isEditing ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-scroll text-amber-400"></i>
                        {hasConstitution ? 'Edit Constitution' : 'Draft Constitution'}
                    </h2>
                    <WikiEditor
                        content={governmentConfig?.constitutionContent || EMPTY_CONSTITUTION}
                        editable={true}
                        onSave={save}
                        onCancel={() => setIsEditing(false)}
                    />
                </div>
            ) : hasConstitution ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <i className="fa-solid fa-scroll text-amber-400"></i>Verfassung</h2>
                        {canAdmin && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 border border-slate-600/50 rounded-md hover:bg-slate-700 transition-colors">
                                <i className="fa-solid fa-pen text-xs"></i>Bearbeiten</button>
                        )}
                    </div>
                    <WikiEditor
                        content={governmentConfig.constitutionContent}
                        editable={false}
                    />
                </div>
            ) : (
                <div className="text-center py-12">
                    <i className="fa-solid fa-scroll text-3xl text-slate-600 mb-3"></i>
                    <p className="text-sm text-slate-400">Es wurde noch keine Verfassung ausgearbeitet.</p>
                    {canAdmin && (
                        <button onClick={() => setIsEditing(true)} className="mt-3 flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md hover:bg-amber-500/20 transition-colors mx-auto">
                            <i className="fa-solid fa-plus"></i>Verfassungsentwurf</button>
                    )}
                </div>
            )}
        </div>
    );
};

function formatGovernmentType(type: string): string {
    const labels: Record<string, string> = {
        military_junta: 'Military Junta',
        corporate_board: 'Corporate Board',
        democratic_republic: 'Democratic Republic',
        constitutional_monarchy: 'Constitutional Monarchy',
        westminster: 'Westminster Parliament',
        technocracy: 'Technocracy',
        pirate_code: 'Pirate Code',
        custom: 'Custom Government',
    };
    return labels[type] || type;
}

export default GovernmentView;
