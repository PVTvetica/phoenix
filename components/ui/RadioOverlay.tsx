
import React from 'react';
import { useRadio } from '../../contexts/RadioContext';
import TXLevelMeter from './TXLevelMeter';

const RadioOverlay: React.FC = () => {
    const { isTransmitting, activeSpeakers, currentChannel, isConnected, localAudioLevel } = useRadio();

    if (!isConnected || (!isTransmitting && activeSpeakers.length === 0)) return null;

    return (
        <div className="fixed top-20 right-6 z-90 flex flex-col items-end space-y-2 pointer-events-none">
            {isTransmitting && (
                <div className="bg-red-600/20 border border-red-500 rounded-sm px-3 py-1.5 animate-pulse w-44">
                    <div className="flex items-center mb-1">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mr-2">TX</span>
                        <span className="text-sm font-bold text-white uppercase tracking-tighter truncate">{currentChannel?.name}</span>
                    </div>
                    <TXLevelMeter level={localAudioLevel} active={true} segments={12} />
                </div>
            )}

            {activeSpeakers.map(name => (
                <div key={name} className="flex items-center bg-sky-600/20 border border-sky-500 rounded-sm px-3 py-1.5">
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mr-2">RX</span>
                    <span className="text-sm font-bold text-white tracking-tighter">{name}</span>
                </div>
            ))}
        </div>
    );
};

export default RadioOverlay;
