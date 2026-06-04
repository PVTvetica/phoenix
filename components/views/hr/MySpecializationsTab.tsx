
import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import EmptyState from '../../shared/ui/EmptyState';
import AwardIcon from '../../common/AwardIcon';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const MySpecializationsTab: React.FC = () => {
    const { currentUser } = useAuth();
    const { setIsManageSpecializationsModalOpen } = useModalRegistry();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-tags text-emerald-300"></i>Meine Spezialisierungen</h2>
                    <p className="text-slate-400 text-sm mt-1">Manage your active skill tags and operational capabilities.</p>
                </div>
                <button
                    onClick={() => setIsManageSpecializationsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-pen-to-square"></i>Fähigkeiten verwalten</button>
            </div>

            {currentUser?.specializations && currentUser.specializations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentUser.specializations.map(spec => (
                        <div key={spec.id} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-5 rounded-xl flex flex-col gap-4 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/20 hover:-translate-y-0.5 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 overflow-hidden">
                                    <AwardIcon imageUrl={spec.imageUrl} icon={spec.icon} fallbackIcon="fa-solid fa-star" className="text-lg max-w-full max-h-full" alt={spec.name} />
                                </div>
                                <h3 className="font-bold text-white text-base truncate">{spec.name}</h3>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{spec.description || "No description provided."}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-tags"
                        accent="emerald"
                        heading="Keine Spezialisierungen gewählt"
                        description="Füge Skill-Tags hinzu, damit Einsatzleiter dich der passenden Aufgabe zuordnen können."
                        action={
                            <button
                                onClick={() => setIsManageSpecializationsModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition"
                            >
                                <i className="fa-solid fa-plus"></i>Wähle Spezialisierungen aus</button>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default MySpecializationsTab;
