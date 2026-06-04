
import React, { useMemo, useState } from 'react';
import { HydratedOperation, OperationLiveStatus } from '../../../../types';
import { useOperations } from '../../../../contexts/OperationsContext';
import { useData } from '../../../../contexts/DataContext';
import OpCommsTab from './OpCommsTab';

interface OpLiveCommandTabProps {
    operation: HydratedOperation;
    canManage: boolean;
    isParticipant: boolean;
    onRefresh: () => void;
}

const STATUS_OPTIONS: { value: OperationLiveStatus; label: string }[] = [
    { value: OperationLiveStatus.Standby, label: 'Standby' },
    { value: OperationLiveStatus.Engaged, label: 'Engaged' },
    { value: OperationLiveStatus.Holding, label: 'Holding' },
    { value: OperationLiveStatus.RTB, label: 'RTB' },
    { value: OperationLiveStatus.Disengaging, label: 'Disengaging' },
    { value: OperationLiveStatus.Regrouping, label: 'Regrouping' },
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

const OpLiveCommandTab: React.FC<OpLiveCommandTabProps> = ({ operation, canManage, isParticipant, onRefresh }) => {
    const { resetOperationReadiness } = useOperations();
    const { rpcAction } = useData();
    const [alertMessage, setAlertMessage] = useState('');
    const [isSendingAlert, setIsSendingAlert] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [resettingReadiness, setResettingReadiness] = useState(false);

    const activeParticipants = useMemo(() =>
        (operation.participants || []).filter(p => p.timeLeft === null),
        [operation.participants]
    );

    const readyCount = activeParticipants.filter(p => p.isReady).length;
    const totalCount = activeParticipants.length;
    const readyPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;

    const handleBroadcastAlert = async () => {
        if (!alertMessage.trim() || isSendingAlert) return;
        setIsSendingAlert(true);
        try {
            await rpcAction('operation:broadcast_alert', { operationId: operation.id, message: alertMessage.trim() });
            setAlertMessage('');
            onRefresh();
        } catch (e) {
            console.error('Failed to broadcast alert:', e);
        } finally {
            setIsSendingAlert(false);
        }
    };

    const handleLiveStatusChange = async (status: OperationLiveStatus) => {
        if (updatingStatus) return;
        setUpdatingStatus(true);
        try {
            await rpcAction('operation:update_live_status', { operationId: operation.id, liveStatus: status });
            onRefresh();
        } catch (e) {
            console.error('Failed to update live status:', e);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleResetReadiness = async () => {
        setResettingReadiness(true);
        try {
            await resetOperationReadiness(operation.id);
        } catch (e) {
            console.error('Failed to reset readiness:', e);
        } finally {
            setResettingReadiness(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Sidebar: Command Tools — rendered first for mobile, visually reordered to right on desktop */}
            <div className="w-full md:w-80 md:order-2 shrink-0 md:shrink md:basis-auto border-b md:border-b-0 md:border-l border-slate-800/60 bg-slate-900/30 p-4 space-y-5 max-h-[40vh] md:max-h-none overflow-y-auto custom-scrollbar">
                {/* Broadcast Alert */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-red-400 font-black flex items-center gap-1.5">
                        <i className="fa-solid fa-bullhorn text-[9px]" />Broadcast-Alarm</label>
                    <textarea
                        value={alertMessage}
                        onChange={e => setAlertMessage(e.target.value)}
                        placeholder="Alert message to all participants..."
                        maxLength={500}
                        rows={3}
                        className="w-full bg-slate-900/60 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-red-500/40 focus:ring-1 focus:ring-red-500/30 outline-hidden resize-none transition-all"
                    />
                    <button
                        onClick={handleBroadcastAlert}
                        disabled={!alertMessage.trim() || isSendingAlert}
                        className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all"
                    >
                        {isSendingAlert ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-1.5" />Senden…</>
                        ) : (
                            <><i className="fa-solid fa-bullhorn mr-1.5" />Benachrichtigung senden</>
                        )}
                    </button>
                </div>

                {/* Operation Live Status */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black flex items-center gap-1.5">
                        <i className="fa-solid fa-signal text-[9px]" />Betriebsstatus</label>
                    <div className="grid grid-cols-2 gap-1.5">
                        {STATUS_OPTIONS.map(opt => {
                            const colors = statusColor(opt.value);
                            const isActive = operation.liveStatus === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleLiveStatusChange(opt.value)}
                                    disabled={updatingStatus}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                                        isActive
                                            ? `${colors.bg} ${colors.text} ${colors.border} shadow-xs`
                                            : 'bg-slate-900/60 text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600'
                                    } disabled:opacity-50`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Readiness Summary */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-black flex items-center gap-1.5">
                        <i className="fa-solid fa-check-double text-[9px]" />Bereitschaft</label>
                    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">{readyCount}/{totalCount} ready</span>
                            <span className="text-xs font-bold text-green-400">{readyPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
                                style={{ width: `${readyPct}%` }}
                            />
                        </div>

                        {/* Not-ready list */}
                        {totalCount > readyCount && (
                            <div className="mt-2 space-y-1">
                                {activeParticipants.filter(p => !p.isReady).map(p => (
                                    <div key={p.userId} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                        {p.user?.name || 'Unknown'}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reset Readiness */}
                    {canManage && (
                        <button
                            onClick={handleResetReadiness}
                            disabled={resettingReadiness}
                            className="w-full py-2 bg-slate-900/60 text-slate-300 border border-slate-700/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                        >
                            {resettingReadiness ? (
                                <><i className="fa-solid fa-spinner fa-spin" />Zurücksetzen…</>
                            ) : (
                                <><i className="fa-solid fa-rotate-left" />Bereitschaft zurücksetzen</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Ops Log — rendered second for mobile (below sidebar), visually reordered to left on desktop */}
            <div className="flex-1 min-h-[200px] min-w-0 md:order-1">
                <OpCommsTab operation={operation} canManage={canManage} isParticipant={isParticipant} onRefresh={onRefresh} />
            </div>
        </div>
    );
};

export default OpLiveCommandTab;
