import React, { ReactNode } from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    children: ReactNode;
    accent?: AccentKey;
    variant?: 'default' | 'highlighted' | 'dashed' | 'nested';
    padding?: 'sm' | 'md' | 'lg' | 'none';
    className?: string;
    onClick?: () => void;
}

const PAD_MAP = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-5 lg:p-6',
};

export default function PortalCard({ children, accent, variant = 'default', padding = 'md', className = '', onClick }: Props) {
    const a = accent ? ACCENTS[accent] : null;

    let containerCls = 'rounded-xl border ';
    if (variant === 'highlighted' && a) {
        containerCls += `${a.bg} ${a.border}`;
    } else if (variant === 'dashed') {
        containerCls += 'bg-slate-900/40 border-dashed border-white/10';
    } else if (variant === 'nested') {
        containerCls += 'bg-slate-800/50 border-white/5';
    } else {
        containerCls += 'bg-slate-900 border-white/10';
    }

    const Tag = onClick ? 'button' : 'div';
    const interactive = onClick ? 'text-left hover:border-white/20 transition-colors cursor-pointer' : '';

    return (
        <Tag
            onClick={onClick}
            className={`${containerCls} ${PAD_MAP[padding]} ${interactive} ${className}`.trim()}
        >
            {children}
        </Tag>
    );
}
