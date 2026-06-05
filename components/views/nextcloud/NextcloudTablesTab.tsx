
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../../shared/ui/EmptyState';
import MetricCard from '../../shared/ui/MetricCard';
import nextcloudTablesService, {
    TablesColumn,
    TablesRow,
    TablesStatus,
    TablesTable,
} from '../../../services/nextcloudTablesService';
import { cellText, tablesStatusAccent, tablesStatusLabel } from './nextcloudTablesUtils';

interface Props {
    active: boolean;
}

const ROW_PAGE_SIZE = 50;

const NextcloudTablesTab: React.FC<Props> = ({ active }) => {
    const [tablesStatus, setTablesStatus] = useState<TablesStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [tables, setTables] = useState<TablesTable[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
    const [columns, setColumns] = useState<TablesColumn[]>([]);
    const [rows, setRows] = useState<TablesRow[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const selectedTable = useMemo(
        () => tables.find(t => t.id === selectedTableId) ?? null,
        [tables, selectedTableId],
    );

    const displayColumns = useMemo((): TablesColumn[] => {
        if (columns.length > 0) return columns;
        const ids = new Set<number>();
        for (const row of rows) {
            for (const key of Object.keys(row.cells)) {
                const id = Number(key);
                if (Number.isInteger(id) && id > 0) ids.add(id);
            }
        }
        return Array.from(ids)
            .sort((a, b) => a - b)
            .map(id => ({ id, title: `Spalte ${id}` }));
    }, [columns, rows]);

    const loadStatus = useCallback(async () => {
        setStatusLoading(true);
        setLoadError(null);
        try {
            const s = await nextcloudTablesService.getStatus();
            setTablesStatus(s);
            if (s.available) {
                const list = await nextcloudTablesService.getTables();
                setTables(list);
                if (list.length > 0) {
                    setSelectedTableId((prev) => (prev && list.some(t => t.id === prev) ? prev : list[0].id));
                } else {
                    setSelectedTableId(null);
                }
            } else {
                setTables([]);
                setSelectedTableId(null);
            }
        } catch {
            setTablesStatus({ configured: true, available: false, error: 'Tables-App nicht verfügbar' });
            setTables([]);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const loadTableData = useCallback(async (tableId: number, pageOffset: number) => {
        setDataLoading(true);
        setLoadError(null);
        try {
            const [schema, rowsResult] = await Promise.all([
                nextcloudTablesService.getSchema(tableId),
                nextcloudTablesService.getRows(tableId, ROW_PAGE_SIZE, pageOffset),
            ]);
            setColumns(schema.columns);
            setRows(rowsResult.rows);
            setOffset(rowsResult.offset);
            setHasMore(rowsResult.hasMore);
        } catch (e) {
            setColumns([]);
            setRows([]);
            setHasMore(false);
            setLoadError(e instanceof Error ? e.message : 'Tabellendaten konnten nicht geladen werden.');
        } finally {
            setDataLoading(false);
        }
    }, []);

    useEffect(() => {
        if (active) void loadStatus();
    }, [active, loadStatus]);

    useEffect(() => {
        if (active && tablesStatus?.available && selectedTableId != null) {
            setOffset(0);
            void loadTableData(selectedTableId, 0);
        }
    }, [active, tablesStatus?.available, selectedTableId, loadTableData]);

    const openInNextcloud = () => {
        if (!selectedTable?.url) return;
        window.open(selectedTable.url, '_blank', 'noopener,noreferrer');
    };

    const goToPage = (nextOffset: number) => {
        if (selectedTableId == null || nextOffset < 0) return;
        void loadTableData(selectedTableId, nextOffset);
    };

    if (statusLoading) {
        return (
            <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                <i className="fa-solid fa-circle-notch animate-spin mr-2" />Tabellen werden geladen…
            </div>
        );
    }

    if (!tablesStatus?.configured) {
        return (
            <EmptyState
                icon="fa-table"
                heading="Nicht konfiguriert"
                description="Nextcloud-Zugangsdaten fehlen auf dem Server. Tables-Integration ist nicht eingerichtet."
                accent="purple"
            />
        );
    }

    if (!tablesStatus.available) {
        return (
            <div className="space-y-4">
                <MetricCard
                    label="Tabellen"
                    value="Fehler"
                    sub={tablesStatus.error}
                    icon="fa-table"
                    accent="red"
                />
                <EmptyState
                    icon="fa-table"
                    heading="Tables-App nicht verfügbar"
                    description={tablesStatus.error ?? 'Nextcloud Tables ist nicht erreichbar oder nicht installiert.'}
                    accent="purple"
                />
            </div>
        );
    }

    const statusLabel = tablesStatusLabel(tablesStatus);

    return (
        <div className="space-y-4">
            <MetricCard
                label="Tabellen"
                value={statusLabel}
                sub="Nextcloud Tables read-only · keine Bearbeitung"
                icon="fa-table"
                accent={tablesStatusAccent(tablesStatus)}
                emphasize={statusLabel === 'Aktiv'}
            />

            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[220px]">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Tabelle
                    </label>
                    <select
                        value={selectedTableId ?? ''}
                        onChange={(e) => setSelectedTableId(Number(e.target.value) || null)}
                        disabled={dataLoading || tables.length === 0}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                        {tables.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    {selectedTable?.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selectedTable.description}</p>
                    )}
                </div>

                <div className="flex items-end gap-2 ml-auto">
                    {selectedTable?.url && (
                        <button
                            type="button"
                            onClick={openInNextcloud}
                            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square mr-1" />In Nextcloud öffnen
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => selectedTableId != null && void loadTableData(selectedTableId, offset)}
                        disabled={dataLoading || selectedTableId == null}
                        className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-40"
                        title="Aktualisieren"
                    >
                        <i className={`fa-solid fa-rotate-right ${dataLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {loadError}
                </div>
            )}

            {tables.length === 0 ? (
                <EmptyState
                    icon="fa-table"
                    heading="Keine Tabellen gefunden"
                    description="Für den Service-User sind keine Nextcloud Tables sichtbar."
                    accent="purple"
                />
            ) : dataLoading && rows.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                    <i className="fa-solid fa-circle-notch animate-spin mr-2" />Daten laden…
                </div>
            ) : (
                <>
                    {displayColumns.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {displayColumns.map(col => (
                                <span
                                    key={col.id}
                                    className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border border-slate-700/80 text-slate-400"
                                    title={col.type ? `Typ: ${col.type}` : undefined}
                                >
                                    {col.title}
                                    {col.mandatory ? ' *' : ''}
                                </span>
                            ))}
                        </div>
                    )}

                    {rows.length === 0 ? (
                        <EmptyState
                            icon="fa-table-cells"
                            heading="Keine Zeilen vorhanden"
                            description={selectedTable ? `„${selectedTable.title}" enthält noch keine Zeilen.` : 'Wähle eine Tabelle.'}
                            accent="purple"
                        />
                    ) : (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700/60 text-left">
                                        <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                            #
                                        </th>
                                        {displayColumns.map(col => (
                                            <th
                                                key={col.id}
                                                className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap"
                                            >
                                                {col.title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                    {rows.map(row => (
                                        <tr key={row.id} className="hover:bg-slate-800/30">
                                            <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">
                                                {row.id}
                                            </td>
                                            {displayColumns.map(col => (
                                                <td
                                                    key={`${row.id}-${col.id}`}
                                                    className="px-3 py-2 text-slate-200 max-w-xs truncate"
                                                    title={cellText(row.cells[String(col.id)])}
                                                >
                                                    {cellText(row.cells[String(col.id)])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(offset > 0 || hasMore) && (
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                            <span>
                                Zeilen {offset + 1}–{offset + rows.length}
                                {hasMore ? '+' : ''}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={dataLoading || offset === 0}
                                    onClick={() => goToPage(Math.max(0, offset - ROW_PAGE_SIZE))}
                                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 disabled:opacity-40"
                                >
                                    Zurück
                                </button>
                                <button
                                    type="button"
                                    disabled={dataLoading || !hasMore}
                                    onClick={() => goToPage(offset + ROW_PAGE_SIZE)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 disabled:opacity-40"
                                >
                                    Weiter
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default NextcloudTablesTab;
