import React, { useMemo } from 'react';
import { useOperations } from '../../../../../contexts/OperationsContext';
import { useAuth } from '../../../../../contexts/AuthContext';

import { OperationStatus } from '../../../../../types';
import { EmptyState } from '../../../../shared/ui';
import { useNavigation } from '../../../../../contexts/NavigationContext';

export default function OperationsPanel() {
    const { operations } = useOperations();
    const { currentUser, hasPermission } = useAuth();
    const { setActiveView, viewOperationDetails } = useNavigation();

    const userLevel = currentUser?.clearanceLevel?.level || 0;
    const userMarkers = useMemo(
        () => new Set(currentUser?.limitingMarkers?.map((m: any) => m.id) || []),
        [currentUser],
    );

    const visible = useMemo(() => operations
        .filter((op) => {
            if (op.status !== OperationStatus.Active && op.status !== OperationStatus.Scheduled) return false;
            if (op.isSpecial || op.ownerId === currentUser?.id || hasPermission('operations:manage')) return true;
            if ((op.clearanceLevel || 0) > userLevel) return false;
            if (op.limitingMarkers && op.limitingMarkers.length > 0) {
                return op.limitingMarkers.every((m: any) => userMarkers.has(m.id));
            }
            return true;
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [operations, currentUser, userLevel, userMarkers, hasPermission]);

    if (visible.length === 0) {
        return (
            <EmptyState
                icon="fa-crosshairs"
                heading="Keine aktiven Einsätze"
                description="Geplante und aktive Einsätze erscheinen hier."
                accent="amber"
            />
        );
    }

    return (
        <div className="divide-y divide-white/5">
            {visible.map((op) => (
                <button
                    key={op.id}
                    onClick={() => viewOperationDetails(op)}
                    className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                >
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                        op.status === OperationStatus.Active
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                        <i className="fa-solid fa-crosshairs text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">{op.name}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                                op.status === OperationStatus.Active
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            }`}>
                                {op.status}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{op.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                            <span><i className="fa-solid fa-users mr-1" />{op.participants?.length || 0}</span>
                        </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                </button>
            ))}
            <div className="p-2">
                <button
                    onClick={() => setActiveView('operations')}
                    className="w-full text-center text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-purple-300 transition-colors py-1"
                >Alle Vorgänge anzeigen →</button>
            </div>
        </div>
    );
}
