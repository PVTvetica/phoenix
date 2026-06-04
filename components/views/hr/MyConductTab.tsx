
import React, { useMemo } from 'react';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import { ConductRecordType } from '../../../types';
import EmptyState from '../../shared/ui/EmptyState';

const getConductStyle = (type: ConductRecordType) => {
    switch (type) {
        case ConductRecordType.Commendation:
            return { chip: 'bg-green-500/10 text-green-400 border-green-500/30', stripe: 'bg-green-500' };
        case ConductRecordType.Observation:
            return { chip: 'bg-sky-500/10 text-sky-400 border-sky-500/30', stripe: 'bg-sky-500' };
        case ConductRecordType.Counseling:
            return { chip: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', stripe: 'bg-yellow-500' };
        case ConductRecordType.Warning:
            return { chip: 'bg-orange-500/10 text-orange-400 border-orange-500/30', stripe: 'bg-orange-500' };
        case ConductRecordType.Infraction:
            return { chip: 'bg-red-500/10 text-red-400 border-red-500/30', stripe: 'bg-red-500' };
        default:
            return { chip: 'bg-slate-500/10 text-slate-400 border-slate-500/30', stripe: 'bg-slate-500' };
    }
};

const MyConductTab: React.FC = () => {
    const { currentUser } = useAuth();
    const fmt = useFormatDate();

    const records = useMemo(() => {
        return (currentUser?.conductRecord || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [currentUser]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-gavel text-emerald-300"></i>Verhaltensprotokoll</h2>
                    <p className="text-slate-400 text-sm mt-1">Offizielle Beobachtungen und Disziplinarmaßnahmen.</p>
                </div>
            </div>
            {records.length > 0 ? (
                <div className="space-y-3">
                    {records.map(record => {
                        const styles = getConductStyle(record.type);
                        return (
                            <div key={record.id} className="relative bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 pl-5 overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.stripe}`}></div>
                                <div className="flex justify-between items-start mb-2 gap-3">
                                    <span className={`px-2.5 py-0.5 rounded-sm border text-[10px] font-black uppercase tracking-wider ${styles.chip}`}>{record.type}</span>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{fmt(record.createdAt)}</p>
                                        <p className="text-[10px] text-slate-500">by {record.enteredBy?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{record.reason}</p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-gavel"
                        accent="emerald"
                        heading="Keine Verhaltenseinträge"
                        description="Saubere Akte — keine Beobachtungen oder Maßnahmen hinterlegt."
                    />
                </div>
            )}
        </div>
    );
};

export default MyConductTab;
