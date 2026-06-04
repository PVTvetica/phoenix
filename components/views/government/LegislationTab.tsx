
import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useGovernment } from '../../../contexts/GovernmentContext';
import WindowFrame from '../../layout/WindowFrame';
import WikiEditor from '../wiki/WikiEditor';
import { GovernmentLegislation, LegislationStatus } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface LegislationTabProps {
    onViewLegislation: (legislation: GovernmentLegislation) => void;
}

const statusColors: Record<string, string> = {
    Draft: 'bg-slate-500/10 text-slate-400',
    Proposed: 'bg-amber-500/10 text-amber-400',
    Debate: 'bg-purple-500/10 text-purple-400',
    Voting: 'bg-emerald-500/10 text-emerald-400',
    Passed: 'bg-sky-500/10 text-sky-400',
    Failed: 'bg-red-500/10 text-red-400',
    Vetoed: 'bg-red-500/10 text-red-400',
    Repealed: 'bg-slate-500/10 text-slate-500',
    Amended: 'bg-orange-500/10 text-orange-400',
};

const LegislationTab: React.FC<LegislationTabProps> = ({ onViewLegislation }) => {
    const { currentUser, hasPermission } = useAuth();
    const { rpcAction } = useData();
    const { governmentLegislation, governmentPositions, governmentPositionHolders, refreshGovernment } = useGovernment();
    const { addToast } = useNotification();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Create form
    const [formTitle, setFormTitle] = useState('');
    const [formSummary, setFormSummary] = useState('');
    const formBodyRef = useRef<any>({});
    const [formSponsorPositionId, setFormSponsorPositionId] = useState<number | ''>('');
    const [formIsAmendment, setFormIsAmendment] = useState(false);
    const emptyContent = useMemo(() => ({}), []);

    const canCreateLegislation = hasPermission('gov:elected_official');
    const canManage = hasPermission('gov:manage');

    // Get positions the current user holds that can propose legislation
    const myProposingPositions = governmentPositionHolders
        .filter(h => h.userId === currentUser?.id && !h.endedAt)
        .map(h => governmentPositions.find(p => p.id === h.positionId))
        .filter(p => p?.canProposeLegislation);

    const filteredLegislation = filterStatus === 'all'
        ? governmentLegislation
        : governmentLegislation.filter(l => l.status === filterStatus);

    const activeLegislation = filteredLegislation.filter(l => ['Draft', 'Proposed', 'Debate', 'Voting'].includes(l.status));
    const passedLaws = filteredLegislation.filter(l => l.status === 'Passed');
    const archivedLegislation = filteredLegislation.filter(l => ['Failed', 'Vetoed', 'Repealed', 'Amended'].includes(l.status));

    const handleCreate = async () => {
        if (!formTitle.trim()) return;
        setIsCreating(true);
        try {
            await rpcAction('gov:create_legislation', {
                legislationData: {
                    title: formTitle,
                    summary: formSummary || null,
                    body: formBodyRef.current || {},
                    sponsorPositionId: formSponsorPositionId || null,
                    isConstitutionalAmendment: formIsAmendment,
                }
            });
            setShowCreateModal(false);
            setFormTitle(''); setFormSummary(''); formBodyRef.current = {}; setFormSponsorPositionId('');
            addToast("Rechnung erstellt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50', { description: 'Dein Gesetzentwurf wurde als Entwurf erstellt.' });
            await refreshGovernment();
        } catch (err: any) {
            addToast("Erstellen fehlgeschlagen", <i className="fa-solid fa-circle-exclamation" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err.message || 'Failed to create legislation.' });
        } finally {
            setIsCreating(false);
        }
    };

    const renderLegislationCard = (leg: GovernmentLegislation) => (
        <div
            key={leg.id}
            onClick={() => onViewLegislation(leg)}
            className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer"
        >
            <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-sm font-bold text-white flex-1">{leg.title}</h3>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm ml-2 shrink-0 ${statusColors[leg.status] || statusColors.Draft}`}>
                    {leg.status}
                </span>
            </div>
            {leg.summary && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{leg.summary}</p>}
            <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>by {leg.author?.name || 'Unknown'}</span>
                {leg.sponsorPosition && <span>via {leg.sponsorPosition.name}</span>}
                {leg.isConstitutionalAmendment && <span className="text-amber-400 font-bold">ÄNDERUNG</span>}
                {leg.status === LegislationStatus.Voting && (
                    <span className="text-emerald-400">
                        {leg.votesFor} for / {leg.votesAgainst} against / {leg.votesAbstain} abstain
                    </span>
                )}
                {leg.status === LegislationStatus.Passed && <span className="text-sky-400">In Kraft gesetzt</span>}
                {leg.vetoedAt && <span className="text-red-400">Veto eingelegt</span>}
                {leg.comments && leg.comments.length > 0 && (
                    <span><i className="fa-solid fa-comment mr-0.5"></i>{leg.comments.length}</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-white">Gesetzgebung</h2>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="text-[10px] bg-slate-800 border border-slate-700 rounded-sm px-2 py-1 text-slate-300"
                    >
                        <option value="all">Alle</option>
                        {Object.values(LegislationStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {canCreateLegislation && myProposingPositions.length > 0 && (
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 rounded-md hover:bg-sky-500/20 transition-colors">
                        <i className="fa-solid fa-pen-nib"></i>Gesetzentwurf</button>
                )}
            </div>

            {activeLegislation.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aktiv</h3>
                    <div className="space-y-2">{activeLegislation.map(renderLegislationCard)}</div>
                </div>
            )}

            {passedLaws.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Erlassene Gesetze</h3>
                    <div className="space-y-2">{passedLaws.map(renderLegislationCard)}</div>
                </div>
            )}

            {archivedLegislation.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Archiviert</h3>
                    <div className="space-y-2">{archivedLegislation.map(renderLegislationCard)}</div>
                </div>
            )}

            {governmentLegislation.length === 0 && (
                <div className="text-center py-12">
                    <i className="fa-solid fa-scroll text-3xl text-slate-600 mb-3"></i>
                    <p className="text-sm text-slate-400">Es liegen noch keine Gesetzesentwürfe vor.</p>
                </div>
            )}

            <WindowFrame
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Draft New Bill"
                subtitle="Gesetzgebung"
                icon="fa-solid fa-scroll"
                color="sky"
                width="max-w-2xl"
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titel</label>
                            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all" placeholder="e.g. Trade Regulation Act" disabled={isCreating} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sponsoring-Position</label>
                            <select value={formSponsorPositionId} onChange={e => setFormSponsorPositionId(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all" disabled={isCreating}>
                                <option value="">Position auswählen…</option>
                                {myProposingPositions.map(p => p && <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Zusammenfassung</label>
                            <textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-hidden transition-all resize-none" rows={2} placeholder="Brief summary of the bill..." disabled={isCreating} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Körper</label>
                            <WikiEditor
                                content={emptyContent}
                                editable={true}
                                onChange={(json) => { formBodyRef.current = json; }}
                            />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={formIsAmendment} onChange={e => setFormIsAmendment(e.target.checked)} className="rounded-sm bg-slate-800 border-slate-600 text-sky-500 focus:ring-sky-500" disabled={isCreating} />Verfassungsänderung</label>
                    </div>
                    <div className="flex justify-end items-center p-4 bg-slate-900/50 border-t border-white/5 shrink-0 gap-3">
                        <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreating} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">Abbrechen</button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating || !formTitle.trim()}
                            className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-all shadow-lg shadow-sky-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none border border-sky-500/50"
                        >
                            {isCreating ? <i className="fa-solid fa-spinner animate-spin" /> : 'Create Draft'}
                        </button>
                    </div>
                </div>
            </WindowFrame>
        </div>
    );
};

export default LegislationTab;
