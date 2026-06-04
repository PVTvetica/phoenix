
import React from 'react';
import UnifiedCaseFileView from './UnifiedCaseFileView';
import { HydratedHRApplication } from '../../../types';

interface SecurityVettingViewProps {
    applicant: HydratedHRApplication;
    onBack: () => void;
}

const SecurityVettingView: React.FC<SecurityVettingViewProps> = ({ applicant, onBack }) => {
    return <UnifiedCaseFileView applicationId={applicant.id} onBack={onBack} />;
};

export default SecurityVettingView;
