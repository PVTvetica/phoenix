
import React, { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';

import { ServiceTypeConfig } from '../../../types';
import { useTableControls } from '../../../hooks/useTableControls';
import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const ServiceTypesManagementTab: React.FC = () => {
    const { serviceTypes, deleteServiceType } = useConfig();
    const { addToast, confirm } = useNotification();
    const { openServiceTypeModal } = useModalRegistry();
    const [searchTerm, setSearchTerm] = useState('');

    const { sortedAndFilteredItems } = useTableControls(
        serviceTypes,
        { key: 'name', direction: 'ascending' },
        ['name', 'description'],
        searchTerm
    );

    const handleDelete = async (type: ServiceTypeConfig) => {
        const confirmed = await confirm({ title: 'Delete Service Type', message: `Are you sure you want to delete "${type.name}"? Historical requests will still display the name but may lose icon styling if not handled by legacy fallback.`, confirmText: 'Delete', variant: 'danger' });
        if (!confirmed) return;
        try {
            await deleteServiceType(type.id);
        } catch (e) {
            console.error(e);
            addToast("Löschen fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Servicetyp konnte nicht gelöscht werden." });
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="Service Types"
                icon="fa-solid fa-list-check"
                accent="emerald"
                subtitle="Konfiguriere verfügbare Missionskategorien für Clients und Mitglieder."
                actions={
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search types..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-400/50 focus:border-slate-500 outline-hidden text-sm transition-all"
                            />
                        </div>
                        <button
                            onClick={() => openServiceTypeModal()}
                            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-sm transition-all shadow-lg flex items-center justify-center whitespace-nowrap"
                        >
                            <i className="fa-solid fa-plus mr-2"></i>Neuer Typ</button>
                    </div>
                }
            />

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider font-bold">
                            <th className="p-4 w-16 text-center">Symbol</th>
                            <th className="p-4">Name</th>
                            <th className="p-4 hidden md:table-cell">Beschreibung</th>
                            <th className="p-4 w-32 hidden lg:table-cell text-center">Kanal</th>
                            <th className="p-4 w-24 text-center">Status</th>
                            <th className="p-4 w-32 text-right">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {sortedAndFilteredItems.map(type => (
                            <tr key={type.id} className="hover:bg-slate-700/20 transition-colors group">
                                <td className="p-4 text-center">
                                    <div className="w-8 h-8 rounded-sm bg-slate-700/50 flex items-center justify-center border border-slate-600 mx-auto" style={{ color: type.color }}>
                                        <i className={`${type.icon}`}></i>
                                    </div>
                                </td>
                                <td className="p-4 text-white font-bold">
                                    {type.name}
                                </td>
                                <td className="p-4 text-sm text-slate-400 truncate max-w-xs hidden md:table-cell">{type.description || '-'}</td>
                                <td className="p-4 text-center hidden lg:table-cell">
                                    {type.discordChannelId ? (
                                        <span
                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/30"
                                            title={`Routes to Discord channel ${type.discordChannelId}`}
                                        >
                                            <i className="fa-brands fa-discord text-[9px]"></i>
                                            …{type.discordChannelId.slice(-4)}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-600 italic" title="Falls back to global default">default</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase ${type.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {type.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openServiceTypeModal(type)} className="p-1.5 text-slate-300 hover:bg-slate-700 rounded-sm transition-colors"><i className="fa-solid fa-pencil"></i></button>
                                        <button onClick={() => handleDelete(type)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-sm transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedAndFilteredItems.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">Keine Servicetypen definiert.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-700 p-4 rounded-xl text-xs text-slate-300">
                <i className="fa-solid fa-circle-info mr-2"></i>
                <strong>Notiz:</strong> Disabling a service type will hide it from the "New Request" form but keep existing history intact. Deleting a type will cause old records to display with a default icon.
            </div>
        </div>
    );
};

export default ServiceTypesManagementTab;
