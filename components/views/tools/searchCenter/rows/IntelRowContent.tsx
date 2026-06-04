import React from 'react';
import { HydratedIntelligenceReport } from '../../../../../types';
import SearchResultCard from '../SearchResultCard';
import { ACCENTS } from '../../../../shared/ui/accents';
import {
    threatAccent,
    threatIsAlarm,
    subjectIcon,
    subjectLabel,
    timeAgoShort,
} from '../../../intel/intelStyles';

interface Props {
    report: HydratedIntelligenceReport;
    onClick: () => void;
    isSelected?: boolean;
}

const IntelRowContent: React.FC<Props> = ({ report, onClick, isSelected }) => {
    const accent = threatAccent(report.threatLevel);
    const a = ACCENTS[accent];
    const alarm = threatIsAlarm(report.threatLevel);
    const tags = Array.isArray(report.tags) ? report.tags : [];
    return (
        <SearchResultCard
            accent={accent}
            pulseRail={alarm}
            icon={subjectIcon(report.subjectType)}
            onClick={onClick}
            isSelected={isSelected}
        >
            <div className="flex items-center gap-2 min-w-0">
                <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/60 border-white/10 text-slate-400 font-mono text-[9px] uppercase tracking-widest shrink-0">
                    Intel
                </span>
                <h3 className="text-white font-black font-mono text-sm uppercase truncate">{report.targetId}</h3>
                <span className="text-slate-700 shrink-0">·</span>
                <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    <i className="fa-regular fa-clock mr-1" aria-hidden />
                    {timeAgoShort(report.createdAt)}
                </span>
                <span className="text-slate-700 shrink-0">·</span>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    {subjectLabel(report.subjectType)}
                </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
                <span className={`px-1.5 py-0.5 rounded-sm border font-black text-[9px] uppercase tracking-widest shrink-0 ${a.bg} ${a.border} ${a.text}`}>
                    {report.threatLevel || 'UNKNOWN'}
                </span>
                {(report.classificationLevel || 0) > 0 && (
                    <span className="px-1.5 py-0.5 rounded-sm border bg-amber-500/10 border-amber-500/30 text-amber-300 font-mono text-[10px] uppercase tracking-wider shrink-0">
                        <i className="fa-solid fa-lock mr-1" aria-hidden />
                        LVL {report.classificationLevel}
                    </span>
                )}
                <p className="text-[11px] text-slate-300 truncate min-w-0 flex-1 italic">
                    {report.summary}
                </p>
                {tags.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-sm border bg-slate-900/40 border-white/5 text-slate-500 font-mono text-[10px] shrink-0">
                        <i className="fa-solid fa-tag mr-1" aria-hidden />
                        {tags.length}
                    </span>
                )}
            </div>
        </SearchResultCard>
    );
};

export default React.memo(IntelRowContent);
