import React from 'react';
import { HydratedOperation, HydratedOperationTeam } from '../../types';

interface TeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    operation: HydratedOperation;
    team?: HydratedOperationTeam | null;
}

const TeamModal: React.FC<TeamModalProps> = () => {
    // This feature has been deprecated and removed.
    // The component remains as a stub to prevent import errors in the main application.
    return null;
};

export default TeamModal;