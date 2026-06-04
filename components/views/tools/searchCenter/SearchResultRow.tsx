import React from 'react';
import { SearchResult } from './types';
import PersonnelRowContent from './rows/PersonnelRowContent';
import MissionRowContent from './rows/MissionRowContent';
import WarrantRowContent from './rows/WarrantRowContent';
import OperationRowContent from './rows/OperationRowContent';
import IntelRowContent from './rows/IntelRowContent';
import HrRowContent from './rows/HrRowContent';
import WikiRowContent from './rows/WikiRowContent';
import SkeletonRow from './SkeletonRow';

interface Props {
    result: SearchResult;
    isSelected: boolean;
    onActivate: () => void;
}

const SearchResultRow: React.FC<Props> = ({ result, isSelected, onActivate }) => {
    switch (result.type) {
        case 'personnel':
            return <PersonnelRowContent user={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'mission':
            return <MissionRowContent request={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'warrant':
            return <WarrantRowContent warrant={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'operation':
            return <OperationRowContent operation={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'intel':
            return <IntelRowContent report={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'hr':
            return (
                <HrRowContent
                    subtype={result.subtype}
                    data={result.data}
                    onClick={onActivate}
                    isSelected={isSelected}
                />
            );
        case 'wiki':
            return <WikiRowContent page={result.data} onClick={onActivate} isSelected={isSelected} />;
        case 'intel-loading':
            return <SkeletonRow />;
        default:
            return null;
    }
};

export default React.memo(SearchResultRow);
