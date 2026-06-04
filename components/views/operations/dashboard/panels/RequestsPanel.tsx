import React, { useMemo } from 'react';
import { useData } from '../../../../../contexts/DataContext';

import { ServiceRequestStatus, UrgencyLevel } from '../../../../../types';
import { EmptyState } from '../../../../shared/ui';
import { useNavigation } from '../../../../../contexts/NavigationContext';

const URGENCY_STYLES: Record<string, string> = {
    Critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    High: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    Medium: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    Low: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    None: 'bg-slate-700/50 text-slate-400 border-white/10',
};

const STATUS_STYLES: Record<string, string> = {
    Submitted: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    Triaged: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    Accepted: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    'In-Progress': 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export default function RequestsPanel() {
    const { hydratedServiceRequests } = useData();
    const { setActiveView, viewRequestDetails } = useNavigation();

    const visible = useMemo(() => hydratedServiceRequests
        .filter((r) => [ServiceRequestStatus.Submitted, ServiceRequestStatus.Triaged, ServiceRequestStatus.InProgress].includes(r.status))
        .sort((a, b) => {
            const aCrit = a.urgency === UrgencyLevel.Critical ? 0 : 1;
            const bCrit = b.urgency === UrgencyLevel.Critical ? 0 : 1;
            if (aCrit !== bCrit) return aCrit - bCrit;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 10),
    [hydratedServiceRequests]);

    if (visible.length === 0) {
        return (
            <EmptyState
                icon="fa-clipboard-check"
                heading="Warteschlange leer"
                description="Keine offenen Serviceanfragen."
                accent="emerald"
            />
        );
    }

    return (
        <div className="divide-y divide-white/5">
            {visible.map((req) => (
                <button
                    key={req.id}
                    onClick={() => viewRequestDetails(req)}
                    className="w-full text-left p-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                >
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-clipboard-list text-sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">{req.serviceType}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${STATUS_STYLES[req.status] || 'bg-slate-700/50 text-slate-400 border-white/10'}`}>
                                {req.status}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border ${URGENCY_STYLES[req.urgency] || URGENCY_STYLES.None}`}>
                                {req.urgency}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            <i className="fa-solid fa-location-dot text-[9px] mr-1" />
                            {req.location || 'No location'}
                        </p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0 mt-2" />
                </button>
            ))}
            <div className="p-2">
                <button
                    onClick={() => setActiveView('requests')}
                    className="w-full text-center text-[11px] font-mono uppercase tracking-widest text-slate-500 hover:text-sky-300 transition-colors py-1"
                >Alle Anfragen anzeigen →</button>
            </div>
        </div>
    );
}
