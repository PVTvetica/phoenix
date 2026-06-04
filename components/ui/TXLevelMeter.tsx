import React from 'react';

export interface TXLevelMeterProps {
    /** 0–1 normalised RMS. Values >1 are clamped, <0 floored. */
    level: number;
    /** When false, render the bar in a dim "off" state regardless of level. */
    active: boolean;
    orientation?: 'horizontal' | 'vertical';
    /** Default 10 segments. */
    segments?: number;
    className?: string;
    /** Visible label like "TX" rendered alongside the bar. */
    label?: string;
}

/**
 * Segmented LED-style level meter for the local mic. Pure presentational —
 * caller polls audio energy and passes `level` (0–1).
 *
 * Colour ramp follows the standard tactical-radio meter look (green → amber
 * → red). When `active=false`, all segments render in their "off" state so
 * the meter reads as armed-but-idle rather than invisible.
 */
const TXLevelMeter: React.FC<TXLevelMeterProps> = ({
    level,
    active,
    orientation = 'horizontal',
    segments = 10,
    className = '',
    label,
}) => {
    const clamped = Math.max(0, Math.min(1, level));
    const lit = active ? Math.round(clamped * segments) : 0;

    const colourFor = (i: number) => {
        // First 60% green, next 20% amber, top 20% red.
        const greenCut = Math.floor(segments * 0.6);
        const amberCut = Math.floor(segments * 0.8);
        if (i < greenCut) return 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.7)]';
        if (i < amberCut) return 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.7)]';
        return 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.7)]';
    };

    const offClass = 'bg-slate-800 border border-slate-700/50';

    const isHorizontal = orientation === 'horizontal';
    const containerCls = isHorizontal
        ? 'flex flex-row items-center gap-0.5'
        : 'flex flex-col-reverse items-stretch gap-0.5';
    const segmentCls = isHorizontal
        ? 'h-2 flex-1 rounded-xs transition-all duration-75'
        : 'w-2 flex-1 rounded-xs transition-all duration-75';

    const segmentEls: React.ReactNode[] = [];
    for (let i = 0; i < segments; i++) {
        const isLit = i < lit;
        segmentEls.push(
            <div
                key={i}
                className={`${segmentCls} ${isLit ? colourFor(i) : offClass}`}
                aria-hidden
            />
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {label && (
                <span
                    className={`text-[9px] font-black uppercase tracking-widest shrink-0 ${active ? 'text-green-400' : 'text-slate-600'}`}
                >
                    {label}
                </span>
            )}
            <div className={`${containerCls} flex-1`} role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={clamped}>
                {segmentEls}
            </div>
        </div>
    );
};

export default TXLevelMeter;
