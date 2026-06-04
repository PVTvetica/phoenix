import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { QmLocation } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    locations: QmLocation[];
    canManage: boolean;
    onCreate: () => void;
    onRefresh: () => void;
}

const TYPE_LABEL: Record<QmLocation['type'], string> = {
    hangar: 'Hangar',
    ship: 'Ship',
    station: 'Station',
    custom: 'Custom',
};

export default function WhLocationsTab({ locations, canManage, onCreate, onRefresh }: Props) {
    const { rpcAction } = useData();
    const { addToast, confirm } = useNotification();
    const [working, setWorking] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [savingRename, setSavingRename] = useState(false);
    const renameInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (editingId !== null) {
            renameInputRef.current?.focus();
            renameInputRef.current?.select();
        }
    }, [editingId]);

    const startRename = (loc: QmLocation) => {
        setEditingId(loc.id);
        setEditName(loc.name);
    };

    const cancelRename = () => {
        setEditingId(null);
        setEditName('');
        setSavingRename(false);
    };

    const commitRename = async (loc: QmLocation) => {
        const next = editName.trim();
        if (!next || next === loc.name) {
            cancelRename();
            return;
        }
        setSavingRename(true);
        try {
            await rpcAction('warehouse:update_location', { locationId: loc.id, name: next });
            addToast("Standort umbenannt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            setEditingId(null);
            setEditName('');
            onRefresh();
        } catch (err: any) {
            addToast("Umbenennen fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
                description: err?.message,
            });
        } finally {
            setSavingRename(false);
        }
    };

    const deleteLoc = async (loc: QmLocation) => {
        const ok = await confirm({
            title: `Delete "${loc.name}"?`,
            message: 'Warehouse stock and movement history at this location will be deleted. Quartermaster inventory rows have their location cleared, and child locations become top-level. Quartermaster (if enabled) shares this location list.',
            confirmText: 'Delete',
            variant: 'warning',
        });
        if (!ok) return;
        setWorking(loc.id);
        try {
            await rpcAction('warehouse:delete_location', { locationId: loc.id });
            addToast("Standort gelöscht", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onRefresh();
        } catch (err: any) {
            addToast("Das Löschen ist fehlgeschlagen", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
                description: err?.message,
            });
        } finally {
            setWorking(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Standorte</h2>
                    <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Wo Waren sitzen · geteilt mit Quartermaster</p>
                </div>
                {canManage && (
                    <button
                        onClick={onCreate}
                        className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[11px] transition-all"
                    >
                        <i className="fa-solid fa-plus" />Neuer Standort</button>
                )}
            </div>

            {locations.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-slate-900/30 p-10 text-center text-slate-500 text-sm">Noch keine Standorte. Erstelle einen, dem du den Bestand zuweisen möchten.</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {locations.map((loc) => {
                        const isEditing = editingId === loc.id;
                        return (
                            <div key={loc.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                                            {TYPE_LABEL[loc.type]}
                                        </div>
                                        {isEditing ? (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <input
                                                    ref={renameInputRef}
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            commitRename(loc);
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelRename();
                                                        }
                                                    }}
                                                    disabled={savingRename}
                                                    maxLength={80}
                                                    className="min-w-0 flex-1 bg-slate-950 border border-cyan-500/40 rounded-md px-2 py-1 text-sm text-white focus:outline-hidden focus:border-cyan-400 disabled:opacity-50"
                                                />
                                                <button
                                                    onClick={() => commitRename(loc)}
                                                    disabled={savingRename || editName.trim() === '' || editName.trim() === loc.name}
                                                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 text-xs shrink-0"
                                                    aria-label="Save rename"
                                                    title="Save (Enter)"
                                                >
                                                    <i className={`fa-solid ${savingRename ? 'fa-spinner fa-spin' : 'fa-check'}`} />
                                                </button>
                                                <button
                                                    onClick={cancelRename}
                                                    disabled={savingRename}
                                                    className="text-slate-500 hover:text-slate-300 text-xs shrink-0 disabled:opacity-50"
                                                    aria-label="Cancel rename"
                                                    title="Cancel (Esc)"
                                                >
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-sm font-bold text-white truncate">{loc.name}</div>
                                        )}
                                    </div>
                                    {canManage && !isEditing && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => startRename(loc)}
                                                disabled={working === loc.id || editingId !== null}
                                                className="text-slate-500 hover:text-cyan-300 text-xs disabled:opacity-50"
                                                aria-label="Rename"
                                                title="Rename"
                                            >
                                                <i className="fa-solid fa-pen" />
                                            </button>
                                            <button
                                                onClick={() => deleteLoc(loc)}
                                                disabled={working === loc.id || editingId !== null}
                                                className="text-slate-500 hover:text-rose-400 text-xs disabled:opacity-50"
                                                aria-label="Löschen"
                                            >
                                                <i className="fa-solid fa-trash" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {loc.description && (
                                    <div className="text-[11px] text-slate-500 line-clamp-2">{loc.description}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
