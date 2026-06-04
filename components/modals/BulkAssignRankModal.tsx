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

/** Assigns the chosen rank to all selected users. */
const BulkAssignRankModal: React.FC<Props> = ({ selectedUsers, onClose }) => {
    const { ranks } = useMembers();
    const [rankId, setRankId] = useState<number | null>(null);
    const bulk = useBulkProgress<number>();

    const targetIds = selectedUsers.map((u) => u.id);

    useBulkActionFlow({
        state: bulk.state,
        aggregate: bulk.aggregate,
        total: bulk.total,
        onClose,
        successVerb: 'Assigned',
    });

    const onConfirm = () => {
        if (rankId == null) return;
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc('admin:bulk_assign_rank', { targetUserIds: chunk, rankId });
            return res?.data ?? res;
        });
    };

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    // Sorted lowest-to-highest by sortOrder so most common assignments are at top.
    const sortedRanks = [...(ranks || [])].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

    return (
        <BulkActionShell
            title="Assign Rank"
            subtitle="Allen ausgewählten Mitgliedern wird der gewählte Rang zugewiesen."
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel="Zuordnen"
            confirmDisabled={rankId == null}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
            {!isRunning && !isFinished && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-white">Rang</label>
                    <select
                        value={rankId ?? ''}
                        onChange={(e) => setRankId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-sky-500/50"
                    >
                        <option value="">— Select a rank —</option>
                        {sortedRanks.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
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

export default BulkAssignRankModal;
