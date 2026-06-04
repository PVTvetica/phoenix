import React, { useState } from 'react';
import { useMembers } from '../../contexts/MembersContext';
import apiService from '../../services/apiService';
import BulkActionShell from '../shared/BulkActionShell';
import BulkProgressDisplay from '../shared/BulkProgressDisplay';
import { useBulkProgress } from '../../hooks/useBulkProgress';
import { useBulkActionFlow } from '../../hooks/useBulkActionFlow';
import { User } from '../../types';

interface Props {
    selectedUsers: User[];
    onClose: () => void;
}

/**
 * Grants the chosen commendation (with optional reason) to all selected
 * users. The reason field is shared across the batch — useful for
 * after-action recognition where everyone gets credit for the same op.
 */
const BulkGrantCommendationModal: React.FC<Props> = ({ selectedUsers, onClose }) => {
    const { commendations } = useMembers();
    const [commendationId, setCommendationId] = useState<number | null>(null);
    const [reason, setReason] = useState('');
    const bulk = useBulkProgress<number>();

    const targetIds = selectedUsers.map((u) => u.id);

    useBulkActionFlow({
        state: bulk.state,
        aggregate: bulk.aggregate,
        total: bulk.total,
        onClose,
        successVerb: 'Granted',
    });

    const onConfirm = () => {
        if (commendationId == null) return;
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc('admin:bulk_grant_commendation', {
                targetUserIds: chunk,
                commendationId,
                reason: reason.trim() || null,
            });
            return res?.data ?? res;
        });
    };

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    return (
        <BulkActionShell
            title="Grant Commendation"
            subtitle="Die gewählte Auszeichnung wird allen ausgewählten Mitgliedern verliehen."
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel="Grant"
            confirmDisabled={commendationId == null}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
            {!isRunning && !isFinished && (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-white">Lob</label>
                        <select
                            value={commendationId ?? ''}
                            onChange={(e) => setCommendationId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-sky-500/50"
                        >
                            <option value="">— Select a commendation —</option>
                            {(commendations || []).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-white">Grund<span className="text-slate-500 font-normal">(optional, shared across batch)</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Outstanding performance during Operation X on…"
                            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-md text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
                        />
                    </div>
                </div>
            )}
            {(isRunning || isFinished) && (
                <BulkProgressDisplay
                    state={bulk.state}
                    processed={bulk.processed}
                    total={bulk.total}
                    aggregate={bulk.aggregate}
                    onCancel={bulk.cancel}
                    error={bulk.error}
                />
            )}
        </BulkActionShell>
    );
};

export default BulkGrantCommendationModal;
