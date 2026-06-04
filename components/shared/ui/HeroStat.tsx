import React from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    label: string;
    value: string | number;
    sub?: string;
    icon: string;
    accent?: AccentKey;
    /** Highlight the tile (e.g. when value > 0 for an "active count" tile). */
    emphasize?: boolean;
    onClick?: () => void;
}

/**
 * Compact stat tile sized for in-hero stat strips. A denser cousin of
 * MetricCard — transparent-ish background so it reads correctly over the
 * hero gradient, smaller typography, and a tighter footprint so 4 tiles
 * fit comfortably next to a callsign chip + title.
 */
export default function HeroStat({ label, value, sub, icon, accent = 'sky', emphasize, onClick }: Props) {
    const a = ACCENTS[accent];
    const clickable = !!onClick;
    const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 text-left transition ${
                emphasize
                    ? `${a.border} ${a.bg} ring-1 ${a.ring}`
                    : 'border-white/10 bg-slate-950/40'
            } ${clickable ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                    {label}
                </span>
                <i className={`fa-solid ${icon} ${a.text} text-sm shrink-0`} aria-hidden />
            </div>
            <div className="text-sm sm:text-base font-black text-white leading-none font-mono truncate">
                {displayValue}
            </div>
            {sub && <div className="text-[10px] text-slate-500 mt-1 truncate">{sub}</div>}
        </button>
    );
}
