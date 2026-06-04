import React from 'react';
import type { AccentKey } from './accents';

interface Props {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    accent: AccentKey;
    icon?: string;
    children: React.ReactNode;
    title?: string;
    type?: 'button' | 'submit';
    className?: string;
}

/**
 * Tint-style action button for use inside HeroShell's `actions` slot. Chosen
 * over a solid-filled treatment so multiple actions can sit side-by-side at
 * equal visual weight without one shouting over the others. Tailwind cannot
 * build class names dynamically, so the accent → class mapping lives in the
 * table below.
 */
const BTN_TINT: Record<AccentKey, string> = {
    sky:     'text-sky-300 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
    purple:  'text-purple-300 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20',
    amber:   'text-amber-300 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
    rose:    'text-rose-300 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
    indigo:  'text-indigo-300 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20',
    cyan:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20',
    orange:  'text-orange-300 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
    red:     'text-red-300 bg-red-500/10 border-red-500/30 hover:bg-red-500/20',
    slate:   'text-slate-300 bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20',
};

export default function HeroActionButton({
    onClick,
    disabled = false,
    accent,
    icon,
    children,
    title,
    type = 'button',
    className = '',
}: Props) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${BTN_TINT[accent]} ${className}`}
        >
            {icon && <i className={`fa-solid ${icon}`} aria-hidden />}
            {children}
        </button>
    );
}
