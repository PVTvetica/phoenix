import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { AllianceDirectoryEntry, AllyRosterData, AllyFleetSummary } from '../../../types';

type StatusFilter = 'All' | 'Active' | 'Pending';
type TypeFilter = 'All' | 'Alliance' | 'Neutral' | 'Rivalry';

const typeStyles: Record<string, { ring: string; chip: string; icon: string }> = {
    Alliance: { ring: 'border-green-500/30', chip: 'bg-green-500/15 text-green-300 border-green-500/30', icon: 'fa-handshake' },
    Neutral: { ring: 'border-slate-600/40', chip: 'bg-slate-600/20 text-slate-300 border-slate-600/40', icon: 'fa-scale-balanced' },
    Rivalry: { ring: 'border-red-500/30', chip: 'bg-red-500/15 text-red-300 border-red-500/30', icon: 'fa-bolt' },
};

const STATUS_LABELS: Record<StatusFilter, string> = { All: 'Alle', Active: 'Aktiv', Pending: 'Ausstehend' };
const TYPE_LABELS: Record<TypeFilter, string> = { All: 'Alle', Alliance: 'Allianz', Neutral: 'Neutral', Rivalry: 'Rivalität' };
const ALLIANCE_TYPE_LABELS: Record<string, string> = { Alliance: 'Allianz', Neutral: 'Neutral', Rivalry: 'Rivalität' };
const ALLIANCE_STATUS_LABELS: Record<string, string> = { Active: 'Aktiv', Pending: 'Ausstehend' };

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick}
        className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${active ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/50' : 'bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200'}`}>
        {children}
    </button>
);

const AllianceDirectoryView: React.FC = () => {
    const { rpcAction } = useData();
    const [entries, setEntries] = useState<AllianceDirectoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');

    // Drill-in: an ally's shared roster / fleet summary (lazy-loaded server-to-server).
    const [openPeer, setOpenPeer] = useState<AllianceDirectoryEntry | null>(null);
    const [roster, setRoster] = useState<AllyRosterData | null>(null);
    const [fleet, setFleet] = useState<AllyFleetSummary | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const openPeerDetail = useCallback(async (entry: AllianceDirectoryEntry) => {
        setOpenPeer(entry);
        setRoster(null); setFleet(null); setDetailLoading(true);
        try {
            const [r, f] = await Promise.all([
                rpcAction('alliance:fetch_peer_roster', { peerId: entry.id }).catch(() => null),
                rpcAction('alliance:fetch_peer_fleet', { peerId: entry.id }).catch(() => null),
            ]);
            setRoster(r); setFleet(f);
        } finally { setDetailLoading(false); }
    }, [rpcAction]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rpcAction('alliance:get_directory', {});
            setEntries(data || []);
        } catch {
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, [rpcAction]);

    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => entries.filter(e =>
        (statusFilter === 'All' || e.status === statusFilter) &&
        (typeFilter === 'All' || e.type === typeFilter)
    ), [entries, statusFilter, typeFilter]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="border-b border-slate-700/50 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30">
                        <i className="fa-solid fa-handshake text-indigo-300" aria-hidden />
                    </span>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Allianzverzeichnis</h2>
                        <p className="text-slate-400 text-sm mt-1">Organisationen, mit denen deine Org eine diplomatische Beziehung pflegt.</p>
                    </div>
                </div>
                <button onClick={load} className="text-xs text-slate-400 hover:text-white self-start md:self-auto"><i className="fa-solid fa-rotate mr-1"></i>Aktualisieren</button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Status</span>
                {(['All', 'Active', 'Pending'] as StatusFilter[]).map(s => (
                    <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_LABELS[s]}</FilterChip>
                ))}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mx-1 ml-4">Typ</span>
                {(['All', 'Alliance', 'Neutral', 'Rivalry'] as TypeFilter[]).map(t => (
                    <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)}>{TYPE_LABELS[t]}</FilterChip>
                ))}
            </div>

            {loading ? (
                <p className="text-center text-slate-500 py-10">Verzeichnis wird geladen…</p>
            ) : filtered.length === 0 ? (
                <p className="text-center text-slate-500 py-10 italic">Keine Allianzen entsprechen diesen Filtern.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(entry => {
                        const ts = typeStyles[entry.type] || typeStyles.Neutral;
                        return (
                            <div key={entry.id} className={`bg-slate-900/40 rounded-xl border ${ts.ring} p-5 flex flex-col gap-3`}>
                                <div className="flex items-center gap-3">
                                    {entry.peerIconUrl ? (
                                        <img src={entry.peerIconUrl} alt="" className="h-11 w-11 rounded-lg object-cover border border-slate-700" />
                                    ) : (
                                        <span className="h-11 w-11 rounded-lg bg-slate-800 border border-slate-700 inline-flex items-center justify-center text-slate-500">
                                            <i className="fa-solid fa-shield-halved" />
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold text-white truncate">{entry.peerOrgName || 'Unknown Org'}</p>
                                        {entry.peerOrgTag && <p className="text-xs text-slate-500 font-mono truncate">[{entry.peerOrgTag}]</p>}
                                    </div>
                                </div>
                                {entry.peerBlurb && <p className="text-sm text-slate-400 line-clamp-3">{entry.peerBlurb}</p>}
                                <div className="mt-auto flex items-center gap-2 pt-1">
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ts.chip}`}>
                                        <i className={`fa-solid ${ts.icon} mr-1`} />{ALLIANCE_TYPE_LABELS[entry.type] || entry.type}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${entry.status === 'Active' ? 'bg-green-500/15 text-green-400 border-green-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                                        {ALLIANCE_STATUS_LABELS[entry.status] || entry.status}
                                    </span>
                                </div>
                                {entry.status === 'Active' && (
                                    <button onClick={() => openPeerDetail(entry)}
                                        className="mt-1 text-[11px] font-bold uppercase tracking-wider text-indigo-300 hover:text-indigo-200 self-start">
                                        <i className="fa-solid fa-users-viewfinder mr-1.5"></i>Dienstplan & ansehen Flotte</button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {openPeer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpenPeer(null)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 sticky top-0 bg-slate-900">
                            <h3 className="text-lg font-bold text-white">{openPeer.peerOrgName || 'Ally'} <span className="text-slate-500 text-sm">· shared intelligence</span></h3>
                            <button onClick={() => setOpenPeer(null)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {detailLoading && <p className="text-center text-slate-500 py-6">Fetching from {openPeer.peerOrgName || 'the ally'}…</p>}

                            {!detailLoading && (
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3"><i className="fa-solid fa-users mr-2 text-slate-400"></i>Mitgliederliste</h4>
                                    {!roster ? (
                                        <p className="text-sm text-slate-500 italic">Dieser Verbündete hat seine Liste nicht geteilt.</p>
                                    ) : (
                                        <>
                                            <p className="text-xs text-slate-500 mb-3">{roster.memberCount} member{roster.memberCount === 1 ? '' : 's'}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                {roster.members.map(m => (
                                                    <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                                                        {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-slate-700" /> : <span className="h-7 w-7 rounded-full bg-slate-700 inline-flex items-center justify-center text-slate-400 text-[10px]"><i className="fa-solid fa-user"></i></span>}
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-white truncate">{m.name}</p>
                                                            <p className="text-[10px] text-slate-500 truncate">{[m.rankName, m.unitName].filter(Boolean).join(' · ') || m.roleName}</p>
                                                        </div>
                                                        {m.isDuty && <span className="ml-auto h-2 w-2 rounded-full bg-green-500" title="On duty"></span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {!detailLoading && (
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3"><i className="fa-solid fa-ship mr-2 text-slate-400"></i>Flottenübersicht</h4>
                                    {!fleet ? (
                                        <p className="text-sm text-slate-500 italic">Dieser Verbündete hat seine Flotte nicht geteilt.</p>
                                    ) : (
                                        <>
                                            <p className="text-xs text-slate-500 mb-3">{fleet.totalShips} ship{fleet.totalShips === 1 ? '' : 's'} across {fleet.groupCount} group{fleet.groupCount === 1 ? '' : 's'}</p>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {fleet.shipsByCategory.map(c => (
                                                    <span key={c.category} className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/40 border border-slate-700/40 text-slate-300">{c.category}: <span className="text-white font-semibold">{c.count}</span></span>
                                                ))}
                                            </div>
                                            {fleet.groups.length > 0 && (
                                                <div className="space-y-1.5">
                                                    {fleet.groups.map((g, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                                            <span className="text-slate-200">{g.name} <span className="text-slate-500">· {g.type}</span></span>
                                                            <span className="text-slate-500">{g.totalShips} ship{g.totalShips === 1 ? '' : 's'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllianceDirectoryView;
