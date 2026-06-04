
import React from 'react';
import { useData } from '../../../contexts/DataContext';
import { useHR } from '../../../contexts/HRContext';
import EmptyState from '../../shared/ui/EmptyState';
import { useNotification } from '../../../contexts/NotificationContext';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const AdminTemplatesTab: React.FC = () => {
    const { rpcAction, refreshHR } = useData();
    const { hrTemplates } = useHR();
    const { confirm } = useNotification();
    const { openCreateTemplateModal } = useModalRegistry();

    const handleDelete = async (id: number) => {
        const confirmed = await confirm({
            title: 'Delete Template',
            message: 'Are you sure you want to delete this template?',
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!confirmed) return;
        await rpcAction('hr:delete_template', { id });
        await refreshHR();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-tight">
                        <i className="fa-solid fa-clipboard-question text-emerald-300"></i>Interviewvorlagen</h2>
                    <p className="text-sm text-slate-400 mt-1">Standardisierte Rekrutierungsfragebögen.</p>
                </div>
                <button
                    onClick={() => openCreateTemplateModal()}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition whitespace-nowrap"
                >
                    <i className="fa-solid fa-plus"></i>Neue Vorlage</button>
            </div>

            {hrTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hrTemplates.map(template => (
                        <div key={template.id} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 space-y-4 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-900/20 hover:-translate-y-0.5 transition-all group">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-white group-hover:text-emerald-200 transition-colors uppercase tracking-tight">{template.name}</h3>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-sm uppercase tracking-widest font-black mt-1">
                                        <i className="fa-solid fa-list-check text-[9px]"></i>{template.questions?.length || 0} questions
                                    </span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <button onClick={() => openCreateTemplateModal(template)} className="p-2 text-emerald-300 hover:bg-emerald-500/10 rounded-sm transition-colors" title="Bearbeiten"><i className="fa-solid fa-pencil text-sm"></i></button>
                                    <button onClick={() => handleDelete(template.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-sm transition-colors" title="Löschen"><i className="fa-solid fa-trash-can text-sm"></i></button>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 italic leading-relaxed">"{template.description}"</p>
                            <div className="pt-3 border-t border-slate-800">
                                <button
                                    onClick={() => openCreateTemplateModal(template)}
                                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-list-check"></i>Fragen anzeigen/bearbeiten</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30">
                    <EmptyState
                        icon="fa-clipboard-question"
                        accent="emerald"
                        heading="Keine Interview-Vorlagen"
                        description="Erstelle eine Vorlage, um Interviewfragen über Rekrutierungsfälle hinweg zu standardisieren."
                    />
                </div>
            )}
        </div>
    );
};

export default AdminTemplatesTab;
