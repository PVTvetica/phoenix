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

/** Assigns the chosen unit to all selected users. Pass-through to admin:bulk_assign_unit. */
const BulkAssignUnitModal: React.FC<Props> = ({ selectedUsers, onClose }) => {
    const { units } = useMembers();
    const [unitId, setUnitId] = useState<number | null>(null);
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
        if (unitId == null) return;
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc('admin:bulk_assign_unit', { targetUserIds: chunk, unitId });
            return res?.data ?? res;
        });
    };

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    return (
        <BulkActionShell
            title="Assign Unit"
            subtitle="Alle ausgewählten Mitglieder werden zur gewählten Einheit verschoben."
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel="Zuordnen"
            confirmDisabled={unitId == null}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
            {!isRunning && !isFinished && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-white">Einheit</label>
                    <select
                        value={unitId ?? ''}
                        onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-sky-500/50"
                    >
                        <option value="">— Select a unit —</option>
                        {(units || []).map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
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

export default BulkAssignUnitModal;
