
import React, { useCallback, useState } from 'react';
import { HydratedServiceRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRequests } from '../../contexts/RequestsContext';
import WindowFrame from '../layout/WindowFrame';
import MemberPicker from '../shared/MemberPicker';

interface AddResponderModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: HydratedServiceRequest;
}

const AddResponderModal: React.FC<AddResponderModalProps> = ({ isOpen, onClose, request }) => {
    const { currentUser, hasPermission } = useAuth();
    const { addResponder, removeResponder, setLeadResponder } = useRequests();
    const [leadUpdating, setLeadUpdating] = useState(false);

    const handleToggle = useCallback(async (memberId: number, currentlyAssigned: boolean) => {
        if (!currentUser) return;
        if (currentlyAssigned) {
            // Block self-removal unless the user has manage permission.
            if (!hasPermission('request:manage_responders') && memberId === currentUser.id) return;
            await removeResponder(request.id, memberId);
        } else {
            await addResponder(request.id, memberId);
        }
    }, [request.id, addResponder, removeResponder, hasPermission, currentUser]);

    // Lead-update guard: select element is locked while the previous
    // setLeadResponder call is in flight, so a fast clicker can't queue up
    // duplicate RPCs.
    const handleLeadChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = e.target.value ? parseInt(e.target.value) : undefined;
        setLeadUpdating(true);
        try {
            await setLeadResponder(request.id, next);
        } finally {
            setLeadUpdating(false);
        }
    }, [request.id, setLeadResponder]);

    if (!currentUser) return null;

    const assignedIds = new Set(request.assignedMembers.map(m => m.id));
    const isLead = currentUser.id === request.leadResponderId;
    const canManageResponders = hasPermission('request:manage_responders') || isLead;

    return (
        <WindowFrame
            isOpen={isOpen}
            onClose={onClose}
            title="Team verwalten"
            subtitle="Responder zuweisen"
            icon="fa-solid fa-users-gear"
            color="green"
            width="max-w-xl"
        >
            {/* Single flex column inside the WindowFrame body so the footer
                stays pinned and only the picker scrolls when content overflows. */}
            <div className="flex flex-col h-full">
                {/* Mission lead select — only when ≥1 responder assigned */}
                {hasPermission('request:set_lead') && request.assignedMembers.length > 0 && (
                    <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-800/60">
                        <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1.5">
                            <i className={`fa-solid ${leadUpdating ? 'fa-circle-notch animate-spin' : 'fa-crown'} mr-1.5`}></i>Mission Lead
                            {leadUpdating && <span className="ml-2 text-slate-500 normal-case font-mono text-[9px]">updating…</span>}
                        </label>
                        <select
                            value={request.leadResponderId || ''}
                            onChange={handleLeadChange}
                            disabled={leadUpdating}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-amber-500 outline-hidden transition-all disabled:opacity-60 disabled:cursor-wait"
                        >
                            <option value="">— No designated lead —</option>
                            {request.assignedMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Assigned chip strip — at-a-glance roster of who's on this mission */}
                <div className="shrink-0 px-4 py-3 border-b border-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">
                            Active Unit ({request.assignedMembers.length})
                        </span>
                        {request.assignedMembers.length > 0 && (
                            <span className="text-[9px] text-slate-600 font-mono">tap chip to remove</span>
                        )}
                    </div>
                    {request.assignedMembers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                            {request.assignedMembers.map(member => {
                                const isMissionLead = member.id === request.leadResponderId;
                                const canRemove = canManageResponders || (member.id !== currentUser.id);
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => canRemove && handleToggle(member.id, true)}
                                        disabled={!canRemove}
                                        className={`flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border transition-colors group ${
                                            isMissionLead
                                                ? 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
                                                : 'bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title={canRemove ? `Remove ${member.name}` : 'You cannot remove yourself'}
                                    >
                                        <img src={member.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-slate-700" />
                                        <span className="text-xs font-bold text-white">{member.name}</span>
                                        {isMissionLead && <i className="fa-solid fa-crown text-amber-400 text-[9px]"></i>}
                                        {canRemove && <i className="fa-solid fa-xmark text-slate-500 group-hover:text-red-400 text-[9px] ml-0.5"></i>}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-600 italic">No responders assigned. Tap any on-duty member below to assign them.</p>
                    )}
                </div>

                {/* Member picker — flex-1 takes remaining space */}
                <div className="flex-1 min-h-0">
                    <MemberPicker
                        assignedIds={assignedIds}
                        onToggle={handleToggle}
                        matchKeyword={request.serviceType}
                        allowDutyToggle={hasPermission('admin:user:update')}
                    />
                </div>

                {/* Pinned footer — always visible regardless of body content */}
                <div className="shrink-0 p-3 border-t border-white/5 bg-slate-900/50 flex justify-end rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                    >Erledigt</button>
                </div>
            </div>
        </WindowFrame>
    );
};

export default AddResponderModal;
