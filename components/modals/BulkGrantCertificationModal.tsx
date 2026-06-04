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
 * Grants the chosen certification to all selected users. Allows
 * duplicate grants — schema doesn't enforce uniqueness, matching the
 * single-user flow.
 */
const BulkGrantCertificationModal: React.FC<Props> = ({ selectedUsers, onClose }) => {
    const { certifications } = useMembers();
    const [certificationId, setCertificationId] = useState<number | null>(null);
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
        if (certificationId == null) return;
        bulk.run(targetIds, async (chunk) => {
            const res = await apiService.rpc('admin:bulk_grant_certification', {
                targetUserIds: chunk,
                certificationId,
            });
            return res?.data ?? res;
        });
    };

    const isRunning = bulk.state === 'running';
    const isFinished = bulk.state === 'done' || bulk.state === 'cancelled' || bulk.state === 'error';

    return (
        <BulkActionShell
            title="Grant Certification"
            subtitle="Die gewählte Zertifizierung wird allen ausgewählten Mitgliedern hinzugefügt."
            selectedUsers={selectedUsers}
            onClose={onClose}
            onConfirm={onConfirm}
            confirmLabel="Grant"
            confirmDisabled={certificationId == null}
            busy={isRunning}
            hideFooter={isRunning || isFinished}
        >
            {!isRunning && !isFinished && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-white">Zertifizierung</label>
                    <select
                        value={certificationId ?? ''}
                        onChange={(e) => setCertificationId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-sky-500/50"
                    >
                        <option value="">— Select a certification —</option>
                        {(certifications || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                        Note: certifications can be granted multiple times to the same user. Duplicates won't be deduped.
                    </p>
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

export default BulkGrantCertificationModal;
