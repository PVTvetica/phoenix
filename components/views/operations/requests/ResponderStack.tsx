import React from 'react';
import type { User } from '../../../../types';

interface Props {
    members: User[];
    leadId?: number;
    max?: number;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Overlapping avatar stack. The lead responder (if `leadId` matches) gets a
 * gold ring; everyone else gets a slate ring that matches the card surface.
 * Beyond `max` members, a "+N" chip renders in place of further avatars.
 */
export default function ResponderStack({ members, leadId, max = 4, size = 'sm', className = '' }: Props) {
    if (!members || members.length === 0) return null;

    const visible = members.slice(0, max);
    const overflow = members.length - visible.length;
    const dim = size === 'md' ? 'w-9 h-9 text-xs' : 'w-7 h-7 text-[10px]';

    return (
        <div className={`flex items-center ${className}`}>
            <div className="flex -space-x-2">
                {visible.map(m => {
                    const isLead = m.id === leadId;
                    const ring = isLead ? 'ring-amber-400' : 'ring-slate-950';
                    return (
                        <div
                            key={m.id}
                            className={`relative rounded-full ring-2 ${ring} overflow-hidden ${dim} bg-slate-800 flex items-center justify-center`}
                            title={`${m.name}${isLead ? ' · Lead' : ''}`}
                        >
                            {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-user text-slate-400" aria-hidden />
                            )}
                            {isLead && (
                                <i className="fa-solid fa-crown absolute -top-1 -right-1 text-[8px] text-amber-400 drop-shadow-sm" aria-hidden />
                            )}
                        </div>
                    );
                })}
                {overflow > 0 && (
                    <div
                        className={`rounded-full ring-2 ring-slate-950 ${dim} bg-slate-800 flex items-center justify-center font-mono font-bold text-slate-300`}
                        title={`${overflow} more`}
                    >
                        +{overflow}
                    </div>
                )}
            </div>
        </div>
    );
}
