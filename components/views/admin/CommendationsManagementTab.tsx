
import React, { useState, useMemo } from 'react';
import { useMembers } from '../../../contexts/MembersContext';

import { Commendation } from '../../../types';
import AwardCommendationModal from '../../modals/AwardCommendationModal';
import CommendationModal from '../../modals/CommendationModal';
import { useTableControls } from '../../../hooks/useTableControls';
import AwardIcon from '../../common/AwardIcon';
import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';

const CommendationsManagementTab: React.FC = () => {
    const { commendations, allUsers, deleteCommendation } = useMembers();
    const { confirm } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const [editingCommend, setEditingCommend] = useState<Commendation | undefined>(undefined);
    const [awardingCommend, setAwardingCommend] = useState<Commendation | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const commendData = useMemo(() => {
        const awardCounts = new Map<number, number>();
        allUsers.forEach(user => {
            user.commendations?.forEach(c => {
                const baseCommendation = commendations.find(base => base.name === c.name);
                if (baseCommendation) {
                    awardCounts.set(baseCommendation.id, (awardCounts.get(baseCommendation.id) || 0) + 1);
                }
            });
        });
        return commendations.map(commend => ({
            ...commend,
            awardCount: awardCounts.get(commend.id) || 0,
        }));
    }, [commendations, allUsers]);

    const { sortedAndFilteredItems } = useTableControls(
        commendData,
        { key: 'name', direction: 'ascending' },
        ['name', 'description'],
        searchTerm
    );

    const openModal = (commend?: Commendation) => {
        setEditingCommend(commend);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingCommend(undefined);
        setIsModalOpen(false);
    };
    
    const openAwardModal = (commend: Commendation) => {
        setAwardingCommend(commend);
        setIsAwardModalOpen(true);
    };

    const closeAwardModal = () => {
        setAwardingCommend(undefined);
        setIsAwardModalOpen(false);
    };

    const handleDelete = async (commend: Commendation & { awardCount: number }) => {
        if (commend.awardCount > 0) {
            await confirm({ title: 'Cannot Delete', message: `Cannot delete "${commend.name}" as it has been awarded ${commend.awardCount} time(s).`, confirmText: 'OK', variant: 'info' });
            return;
        }
        if (await confirm({ title: 'Delete Commendation', message: `Are you sure you want to permanently delete the commendation "${commend.name}"? This action cannot be undone.`, confirmText: 'Delete', variant: 'danger' })) {
            deleteCommendation(commend.id);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="Belobigungen"
                icon="fa-solid fa-medal"
                accent="amber"
                subtitle="Medaillen und Auszeichnungen verwalten."
                actions={
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search commendations..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-400/50 focus:border-slate-500 outline-hidden text-sm font-medium transition-all"
                            />
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center justify-center bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors shadow-lg text-sm whitespace-nowrap"
                        >
                            <i className="fa-solid fa-plus mr-2" />Auszeichnung erstellen</button>
                    </div>
                }
            />

            <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
                 <div className="flex bg-slate-800/60 p-4 border-b border-slate-700/50 text-xs font-black text-slate-500 uppercase tracking-widest">
                    <div className="flex-1 md:w-1/4 md:flex-none">Auszeichnungsname</div>
                    <div className="flex-1 hidden md:block">Beschreibung</div>
                    <div className="w-32 text-center hidden md:block">Ausgezeichnet</div>
                    <div className="w-32 text-right">Aktionen</div>
                </div>

                <div className="divide-y divide-slate-700/50">
                    {sortedAndFilteredItems.map(commend => (
                        <div key={commend.id} className="flex items-center p-4 hover:bg-slate-800/50 transition-colors group">
                            <div className="flex-1 md:w-1/4 md:flex-none pr-4">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-sm bg-slate-800 flex items-center justify-center border border-slate-700 text-amber-400 mr-3 shrink-0 overflow-hidden">
                                        <AwardIcon imageUrl={commend.imageUrl} icon={commend.icon} fallbackIcon="fa-solid fa-medal" className="max-w-full max-h-full" alt={commend.name} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="font-bold text-white text-sm truncate block">{commend.name}</span>
                                        <span className="text-xs text-slate-500 md:hidden">{commend.awardCount} awarded</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 pr-4 text-sm text-slate-400 hidden md:block">
                                {commend.description || <span className="opacity-50">-</span>}
                            </div>
                            <div className="w-32 text-center hidden md:block">
                                <span className={`text-xs font-mono font-bold px-2 py-1 rounded-sm ${commend.awardCount > 0 ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>
                                    {commend.awardCount}
                                </span>
                            </div>
                            <div className="w-32 text-right flex justify-end gap-2">
                                <button onClick={() => openAwardModal(commend)} className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-900/20 rounded-sm transition-colors" title="Award to User">
                                    <i className="fa-solid fa-user-plus"></i>
                                </button>
                                <button onClick={() => openModal(commend)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-sm transition-colors" title="Bearbeiten">
                                    <i className="fa-solid fa-pencil"></i>
                                </button>
                                <button 
                                    onClick={() => handleDelete(commend)} 
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-sm transition-colors disabled:opacity-30" 
                                    title="Löschen"
                                    disabled={commend.awardCount > 0}
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {sortedAndFilteredItems.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-slate-500 font-medium italic">Keine Empfehlungen gefunden.</p>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <CommendationModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    commendation={editingCommend}
                />
            )}

            {isAwardModalOpen && awardingCommend && (
                <AwardCommendationModal
                    isOpen={isAwardModalOpen}
                    onClose={closeAwardModal}
                    commendation={awardingCommend}
                />
            )}
        </div>
    );
};

export default CommendationsManagementTab;
