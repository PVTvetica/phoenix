import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { QmLocation } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    locations: QmLocation[];
    onCreateLocation: () => void;
    onRefresh: () => void;
}

const TYPE_LABEL: Record<QmLocation['type'], string> = {
    hangar: 'Hangar',
    ship: 'Ship',
    station: 'Station',
    custom: 'Custom',
};

export default function QmSettingsTab({ locations, onCreateLocation, onRefresh }: Props) {
    const { rpcAction } = useData();
    const { addToast, confirm } = useNotification();
    const [working, setWorking] = useState<number | null>(null);

    const deleteLoc = async (loc: QmLocation) => {
        const ok = await confirm({
            title: `Delete "${loc.name}"?`,
            message: 'Inventory at this location will have its location cleared. Child locations become top-level.',
            confirmText: 'Delete',
            variant: 'warning',
        });
        if (!ok) return;
        setWorking(loc.id);
        try {
            await rpcAction('qm:delete_location', { locationId: loc.id });
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
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Standorte</h2>
                        <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Wo Dein Bestand lebt</p>
                    </div>
                    <button
                        onClick={onCreateLocation}
                        className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[11px] transition-all"
                    >
                        <i className="fa-solid fa-plus" />Neuer Standort</button>
                </div>

                {locations.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-slate-900/30 p-10 text-center text-slate-500 text-sm">Noch keine Standorte. Erstelle einen, dem du den Bestand zuweisen möchten.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {locations.map((loc) => (
                            <div key={loc.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400">
                                            {TYPE_LABEL[loc.type]}
                                        </div>
                                        <div className="text-sm font-bold text-white truncate">{loc.name}</div>
                                    </div>
                                    <button
                                        onClick={() => deleteLoc(loc)}
                                        disabled={working === loc.id}
                                        className="text-slate-500 hover:text-rose-400 text-xs shrink-0"
                                        aria-label="Löschen"
                                    >
                                        <i className="fa-solid fa-trash" />
                                    </button>
                                </div>
                                {loc.description && (
                                    <div className="text-[11px] text-slate-500 line-clamp-2">{loc.description}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
