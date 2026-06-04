
import React from 'react';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import EmptyState from '../../shared/ui/EmptyState';

const MyCommendationsTab: React.FC = () => {
    const { currentUser } = useAuth();
    const fmt = useFormatDate();

    const commendations = currentUser?.commendations || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-medal text-emerald-300"></i>Belobigungen</h2>
                    <p className="text-slate-400 text-sm mt-1">Auszeichnungen und Auszeichnungen erhalten.</p>
                </div>
            </div>
            {commendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {commendations.map(c => (
                        <div key={c.id} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-900/20 transition-all">
                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                                <i className={`${c.icon || 'fa-solid fa-medal'} text-xl`}></i>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-white uppercase tracking-tight">{c.name}</h3>
                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">{fmt(c.awardedAt)}</p>
                                <p className="text-sm text-slate-300 italic leading-relaxed">"{c.reason}"</p>
                                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Awarded by {c.awardedBy?.name ?? 'Unknown'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-medal"
                        accent="amber"
                        heading="Noch keine Auszeichnungen"
                        description="Auszeichnungen und Bänder erscheinen hier, sobald sie verliehen werden."
                    />
                </div>
            )}
        </div>
    );
};

export default MyCommendationsTab;
