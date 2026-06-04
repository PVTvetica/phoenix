
import React, { useEffect, useState } from 'react';
import UnifiedCaseFileView from './UnifiedCaseFileView';

import { useNavigation } from '../../../contexts/NavigationContext';

const ApplicantDetailView: React.FC = () => {
    const { setActiveView } = useNavigation();
    const [id, setId] = useState<string | null>(null);

    useEffect(() => {
        // Fallback to legacy local storage method if no selectedCaseFile in context
        const storedId = localStorage.getItem('selected_applicant_id');
        if (storedId) {
            setId(storedId);
        } else {
            setActiveView('hr');
        }
    }, [setActiveView]);

    if (!id) return null;

    return <UnifiedCaseFileView applicationId={id} onBack={() => setActiveView('hr')} />;
};

export default ApplicantDetailView;
