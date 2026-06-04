
import React, { useMemo } from 'react';
import { HydratedOperation, OperationLiveStatus, OperationStatus } from '../../../../types';
import { useAuth } from '../../../../contexts/AuthContext';
import { useOperations } from '../../../../contexts/OperationsContext';
import OpRadioPanel, { OpRadioState } from '../OpRadioPanel';
import OpCommsTab from './OpCommsTab';

interface OpLiveMyStatusTabProps {
    operation: HydratedOperation;
    canManage: boolean;
    isParticipant: boolean;
    onRefresh: () => void;
    radio: OpRadioState;
}

const STATUS_OPTIONS: { value: OperationLiveStatus; label: string; icon: string }[] = [
    { value: OperationLiveStatus.Standby, label: 'Standby', icon: 'fa-hourglass-half' },
    { value: OperationLiveStatus.Engaged, label: 'Engaged', icon: 'fa-crosshairs' },
    { value: OperationLiveStatus.Holding, label: 'Holding', icon: 'fa-hand' },
    { value: OperationLiveStatus.RTB, label: 'RTB', icon: 'fa-house-chimney' },
    { value: OperationLiveStatus.Disengaging, label: 'Disengaging', icon: 'fa-arrow-right-from-bracket' },
    { value: OperationLiveStatus.Regrouping, label: 'Regrouping', icon: 'fa-people-group' },
];

const statusColor = (status?: string) => {
    switch (status) {
        case 'Engaged': return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' };
        case 'Holding': return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' };
        case 'RTB': return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30', dot: 'bg-green-500' };
        case 'Regrouping': return { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: 'bg-yellow-500' };
        case 'Disengaging': return { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', dot: 'bg-orange-500' };
        case 'Standby': return { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' };
        default: return { bg: 'bg-slate-800/40', text: 'text-slate-500', border: 'border-slate-700/40', dot: 'bg-slate-600' };
    }
};

const OpLiveMyStatusTab: React.FC<OpLiveMyStatusTabProps> = ({ operation, canManage, isParticipant, onRefresh, radio }) => {
    const { currentUser } = useAuth();
    const { toggleParticipantReady, updateParticipantLiveStatus } = useOperations();

    const myParticipant = useMemo(() =>
        (operation.participants || []).find(p => p.userId === currentUser?.id && p.timeLeft === null),
        [operation.participants, currentUser?.id]
    );

    const [updating, setUpdating] = React.useState(false);

    const handleStatusChange = async (status: OperationLiveStatus) => {
        if (updating || !myParticipant) return;
        setUpdating(true);
        try {
            await updateParticipantLiveStatus(operation.id, status);
            onRefresh();
        } catch (e) {
            console.error('Failed to update live status:', e);
        } finally {
            setUpdating(false);
        }
    };

    const handleReadyToggle = async () => {
        if (updating) return;
        setUpdating(true);
        try {
            await toggleParticipantReady(operation.id);
            onRefresh();
        } catch (e) {
            console.error(e);
        } finally {
            setUpdating(false);
        }
    };

    const opColors = statusColor(operation.liveStatus);

    return (
        <div className="flex flex-col h-full">
            {/* Operation-wide Status Banner — full width above both panels */}
            {operation.liveStatus && operation.status === OperationStatus.Active && (
                <div className={`shrink-0 px-4 py-3 ${opColors.bg} border-b ${opColors.border} flex items-center justify-center gap-3`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${opColors.dot} animate-pulse shadow-lg`} />
                    <span className={`text-sm font-black uppercase tracking-wider ${opColors.text}`}>
                        Operation Status: {operation.liveStatus}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${opColors.dot} animate-pulse shadow-lg`} />
                </div>
            )}

            {/* Two-panel area */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
                {/* Sidebar: Personal controls — rendered first for mobile, visually reordered to right on desktop */}
                <div className="w-full md:w-80 md:order-2 shrink-0 md:shrink md:basis-auto border-b md:border-b-0 md:border-l border-slate-800/60 bg-slate-900/30 p-4 space-y-5 max-h-[40vh] md:max-h-none overflow-y-auto custom-scrollbar">
                    {/* Personal Status Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-800/60">
                        {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} className="w-10 h-10 rounded-full border border-slate-700 object-cover shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-user text-slate-500" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{currentUser?.name}</div>
                            {myParticipant && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {myParticipant.liveStatus && (
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border ${statusColor(myParticipant.liveStatus).bg} ${statusColor(myParticipant.liveStatus).text} ${statusColor(myParticipant.liveStatus).border}`}>
                                            {myParticipant.liveStatus}
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm border ${myParticipant.isReady ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-slate-800/40 text-slate-500 border-slate-700/50'}`}>
                                        {myParticipant.isReady ? 'Ready' : 'Not Ready'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Status Buttons */}
                    {myParticipant && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Persönlicher Status</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {STATUS_OPTIONS.map(opt => {
                                    const colors = statusColor(opt.value);
                                    const isActive = myParticipant.liveStatus === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStatusChange(opt.value)}
                                            disabled={updating}
                                            className={`px-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                                isActive
                                                    ? `${colors.bg} ${colors.text} ${colors.border} shadow-xs`
                                                    : 'bg-slate-900/60 text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600'
                                            } disabled:opacity-50`}
                                        >
                                            <i className={`fa-solid ${opt.icon} mr-1 text-[9px]`} />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Ready Toggle */}
                            <button
                                onClick={handleReadyToggle}
                                disabled={updating}
                                className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${
                                    myParticipant.isReady
                                        ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 shadow-lg shadow-green-900/20'
                                        : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                                } disabled:opacity-50`}
                            >
                                <i className={`fa-solid ${myParticipant.isReady ? 'fa-check-circle' : 'fa-circle'} mr-1.5`} />
                                {myParticipant.isReady ? 'Ready' : 'Mark Ready'}
                            </button>
                        </div>
                    )}

                    {/* Operational Radio */}
                    <OpRadioPanel radio={radio} />
                </div>

                {/* Ops Log — rendered second for mobile (below sidebar), visually reordered to left on desktop */}
                <div className="flex-1 min-h-[200px] min-w-0 md:order-1">
                    <OpCommsTab operation={operation} canManage={canManage} isParticipant={isParticipant} onRefresh={onRefresh} />
                </div>
            </div>
        </div>
    );
};

export default OpLiveMyStatusTab;
