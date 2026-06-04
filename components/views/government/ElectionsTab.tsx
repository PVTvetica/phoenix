
import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useGovernment } from '../../../contexts/GovernmentContext';
import WindowFrame from '../../layout/WindowFrame';
import { GovernmentElection, ElectionStatus } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface ElectionsTabProps {
    onViewElection: (election: GovernmentElection) => void;
}

const statusColors: Record<string, string> = {
    Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Candidacy: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Voting: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Concluded: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    Runoff: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const electionTypeLabels: Record<string, string> = {
    SimpleMajority: 'Simple Majority',
    Preferential: 'Preferential (IRV)',
    ProportionalRepresentation: 'Proportional',
    Approval: 'Approval',
    Plurality: 'Plurality',
};

const ElectionsTab: React.FC<ElectionsTabProps> = ({ onViewElection }) => {
    const { currentUser, hasPermission } = useAuth();
    const { rpcAction } = useData();
    const { governmentElections, governmentPositions, refreshGovernment } = useGovernment();
    const { addToast, confirm } = useNotification();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Create form state
    const [formTitle, setFormTitle] = useState('');
    const [formPositionId, setFormPositionId] = useState<number | ''>('');
    const [formElectionType, setFormElectionType] = useState<string>('SimpleMajority');
    const [formMaxWinners, setFormMaxWinners] = useState('1');
    const [formMinCandidates, setFormMinCandidates] = useState('2');
    const [formAllowRunoff, setFormAllowRunoff] = useState(false);
    const [formTurnoutPct, setFormTurnoutPct] = useState('');
    const [formThresholdPct, setFormThresholdPct] = useState('');

    const canManageElections = hasPermission('gov:electoral_officer');

    const activeElections = governmentElections.filter(e =>
        [ElectionStatus.Draft, ElectionStatus.Candidacy, ElectionStatus.Voting, ElectionStatus.Runoff].includes(e.status as ElectionStatus)
    );
    const pastElections = governmentElections.filter(e =>
        [ElectionStatus.Concluded, ElectionStatus.Cancelled].includes(e.status as ElectionStatus)
    );

    const handleCreate = async () => {
        if (!formTitle.trim() || !formPositionId) return;
        setIsCreating(true);
        try {
            await rpcAction('gov:create_election', {
                electionData: {
                    positionId: formPositionId,
                    title: formTitle,
                    electionType: formElectionType,
                    maxWinners: parseInt(formMaxWinners) || 1,
                    minCandidates: parseInt(formMinCandidates) || 2,
                    allowRunoff: formAllowRunoff,
                    minVoterTurnoutPct: formTurnoutPct ? parseFloat(formTurnoutPct) : null,
                    minVoteThresholdPct: formThresholdPct ? parseFloat(formThresholdPct) : null,
                }
            });
            setShowCreateModal(false);
            setFormTitle('');
            setFormPositionId('');
            addToast("Wahl erstellt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50', { description: 'Die Wahl wurde als Entwurf erstellt.' });
            await refreshGovernment();
        } catch (err: any) {
            addToast("Erstellen fehlgeschlagen", <i className="fa-solid fa-circle-exclamation" />, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err.message || 'Failed to create election.' });
        } finally {
            setIsCreating(false);
        }
    };

    const renderElectionCard = (election: GovernmentElection) => {
        const statusCls = statusColors[election.status] || statusColors.Draft;
        const candidateCount = election.candidates?.length || 0;

        return (
            <div
                key={election.id}
                onClick={() => onViewElection(election)}
                className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer"
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-white">{election.title}</h3>
                        {election.position && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                <i className={`${election.position.icon || 'fa-solid fa-user'} mr-1`}></i>
                                {election.position.name}
                            </p>
                        )}
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm border ${statusCls}`}>
                        {election.status}
                    </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span><i className="fa-solid fa-check-to-slot mr-1"></i>{electionTypeLabels[election.electionType] || election.electionType}</span>
                    <span><i className="fa-solid fa-users mr-1"></i>{candidateCount} candidate{candidateCount !== 1 ? 's' : ''}</span>
                    {election.totalVotesCast !== undefined && (
                        <span><i className="fa-solid fa-box-ballot mr-1"></i>{election.totalVotesCast} votes</span>
                    )}
                    {election.isByElection && (
                        <span className="text-amber-400"><i className="fa-solid fa-rotate mr-1"></i>Nachwahl</span>
                    )}
                </div>

                {election.status === ElectionStatus.Voting && election.hasVoted !== undefined && (
                    <div className="mt-2">
                        {election.hasVoted ? (
                            <span className="text-[10px] text-emerald-400"><i className="fa-solid fa-check mr-1"></i>Du hast abgestimmt</span>
                        ) : (
                            <span className="text-[10px] text-amber-400 font-medium"><i className="fa-solid fa-exclamation-triangle mr-1"></i>Du hast noch nicht abgestimmt</span>
                        )}
                    </div>
                )}

                {election.conclusionReason && election.status === ElectionStatus.Concluded && (
                    <p className="text-[10px] text-slate-500 mt-2 italic">{election.conclusionReason}</p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Wahlen</h2>
                {canManageElections && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md hover:bg-amber-500/20 transition-colors"
                    >
                        <i className="fa-solid fa-plus"></i>Aufruf zur Wahl</button>
                )}
            </div>

            {/* Active Elections */}
            {activeElections.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Aktiv</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {activeElections.map(renderElectionCard)}
                    </div>
                </div>
            )}

            {/* Past Elections */}
            {pastElections.length > 0 && (
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Vergangene Wahlen</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {pastElections.map(renderElectionCard)}
                    </div>
                </div>
            )}

            {governmentElections.length === 0 && (
                <div className="text-center py-12">
                    <i className="fa-solid fa-box-ballot text-3xl text-slate-600 mb-3"></i>
                    <p className="text-sm text-slate-400">Es wurden noch keine Wahlen anberaumt.</p>
                </div>
            )}

            <WindowFrame
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Call New Election"
                subtitle="Wahlsystem"
                icon="fa-solid fa-box-ballot"
                color="amber"
                width="max-w-xl"
            >
                <div className="flex flex-col h-full">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titel</label>
                            <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" placeholder="e.g. Presidential Election 2954" disabled={isCreating} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Position</label>
                            <select value={formPositionId} onChange={e => setFormPositionId(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" disabled={isCreating}>
                                <option value="">Position auswählen…</option>
                                {governmentPositions.filter(p => p.fillMethod === 'Elected').map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (max {p.maxHolders})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Wahltyp</label>
                                <select value={formElectionType} onChange={e => setFormElectionType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" disabled={isCreating}>
                                    {Object.entries(electionTypeLabels).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gewinner</label>
                                <input type="number" min="1" value={formMaxWinners} onChange={e => setFormMaxWinners(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" disabled={isCreating} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Min. Kandidaten</label>
                                <input type="number" min="1" value={formMinCandidates} onChange={e => setFormMinCandidates(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" disabled={isCreating} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Min. Wahlbeteiligung %</label>
                                <input type="number" min="0" max="100" step="0.1" value={formTurnoutPct} onChange={e => setFormTurnoutPct(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" placeholder="Optional" disabled={isCreating} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gewinnschwelle %</label>
                                <input type="number" min="0" max="100" step="0.1" value={formThresholdPct} onChange={e => setFormThresholdPct(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition-all" placeholder="Optional" disabled={isCreating} />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                    <input type="checkbox" checked={formAllowRunoff} onChange={e => setFormAllowRunoff(e.target.checked)} className="rounded-sm bg-slate-800 border-slate-600 text-amber-500 focus:ring-amber-500" disabled={isCreating} />Abfluss zulassen</label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 bg-slate-900/50 border-t border-white/5 shrink-0 gap-3">
                        <button type="button" onClick={() => setShowCreateModal(false)} disabled={isCreating} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">Abbrechen</button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating || !formTitle.trim() || !formPositionId}
                            className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-white bg-amber-600 rounded-lg hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none border border-amber-500/50"
                        >
                            {isCreating ? <i className="fa-solid fa-spinner animate-spin" /> : 'Create Election'}
                        </button>
                    </div>
                </div>
            </WindowFrame>
        </div>
    );
};

export default ElectionsTab;
