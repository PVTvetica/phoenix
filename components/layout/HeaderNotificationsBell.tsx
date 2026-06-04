import React, { useEffect, useRef, useState } from 'react';

import { useData } from '../../contexts/DataContext';
import { useIntel } from '../../contexts/IntelContext';
import { useActionRequired, ActionItem, ActionItemAccent } from '../../hooks/useActionRequired';
import { ACCENTS } from '../shared/ui/accents';
import { useNavigation } from '../../contexts/NavigationContext';

const SAFE_ACCENT: Record<ActionItemAccent, keyof typeof ACCENTS> = {
    amber: 'amber',
    rose: 'rose',
    sky: 'sky',
    purple: 'purple',
    emerald: 'emerald',
    indigo: 'indigo',
};

export default function HeaderNotificationsBell() {
    const { items, count, criticalCount } = useActionRequired();
    const { setActiveView, viewRequestDetails, setSelectedBulletin } = useNavigation();
    const { hydratedServiceRequests } = useData();
    const { activeBulletins } = useIntel();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleClick = (item: ActionItem) => {
        setOpen(false);
        if (item.type === 'intel' && item.targetId) {
            const bulletin = Array.isArray(activeBulletins)
                ? (activeBulletins as any[]).find((b: any) => String(b.id) === item.targetId)
                : null;
            if (bulletin) {
                setSelectedBulletin(bulletin);
                return;
            }
        }
        if (item.type === 'request' && item.targetId) {
            const req = (hydratedServiceRequests as any[]).find((r) => r.id === item.targetId);
            if (req) {
                viewRequestDetails(req);
                return;
            }
        }
        // Sub-tab deep links — match the localStorage + custom-event pattern
        // each section already listens for. Setting both ensures the tab is
        // applied whether the section view is mounting fresh or already mounted.
        if (item.targetTab) {
            if (item.targetView === 'hr') {
                localStorage.setItem('hr_active_tab', item.targetTab);
                window.dispatchEvent(new CustomEvent('app:navigate-hr-tab', { detail: item.targetTab }));
            }
        }
        setActiveView(item.targetView as any);
    };

    const accentCls = count === 0
        ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
        : criticalCount > 0
            ? 'text-rose-400 hover:bg-rose-500/5'
            : 'text-amber-400 hover:bg-amber-500/5';

    return (
        <div className="relative h-full" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className={`relative flex items-center gap-3 px-5 h-full border-l border-white/5 transition-all duration-200 ${accentCls}`}
                aria-label="Notifications"
            >
                <div className="relative">
                    <i className={`fa-solid fa-bell text-lg ${criticalCount > 0 ? 'animate-pulse' : ''}`} />
                    {count > 0 && (
                        <span className={`absolute -top-1.5 -right-1.5 text-white text-[9px] font-black px-1 rounded-xs shadow-xs leading-none min-w-[14px] h-[14px] flex items-center justify-center ${criticalCount > 0 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                            {count > 99 ? '99+' : count}
                        </span>
                    )}
                </div>
                <span className="text-xs font-bold uppercase tracking-wide hidden md:block">Warnungen</span>
            </button>

            {open && (
                <div className="absolute top-full right-0 mt-1 w-80 max-w-[calc(100vw-1rem)] bg-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Aufmerksamkeit erforderlich</p>
                            <p className="text-sm font-bold text-white">
                                {count === 0 ? 'All clear' : `${count} ${count === 1 ? 'item' : 'items'}`}
                                {criticalCount > 0 && <span className="ml-2 text-rose-300">· {criticalCount} critical</span>}
                            </p>
                        </div>
                        {criticalCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                        )}
                    </div>
                    {count === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <i className="fa-solid fa-check-circle text-2xl text-slate-600 mb-2" />
                            <p className="text-xs text-slate-500">Nichts erfordert Deine Aufmerksamkeit.</p>
                        </div>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto divide-y divide-white/5">
                            {items.map((item) => {
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
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
