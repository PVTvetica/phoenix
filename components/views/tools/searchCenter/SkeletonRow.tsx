import React from 'react';
import { SEARCH_ROW_HEIGHT } from './SearchResultCard';

const SkeletonRow: React.FC = () => (
    <div
        className="relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border border-white/10 bg-linear-to-br from-slate-900/60 via-slate-900/40 to-slate-950/60 overflow-hidden"
        style={{ height: SEARCH_ROW_HEIGHT }}
    >
        <div className="absolute inset-y-0 left-0 w-1 bg-sky-500/30 animate-pulse" aria-hidden />
        <div className="w-10 h-10 rounded-lg bg-slate-800/60 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 bg-slate-800/60 rounded-sm animate-pulse" />
            <div className="h-2.5 w-1/2 bg-slate-800/40 rounded-sm animate-pulse" />
        </div>
    </div>
);

export default SkeletonRow;
