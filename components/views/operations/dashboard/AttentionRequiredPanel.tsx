import React, { useState } from 'react';
import { useData } from '../../../../contexts/DataContext';
import { useIntel } from '../../../../contexts/IntelContext';
import { useActionRequired, ActionItem, ActionItemAccent } from '../../../../hooks/useActionRequired';
import { CallsignChip } from '../../../shared/ui';
import { ACCENTS } from '../../../shared/ui/accents';
import { useNavigation } from '../../../../contexts/NavigationContext';

const INITIAL_VISIBLE = 5;

const SAFE_ACCENT: Record<ActionItemAccent, keyof typeof ACCENTS> = {
    amber: 'amber',
    rose: 'rose',
    sky: 'sky',
    purple: 'purple',
    emerald: 'emerald',
    indigo: 'indigo',
};

interface Props {
    /** If provided, shown when the user has no pending items. Defaults to hidden. */
    showWhenEmpty?: boolean;
}

export default function AttentionRequiredPanel({ showWhenEmpty = false }: Props) {
    const { items, count, criticalCount } = useActionRequired();
    const { setActiveView, viewRequestDetails, setSelectedBulletin } = useNavigation();
    const { hydratedServiceRequests } = useData();
    const { activeBulletins } = useIntel();
    const [expanded, setExpanded] = useState(false);

    if (count === 0) {
        if (!showWhenEmpty) return null;
        return (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <i className="fa-solid fa-circle-check text-emerald-300" />
                </div>
                <div>
                    <p className="text-sm font-bold text-emerald-200">Alles klar</p>
                    <p className="text-[11px] text-slate-400">Für Du bist keine Maßnahmen anhängig.</p>
                </div>
            </div>
        );
    }

    const visible = expanded ? items : items.slice(0, INITIAL_VISIBLE);
    const hasMore = items.length > INITIAL_VISIBLE;
    const visibleAction = visible.filter((i) => i.category === 'action');
    const visibleAdvisory = visible.filter((i) => i.category === 'advisory');
    const actionCount = items.filter((i) => i.category === 'action').length;
    const advisoryCount = items.filter((i) => i.category === 'advisory').length;

    // Banner colour: rose if anything critical, amber if there's an action backlog, sky for advisory-only.
    const banner: 'rose' | 'amber' | 'sky' =
        criticalCount > 0 ? 'rose' : actionCount > 0 ? 'amber' : 'sky';

    const bannerChrome: Record<typeof banner, { border: string; bg: string; subBorder: string; subBg: string; iconBorder: string; iconBg: string; iconText: string; label: string }> = {
        rose: {
            border: 'border-rose-500/30', bg: 'bg-rose-500/5',
            subBorder: 'border-rose-500/20', subBg: 'bg-rose-500/10',
            iconBorder: 'border-rose-500/30', iconBg: 'bg-rose-500/15', iconText: 'text-rose-300',
            label: 'text-rose-300/80',
        },
        amber: {
            border: 'border-amber-500/30', bg: 'bg-amber-500/5',
            subBorder: 'border-amber-500/20', subBg: 'bg-amber-500/10',
            iconBorder: 'border-amber-500/30', iconBg: 'bg-amber-500/15', iconText: 'text-amber-300',
            label: 'text-amber-300/80',
        },
        sky: {
            border: 'border-sky-500/30', bg: 'bg-sky-500/5',
            subBorder: 'border-sky-500/20', subBg: 'bg-sky-500/10',
            iconBorder: 'border-sky-500/30', iconBg: 'bg-sky-500/15', iconText: 'text-sky-300',
            label: 'text-sky-300/80',
        },
    };
    const chrome = bannerChrome[banner];

    // Header text reflects the mix: actions dominate, advisories are secondary.
    let headerEyebrow: string;
    let headerIcon: string;
    let headerTitle: React.ReactNode;
    if (actionCount > 0 && advisoryCount > 0) {
        headerEyebrow = 'Dashboard Notifications';
        headerIcon = 'fa-triangle-exclamation';
        headerTitle = (
            <>
                {actionCount} {actionCount === 1 ? 'action' : 'actions'}
                <span className="text-slate-500"> · </span>
                {advisoryCount} {advisoryCount === 1 ? 'advisory' : 'advisories'}
                {criticalCount > 0 && <span className="ml-2 text-rose-300">· {criticalCount} critical</span>}
            </>
        );
    } else if (actionCount > 0) {
        headerEyebrow = 'Attention Required';
        headerIcon = 'fa-triangle-exclamation';
        headerTitle = (
            <>
                {actionCount} {actionCount === 1 ? 'item' : 'items'} waiting on you
                {criticalCount > 0 && <span className="ml-2 text-rose-300">· {criticalCount} critical</span>}
            </>
        );
    } else {
        headerEyebrow = 'Advisories';
        headerIcon = 'fa-satellite-dish';
        headerTitle = (
            <>
                {advisoryCount} aktive {advisoryCount === 1 ? 'Meldung' : 'Meldungen'}
                {criticalCount > 0 && <span className="ml-2 text-rose-300">· {criticalCount} critical</span>}
            </>
        );
    }

    const handleClick = (item: ActionItem) => {
        // Advisories: open detail in-place rather than leaving the dashboard.
        if (item.type === 'intel' && item.targetId) {
            const bulletin = Array.isArray(activeBulletins)
                ? (activeBulletins as any[]).find((b: any) => String(b.id) === item.targetId)
                : null;
            if (bulletin) {
                setSelectedBulletin(bulletin);
                return;
            }
        }
        // Deep-link to specific request detail if we can find it
        if (item.type === 'request' && item.targetId) {
            const req = (hydratedServiceRequests as any[]).find((r: any) => r.id === item.targetId);
            if (req) {
                viewRequestDetails(req);
                return;
            }
        }
        // Otherwise route to the feature view
        setActiveView(item.targetView as any);
    };

    const renderItem = (item: ActionItem) => {
        const a = ACCENTS[SAFE_ACCENT[item.accent]];
        return (
            <li key={item.id}>
                <button
                    onClick={() => handleClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                >
                    <div className={`w-8 h-8 rounded-lg ${a.bg} border ${a.border} ${a.text} flex items-center justify-center shrink-0`}>
                        <i className={`fa-solid ${item.icon} text-sm`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                        {item.subtitle && (
                            <div className="text-[11px] text-slate-500 truncate">{item.subtitle}</div>
                        )}
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0" />
                </button>
            </li>
        );
    };

    const showGroupHeaders = visibleAction.length > 0 && visibleAdvisory.length > 0;

    return (
        <div className={`rounded-xl border ${chrome.border} ${chrome.bg} overflow-hidden`}>
            <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${chrome.subBorder} ${chrome.subBg}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg border ${chrome.iconBorder} ${chrome.iconBg} ${chrome.iconText} flex items-center justify-center shrink-0`}>
                        <i className={`fa-solid ${headerIcon}`} />
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[10px] font-mono uppercase tracking-widest ${chrome.label}`}>
                            {headerEyebrow}
                        </p>
                        <p className="text-sm font-bold text-white">{headerTitle}</p>
                    </div>
                </div>
                {criticalCount > 0 && <CallsignChip label={actionCount > 0 ? 'Action · Now' : 'Critical'} accent="rose" pulse />}
            </div>

            {visibleAction.length > 0 && (
                <>
                    {showGroupHeaders && (
                        <div className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <i className="fa-solid fa-triangle-exclamation text-amber-400/70" />Aktion erforderlich</div>
                    )}
                    <ul className="divide-y divide-white/5">
                        {visibleAction.map(renderItem)}
                    </ul>
                </>
            )}

            {visibleAdvisory.length > 0 && (
                <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-2 border-t border-white/5">
                        <i className="fa-solid fa-satellite-dish text-sky-300/70" />Hinweise<span className="text-slate-600 normal-case tracking-normal font-sans">· no action required</span>
                    </div>
                    <ul className="divide-y divide-white/5">
                        {visibleAdvisory.map(renderItem)}
                    </ul>
                </>
            )}

            {hasMore && (
                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="w-full py-2 text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-slate-300 border-t border-white/5 transition-colors"
                >
                    {expanded ? 'Show fewer' : `Show all · ${items.length}`}
                </button>
            )}
        </div>
    );
}
