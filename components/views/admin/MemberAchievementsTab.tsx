
import React, { useState, Suspense } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import AchievementImportExportModal from '../../modals/AchievementImportExportModal';

const SpecializationsManagementTab = React.lazy(() => import('./SpecializationsManagementTab'));
const CertificationsManagementTab = React.lazy(() => import('./CertificationsManagementTab'));
const CommendationsManagementTab = React.lazy(() => import('./CommendationsManagementTab'));

type SubTabId = 'specializations' | 'certifications' | 'commendations';

interface SubTabDef {
    id: SubTabId;
    label: string;
    icon: string;
    permission: string;
    description: string;
}

const SUB_TABS: SubTabDef[] = [
    { id: 'specializations', label: 'Spezialisierungen', icon: 'fa-solid fa-tags', permission: 'admin:config:specializations', description: 'Rollenschwerpunkte und operative Spezialisierungen.' },
    { id: 'certifications', label: 'Zertifizierungen', icon: 'fa-solid fa-certificate', permission: 'admin:config:certifications', description: 'Qualifikationen durch Training und Prüfung verliehen.' },
    { id: 'commendations', label: 'Belobigungen', icon: 'fa-solid fa-medal', permission: 'admin:config:commendations', description: 'Ehrungen und Auszeichnungen für Mitgliederleistungen.' },
];

const Fallback = () => (
    <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
            <i className="fa-solid fa-circle-notch animate-spin text-slate-300 text-2xl"></i>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Lädt</p>
        </div>
    </div>
);

const MemberAchievementsTab: React.FC = () => {
    const { hasPermission } = useAuth();
    const available = SUB_TABS.filter(t => hasPermission(t.permission));
    const [active, setActive] = useState<SubTabId>(available[0]?.id ?? 'specializations');
    const [importExportOpen, setImportExportOpen] = useState(false);

    const activeDef = available.find(t => t.id === active) ?? available[0];
    const canImportExport = activeDef ? hasPermission(activeDef.permission) : false;

    const renderContent = () => {
        switch (active) {
            case 'specializations': return <SpecializationsManagementTab />;
            case 'certifications': return <CertificationsManagementTab />;
            case 'commendations': return <CommendationsManagementTab />;
            default: return null;
        }
    };

    if (available.length === 0) return null;

    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Sub-navigation: tab strip + import/export. The inner sub-tab
                renders its own TabPageHeader (Wave 2) so we deliberately do
                NOT add an outer page header here — the strip already names
                the active section. */}
            <div className="shrink-0 px-4 md:px-8 pt-4 border-b border-slate-700/50 flex items-end justify-between gap-3">
                <div className="flex gap-1 -mb-px overflow-x-auto custom-scrollbar">
                    {available.map(tab => {
                        const isActive = tab.id === active;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActive(tab.id)}
                                className={`px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${isActive
                                    ? 'text-slate-100 border-slate-300'
                                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-600'
                                    }`}
                            >
                                <i className={`${tab.icon} text-[11px]`}></i>
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                {canImportExport && activeDef && (
                    <button
                        onClick={() => setImportExportOpen(true)}
                        className="shrink-0 mb-1.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-white hover:border-purple-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors"
                        title={`Import or export ${activeDef.label} catalog as JSON`}
                    >
                        <i className="fa-solid fa-arrow-right-arrow-left"></i> Import / Export
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <Suspense fallback={<Fallback />}>
                    {renderContent()}
                </Suspense>
            </div>

            {importExportOpen && activeDef && (
                <AchievementImportExportModal
                    isOpen={importExportOpen}
                    onClose={() => setImportExportOpen(false)}
                    kind={activeDef.id}
                />
            )}
        </div>
    );
};

export default MemberAchievementsTab;
