import React from 'react';

const TIER_STYLES: Record<string, { label: string; pill: string }> = {
    free:       { label: 'Free',       pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    starter:    { label: 'Starter',    pill: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    standard:   { label: 'Standard',   pill: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    plus:       { label: 'Plus',       pill: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    pro:        { label: 'Pro',        pill: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    enterprise: { label: 'Enterprise', pill: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const DEFAULT_TIER = TIER_STYLES.free;

interface Props {
    tier: string | null | undefined;
    size?: 'sm' | 'md';
    labelOverride?: string;
}

export default function TierBadge({ tier, size = 'md', labelOverride }: Props) {
    const t = (tier && TIER_STYLES[tier]) || DEFAULT_TIER;
    const sizeCls = size === 'sm'
        ? 'px-1.5 py-0.5 text-[9px]'
        : 'px-2 py-0.5 text-[10px]';

    return (
        <span className={`inline-flex items-center rounded-sm border font-black uppercase tracking-widest ${t.pill} ${sizeCls}`}>
            {labelOverride ?? t.label}
        </span>
    );
}
