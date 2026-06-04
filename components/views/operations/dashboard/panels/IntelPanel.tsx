import React, { useMemo } from 'react';
import { useOperations } from '../../../../../contexts/OperationsContext';
import { useIntel } from '../../../../../contexts/IntelContext';
import { useAuth } from '../../../../../contexts/AuthContext';

import { WarrantStatus } from '../../../../../types';
import { EmptyState } from '../../../../shared/ui';
import { useNavigation } from '../../../../../contexts/NavigationContext';

export default function IntelPanel() {
    const { warrants } = useOperations();
    const { activeBulletins } = useIntel();
    const { currentUser } = useAuth();
    const { setActiveView, setSelectedBulletin } = useNavigation();

    const userLevel = currentUser?.clearanceLevel?.level || 0;
    const userMarkers = useMemo(
        () => new Set(currentUser?.limitingMarkers?.map((m: any) => m.id) || []),
        [currentUser],
    );

    const bulletins = useMemo(() => activeBulletins
        .filter((b) => {
            const authorId = (b as any).createdBy?.id || (b as any).createdById;
            if (authorId === currentUser?.id) return true;
            if (b.classificationLevel > userLevel) return false;
            if (b.limitingMarkers && b.limitingMarkers.length > 0) {
                return b.limitingMarkers.every((m: any) => userMarkers.has(m.id));
            }
            return true;
        })
        .slice(0, 5), [activeBulletins, currentUser, userLevel, userMarkers]);

    const activeWarrants = useMemo(() => warrants.filter((w) =>
        w.status === WarrantStatus.Active || w.status === WarrantStatus.Standing,
    ).slice(0, 5), [warrants]);

    const nothing = bulletins.length === 0 && activeWarrants.length === 0;
    if (nothing) {
        return (
            <EmptyState
                icon="fa-satellite-dish"
                heading="Intel-Netz ruhig"
                description="Keine Live-Bulletins oder aktiven Vorsichtshinweise."
                accent="rose"
            />
        );
    }

    return (
        <div className="divide-y divide-white/5">
            {bulletins.length > 0 && (
                <>
                    <div className="px-3 py-2 bg-slate-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Live-Bulletins</span>
                        <span className="text-[10px] font-mono text-slate-600">{bulletins.length}</span>
                    </div>
                    {bulletins.map((b) => (
                        <button
                            key={b.id}
                            onClick={() => setSelectedBulletin(b)}
                            className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-satellite-dish text-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-white truncate">{b.title}</div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{b.body}</p>
                            </div>
                            <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                        </button>
                    ))}
                </>
            )}
            {activeWarrants.length > 0 && (
                <>
                    <div className="px-3 py-2 bg-slate-950/40 flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Aktive Vorsichtsmaßnahmen</span>
                        <span className="text-[10px] font-mono text-slate-600">{activeWarrants.length}</span>
                    </div>
                    {activeWarrants.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => setActiveView('warrants')}
                            className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-center shrink-0">
                                <i className="fa-solid fa-gavel text-sm" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-white truncate">{(w as any).targetRsiHandle || (w as any).target_rsi_handle || 'Warrant'}</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border bg-rose-500/15 text-rose-300 border-rose-500/30">
                                        {w.status}
                                    </span>
                                </div>
                                {(w as any).reason && (
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{(w as any).reason}</p>
                                )}
                            </div>
                            <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                        </button>
                    ))}
                </>
            )}
            <div className="p-2">
                <button
                    onClick={() => setActiveView('intel')}
                    className="w-full text-center text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-sky-300 transition-colors py-1"
                >Intel-Netz anzeigen →</button>
            </div>
        </div>
    );
}
