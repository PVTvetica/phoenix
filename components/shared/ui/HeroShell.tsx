import React from 'react';
import CallsignChip from './CallsignChip';
import { ACCENTS, AccentKey } from './accents';

interface Props {
    chipLabel: string;
    chipIcon?: string;
    chipAccent?: AccentKey;
    chipPulse?: boolean;

    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Renders a small animated "Syncing" pill next to the title. */
    syncing?: boolean;

    /** Right-side action cluster — buttons, toggles, inline forms. */
    actions?: React.ReactNode;

    /** HeroStat tiles. The grid wrapper is `hidden md:grid` so mobile drops the whole strip. */
    stats?: React.ReactNode;

    /** Number of columns the stats grid uses at md+. Defaults to 4. */
    statsCols?: 2 | 3 | 4;

    /** Scrollable tab bar rendered below stats. */
    tabs?: React.ReactNode;

    /**
     * Breakpoint at which the title block and actions move side-by-side.
     * Defaults to `sm` — use `lg` when the action cluster is wide (e.g. an
     * inline search form) and would crowd the title on tablets.
     */
    titleBreakpoint?: 'sm' | 'lg';
}

/**
 * Shared mobile-first page hero for dashboard views. Owns the gradient shell,
 * blur orb, chip, title/subtitle, actions, stats grid, and tab bar — with
 * responsive rules that collapse the header on narrow screens (chip + stats
 * hidden < md, compressed padding, smaller title) so content below the fold
 * stays accessible on phones.
 */
export default function HeroShell({
    chipLabel,
    chipIcon,
    chipAccent = 'sky',
    chipPulse = true,
    title,
    subtitle,
    syncing = false,
    actions,
    stats,
    statsCols = 4,
    tabs,
    titleBreakpoint = 'sm',
}: Props) {
    const a = ACCENTS[chipAccent];
    const rowClass = titleBreakpoint === 'lg'
        ? 'flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-4 mb-3 sm:mb-5'
        : 'flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-5';

    return (
        <div className={`shrink-0 relative overflow-hidden border-b border-white/5 ${a.heroGrad}`}>
            <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] ${a.heroOrb} rounded-full blur-[120px] pointer-events-none`}
                aria-hidden
            />

            <div className="relative px-4 sm:px-8 pt-4 sm:pt-10 pb-0">
                <div className={rowClass}>
                    <div className="min-w-0">
                        <div className="hidden sm:block">
                            <CallsignChip label={chipLabel} icon={chipIcon} accent={chipAccent} pulse={chipPulse} />
                        </div>
                        <h1 className="sm:mt-3 text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight flex items-center gap-3 flex-wrap">
                            {title}
                            {syncing && (
                                <span className={`${a.text} text-xs font-mono uppercase tracking-widest animate-pulse inline-flex items-center gap-1`}>
                                    <i className="fa-solid fa-arrows-rotate fa-spin" aria-hidden />Synchronisierung</span>
                            )}
                        </h1>
                        {subtitle && (
                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {actions && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {actions}
                        </div>
                    )}
                </div>

                {stats && (
                    <div className={`relative hidden md:grid grid-cols-2 gap-3 mb-5 ${statsCols === 2 ? 'md:grid-cols-2' : statsCols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
                        {stats}
                    </div>
                )}

                {tabs && (
                    <div className="relative flex gap-0 -mb-px overflow-x-auto custom-scrollbar">
                        {tabs}
                    </div>
                )}
            </div>
        </div>
    );
}
