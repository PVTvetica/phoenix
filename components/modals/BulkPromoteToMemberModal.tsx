import React, { useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import apiService from '../../services/apiService';
import BulkActionShell from '../shared/BulkActionShell';
import BulkProgressDisplay from '../shared/BulkProgressDisplay';
import { useBulkProgress } from '../../hooks/useBulkProgress';
import { User } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';

interface Props {
    selectedUsers: User[];
    onClose: () => void;
}

/**
 * Promotes the pre-selected users to the org's Member role. Single-org:
 * there is no member cap, so every selected client is promoted.
 */
const BulkPromoteToMemberModal: React.FC<Props> = ({ selectedUsers, onClose }) => {
    const { refreshMainState } = useData();
    const { addToast } = useNotification();
    const bulk = useBulkProgress<number>();

    const targetIds = selectedUsers.map((u) => u.id);

    const onConfirm = () => {
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc('admin:bulk_promote_users', { targetUserIds: chunk });
            return res?.data ?? res;
        });
    };

    useEffect(() => {
        if (bulk.state === 'done' || bulk.state === 'cancelled') {
            const total = targetIds.length;
            const wasCancelled = bulk.state === 'cancelled';
            const parts: string[] = [`Promoted ${bulk.aggregate.updated}`];
            if (bulk.aggregate.skipped > 0) parts.push(`${bulk.aggregate.skipped} skipped`);
            const msg = wasCancelled
                ? `Cancelled — updated ${bulk.aggregate.updated} of ${total}`
                : parts.join(', ');
            addToast(
                msg,
                <i className="fa-solid fa-circle-check" />,
                'bg-green-500/10 text-green-400 border-green-500/50',
            );
            refreshMainState();
            const id = window.setTimeout(onClose, 1500);
            return () => window.clearTimeout(id);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional auto-close on bulk completion: keyed on bulk.state transitions only; aggregate fields and onClose/refreshMainState are read for the one-shot toast/close, not as triggers.
    }, [bulk.state]);

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    return (
        <BulkActionShell
            title="Promote to Member"
            subtitle="Ausgewählte Clients erhalten Member-Zugriff"
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel={`Promote ${targetIds.length}`}
            confirmDisabled={targetIds.length === 0}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
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

export default BulkPromoteToMemberModal;
