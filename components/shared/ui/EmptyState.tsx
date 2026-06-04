import React, { ReactNode } from 'react';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    icon: string;
    heading: string;
    description?: string;
    accent?: AccentKey;
    action?: ReactNode;
    compact?: boolean;
}

export default function EmptyState({ icon, heading, description, accent = 'slate', action, compact = false }: Props) {
    const a = ACCENTS[accent];
    const padding = compact ? 'p-6' : 'p-12';
    const iconSize = compact ? 'text-2xl' : 'text-4xl';

    return (
        <div className={`text-center ${padding}`}>
            <i className={`fa-solid ${icon} ${iconSize} ${a.text} opacity-40 mb-3`} aria-hidden />
            <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold text-white mb-1`}>{heading}</h3>
            {description && <p className="text-sm text-slate-500 max-w-md mx-auto">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
