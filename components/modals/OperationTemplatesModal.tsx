import React, { useState, useMemo, useRef } from 'react';
import { useOperations } from '../../contexts/OperationsContext';
import { useAuth } from '../../contexts/AuthContext';
import WindowFrame from '../layout/WindowFrame';
import type { OperationTemplate, OperationTemplatePayload } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';

interface OperationTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const labelClass = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";
const inputClass = "w-full bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/50 outline-hidden transition-all";

// Counts a payload's structure for the list-row stats badge.
function countTemplate(p: OperationTemplatePayload): { phases: number; tasks: number; milestones: number } {
    const phases = p.phases?.length || 0;
    let tasks = 0;
    let milestones = 0;
    for (const ph of p.phases || []) {
        tasks += ph.tasks?.length || 0;
        milestones += ph.milestones?.length || 0;
    }
    return { phases, tasks, milestones };
}

const OperationTemplatesModal: React.FC<OperationTemplatesModalProps> = ({ isOpen, onClose }) => {
    const { operationTemplates, deleteOperationTemplate, importOperationTemplate, updateOperationTemplate } = useOperations();
    const { hasPermission } = useAuth();
    const { addToast, confirm } = useNotification();

    const canManage = hasPermission('operations:create');
    const [search, setSearch] = useState('');
    const [importOpen, setImportOpen] = useState(false);
    const [importName, setImportName] = useState('');
    const [importDescription, setImportDescription] = useState('');
    const [importJson, setImportJson] = useState('');
    const [importing, setImporting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        const sorted = [...operationTemplates].sort((a, b) => a.name.localeCompare(b.name));
        if (!term) return sorted;
        return sorted.filter(t =>
            t.name.toLowerCase().includes(term) ||
            (t.description || '').toLowerCase().includes(term)
        );
    }, [operationTemplates, search]);

    const handleExport = (tpl: OperationTemplate) => {
        // Strips identifiers and timestamps so the file is portable across orgs.
        const exportShape = {
            name: tpl.name,
            description: tpl.description || '',
            payload: tpl.payload,
        };
        const blob = new Blob([JSON.stringify(exportShape, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = tpl.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
        a.download = `operation-template-${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = async (tpl: OperationTemplate) => {
        const ok = await confirm({
            title: 'Delete Template',
            message: `Permanently delete the template "${tpl.name}"? Operations created from this template are unaffected.`,
            confirmText: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await deleteOperationTemplate(tpl.id);
        } catch (err: any) {
            addToast("Löschen fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message || 'Could not delete template.' });
        }
    };

    const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result || '');
                const parsed = JSON.parse(text);
                // Accept either { name, description, payload } (export shape)
                // or a bare payload { phases: [...] }.
                if (parsed && typeof parsed === 'object' && Array.isArray(parsed.phases)) {
                    setImportJson(JSON.stringify(parsed, null, 2));
                    if (!importName) setImportName(file.name.replace(/\.json$/i, ''));
                } else if (parsed && typeof parsed === 'object' && parsed.payload) {
                    setImportJson(JSON.stringify(parsed.payload, null, 2));
                    if (!importName && typeof parsed.name === 'string') setImportName(parsed.name);
                    if (!importDescription && typeof parsed.description === 'string') setImportDescription(parsed.description);
                } else {
                    throw new Error('JSON does not look like a template (expected "phases" array or "payload" object).');
                }
            } catch (err: any) {
                addToast("Ungültige Datei", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message || 'Could not read JSON.' });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImport = async () => {
        if (!importName.trim()) {
            addToast("Name erforderlich", <i className="fa-solid fa-triangle-exclamation"></i>, 'bg-amber-500/10 text-amber-400 border-amber-500/50', { description: 'Gib der Vorlage einen Namen, bevor du importierst.' });
            return;
        }
        let parsed: any;
        try {
            parsed = JSON.parse(importJson);
        } catch {
            addToast("Ungültiger JSON", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: 'Der eingefügte Text ist kein gültiges JSON.' });
            return;
        }
        const payload: OperationTemplatePayload = parsed?.phases ? parsed : parsed?.payload;
        if (!payload || !Array.isArray(payload.phases)) {
            addToast("Ungültige Vorlage", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: 'JSON muss ein "phases"-Array haben (oder ein "payload"-Objekt damit).' });
            return;
        }
        setImporting(true);
        try {
            await importOperationTemplate({ name: importName.trim(), description: importDescription.trim() || undefined, payload });
            setImportOpen(false);
            setImportName('');
            setImportDescription('');
            setImportJson('');
            addToast("Vorlage importiert", <i className="fa-solid fa-check"></i>, 'bg-green-500/10 text-green-400 border-green-500/30');
        } catch (err: any) {
            addToast('Import Failed', <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message || 'Could not import template.' });
        } finally {
            setImporting(false);
        }
    };

    const startEdit = (tpl: OperationTemplate) => {
        setEditingId(tpl.id);
        setEditName(tpl.name);
        setEditDescription(tpl.description || '');
    };

    const saveEdit = async () => {
        if (editingId == null) return;
        if (!editName.trim()) {
            addToast("Name erforderlich", <i className="fa-solid fa-triangle-exclamation"></i>, 'bg-amber-500/10 text-amber-400 border-amber-500/50');
            return;
        }
        setSavingEdit(true);
        try {
            await updateOperationTemplate(editingId, { name: editName.trim(), description: editDescription.trim() || undefined });
            setEditingId(null);
        } catch (err: any) {
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: err?.message || 'Could not update template.' });
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Operation Templates"
            subtitle="Wiederverwendbare Phasen- / Aufgaben- / Meilensteinpläne"
            icon="fa-solid fa-clipboard-list"
            color="purple"
            width="max-w-3xl"
        >
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="p-5 border-b border-white/5 bg-slate-900/40 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
                        <input
                            type="search"
                            placeholder="Search templates..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-900/60 text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 outline-hidden placeholder:text-slate-600 text-sm focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all"
                        />
                    </div>
                    {canManage && (
                        <>
                            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFilePick} className="hidden" />
                            <button
                                onClick={() => { fileInputRef.current?.click(); setImportOpen(true); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 text-slate-300 border border-slate-700 hover:text-white hover:border-purple-500/30 text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                                <i className="fa-solid fa-file-arrow-up"></i>Wähle JSON</button>
                            <button
                                onClick={() => setImportOpen(o => !o)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                                <i className={`fa-solid ${importOpen ? 'fa-xmark' : 'fa-plus'}`}></i> {importOpen ? 'Cancel Import' : 'Import Template'}
                            </button>
                        </>
                    )}
                </div>

                {/* Import form */}
                {importOpen && canManage && (
                    <div className="p-5 border-b border-white/5 bg-slate-900/30 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Vorlagenname</label>
                                <input value={importName} onChange={e => setImportName(e.target.value)} className={inputClass} placeholder="e.g., Standard Patrol" />
                            </div>
                            <div>
                                <label className={labelClass}>Beschreibung (optional)</label>
                                <input value={importDescription} onChange={e => setImportDescription(e.target.value)} className={inputClass} placeholder="Short summary..." />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Nutzlast JSON</label>
                            <textarea
                                value={importJson}
                                onChange={e => setImportJson(e.target.value)}
                                rows={8}
                                spellCheck={false}
                                placeholder='Paste an exported template, or a payload like { "phases": [ ... ] }'
                                className={`${inputClass} font-mono text-xs resize-y`}
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                Server validates the structure on import; invalid templates are rejected with a descriptive error.
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleImport}
                                disabled={importing}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 border border-purple-500/40 text-white text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {importing
                                    ? <><i className="fa-solid fa-spinner animate-spin"></i>Importieren</>
                                    : <><i className="fa-solid fa-check"></i> Import</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                            <i className="fa-solid fa-clipboard-list text-4xl mb-3 opacity-40"></i>
                            <p className="text-sm font-medium opacity-60">
                                {operationTemplates.length === 0 ? 'No templates yet.' : 'No templates match your search.'}
                            </p>
                            {operationTemplates.length === 0 && canManage && (
                                <p className="text-[11px] text-slate-700 mt-2 max-w-md text-center">
                                    Save an existing operation as a template from its detail view, or import one from JSON above.
                                </p>
                            )}
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {filtered.map(tpl => {
                                const stats = countTemplate(tpl.payload);
                                const isEditing = editingId === tpl.id;
                                return (
                                    <li key={tpl.id} className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4 hover:border-purple-500/30 transition-colors group">
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className={labelClass}>Name</label>
                                                    <input value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Beschreibung</label>
                                                    <input value={editDescription} onChange={e => setEditDescription(e.target.value)} className={inputClass} placeholder="Optional" />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingId(null)} className="text-[10px] text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 uppercase tracking-wider font-bold">Abbrechen</button>
                                                    <button onClick={saveEdit} disabled={savingEdit} className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 px-4 py-1.5 rounded-lg uppercase tracking-wider font-bold disabled:opacity-50">
                                                        {savingEdit ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Save'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-white">{tpl.name}</span>
                                                        <span className="text-[9px] font-mono text-slate-500 bg-slate-800/60 border border-slate-700/40 px-1.5 py-0.5 rounded-sm">
                                                            {stats.phases}p · {stats.tasks}t · {stats.milestones}m
                                                        </span>
                                                    </div>
                                                    {tpl.description && (
                                                        <p className="text-xs text-slate-400 mt-1">{tpl.description}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-600 mt-1.5">
                                                        {tpl.createdByName ? `By ${tpl.createdByName}` : 'Unknown author'} · {new Date(tpl.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleExport(tpl)}
                                                        className="text-slate-400 hover:text-purple-300 p-2 rounded-sm hover:bg-slate-800/60 transition-colors"
                                                        title="Export as JSON"
                                                    >
                                                        <i className="fa-solid fa-file-arrow-down text-xs"></i>
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                onClick={() => startEdit(tpl)}
                                                                className="text-slate-400 hover:text-purple-300 p-2 rounded-sm hover:bg-slate-800/60 transition-colors"
                                                                title="Rename"
                                                            >
                                                                <i className="fa-solid fa-pen-to-square text-xs"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(tpl)}
                                                                className="text-slate-400 hover:text-red-400 p-2 rounded-sm hover:bg-slate-800/60 transition-colors"
                                                                title="Löschen"
                                                            >
                                                                <i className="fa-solid fa-trash text-xs"></i>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-900/50 flex justify-end rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Schließen</button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default OperationTemplatesModal;
