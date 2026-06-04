import React from 'react';
import { WikiPage } from '../../../../../types';
import { AccentKey, ACCENTS } from '../../../../shared/ui/accents';
import SearchResultCard from '../SearchResultCard';
import { timeAgoShort } from '../../../intel/intelStyles';
import { clearanceAccent } from '../../../operations/operations/operationStyles';

interface Props {
    page: WikiPage;
    onClick: () => void;
    isSelected?: boolean;
}

const WikiRowContent: React.FC<Props> = ({ page, onClick, isSelected }) => {
    const isClassified = (page.classificationLevel || 0) > 0;
    const accent: AccentKey = isClassified ? clearanceAccent(page.classificationLevel) : 'indigo';
    const a = ACCENTS[accent];
    const markers = page.limitingMarkers || [];
    return (
        <SearchResultCard
            accent={accent}
            icon="fa-book"
            onClick={onClick}
            isSelected={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded-sm border bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-black text-[9px] uppercase tracking-widest shrink-0">
                    Wiki
                </span>
                <h3 className="text-white font-bold text-sm truncate">{page.title}</h3>
                <span className="text-slate-700 shrink-0">·</span>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    <i className="fa-regular fa-clock mr-1" aria-hidden />
                    {timeAgoShort(page.updatedAt || page.createdAt)}
                </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-slate-400 font-mono truncate min-w-0 flex-1">
                    /{page.slug}
                </span>
                {isClassified && (
                    <span className={`px-1.5 py-0.5 rounded-sm border font-black text-[9px] uppercase tracking-widest shrink-0 ${a.bg} ${a.border} ${a.text}`}>
                        <i className="fa-solid fa-shield-halved mr-1" aria-hidden />
                        LVL {page.classificationLevel}
                    </span>
                )}
                {markers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/40 border-white/5 text-slate-500 font-mono text-[10px] shrink-0">
                        <i className="fa-solid fa-key mr-1" aria-hidden />
                        {markers.length}
                    </span>
                )}
                {page.updatedBy?.name && (
                    <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap shrink-0">
                        {page.updatedBy.name}
                    </span>
                )}
            </div>
        </SearchResultCard>
    );
};

export default React.memo(WikiRowContent);
