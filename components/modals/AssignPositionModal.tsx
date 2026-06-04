import React from 'react';
import { HydratedOperation, HydratedOperationPosition } from '../../types';

interface AssignPositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: HydratedOperationPosition;
    operation: HydratedOperation;
}

const AssignPositionModal: React.FC<AssignPositionModalProps> = () => {
    // This feature has been deprecated and removed.
    // The component remains as a stub to prevent import errors in the main application.
    return null;
};

export default AssignPositionModal;