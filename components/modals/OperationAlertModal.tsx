
import React, { useState, useEffect } from 'react';
import { useFormatDate } from '../../contexts/AuthContext';
import { formatUserTime } from '../../lib/time';
import { playCachedSound } from '../../lib/audioCache';

interface OperationAlertModalProps {
    message: string;
    senderName?: string;
    operationId?: string;
    onClose: () => void;
    soundUrl?: string;
    volume?: number;
}

const OperationAlertModal: React.FC<OperationAlertModalProps> = ({ message, senderName, onClose, soundUrl, volume = 50 }) => {
    const fmt = useFormatDate();
    const [isVisible, setIsVisible] = useState(false);

    // Play alert sound on mount — routed through audio cache so the alert
    // chime plays in sync with the modal animation rather than catching up
    // a beat late on first fire.
    useEffect(() => {
        playCachedSound(soundUrl, volume);
    }, [soundUrl, volume]);

    // Animate in
    useEffect(() => {
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200);
    };

    return (
        <div className={`fixed inset-0 z-900 flex items-center justify-center p-4 transition-all duration-200 ${isVisible ? 'bg-slate-950/80 backdrop-blur-xs' : 'bg-transparent'}`}
            onClick={handleClose}>
            <div className={`relative w-full max-w-lg transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
                onClick={e => e.stopPropagation()}>

                {/* Glow effect */}
                <div className="absolute -inset-1 bg-linear-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-xl blur-lg animate-pulse"></div>

                <div className="relative bg-slate-900 rounded-xl border border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden">
                    {/* Scanning line */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-scan-alert z-20 opacity-60"></div>

                    {/* Header */}
                    <div className="bg-amber-950/60 px-5 py-4 border-b border-amber-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-600 flex items-center justify-center rounded-lg shadow-lg shadow-amber-600/20 animate-pulse">
                                <i className="fa-solid fa-tower-broadcast text-lg text-white"></i>
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-wider uppercase leading-none">Betriebsalarm</h2>
                                <p className="text-amber-400/80 text-[10px] font-mono uppercase tracking-[0.2em] mt-0.5">
                                    Priority Broadcast {senderName ? `// ${senderName}` : ''}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 bg-slate-900/80 relative">
                        {/* Subtle watermark */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500/3 text-7xl font-black uppercase pointer-events-none select-none">ALARM</div>

                        <div className="relative z-10">
                            <p className="text-white text-base leading-relaxed font-semibold whitespace-pre-wrap">
                                {message}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-950/60 border-t border-amber-500/20 px-5 py-3 flex items-center justify-between">
                        <p className="text-amber-500/40 text-[9px] font-mono uppercase tracking-wider">
                            {formatUserTime(new Date().toISOString(), { timezone: 'UTC', dateFormat: fmt.prefs.dateFormat })} UTC
                        </p>
                        <button onClick={handleClose}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-900/30 active:scale-95 transition-all">Anerkennen</button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan-alert {
                    0% { left: -100%; width: 40%; opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.8; }
                    100% { left: 100%; width: 40%; opacity: 0; }
                }
                .animate-scan-alert {
                    animation: scan-alert 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default OperationAlertModal;
