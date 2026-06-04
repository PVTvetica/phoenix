import React from 'react';
import MetricCard from '../../shared/ui/MetricCard';
import type { FinancesOverview, TreasuryAccount } from '../../../types';
import LedgerRow from './LedgerRow';

interface Props {
    overview: FinancesOverview;
    accounts: TreasuryAccount[];
    onOpenLedger: () => void;
    onOpenRequests: () => void;
}

export default function FinancesOverviewTab({ overview, accounts, onOpenLedger, onOpenRequests }: Props) {
    const activeAccounts = accounts.filter((a) => a.isActive);
    const pendingTotal = overview.pendingDepositsCount + overview.pendingWithdrawalsCount;
    const netFormatted = overview.thirtyDayNet >= 0
        ? `+${overview.thirtyDayNet.toLocaleString()}`
        : overview.thirtyDayNet.toLocaleString();

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Balance"
                    value={overview.totalBalance.toLocaleString()}
                    sub={`${activeAccounts.length} active account${activeAccounts.length === 1 ? '' : 's'} · aUEC`}
                    icon="fa-coins"
                    accent="amber"
                    emphasize
                />
                <MetricCard
                    label="Pending Deposits"
                    value={overview.pendingDepositsCount}
                    sub={`${overview.pendingDepositsAmount.toLocaleString()} aUEC awaiting confirmation`}
                    icon="fa-arrow-down-to-bracket"
                    accent="emerald"
                    onClick={pendingTotal > 0 ? onOpenRequests : undefined}
                />
                <MetricCard
                    label="Pending Withdrawals"
                    value={overview.pendingWithdrawalsCount}
                    sub={`${overview.pendingWithdrawalsAmount.toLocaleString()} aUEC requested`}
                    icon="fa-arrow-up-from-bracket"
                    accent="rose"
                    onClick={pendingTotal > 0 ? onOpenRequests : undefined}
                />
                <MetricCard
                    label="30-day Net"
                    value={netFormatted}
                    sub="Confirmed entries only"
                    icon={overview.thirtyDayNet >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}
                    accent={overview.thirtyDayNet >= 0 ? 'sky' : 'rose'}
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Konten</h2>
                        <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Live-Guthaben</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeAccounts.map((a) => (
                        <div key={a.id} className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                                        {a.type}
                                    </div>
                                    <div className="text-sm font-bold text-white truncate">{a.name}</div>
                                </div>
                                <i className="fa-solid fa-vault text-amber-300/70" />
                            </div>
                            <div className="text-2xl font-black font-mono text-white">
                                {a.balanceCached.toLocaleString()} <span className="text-xs text-slate-500 font-normal">aUEC</span>
                            </div>
                            {a.description && <div className="text-[11px] text-slate-500 mt-2 line-clamp-2">{a.description}</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-sm font-bold text-white uppercase tracking-widest">Aktuelle Aktivität</h2>
                        <p className="text-[11px] text-slate-500 font-mono uppercase tracking-widest mt-0.5">Letzte 10 Einträge</p>
                    </div>
                    <button
                        onClick={onOpenLedger}
                        className="text-[11px] font-bold uppercase tracking-widest text-amber-300 hover:text-amber-200 inline-flex items-center gap-1"
                    >Vollständiges Hauptbuch anzeigen<i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                </div>
                {overview.recentEntries.length === 0 ? (
                    <div className="rounded-xl border border-white/5 bg-slate-900/30 p-8 text-center text-slate-500 text-sm">
                        No activity yet. Deposits and withdrawals will appear here.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {overview.recentEntries.map((e) => <LedgerRow key={e.id} entry={e} accounts={accounts} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
