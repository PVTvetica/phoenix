import React, { useEffect, useMemo, useRef } from 'react';
import { WikiPage } from '../../../types';

interface Props {
    page: WikiPage | null;
    allPages: WikiPage[];
    onSelect: (pageId: string | null) => void;
    showHome?: boolean;
    className?: string;
}

const WikiBreadcrumb: React.FC<Props> = ({ page, allPages, onSelect, showHome = true, className = '' }) => {
    const trail = useMemo(() => {
        if (!page) return [];
        const byId = new Map(allPages.map((p) => [p.id, p]));
        const chain: WikiPage[] = [];
        let current: WikiPage | undefined = page;
        const seen = new Set<string>();
        while (current && !seen.has(current.id)) {
            seen.add(current.id);
            chain.unshift(current);
            current = current.parentPageId ? byId.get(current.parentPageId) : undefined;
        }
        return chain;
    }, [page, allPages]);

    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }, [trail.length, page?.id]);

    if (!showHome && trail.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={`flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs scrollbar-none ${className}`}
            style={{ scrollbarWidth: 'none' }}
        >
            {showHome && (
                <button
                    onClick={() => onSelect(null)}
                    className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${
                        trail.length === 0 ? 'text-white font-bold' : 'text-slate-400 hover:text-sky-300'
                    }`}
                >
                    <i className="fa-solid fa-house text-[10px]" />
                    <span>Heim</span>
                </button>
            )}
            {trail.map((p, idx) => {
                const isLast = idx === trail.length - 1;
                return (
                    <React.Fragment key={p.id}>
                        <i className="fa-solid fa-chevron-right text-[8px] text-slate-600" />
                        <button
                            onClick={() => onSelect(p.id)}
                            disabled={isLast}
                            className={`px-1.5 py-1 rounded transition-colors truncate max-w-[180px] ${
                                isLast ? 'text-white font-bold cursor-default' : 'text-slate-400 hover:text-sky-300'
                            }`}
                            title={p.title}
                        >
                            {p.title}
                        </button>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default WikiBreadcrumb;
