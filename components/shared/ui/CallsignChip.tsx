import React from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    label: string;
    icon?: string;
    accent?: AccentKey;
    pulse?: boolean;
    className?: string;
}

export default function CallsignChip({ label, icon, accent = 'sky', pulse = false, className = '' }: Props) {
    const a = ACCENTS[accent];
    return (
        <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm border font-mono text-[10px] uppercase tracking-widest ${a.bg} ${a.border} ${a.text} ${className}`}
        >
            {pulse && <span className={`w-1.5 h-1.5 rounded-full ${a.dot} animate-pulse`} />}
            {icon && <i className={`fa-solid ${icon}`} aria-hidden />}
            <span>{label}</span>
        </span>
    );
}
