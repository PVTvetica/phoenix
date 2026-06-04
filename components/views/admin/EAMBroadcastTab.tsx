
import React, { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useFormatDate } from '../../../contexts/AuthContext';

import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import WindowFrame from '../../layout/WindowFrame';

const EAMBroadcastTab: React.FC = () => {
    const { broadcastEAM, rpcAction } = useData();
    const { addToast } = useNotification();
    const { setEamMessage } = useNavigation();
    const fmt = useFormatDate();
    const [message, setMessage] = useState('');
    // The active EAM no longer rides the state payload (stripSecrets removes
    // it — the body is audience-gated). Fetch it via the gated RPC on mount
    // and after each transmit.
    const [activeEam, setActiveEam] = useState<{ message?: string; timestamp?: string } | null>(null);
    useEffect(() => {
        rpcAction('broadcast:get_active_eam', {})
            .then((eam) => setActiveEam(eam ?? null))
            .catch(() => setActiveEam(null));
    }, [rpcAction]);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isArming, setIsArming] = useState(false);
    const [armCountdown, setArmCountdown] = useState(3);
    const [isArmed, setIsArmed] = useState(false);

    const charLimit = 256;

    const handleInitiate = () => {
        if (!message.trim()) {
            addToast("Leere Nachricht", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "EAM-Nachrichtentext darf nicht leer sein." });
            return;
        }
        setShowConfirmModal(true);
        setIsArmed(false);
        setIsArming(false);
        setArmCountdown(3);
    };

    const handleCloseModal = () => {
        setShowConfirmModal(false);
        setIsArmed(false);
        setIsArming(false);
    };

    useEffect(() => {
        let timer: number;
        if (isArming && armCountdown > 0) {
            timer = window.setTimeout(() => setArmCountdown(prev => prev - 1), 1000);
        } else if (isArming && armCountdown === 0) {
            setIsArmed(true);
            setIsArming(false);
        }
        return () => clearTimeout(timer);
    }, [isArming, armCountdown]);

    const handleArmClick = () => {
        setIsArming(true);
        setArmCountdown(3);
    };

    const handleTransmit = async () => {
        if (!isArmed) return;
        setIsBroadcasting(true);
        try {
            await broadcastEAM(message.toUpperCase());
            setEamMessage(message.toUpperCase());
            setActiveEam({ message: message.toUpperCase(), timestamp: new Date().toISOString() });
            addToast("EAM Übermittelt", <i className="fa-solid fa-tower-broadcast"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Emergency Action Message an alle aktiven Sitzungen gesendet." });
            setTimeout(() => {
                handleCloseModal();
                setMessage('');
            }, 800);
        } catch (error) {
            console.error('Failed to broadcast EAM:', error);
            addToast("Übertragung fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Der EAM-Rundfunk konnte nicht gesendet werden." });
        } finally {
            setIsBroadcasting(false);
        }
    };

    const formatTimestamp = (ts: string) => fmt(ts);

    return (
        <div className="p-4 md:p-8 space-y-6 h-full flex flex-col animate-fade-in">
            <TabPageHeader
                title="Notfall-Aktionsmeldung"
                icon="fa-solid fa-tower-broadcast"
                accent="red"
                subtitle="Prioritäts-Rundfunksystem"
                meta={
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Systembereit</span>
                    </span>
                }
            />

            {/* Active EAM Status */}
            {activeEam?.message && (
                <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-circle-exclamation text-red-400"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Aktiv EAM</span>
                            {activeEam.timestamp && (
                                <span className="text-[10px] text-slate-500 font-mono">{formatTimestamp(activeEam.timestamp)}</span>
                            )}
                        </div>
                        <p className="text-sm text-slate-300 font-mono uppercase wrap-break-word">{activeEam.message}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Message Compose */}
                <div className="lg:col-span-2 flex flex-col bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nachricht verfassen</span>
                        <span className={`text-[10px] font-mono ${message.length > charLimit ? 'text-red-400' : 'text-slate-600'}`}>
                            {message.length}/{charLimit}
                        </span>
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value.slice(0, charLimit))}
                            className="w-full h-full min-h-[200px] bg-transparent border-none p-5 text-white text-lg font-mono placeholder:text-slate-700 focus:ring-0 resize-none leading-relaxed uppercase tracking-wide outline-hidden"
                            placeholder="Enter emergency message..."
                            spellCheck={false}
                            maxLength={charLimit}
                        />
                    </div>
                    <div className="px-4 py-3 border-t border-slate-700/50 flex justify-end">
                        <button
                            onClick={handleInitiate}
                            disabled={!message.trim()}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <i className="fa-solid fa-satellite-dish"></i>Übertragung einleiten</button>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="flex flex-col gap-4">
                    {/* What happens */}
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <i className="fa-solid fa-circle-info text-slate-500"></i>Broadcast-Effekte</h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <i className="fa-solid fa-display text-amber-500/70 text-xs mt-0.5"></i>
                                <p className="text-xs text-slate-400 leading-relaxed">Displays a full-screen alert overlay on all active sessions.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <i className="fa-solid fa-volume-high text-amber-500/70 text-xs mt-0.5"></i>
                                <p className="text-xs text-slate-400 leading-relaxed">Löst den EAM-Alarmton auf allen verbundenen Geräten aus.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <i className="fa-solid fa-bell text-amber-500/70 text-xs mt-0.5"></i>
                                <p className="text-xs text-slate-400 leading-relaxed">Sendet Push-Benachrichtigungen an alle abonnierten Mitglieder.</p>
                            </div>
                        </div>
                    </div>

                    {/* Usage guidance */}
                    <div className="bg-amber-950/10 border border-amber-500/10 rounded-xl p-5 space-y-3">
                        <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation"></i>Nutzungsrichtlinien</h3>
                        <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500/50 mt-0.5">-</span>Serverabstürze oder kritische Ausfallzeiten</li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500/50 mt-0.5">-</span>Organisationsweite Rückzugs- oder Notfallanordnungen</li>
                            <li className="flex items-start gap-2">
                                <span className="text-amber-500/50 mt-0.5">-</span>Zeitkritische Anweisungen, die sofortige Aufmerksamkeit erfordern</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Confirmation — window-frame chrome to match the app-wide modal design */}
            <WindowFrame
                isOpen={showConfirmModal}
                onClose={handleCloseModal}
                title="Confirm Broadcast"
                subtitle="Prioritäts-Rundfunksystem"
                icon="fa-solid fa-tower-broadcast"
                color="red"
                width="max-w-md"
            >
                <div className="p-6 space-y-5">
                    <p className="text-xs text-slate-500 uppercase tracking-wider text-center">Dadurch werden alle aktiven Sitzungen benachrichtigt</p>

                    <div className="bg-black/30 border border-slate-800 p-4 rounded-lg text-left">
                        <p className="font-mono text-sm text-slate-300 whitespace-pre-wrap uppercase wrap-break-word leading-relaxed">{message}</p>
                    </div>

                    {!isArmed ? (
                        <button
                            onClick={handleArmClick}
                            disabled={isArming}
                            className={`w-full py-3.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                                isArming
                                    ? 'bg-red-950/50 border border-red-500/30 text-red-400 cursor-wait'
                                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                            }`}
                        >
                            {isArming ? (
                                <span className="flex items-center justify-center gap-2">
                                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                                    Arming... {armCountdown}
                                </span>
                            ) : (
                                'Arm System'
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] text-red-400 uppercase tracking-widest font-bold">Bewaffnet</span>
                            </div>
                            <button
                                onClick={handleTransmit}
                                disabled={isBroadcasting}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {isBroadcasting ? (
                                    <><i className="fa-solid fa-circle-notch animate-spin"></i>Übertragen…</>
                                ) : (
                                    <><i className="fa-solid fa-paper-plane"></i>Übertragen</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </WindowFrame>
        </div>
    );
};

export default EAMBroadcastTab;
