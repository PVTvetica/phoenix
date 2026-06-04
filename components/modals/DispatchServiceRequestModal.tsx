import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HydratedServiceRequest } from '../../types';
import ServiceRequestDetailView from '../views/operations/ServiceRequestDetailView';

import { useData } from '../../contexts/DataContext';
import { useModalRegistry } from '../../contexts/ModalRegistryContext';

interface DispatchServiceRequestModalProps {
    request: HydratedServiceRequest | null;
    onClose: () => void;
}

const DispatchServiceRequestModal: React.FC<DispatchServiceRequestModalProps> = ({ request, onClose }) => {
    const { hydratedServiceRequests } = useData();
    const { openModal, setIsCompleteModalOpen, setIsRateRequestModalOpen, setIsAddResponderModalOpen, setIsUpdateRequestModalOpen, setIsTriageModalOpen, setIsDispatchModalOpen } = useModalRegistry();

    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!request) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs"
                onClick={onClose}
            ></div>

            {/* Modal Content - Reusing the View */}
            <div className="relative w-full h-full max-w-7xl max-h-[95vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 flex flex-col">
                {/* Close Button Overlay (Optional, as the View has a back button) */}
                <ServiceRequestDetailView
                    request={hydratedServiceRequests.find(r => r.id === request.id) || request}
                    onBack={onClose}
                    openCompleteModal={(req) => openModal(setIsCompleteModalOpen, req)}
                    openRateRequestModal={(req) => openModal(setIsRateRequestModalOpen, req)}
                    openAddResponderModal={(req) => openModal(setIsAddResponderModalOpen, req)}
                    openUpdateStatusModal={(req) => openModal(setIsUpdateRequestModalOpen, req)}
                    openTriageModal={(req) => openModal(setIsTriageModalOpen, req)}
                    openDispatchModal={(req) => openModal(setIsDispatchModalOpen, req)}
                />
            </div>
        </div>,
        document.body
    );
};

export default DispatchServiceRequestModal;
