import React, { useState } from 'react';
import WindowFrame from '../../layout/WindowFrame';
import { useData } from '../../../contexts/DataContext';
import CatalogSearchCombobox, { ComboboxItem } from '../../ui/CatalogSearchCombobox';
import type { QmLocation, QmCondition } from '../../../types';
import { useNotification } from '../../../contexts/NotificationContext';

interface Props {
    /** True if the org has at least one custom catalog item — used only to
     *  decide the initial mode (catalog vs custom name). The picker itself
     *  searches server-side regardless. */
    hasOrgCatalogItems?: boolean;
    locations: QmLocation[];
    onClose: () => void;
    onSubmitted: () => void;
}

export default function CreateInventoryModal({ hasOrgCatalogItems = true, locations, onClose, onSubmitted }: Props) {
    const { rpcAction } = useData();
    const { addToast } = useNotification();

    const [mode, setMode] = useState<'catalog' | 'custom'>(hasOrgCatalogItems ? 'catalog' : 'custom');
    const [selectedItem, setSelectedItem] = useState<ComboboxItem | null>(null);
    const [customName, setCustomName] = useState('');
    const [locationId, setLocationId] = useState<number | null>(locations[0]?.id ?? null);
    const [condition, setCondition] = useState<QmCondition>('pristine');
    const [quantity, setQuantity] = useState('1');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const qty = Math.trunc(Number(quantity));
    const valid =
        (mode === 'catalog' ? selectedItem !== null : customName.trim().length > 0)
        && Number.isFinite(qty) && qty >= 0;

    const submit = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
            await rpcAction('qm:create_inventory', {
                catalogId: mode === 'catalog' ? selectedItem?.id ?? null : null,
                customName: mode === 'custom' ? customName.trim() : null,
                locationId,
                condition,
                initialQuantity: qty,
                notes: notes.trim() || undefined,
            });
            addToast("Lagerbestand hinzugefügt", <i className="fa-solid fa-check" />, 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50');
            onSubmitted();
        } catch (err: any) {
            addToast("Bestand konnte nicht hinzugefügt werden", <i className="fa-solid fa-xmark" />, 'bg-red-500/10 text-red-400 border-red-500/50', {
                description: err?.message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <WindowFrame
            isOpen
            onClose={onClose}
            title="Lagerbestand hinzufügen"
            subtitle="Quartiermeister"
            icon="fa-solid fa-boxes-stacked"
            color="amber"
            width="max-w-md"
        >
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('catalog')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border ${
                            mode === 'catalog'
                                ? 'bg-orange-500/20 border-orange-500/40 text-orange-200'
                                : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                    >Aus dem Katalog</button>
                    <button
                        type="button"
                        onClick={() => setMode('custom')}
                        className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest border ${
                            mode === 'custom'
                                ? 'bg-orange-500/20 border-orange-500/40 text-orange-200'
                                : 'bg-slate-900 border-white/10 text-slate-400'
                        }`}
                    >Benutzerdefinierter Name</button>
                </div>

                {mode === 'catalog' ? (
                    <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Katalogartikel</span>
                        <div className="mt-1">
                            <CatalogSearchCombobox
                                rpcName="qm:search_catalog"
                                value={selectedItem}
                                onChange={setSelectedItem}
                                initialScope="both"
                                placeholder="Search org-custom and platform catalog…"
                                helpText="Custom items are listed first; platform items below."
                            />
                        </div>
                    </div>
                ) : (
                    <label className="block">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Benutzerdefinierter Name</span>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            maxLength={100}
                            placeholder="e.g. Salvaged helmet — Greycat Mk II"
                            className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        />
                    </label>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Menge</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Zustand</span>
                        <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value as QmCondition)}
                            className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                        >
                            <option value="pristine">Unberührt</option>
                            <option value="used">Gebraucht</option>
                            <option value="damaged">Beschädigt</option>
                            <option value="broken">Gebrochen</option>
                        </select>
                    </label>
                </div>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Standort</span>
                    <select
                        value={locationId ?? ''}
                        onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : null)}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    >
                        <option value="">— unassigned —</option>
                        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </label>

                <label className="block">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Notizen (optional)</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        maxLength={400}
                        className="mt-1 w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white">Abbrechen</button>
                    <button
                        onClick={submit}
                        disabled={!valid || submitting}
                        className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Adding…' : 'Add Stock'}
                    </button>
                </div>
            </div>
        </WindowFrame>
    );
}
