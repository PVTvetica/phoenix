
import React, { useEffect, useState } from 'react';
import UnifiedCaseFileView from './UnifiedCaseFileView';

import { useNavigation } from '../../../contexts/NavigationContext';

const InternalTransferView: React.FC = () => {
    const { setActiveView } = useNavigation();
    const [id, setId] = useState<string | null>(null);

    useEffect(() => {
        const storedId = localStorage.getItem('selected_transfer_id');
        if (storedId) {
            setId(storedId);
        } else {
            setActiveView('hr');
        }
    }, [setActiveView]);

    if (!id) return null;

    return <UnifiedCaseFileView applicationId={id} onBack={() => setActiveView('hr')} />;
};

export default InternalTransferView;
