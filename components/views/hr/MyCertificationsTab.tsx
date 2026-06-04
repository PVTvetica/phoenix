
import React from 'react';
import { useAuth, useFormatDate } from '../../../contexts/AuthContext';
import EmptyState from '../../shared/ui/EmptyState';

const MyCertificationsTab: React.FC = () => {
    const { currentUser } = useAuth();
    const fmt = useFormatDate();

    const certifications = currentUser?.certifications || [];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-certificate text-emerald-300"></i>Zertifizierungen</h2>
                    <p className="text-slate-400 text-sm mt-1">Aktive Ausbildungsnachweise.</p>
                </div>
            </div>
            {certifications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certifications.map(c => (
                        <div key={c.id} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/20 transition-all">
                            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
                                <i className={`${c.icon || 'fa-solid fa-certificate'} text-xl`}></i>
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-white uppercase tracking-tight">{c.name}</h3>
                                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-2">{fmt(c.awardedAt)}</p>
                                <p className="text-sm text-slate-300 italic leading-relaxed">"{c.description}"</p>
                                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Instructor: {c.awardedBy?.name ?? 'Unknown'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-certificate"
                        accent="emerald"
                        heading="Keine Zertifizierungen hinterlegt"
                        description="Ausbildungsnachweise erscheinen hier nach Erwerb."
                    />
                </div>
            )}
        </div>
    );
};

export default MyCertificationsTab;
