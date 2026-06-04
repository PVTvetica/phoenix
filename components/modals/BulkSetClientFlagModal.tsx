import React, { useState } from 'react';
import apiService from '../../services/apiService';
import BulkActionShell from '../shared/BulkActionShell';
import BulkProgressDisplay from '../shared/BulkProgressDisplay';
import { useBulkProgress } from '../../hooks/useBulkProgress';
import { useBulkActionFlow } from '../../hooks/useBulkActionFlow';
import { User } from '../../types';

interface Props {
    flag: 'is_affiliate' | 'is_vip';
    selectedUsers: User[];
    onClose: () => void;
}

const FLAG_LABEL: Record<Props['flag'], string> = {
    is_affiliate: 'Affiliate',
    is_vip: 'VIP',
};

const FLAG_ACTION: Record<Props['flag'], string> = {
    is_affiliate: 'admin:bulk_set_affiliate',
    is_vip: 'admin:bulk_set_vip',
};

/**
 * Sets the is_affiliate / is_vip boolean to an explicit value across the
 * selection. Bulk action takes a value (not a toggle) since toggling
 * mixed-state selections produces inconsistent outcomes that admins
 * almost never want.
 *
 * Server enforces a Client-tier guard per row — non-Clients in the
 * selection are silently counted as skipped.
 */
const BulkSetClientFlagModal: React.FC<Props> = ({ flag, selectedUsers, onClose }) => {
    const [value, setValue] = useState<boolean>(true);
    const bulk = useBulkProgress<number>();

    const targetIds = selectedUsers.map((u) => u.id);
    const label = FLAG_LABEL[flag];

    useBulkActionFlow({
        state: bulk.state,
        aggregate: bulk.aggregate,
        total: bulk.total,
        onClose,
        successVerb: 'Updated',
    });

    const onConfirm = () => {
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc(FLAG_ACTION[flag], { targetUserIds: chunk, value });
            return res?.data ?? res;
        });
    };

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    return (
        <BulkActionShell
            title={`Set ${label} Flag`}
            subtitle={`Apply to ${selectedUsers.length} ${selectedUsers.length === 1 ? 'client' : 'clients'} (non-Client users will be skipped).`}
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel={value ? `Enable ${label}` : `Disable ${label}`}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
            {!isRunning && !isFinished && (
                <div className="space-y-2">
                    <div className="text-sm font-bold text-white">Set {label} flag to:</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setValue(true)}
                            className={`px-4 py-3 rounded-md border text-sm font-bold transition-colors ${
                                value
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                            }`}
                        >
                            <i className="fa-solid fa-check mr-2" />Aktivieren</button>
                        <button
                            onClick={() => setValue(false)}
                            className={`px-4 py-3 rounded-md border text-sm font-bold transition-colors ${
                                !value
                                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                    : 'bg-slate-800 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                            }`}
                        >
                            <i className="fa-solid fa-xmark mr-2" />Deaktivieren</button>
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

export default BulkSetClientFlagModal;
