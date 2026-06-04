import React, { useMemo } from 'react';
import { VirtualizedList } from '../../../ui/VirtualizedList';
import { SearchResult } from './types';
import SearchResultRow from './SearchResultRow';
import { SEARCH_ROW_HEIGHT } from './SearchResultCard';

interface Props {
    results: SearchResult[];
    selectedIndex: number;
    onActivate: (index: number) => void;
    scrollContainerId: string;
}

interface IndexedRow {
    id: string;
    idx: number;
    result: SearchResult;
}

const SearchResultsList: React.FC<Props> = ({ results, selectedIndex, onActivate, scrollContainerId }) => {
    const indexedItems = useMemo<IndexedRow[]>(
        () => results.map((result, idx) => ({ id: result.id, idx, result })),
        [results],
    );

    return (
        <VirtualizedList
            items={indexedItems}
            itemHeight={SEARCH_ROW_HEIGHT + 8}
            scrollContainerId={scrollContainerId}
            renderItem={(item) => (
                <div className="pb-2">
                    <SearchResultRow
                        result={item.result}
                        isSelected={item.idx === selectedIndex}
                        onActivate={() => onActivate(item.idx)}
                    />
                </div>
            )}
        />
    );
};

export default SearchResultsList;
