import React, { ReactNode } from 'react';

interface Props {
    label: string;
    count?: number | string;
    action?: ReactNode;
    icon?: string;
    className?: string;
}

export default function SectionLabel({ label, count, action, icon, className = '' }: Props) {
    return (
        <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                {icon && <i className={`fa-solid ${icon}`} aria-hidden />}
                <span>{label}</span>
                {count != null && (
                    <span className="font-mono text-slate-600 tracking-normal">· {count}</span>
                )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
