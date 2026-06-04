import React from 'react';
import { HydratedOperationTeam, HydratedOperationPosition } from '../../types';

interface PositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: HydratedOperationTeam;
    position?: HydratedOperationPosition | null;
}

const PositionModal: React.FC<PositionModalProps> = () => {
    // This feature has been deprecated and removed.
    // The component remains as a stub to prevent import errors in the main application.
    return null;
};

export default PositionModal;