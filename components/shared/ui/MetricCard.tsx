import React from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    label: string;
    value: string | number;
    sub?: string;
    icon: string;
    accent?: AccentKey;
    onClick?: () => void;
    emphasize?: boolean;
}

export default function MetricCard({ label, value, sub, icon, accent = 'sky', onClick, emphasize }: Props) {
    const a = ACCENTS[accent];
    const clickable = !!onClick;
    const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={`text-left relative overflow-hidden bg-slate-900 border rounded-xl p-5 transition ${
                emphasize ? `border-amber-500/40 ring-1 ${a.ring}` : 'border-white/10'
            } ${clickable ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'}`}
        >
            <div className={`absolute inset-0 bg-linear-to-br ${a.grad} pointer-events-none`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                    <i className={`fa-solid ${icon} ${a.text}`} aria-hidden />
                </div>
                <div className="text-3xl font-black text-white leading-none font-mono">{displayValue}</div>
                {sub && <div className="text-xs text-slate-500 mt-2">{sub}</div>}
            </div>
        </button>
    );
}
