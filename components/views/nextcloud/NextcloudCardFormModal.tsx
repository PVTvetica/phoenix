
import React, { useEffect, useState } from 'react';
import type { DeckCard, DeckStack } from '../../../services/nextcloudDeckTypes';
import { isoToDatetimeLocal } from './nextcloudDeckUtils';

export type CardFormMode = 'create' | 'edit';

interface Props {
    isOpen: boolean;
    mode: CardFormMode;
    onClose: () => void;
    stacks: DeckStack[];
    defaultStackId: number | null;
    boardId: number;
    initialCard?: DeckCard | null;
    onSubmit: (data: { stackId: number; title: string; description: string; dueDate: string }) => Promise<void>;
    saving: boolean;
    error: string | null;
}

const NextcloudCardFormModal: React.FC<Props> = ({
    isOpen,
    mode,
    onClose,
    stacks,
    defaultStackId,
    boardId,
    initialCard,
    onSubmit,
    saving,
    error,
}) => {
    const [stackId, setStackId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        if (mode === 'edit' && initialCard) {
            setStackId(String(initialCard.stackId));
            setTitle(initialCard.title);
            setDescription(initialCard.description ?? '');
            setDueDate(isoToDatetimeLocal(initialCard.dueDate));
        } else {
            setStackId(defaultStackId != null ? String(defaultStackId) : (stacks[0] ? String(stacks[0].id) : ''));
            setTitle('');
            setDescription('');
            setDueDate('');
        }
    }, [isOpen, mode, initialCard, defaultStackId, stacks]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, saving]);

    if (!isOpen) return null;

    const isEdit = mode === 'edit';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const sid = Number(stackId);
        if (!sid || !title.trim()) return;
        await onSubmit({
            stackId: sid,
            title: title.trim(),
            description: description.trim(),
            dueDate: dueDate.trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={saving ? undefined : onClose} aria-label="Schließen" />
            <form
                onSubmit={(e) => void handleSubmit(e)}
                className="relative w-full max-w-md bg-slate-950 border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden"
            >
                <div className="px-4 py-3 border-b border-slate-800 bg-purple-950/30 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <i className={`fa-solid ${isEdit ? 'fa-pen' : 'fa-plus'} text-purple-400`} />
                        {isEdit ? 'Karte bearbeiten' : 'Neue Karte'}
                    </h2>
                    <button type="button" onClick={onClose} disabled={saving} className="p-2 text-slate-400 hover:text-white rounded-lg disabled:opacity-40">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {error && (
                        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
                    )}

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Spalte</label>
                        <select
                            value={stackId}
                            onChange={(e) => setStackId(e.target.value)}
                            disabled={saving || isEdit}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                            required
                        >
                            {stacks.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        {isEdit && (
                            <p className="text-[10px] text-slate-600 mt-1">Spaltenwechsel wird in einer späteren Version unterstützt.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Titel</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={saving}
                            maxLength={255}
                            required
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                            placeholder="Kartentitel"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Beschreibung (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={saving}
                            rows={4}
                            maxLength={5000}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-y"
                            placeholder="Kurzbeschreibung als Text"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Fällig am (optional)</label>
                        <input
                            type="datetime-local"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            disabled={saving}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                        />
                    </div>

                    <input type="hidden" name="boardId" value={boardId} />
                </div>

                <div className="px-4 py-3 border-t border-slate-800 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white disabled:opacity-40">
                        Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !title.trim() || !stackId}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
                    >
                        {saving
                            ? <><i className="fa-solid fa-circle-notch animate-spin mr-1" />Speichern…</>
                            : (isEdit ? 'Speichern' : 'Erstellen')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NextcloudCardFormModal;
