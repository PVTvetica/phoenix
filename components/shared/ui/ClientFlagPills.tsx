import React from 'react';

// Visual-only pills for the affiliate / VIP client flags. Both can show at
// once. Returns null when neither flag is set so callers can drop the
// component into a row without conditional wrappers. Server-side toggle
// handlers reject these flags on non-Client users — no role check needed
// here.
//
// VIP   = amber + crown   (high-value individual)
// Affil = purple + handshake (partner / referral relationship)

interface ClientFlagPillsProps {
    isAffiliate?: boolean;
    isVip?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

const ClientFlagPills: React.FC<ClientFlagPillsProps> = ({ isAffiliate, isVip, size = 'sm', className = '' }) => {
    if (!isAffiliate && !isVip) return null;
    const pillCls = size === 'sm'
        ? 'text-[9px] px-1.5 py-0.5'
        : 'text-[10px] px-2 py-0.5';
    return (
        <span className={`inline-flex items-center gap-1 ${className}`}>
            {isVip && (
                <span
                    className={`${pillCls} font-black uppercase tracking-widest rounded-sm border bg-amber-500/10 text-amber-300 border-amber-500/30`}
                    title="VIP client"
                >
                    <i className="fa-solid fa-crown mr-1" aria-hidden /> VIP
                </span>
            )}
            {isAffiliate && (
                <span
                    className={`${pillCls} font-black uppercase tracking-widest rounded-sm border bg-purple-500/10 text-purple-300 border-purple-500/30`}
                    title="Affiliate client"
                >
                    <i className="fa-solid fa-handshake mr-1" aria-hidden />Partner</span>
            )}
        </span>
    );
};

export default ClientFlagPills;
