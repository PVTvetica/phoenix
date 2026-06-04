
import React, { useState, useEffect, useCallback } from 'react';
import { HRInterviewTemplate } from '../../../types';
import { useData } from '../../../contexts/DataContext';

import WindowFrame from '../../layout/WindowFrame';
import { useNotification } from '../../../contexts/NotificationContext';

interface CreateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: HRInterviewTemplate;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({ isOpen, onClose, template }) => {
    const { rpcAction, refreshHR } = useData();
    const { addToast } = useNotification();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const isEditing = !!template;

    useEffect(() => {
        if (isOpen) {
            if (template) {
                setName(template.name);
                setDescription(template.description);
                fetchQuestions(template.id);
            } else {
                setName('');
                setDescription('');
                setQuestions([]);
                setIsFetching(false);
            }
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional form-reset on isOpen / template flip; fetchQuestions is an inline async helper that closes over current state at call time.
    }, [isOpen, template]);

    const fetchQuestions = async (id: number) => {
        setIsFetching(true);
        try {
            const details: HRInterviewTemplate = await rpcAction('hr:get_template_details', { id });
            if (details && details.questions) {
                setQuestions(details.questions.sort((a, b) => a.orderIndex - b.orderIndex).map(q => q.questionText));
            }
        } catch (error) {
            console.error("Failed to fetch template questions:", error);
            addToast("Laden fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Fragendetails konnten nicht geladen werden." });
        } finally {
            setIsFetching(false);
        }
    };

    const handleAddQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (newQuestion.trim()) {
            setQuestions([...questions, newQuestion.trim()]);
            setNewQuestion('');
        }
    };

    const removeQuestion = (index: number) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const moveQuestion = (index: number, direction: -1 | 1) => {
        if ((index === 0 && direction === -1) || (index === questions.length - 1 && direction === 1)) return;
        const newQs = [...questions];
        const temp = newQs[index];
        newQs[index] = newQs[index + direction];
        newQs[index + direction] = temp;
        setQuestions(newQs);
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        const data = {
            name: name.trim(),
            description: description.trim(),
            questions
        };

        try {
            if (isEditing && template) {
                await rpcAction('hr:update_template', { ...data, id: template.id });
            } else {
                await rpcAction('hr:create_template', data);
            }
            await refreshHR();
            onClose();
        } catch (err) {
            console.error("Failed to save template:", err);
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Ein Fehler ist aufgetreten. Bitte versuche es erneut." });
        } finally {
            setIsLoading(false);
        }
    }, [name, description, questions, isEditing, template, rpcAction, refreshHR, onClose, addToast]);

    const inputClass = "w-full bg-slate-950/50 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/50 outline-hidden transition-all";
    const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? 'Edit Protocol' : 'New Interview Protocol'}
            subtitle="Fragebogen-Konfiguration"
            icon="fa-solid fa-clipboard-question"
            color="emerald"
            width="max-w-2xl"
        >
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col h-full">
                <div className="p-6 space-y-6">
                    {isFetching ? (
                        <div className="flex justify-center items-center h-48 text-slate-500 flex-col gap-3">
                            <i className="fa-solid fa-circle-notch animate-spin text-3xl text-emerald-300"></i>
                            <p className="text-[10px] uppercase tracking-widest font-bold">Daten werden geladen…</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className={labelClass}>Protokollname</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClass}
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Beschreibung</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        className={`${inputClass} resize-none`}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-700/50 pt-5">
                                <label className={labelClass}>Interviewfragen</label>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="text"
                                        value={newQuestion}
                                        onChange={(e) => setNewQuestion(e.target.value)}
                                        className={inputClass}
                                        placeholder="Type a question and press +"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuestion(e); }}
                                        disabled={isLoading}
                                    />
                                    <button
                                        onClick={handleAddQuestion}
                                        type="button"
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-lg font-bold transition-colors disabled:opacity-50 border border-emerald-500/40 shadow-lg shadow-emerald-900/30"
                                        disabled={isLoading || !newQuestion.trim()}
                                    >
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {questions.map((q, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800 group hover:border-slate-700 transition-colors">
                                            <span className="text-slate-500 font-mono text-[10px] font-bold w-6 text-center">{i + 1}.</span>
                                            <p className="flex-1 text-sm text-slate-300">{q}</p>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-white p-1.5 rounded-sm hover:bg-slate-800 disabled:opacity-30 transition-colors"><i className="fa-solid fa-arrow-up text-xs"></i></button>
                                                <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === questions.length - 1} className="text-slate-500 hover:text-white p-1.5 rounded-sm hover:bg-slate-800 disabled:opacity-30 transition-colors"><i className="fa-solid fa-arrow-down text-xs"></i></button>
                                                <button type="button" onClick={() => removeQuestion(i)} className="text-slate-500 hover:text-red-400 p-1.5 ml-2 rounded-sm hover:bg-red-900/20 transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
                                            </div>
                                        </div>
                                    ))}
                                    {questions.length === 0 && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">
                                            <p className="text-slate-500 text-xs italic">Es wurden noch keine Fragen hinzugefügt.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors" disabled={isLoading}>Abbrechen</button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/40 rounded-lg shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                        disabled={isLoading || isFetching}
                    >
                        {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Save Protocol'}
                    </button>
                </div>
            </form>
        </WindowFrame>
    );
};

export default CreateTemplateModal;
