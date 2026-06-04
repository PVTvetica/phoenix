
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useData } from '../../../contexts/DataContext';
import { useOperations } from '../../../contexts/OperationsContext';
import { HydratedWarrant, WarrantStatus } from '../../../types';
import { VirtualizedList } from '../../ui/VirtualizedList';
import { DataTableView, TableColumn } from '../../ui/DataTableView';
import HeroShell from '../../shared/ui/HeroShell';
import HeroStat from '../../shared/ui/HeroStat';
import HeroActionButton from '../../shared/ui/HeroActionButton';
import EmptyState from '../../shared/ui/EmptyState';
import { ACCENTS } from '../../shared/ui/accents';
import WarrantCard from './warrants/WarrantCard';
import { useNotification } from '../../../contexts/NotificationContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import {
    warrantStatusAccent,
    warrantStatusLabel,
    warrantActionAccent,
    warrantActionIcon,
    warrantActionLabel,
    warrantIsLive,
    timeAgoShort,
} from './warrants/warrantStyles';

/** UI-level filter — Active and Standing are merged into a single "active" bucket. */
type WarrantFilter = 'active' | 'claimed' | 'cancelled' | 'all';

interface WarrantsViewProps {
    openCreateModal: () => void;
    openUpdateModal: (warrant: HydratedWarrant) => void;
}

const WarrantsView: React.FC<WarrantsViewProps> = ({ openCreateModal, openUpdateModal }) => {
    const { rpcAction, refreshWarrants, isFetching } = useData();
    const { warrants, deleteWarrant } = useOperations();
    const { hasPermission } = useAuth();
    const { confirm } = useNotification();
    const { setSelectedWarrant } = useNavigation();
    const canManageWarrants = hasPermission('warrant:manage');
    const [filter, setFilter] = useState<WarrantFilter>('active');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Adjusted height for new card design. Increase for mobile to prevent cutoff.
    const [itemHeight, setItemHeight] = useState(window.innerWidth < 768 ? 480 : 380);

    useEffect(() => {
        const handleResize = () => setItemHeight(window.innerWidth < 768 ? 480 : 380);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cross-view pre-selection: the Diplomacy dossier can fire `app:warrants-open-warrant`
    // with a warrant id when it navigates here. Match on id and open the detail modal.
    useEffect(() => {
        const handler = (e: Event) => {
            const wid = (e as CustomEvent).detail?.warrantId;
            if (!wid) return;
            const found = warrants.find(w => String(w.id) === String(wid));
            if (found) setSelectedWarrant(found);
        };
        window.addEventListener('app:warrants-open-warrant', handler as EventListener);
        return () => window.removeEventListener('app:warrants-open-warrant', handler as EventListener);
    }, [warrants, setSelectedWarrant]);

    const filteredWarrants = useMemo(() => {
        let result = warrants;
        if (filter === 'active') {
            result = result.filter(w => warrantIsLive(w.status));
        } else if (filter === 'claimed') {
            result = result.filter(w => w.status === WarrantStatus.Claimed);
        } else if (filter === 'cancelled') {
            result = result.filter(w => w.status === WarrantStatus.Cancelled);
        }
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(w =>
                w.targetRsiHandle.toLowerCase().includes(lowerTerm) ||
                w.reason.toLowerCase().includes(lowerTerm) ||
                w.id.toLowerCase().includes(lowerTerm)
            );
        }
        return result;
    }, [warrants, filter, searchTerm]);

    const warrantTableColumns: TableColumn<HydratedWarrant>[] = useMemo(() => [
        { key: 'targetRsiHandle', label: 'Target', sortable: true, width: '140px', render: (w) => <span className="font-mono font-bold text-white text-xs">{w.targetRsiHandle}</span> },
        { key: 'action', label: 'Aktion', sortable: true, width: '110px', render: (w) => {
            const a = ACCENTS[warrantActionAccent(w.action)];
            return <span className={`text-[10px] font-black uppercase ${a.text}`}><i className={`fa-solid ${warrantActionIcon(w.action)} mr-1`} aria-hidden />{warrantActionLabel(w.action)}</span>;
        }},
        { key: 'status', label: 'Status', sortable: true, width: '90px', render: (w) => {
            const a = ACCENTS[warrantStatusAccent(w.status)];
            return <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase border ${a.bg} ${a.border} ${a.text} ${warrantIsLive(w.status) ? 'animate-pulse' : ''}`}>{warrantStatusLabel(w.status)}</span>;
        }},
        { key: 'uecReward', label: 'Reward', sortable: true, width: '100px', render: (w) => <span className="text-xs font-bold text-lime-400 font-mono">{w.uecReward.toLocaleString()} <span className="text-[9px] text-lime-400/60">aUEC</span></span> },
        { key: 'reason', label: 'Grund', render: (w) => <span className="text-xs text-slate-400 truncate block">{w.reason.substring(0, 60)}{w.reason.length > 60 ? '...' : ''}</span> },
        { key: 'issuedAt', label: 'Ausgegeben', sortable: true, width: '80px', render: (w) => <span className="text-[10px] text-slate-500 font-mono">{timeAgoShort(w.issuedAt)}</span> },
        { key: 'sourceFeedLabel', label: 'Quelle', width: '70px', render: (w) => w.sourceFeedLabel ? <span className="text-[9px] text-sky-400 bg-sky-900/40 px-1.5 py-0.5 rounded-sm border border-sky-500/30 uppercase font-bold">EXT</span> : <span className="text-[9px] text-slate-600">LOCAL</span> },
    ], []);

    const handleBulkDeleteWarrants = async () => {
        if (selectedIds.size === 0) return;
        const confirmed = await confirm({
            title: 'Kopfgelder löschen',
            message: `${selectedIds.size} ${selectedIds.size === 1 ? 'ausgewähltes Kopfgeld' : 'ausgewählte Kopfgelder'} dauerhaft löschen? Das kann nicht rückgängig gemacht werden.`,
            variant: 'danger',
            confirmText: `${selectedIds.size} ${selectedIds.size === 1 ? 'Kopfgeld' : 'Kopfgelder'} löschen`
        });
        if (!confirmed) return;
        try {
            await rpcAction('warrant:bulk_delete', { warrantIds: Array.from(selectedIds) });
            setSelectedIds(new Set());
            refreshWarrants();
        } catch (e) { console.error(e); }
    };

    const heroCounts = useMemo(() => {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const active = warrants.filter(w => w.status === WarrantStatus.Active || w.status === WarrantStatus.Standing);
        return {
            active: active.length,
            totalBounty: active.reduce((sum, w) => sum + (w.uecReward || 0), 0),
            claimed30d: warrants.filter(w => w.status === WarrantStatus.Claimed && new Date(w.issuedAt).getTime() > thirtyDaysAgo).length,
            closed30d: warrants.filter(w => [WarrantStatus.Cancelled, WarrantStatus.Claimed].includes(w.status) && new Date(w.issuedAt).getTime() > thirtyDaysAgo).length,
        };
    }, [warrants]);

    const tabs: { key: WarrantFilter; label: string; icon: string; badge?: number }[] = [
        { key: 'active', label: 'Aktiv', icon: 'fa-bolt', badge: warrants.filter(w => warrantIsLive(w.status)).length || undefined },
        { key: 'claimed', label: 'Behauptet', icon: 'fa-handcuffs' },
        { key: 'cancelled', label: 'Abgesagt', icon: 'fa-ban' },
        { key: 'all', label: 'Alle', icon: 'fa-list-ul' },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden animate-fade-in">
            <HeroShell
                chipLabel="MODUL · KOPFGELDER"
                chipIcon="fa-crosshairs"
                chipAccent="red"
                title="Kopfgelder"
                subtitle="Markierte Handles, Belohnungen und Feldverfolgung."
                syncing={isFetching['warrants']}
                actions={<>
                    {hasPermission('warrant:create') && (
                        <HeroActionButton onClick={openCreateModal} accent="red" icon="fa-plus">Neues Kopfgeld</HeroActionButton>
                    )}
                    <div className="flex bg-slate-900/60 rounded-lg border border-slate-700 p-0.5">
                        <button onClick={() => { setViewMode('cards'); setSelectedIds(new Set()); }}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'cards' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                            <i className="fa-solid fa-grip"></i>
                        </button>
                        <button onClick={() => { setViewMode('table'); setSelectedIds(new Set()); }}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                            <i className="fa-solid fa-table-list"></i>
                        </button>
                    </div>
                </>}
                stats={<>
                    <HeroStat icon="fa-bolt" label="Aktiv" value={heroCounts.active} accent="red" emphasize={heroCounts.active > 0} />
                    <HeroStat icon="fa-coins" label="Gesamtbelohnung" value={heroCounts.totalBounty.toLocaleString()} sub="aUEC ausstehend" accent="amber" />
                    <HeroStat icon="fa-handcuffs" label="Beansprucht (30T)" value={heroCounts.claimed30d} accent="sky" />
                    <HeroStat icon="fa-flag-checkered" label="Geschlossen (30T)" value={heroCounts.closed30d} accent="slate" />
                </>}
                tabs={tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                            filter === tab.key
                                ? 'text-red-300 border-red-400'
                                : 'text-slate-500 border-transparent hover:text-slate-300'
                        }`}
                    >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        {tab.label}
                        {tab.badge != null && (
                            <span className="ml-1 min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-red-500/20 text-red-300 rounded-full flex items-center justify-center">{tab.badge}</span>
                        )}
                    </button>
                ))}
            />

            {/* Body — full-width */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Search */}
                <div className="relative mb-4 max-w-2xl">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                    <input
                        type="search"
                        placeholder="Ziel, Grund oder ID suchen…"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (e.target.value) setFilter('all');
                        }}
                        className="w-full bg-slate-900/60 text-white pl-12 pr-4 py-2.5 rounded-lg border border-slate-700 outline-hidden placeholder:text-slate-600 font-mono text-sm focus:ring-1 focus:ring-red-500/50 focus:border-red-500/40 transition-all"
                    />
                </div>

                {/* Bulk Action Bar */}
                {viewMode === 'table' && selectedIds.size > 0 && hasPermission('warrant:manage') && (
                    <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg animate-fade-in">
                        <span className="text-xs font-bold text-red-400">{selectedIds.size} ausgewählt</span>
                        <span className="h-4 w-px bg-red-500/30"></span>
                        <button onClick={handleBulkDeleteWarrants} className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 px-3 py-1.5 rounded-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                            <i className="fa-solid fa-trash mr-1.5"></i>Ausgewählte löschen</button>
                        <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Auswahl löschen</button>
                    </div>
                )}

                {filteredWarrants.length > 0 ? (
                    viewMode === 'table' ? (
                        <DataTableView<HydratedWarrant>
                            items={filteredWarrants}
                            columns={warrantTableColumns}
                            itemHeight={56}
                            selectable={hasPermission('warrant:manage')}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            onRowClick={(warrant) => setSelectedWarrant(warrant)}
                            getId={(w) => w.id}
                        />
                    ) : (
                        <VirtualizedList
                            items={filteredWarrants}
                            itemHeight={itemHeight}
                            renderItem={(warrant) => (
                                <div className="p-3 h-full">
                                    <WarrantCard warrant={warrant} canManage={canManageWarrants} onUpdate={openUpdateModal} onDelete={deleteWarrant} onClick={() => setSelectedWarrant(warrant)} />
                                </div>
                            )}
                        />
                    )
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 mt-4">
                        <EmptyState
                            icon="fa-folder-open"
                            accent="red"
                            heading="Keine passenden Kopfgelder"
                            description={searchTerm ? 'Probiere einen anderen Suchbegriff.' : 'Neue Kopfgelder erscheinen hier nach Einreichung.'}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
export default WarrantsView;
