import React from 'react';
import MetricCard from '../../shared/ui/MetricCard';
import type { QmOverview, QmLowStockRow } from '../../../types';
import IssuanceRow from './IssuanceRow';

interface Props {
    overview: QmOverview;
    lowStock: QmLowStockRow[];
    lowStockLoading: boolean;
    onOpenArmory: () => void;
    onOpenIssuances: () => void;
}

export default function QmOverviewTab({ overview, lowStock, lowStockLoading, onOpenArmory, onOpenIssuances }: Props) {
    // Low-stock detail is served by a bounded qm:list_low_stock RPC (top N
    // SKUs at or below the threshold) so the overview never has to pull the
    // full inventory list just to surface a handful of cards.

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Items"
                    value={overview.totalItems.toLocaleString()}
                    sub={`${overview.distinctSkus} distinct SKU${overview.distinctSkus === 1 ? '' : 's'}`}
                    icon="fa-boxes-stacked"
                    accent="orange"
                    emphasize
                    onClick={onOpenArmory}
                />
                <MetricCard
                    label="On Issue"
                    value={overview.itemsOnIssue.toLocaleString()}
                    sub="Items currently held by members"
                    icon="fa-people-carry-box"
                    accent="sky"
                    onClick={overview.itemsOnIssue > 0 ? onOpenIssuances : undefined}
                />
                <MetricCard
                    label="Überfällig"
                    value={overview.overdueCount}
                    sub="Past due-back date"
                    icon="fa-clock"
                    accent="rose"
                    onClick={overview.overdueCount > 0 ? onOpenIssuances : undefined}
                />
                <MetricCard
                    label="Ausstehende Anfragen"
                    value={overview.pendingRequests}
                    sub="Awaiting an officer to fulfil"
                    icon="fa-inbox"
                    accent="amber"
                    onClick={overview.pendingRequests > 0 ? onOpenIssuances : undefined}
                />
            </div>

            {(lowStockLoading || lowStock.length > 0) && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Geringer Lagerbestand</h2>
                            <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Artikel bei oder nahe Null vorrätig</p>
                        </div>
                        <button
                            onClick={onOpenArmory}
                            className="text-[11px] font-bold uppercase tracking-widest text-orange-300 hover:text-orange-200 inline-flex items-center gap-1"
                        >Waffenkammer<i className="fa-solid fa-arrow-right text-[10px]" />
                        </button>
                    </div>
                    {lowStockLoading ? (
                        <div className="rounded-xl border border-white/5 bg-slate-900/30 p-6 text-center text-slate-500 text-sm">
                            <i className="fa-solid fa-spinner fa-spin mr-2" />Inventar wird gescannt…</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {lowStock.map((row) => {
                                const out = row.quantityOnHand <= 0;
                                return (
                                    <button
                                        key={row.inventoryId}
                                        onClick={onOpenArmory}
                                        className="text-left rounded-lg border border-rose-500/20 bg-slate-900/40 overflow-hidden flex hover:border-rose-500/40 transition-colors"
                                    >
                                        <div className={`w-1 shrink-0 ${out ? 'bg-rose-500' : 'bg-amber-500'}`} aria-hidden />
                                        <div className="flex-1 p-3 min-w-0">
                                            <div className="text-sm font-bold text-white truncate" title={row.name}>{row.name}</div>
                                            <div className="mt-1 flex items-baseline gap-3">
                                                <div>
                                                    <div className={`text-2xl font-black font-mono ${out ? 'text-rose-300' : 'text-amber-300'}`}>
                                                        {row.quantityOnHand}
                                                    </div>
                                                    <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Zur Hand</div>
                                                </div>
                                                {row.quantityOnIssue > 0 && (
                                                    <div>
                                                        <div className="text-lg font-bold font-mono text-sky-300">{row.quantityOnIssue}</div>
                                                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Zum Thema</div>
                                                    </div>
                                                )}
                                            </div>
                                            {row.locationName && (
                                                <div className="mt-2 text-[11px] text-slate-500 truncate">
                                                    <i className="fa-solid fa-location-dot mr-1 text-slate-600" /> {row.locationName}
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Aktuelle Emissionsaktivitäten</h2>
                        <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Letzte 10 Ereignisse</p>
                    </div>
                    <button
                        onClick={onOpenIssuances}
                        className="text-[11px] font-bold uppercase tracking-widest text-orange-300 hover:text-orange-200 inline-flex items-center gap-1"
                    >Alle anzeigen<i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                </div>
                {overview.recentIssuances.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-slate-900/30 p-8 text-center text-slate-500 text-sm">
                        No issuances yet. When an officer issues kit to a member, it appears here.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {overview.recentIssuances.map((iss) => <IssuanceRow key={iss.id} issuance={iss} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
