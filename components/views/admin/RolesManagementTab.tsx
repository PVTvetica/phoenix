import React, { useState, useMemo } from 'react';
import { useMembers } from '../../../contexts/MembersContext';

import { Role } from '../../../types';
import { useTableControls } from '../../../hooks/useTableControls';
import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

const RolesManagementTab: React.FC<{ onSelectRole: (id: number) => void }> = ({ onSelectRole }) => {
    const { roles, allUsers, deleteRole } = useMembers();
    const { confirm } = useNotification();
    const { openRoleModal } = useModalRegistry();
    const [searchTerm, setSearchTerm] = useState('');

    const { systemRoleIds, clientRoleId } = useMemo(() => {
        // Primary: system roles by is_system flag
        const flagged = roles.filter(r => r.is_system).sort((a, b) => a.id - b.id);
        if (flagged.length >= 4) {
            return { systemRoleIds: new Set(flagged.map(r => r.id)), clientRoleId: flagged[0].id };
        }
        // Fallback: first 4 roles by ID (pre-migration orgs without is_system flag)
        const sorted = [...roles].sort((a, b) => a.id - b.id);
        const first4 = sorted.slice(0, 4);
        return { systemRoleIds: new Set(first4.map(r => r.id)), clientRoleId: first4[0]?.id };
    }, [roles]);

    const roleData = useMemo(() => {
        const memberCounts = new Map<number, number>();
        allUsers.forEach(user => {
            memberCounts.set(user.roleId, (memberCounts.get(user.roleId) || 0) + 1);
        });
        
        return roles.map(role => ({
            ...role,
            memberCount: memberCounts.get(role.id) || 0
        }));
    }, [roles, allUsers]);

    const { sortedAndFilteredItems } = useTableControls(
        roleData,
        { key: 'id', direction: 'ascending' },
        ['name', 'description'],
        searchTerm
    );

    const handleDelete = async (role: Role & { memberCount: number }) => {
        if (systemRoleIds.has(role.id)) {
            await confirm({
                title: 'Cannot Delete',
                message: 'Default system roles (Client, Member, Dispatcher, Admin) cannot be deleted. They are required for the platform to function correctly.',
                confirmText: 'OK',
                variant: 'info'
            });
            return;
        }
        if (role.memberCount > 0) {
            await confirm({
                title: 'Cannot Delete',
                message: 'Cannot delete a role that is currently assigned to users. Please reassign all users from this role first.',
                confirmText: 'OK',
                variant: 'info'
            });
            return;
        }
        const confirmed = await confirm({
            title: 'Delete Role',
            message: `Are you sure you want to permanently delete the "${role.name}" role? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'danger'
        });
        if (confirmed) {
            deleteRole(role.id);
        }
    };
    
    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="System Roles & Permissions"
                icon="fa-solid fa-user-shield"
                accent="indigo"
                subtitle="Zugriffsstufen und Fähigkeitssets verwalten."
                actions={
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-400/50 focus:border-slate-500 outline-hidden text-sm font-medium transition-all"
                            />
                        </div>
                        <button
                            onClick={() => openRoleModal()}
                            className="flex items-center justify-center bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors shadow-lg text-sm whitespace-nowrap"
                        >
                            <i className="fa-solid fa-plus mr-2" />Rolle erstellen</button>
                    </div>
                }
            />

            <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="flex bg-slate-800/60 p-4 border-b border-slate-700/50 text-xs font-black text-slate-500 uppercase tracking-widest">
                    <div className="w-16">ID</div>
                    <div className="flex-1">Rollenname</div>
                    <div className="w-32 text-center">Mitglieder</div>
                    <div className="w-32 text-right">Aktionen</div>
                </div>

                <div className="divide-y divide-slate-700/50">
                    {sortedAndFilteredItems.map(role => (
                        <div key={role.id} className="flex items-center p-4 hover:bg-slate-800/50 transition-colors group">
                            <div className="w-16 text-xs text-slate-500 font-mono">
                                {role.id}
                            </div>
                            <div className="flex-1 pr-4">
                                <h3 className="text-white font-bold text-sm">{role.name}</h3>
                                {role.description && <p className="text-slate-500 text-xs mt-0.5">{role.description}</p>}
                            </div>
                            <div className="w-32 text-center">
                                <span className={`text-xs font-mono font-bold px-2 py-1 rounded-sm ${role.memberCount > 0 ? 'bg-slate-800 text-white' : 'text-slate-600'}`}>
                                    {role.memberCount}
                                </span>
                            </div>
                            <div className="w-32 text-right flex justify-end gap-2">
                                 <button onClick={() => onSelectRole(role.id)} className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-sm transition-colors" title={role.id === clientRoleId ? 'View Permissions (Locked)' : 'Manage Permissions'}>
                                    <i className={`fa-solid ${role.id === clientRoleId ? 'fa-lock' : 'fa-key'}`}></i>
                                </button>
                                <button onClick={() => openRoleModal(role)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-sm transition-colors" title="Bearbeiten">
                                    <i className="fa-solid fa-pencil"></i>
                                </button>
                                <button 
                                    onClick={() => handleDelete(role)} 
                                    className={`p-1.5 rounded-sm transition-colors ${systemRoleIds.has(role.id) ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-400 hover:bg-red-900/20'}`}
                                    title="Löschen"
                                    disabled={systemRoleIds.has(role.id)}
                                >
                                    <i className="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                    {sortedAndFilteredItems.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic">Keine Rollen gefunden.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RolesManagementTab;