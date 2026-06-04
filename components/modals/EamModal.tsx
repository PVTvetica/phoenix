
import React, { useState, useEffect, useRef } from 'react';
import { playCachedSound } from '../../lib/audioCache';

interface EamModalProps {
    message: string;
    onClose: () => void;
    soundUrl?: string;
    volume?: number;
}

const EamModal: React.FC<EamModalProps> = ({ message, onClose, soundUrl, volume = 50 }) => {
    const [countdown, setCountdown] = useState(10);
    const intervalRef = useRef<number | null>(null);

    // Play EAM sound on mount to guarantee audio regardless of how the modal
    // was triggered. Routed through the audio cache so first-fire latency
    // doesn't lag behind the modal animation.
    useEffect(() => {
        playCachedSound(soundUrl, volume);
    }, [soundUrl, volume]);

    useEffect(() => {
        intervalRef.current = window.setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 overflow-hidden bg-slate-950/95 backdrop-blur-2xl">
            {/* Background Alert Pattern */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.03)_0px,rgba(220,38,38,0.03)_1px,transparent_1px,transparent_20px)] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,transparent_70%)] animate-pulse pointer-events-none"></div>
            
            {/* CRT/Scanline Overlay Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-size-[100%_4px,3px_100%] pointer-events-none z-0"></div>

            <div className="relative w-full max-w-3xl bg-slate-900 border-y-4 border-red-600 shadow-[0_0_100px_rgba(220,38,38,0.4)] flex flex-col overflow-hidden z-10">
                {/* Decorative scanning line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(220,38,38,1)] animate-scan-fast z-20 opacity-50"></div>

                {/* Header */}
                <div className="bg-red-950/90 p-5 border-b border-red-500/30 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-red-600 flex items-center justify-center rounded-xs shadow-lg shadow-red-600/20 animate-pulse">
                            <i className="fa-solid fa-radiation text-3xl text-white"></i>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-[0.15em] uppercase leading-none mb-1 shadow-black drop-shadow-xs">Notfall-Aktionsmeldung</h1>
                            <p className="text-red-400 font-mono text-xs tracking-[0.3em] uppercase font-bold">Priorität Alpha // Überschreiben autorisiert</p>
                        </div>
                    </div>
                    <div className="hidden sm:block text-right">
                        <p className="text-red-500/20 font-black text-6xl font-mono leading-none tracking-tighter select-none">NOTFALL</p>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 md:p-12 bg-black/60 relative min-h-[300px] flex items-center justify-center">
                     {/* "Classified" Watermark */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-8 border-red-500/5 text-red-500/5 text-8xl md:text-9xl font-black uppercase pointer-events-none whitespace-nowrap select-none">ALARM</div>

                    <div className="relative z-10 w-full">
                        <div className="font-mono text-red-50 text-lg md:text-2xl leading-relaxed whitespace-pre-wrap uppercase tracking-wide drop-shadow-md text-center font-bold">
                            {message}
                        </div>
                    </div>
                </div>

                {/* Footer / Controls */}
                <div className="bg-slate-900 border-t border-red-500/30 p-6 flex flex-col items-center gap-5 relative z-10">
                    <p className="text-red-400/60 text-[10px] font-mono uppercase tracking-[0.2em] animate-pulse">Zur Wiederherstellung der Terminalsteuerung ist eine Bestätigung erforderlich</p>
                    
                    <button
                        onClick={onClose}
                        disabled={countdown > 0}
                        className={`
                            relative overflow-hidden w-full max-w-md py-4 rounded-xs font-black uppercase tracking-[0.2em] text-sm transition-all duration-300
                            ${countdown > 0 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:shadow-[0_0_50px_rgba(220,38,38,0.8)] scale-100 hover:scale-[1.02] border border-red-500 cursor-pointer'}
                        `}
                    >
                        {countdown > 0 ? (
                            <div className="flex items-center justify-center gap-3 relative z-10">
                                <span>Entschlüsselungsprotokoll</span>
                                <span className="font-mono text-red-400">00:0{countdown}</span>
                            </div>
                        ) : (
                            <span className="relative z-10 animate-pulse">Bestätigen und verwerfen</span>
                        )}
                        
                        {/* Progress Bar Background for countdown */}
                        {countdown > 0 && (
                            <div 
                                className="absolute top-0 left-0 h-full bg-slate-700/50 transition-all duration-1000 ease-linear z-0"
                                style={{ width: `${(countdown / 10) * 100}%` }}
                            ></div>
                        )}
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes scan-fast {
                    0% { top: -5%; opacity: 0; }
                    10% { opacity: 0.8; }
                    90% { opacity: 0.8; }
                    100% { top: 105%; opacity: 0; }
                }
                .animate-scan-fast {
                    animation: scan-fast 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
};

export default EamModal;
