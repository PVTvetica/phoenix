
import React, { useState, useMemo, useCallback } from 'react';
import { VirtualizedList } from './VirtualizedList';

export interface TableColumn<T> {
    key: string;
    label: string;
    render: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface DataTableViewProps<T> {
    items: T[];
    columns: TableColumn<T>[];
    itemHeight: number;
    scrollContainerId?: string;
    selectable?: boolean;
    selectedIds: Set<string>;
    onSelectionChange: (ids: Set<string>) => void;
    onRowClick?: (item: T) => void;
    getId: (item: T) => string;
}

export const DataTableView = <T extends { id: string | number }>({
    items,
    columns,
    itemHeight,
    scrollContainerId,
    selectable = false,
    selectedIds,
    onSelectionChange,
    onRowClick,
    getId,
}: DataTableViewProps<T>) => {
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = useCallback((key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    }, [sortKey]);

    const allSelected = items.length > 0 && items.every(item => selectedIds.has(getId(item)));

    const handleSelectAll = useCallback(() => {
        if (allSelected) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(items.map(getId)));
        }
    }, [allSelected, items, getId, onSelectionChange]);

    const handleSelectOne = useCallback((id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    }, [selectedIds, onSelectionChange]);

    const sortedItems = useMemo(() => {
        if (!sortKey) return items;
        return [...items].sort((a, b) => {
            const col = columns.find(c => c.key === sortKey);
            if (!col) return 0;
            const aVal = (a as any)[sortKey];
            const bVal = (b as any)[sortKey];
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [items, sortKey, sortDir, columns]);

    return (
        <div className="w-full">
            {/* Header Row */}
            <div className="flex items-center bg-slate-800/60 border border-slate-700/50 rounded-t-lg px-2 py-2 gap-2 sticky top-0 z-10">
                {selectable && (
                    <div className="w-8 shrink-0 flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="accent-sky-500 w-3.5 h-3.5 cursor-pointer"
                        />
                    </div>
                )}
                {columns.map(col => (
                    <div
                        key={col.key}
                        className={`flex-1 text-[10px] font-black uppercase tracking-wider text-slate-500 ${col.sortable ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}
                        style={col.width ? { flex: `0 0 ${col.width}`, maxWidth: col.width } : undefined}
                        onClick={() => col.sortable && handleSort(col.key)}
                    >
                        <span className="flex items-center gap-1">
                            {col.label}
                            {col.sortable && sortKey === col.key && (
                                <i className={`fa-solid fa-caret-${sortDir === 'asc' ? 'up' : 'down'} text-sky-400 text-[9px]`}></i>
                            )}
                        </span>
                    </div>
                ))}
            </div>

            {/* Data Rows — Virtualized */}
            <VirtualizedList<T>
                scrollContainerId={scrollContainerId}
                items={sortedItems}
                itemHeight={itemHeight}
                renderItem={(item) => {
                    const id = getId(item);
                    const isSelected = selectedIds.has(id);
                    return (
                        <div
                            className={`flex items-center px-2 gap-2 border-b border-slate-800/50 transition-colors cursor-pointer h-full
                                ${isSelected ? 'bg-sky-500/10 border-sky-500/20' : 'hover:bg-slate-800/30'}`}
                            onClick={() => onRowClick?.(item)}
                        >
                            {selectable && (
                                <div className="w-8 shrink-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleSelectOne(id)}
                                        className="accent-sky-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                </div>
                            )}
                            {columns.map(col => (
                                <div
                                    key={col.key}
                                    className="flex-1 text-sm text-slate-300 truncate py-1"
                                    style={col.width ? { flex: `0 0 ${col.width}`, maxWidth: col.width } : undefined}
                                >
                                    {col.render(item)}
                                </div>
                            ))}
                        </div>
                    );
                }}
            />
        </div>
    );
};
