
import React, { useState } from 'react';
import { useMembers } from '../../../contexts/MembersContext';
import { User } from '../../../types';
import AdminClientDetailView from '../admin/AdminClientDetailView';
import ClientManagementTab from '../admin/ClientManagementTab';
import { useModalRegistry } from '../../../contexts/ModalRegistryContext';

// HR-Hub-side wrapper for the existing admin Client Register (#9 of the
// user-feedback list). Mirrors the HRMembersTab pattern: the list view and
// drill-in detail view are both reused verbatim from the admin module so HR
// Managers see full parity with admins (including reputation-adjust and
// admin-notes actions). The decision to grant HR Managers full client-detail
// access is documented in the medium-effort PR plan.
//
// State is liftable to HRHubView via optional props so clicking the
// "Client Register" nav while drilled into a client returns to the list —
// otherwise activeTab doesn't change and the click is a no-op.
interface HRClientRegisterTabProps {
    managingClientId?: number | null;
    setManagingClientId?: (id: number | null) => void;
}

const HRClientRegisterTab: React.FC<HRClientRegisterTabProps> = ({
    managingClientId: extId,
    setManagingClientId: extSet,
}) => {
    const [internalId, setInternalId] = useState<number | null>(null);
    const managingClientId = extId !== undefined ? extId : internalId;
    const setManagingClientId = extSet || setInternalId;

    const { allUsers } = useMembers();
    const { openAdjustReputationModal, openReputationHistoryModal } = useModalRegistry();

    const setManagingClient = (user: User | null) => setManagingClientId(user?.id ?? null);
    const managingClient = managingClientId ? allUsers.find(u => u.id === managingClientId) || null : null;

    if (managingClient) {
        return (
            <div className="animate-fade-in -m-4 sm:-m-6">
                <AdminClientDetailView
                    user={managingClient}
                    onBack={() => setManagingClientId(null)}
                    openAdjustReputationModal={openAdjustReputationModal}
                    openReputationHistoryModal={openReputationHistoryModal}
                />
            </div>
        );
    }

    return (
        <div className="animate-fade-in -m-4 sm:-m-6">
            <ClientManagementTab onManageUser={setManagingClient} />
        </div>
    );
};

export default HRClientRegisterTab;
