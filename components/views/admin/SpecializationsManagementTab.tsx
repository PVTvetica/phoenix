
import React, { useState, useMemo } from 'react';
import { useMembers } from '../../../contexts/MembersContext';

import { SpecializationTag } from '../../../types';
import SpecializationModal from '../../modals/SpecializationModal';
import { useTableControls } from '../../../hooks/useTableControls';
import AwardIcon from '../../common/AwardIcon';
import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';

const SpecializationsManagementTab: React.FC = () => {
    const { specializationTags, allUsers, deleteSpecializationTag } = useMembers();
    const { confirm } = useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<SpecializationTag | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    const tagData = useMemo(() => {
        const memberCounts = new Map<number, number>();
        allUsers.forEach(user => {
            user.specializations?.forEach(s => {
                memberCounts.set(s.id, (memberCounts.get(s.id) || 0) + 1);
            });
        });
        return specializationTags.map(tag => ({
            ...tag,
            memberCount: memberCounts.get(tag.id) || 0,
        }));
    }, [specializationTags, allUsers]);

    const { sortedAndFilteredItems } = useTableControls(
        tagData,
        { key: 'name', direction: 'ascending' },
        ['name', 'description'],
        searchTerm
    );

    const openModal = (tag?: SpecializationTag) => {
        setEditingTag(tag);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingTag(undefined);
        setIsModalOpen(false);
    };
    
    const handleDelete = async (tag: SpecializationTag & { memberCount: number }) => {
        if (tag.memberCount > 0) {
            await confirm({
                title: 'Cannot Delete',
                message: `Cannot delete "${tag.name}" as it is assigned to ${tag.memberCount} member(s).`,
                confirmText: 'OK',
                variant: 'info'
            });
            return;
        }
        const confirmed = await confirm({
            title: 'Delete Specialization',
            message: `Are you sure you want to permanently delete the specialization tag "${tag.name}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (confirmed) {
            deleteSpecializationTag(tag.id);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="Spezialisierungen"
                icon="fa-solid fa-tags"
                accent="purple"
                subtitle="Skill-Tags und Bezeichnungen verwalten."
                actions={
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search tags..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-400/50 focus:border-slate-500 outline-hidden text-sm font-medium transition-all"
                            />
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="flex items-center justify-center bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors shadow-lg text-sm whitespace-nowrap"
                        >
                            <i className="fa-solid fa-plus mr-2" />Tag erstellen</button>
                    </div>
                }
            />

            <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
                 <div className="flex bg-slate-800/60 p-4 border-b border-slate-700/50 text-xs font-black text-slate-500 uppercase tracking-widest">
                    <div className="flex-1 md:w-1/4 md:flex-none">Tag-Name</div>
                    <div className="flex-1 hidden md:block">Beschreibung</div>
                    <div className="w-32 text-center hidden md:block">Zugewiesen</div>
                    <div className="w-24 text-right">Aktionen</div>
                </div>
                
                <div className="divide-y divide-slate-700/50">
                    {sortedAndFilteredItems.map(tag => (
                        <div key={tag.id} className="flex items-center p-4 hover:bg-slate-800/50 transition-colors group">
                            <div className="flex-1 md:w-1/4 md:flex-none pr-4">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-sm bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-300 mr-3 shrink-0 overflow-hidden">
                                        <AwardIcon imageUrl={tag.imageUrl} icon={tag.icon} fallbackIcon="fa-solid fa-tag" className="max-w-full max-h-full" alt={tag.name} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="font-bold text-white text-sm truncate block">{tag.name}</span>
                                        <span className="text-xs text-slate-500 md:hidden">{tag.memberCount} assigned</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 pr-4 text-sm text-slate-400 hidden md:block">
                                {tag.description || <span className="opacity-50">-</span>}
                            </div>
                            <div className="w-32 text-center hidden md:block">
                                <span className={`text-xs font-mono font-bold px-2 py-1 rounded-sm ${tag.memberCount > 0 ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>
                                    {tag.memberCount}
                                </span>
                            </div>
                            <div className="w-24 text-right flex justify-end gap-2">
                                <button onClick={() => openModal(tag)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-sm transition-colors" title="Bearbeiten">
                                    <i className="fa-solid fa-pencil"></i>
                                </button>
                                <button 
                                    onClick={() => handleDelete(tag)} 
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-sm transition-colors disabled:opacity-30"
                                    title="Löschen"
                                    disabled={tag.memberCount > 0}
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                     {sortedAndFilteredItems.length === 0 && (
                        <div className="p-12 text-center">
                            <p className="text-slate-500 font-medium italic">Keine Tags gefunden.</p>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <SpecializationModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    tag={editingTag}
                />
            )}
        </div>
    );
};

export default SpecializationsManagementTab;
