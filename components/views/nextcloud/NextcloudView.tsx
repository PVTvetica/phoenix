
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import HeroShell from '../../shared/ui/HeroShell';
import HeroStat from '../../shared/ui/HeroStat';
import EmptyState from '../../shared/ui/EmptyState';
import MetricCard from '../../shared/ui/MetricCard';
import nextcloudService, {
    NextcloudConnectionState,
    NextcloudEnvFlags,
    NextcloudFileEntry,
    NextcloudPreviewKind,
    NextcloudStatus,
} from '../../../services/nextcloudService';
import NextcloudFilePreviewModal from './NextcloudFilePreviewModal';
import {
    buildOpenInNextcloudUrl,
    getPreviewKind,
    triggerBlobDownload,
} from './nextcloudFileUtils';

type TabId = 'files' | 'decks' | 'links' | 'settings';

const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'files', label: 'Dateien', icon: 'fa-folder-open' },
    { id: 'decks', label: 'Decks', icon: 'fa-layer-group' },
    { id: 'links', label: 'Verknüpfungen', icon: 'fa-link' },
    { id: 'settings', label: 'Einstellungen', icon: 'fa-gear' },
];

function connectionLabel(state: NextcloudConnectionState): string {
    switch (state) {
        case 'not_configured': return 'Nicht konfiguriert';
        case 'active': return 'Aktiv';
        case 'error': return 'Fehler';
    }
}

function connectionAccent(state: NextcloudConnectionState): 'amber' | 'emerald' | 'red' {
    switch (state) {
        case 'active': return 'emerald';
        case 'error': return 'red';
        default: return 'amber';
    }
}

function formatBytes(size?: number): string {
    if (size == null) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function parentPath(path: string): string {
    if (path === '/' || !path) return '/';
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    return parts.length ? `/${parts.join('/')}` : '/';
}

const EnvRow: React.FC<{ label: string; set: boolean }> = ({ label, set }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/80 last:border-0">
        <code className="text-xs text-slate-400 font-mono">{label}</code>
        <span className={`text-[10px] font-black uppercase tracking-widest ${set ? 'text-emerald-400' : 'text-slate-500'}`}>
            {set ? 'gesetzt' : 'fehlt'}
        </span>
    </div>
);

const NextcloudView: React.FC = () => {
    const { orgMeta } = useData();
    const { hasPermission } = useAuth();
    const nextcloudEnabled = (orgMeta?.features?.nextcloud?.enabled) === true;
    const canView = hasPermission('nextcloud:view');
    const canManage = hasPermission('nextcloud:manage');

    const [activeTab, setActiveTab] = useState<TabId>('files');
    const [status, setStatus] = useState<NextcloudStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [statusError, setStatusError] = useState<string | null>(null);

    const [browsePath, setBrowsePath] = useState('/');
    const [entries, setEntries] = useState<NextcloudFileEntry[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const uploadInputRef = useRef<HTMLInputElement>(null);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewFilename, setPreviewFilename] = useState('');
    const [previewKind, setPreviewKind] = useState<NextcloudPreviewKind>('none');
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const [previewText, setPreviewText] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const loadStatus = useCallback(async () => {
        setStatusLoading(true);
        setStatusError(null);
        try {
            const s = await nextcloudService.getStatus();
            setStatus(s);
        } catch {
            setStatusError('Status konnte nicht geladen werden.');
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const loadFiles = useCallback(async (path: string) => {
        if (!status?.configured || status.connection !== 'active') return;
        setFilesLoading(true);
        setFilesError(null);
        try {
            const list = await nextcloudService.listFiles(path);
            setBrowsePath(list.path);
            setEntries(list.entries);
        } catch (e) {
            setFilesError(e instanceof Error ? e.message : 'Dateiliste konnte nicht geladen werden.');
            setEntries([]);
        } finally {
            setFilesLoading(false);
        }
    }, [status?.configured, status?.connection]);

    useEffect(() => { void loadStatus(); }, [loadStatus]);

    useEffect(() => {
        if (activeTab === 'files' && status?.connection === 'active') {
            void loadFiles(browsePath);
        }
    }, [activeTab, status?.connection, browsePath, loadFiles]);

    const closePreview = useCallback(() => {
        setPreviewOpen(false);
        if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
        setPreviewText(null);
        setPreviewError(null);
        setPreviewLoading(false);
    }, [previewBlobUrl]);

    const handlePreview = useCallback(async (entry: NextcloudFileEntry) => {
        const kind = getPreviewKind(entry.name);
        if (kind === 'none') {
            setActionError('Vorschau für diesen Dateityp nicht unterstützt.');
            return;
        }
        setPreviewBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setPreviewText(null);
        setPreviewOpen(true);
        setPreviewFilename(entry.name);
        setPreviewKind(kind);
        setPreviewLoading(true);
        setPreviewError(null);
        try {
            const blob = await nextcloudService.fetchPreviewBlob(entry.path);
            if (kind === 'text') {
                setPreviewText(await blob.text());
            } else {
                setPreviewBlobUrl(URL.createObjectURL(blob));
            }
        } catch (e) {
            setPreviewError(e instanceof Error ? e.message : 'Vorschau fehlgeschlagen.');
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    const handleDownload = useCallback(async (entry: NextcloudFileEntry) => {
        setActionError(null);
        try {
            const blob = await nextcloudService.downloadFile(entry.path);
            triggerBlobDownload(blob, entry.name);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Download fehlgeschlagen.');
        }
    }, []);

    const handleUpload = useCallback(async (fileList: FileList | null) => {
        if (!fileList?.length || !canManage) return;
        const file = fileList[0];
        setUploading(true);
        setActionError(null);
        try {
            await nextcloudService.uploadFile(file, browsePath);
            await loadFiles(browsePath);
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Upload fehlgeschlagen.');
        } finally {
            setUploading(false);
            if (uploadInputRef.current) uploadInputRef.current.value = '';
        }
    }, [browsePath, canManage, loadFiles]);

    const openInNextcloud = useCallback((entry: NextcloudFileEntry) => {
        const url = buildOpenInNextcloudUrl(
            status?.serverUrl,
            status?.displayBasePath ?? '/',
            entry.path,
            entry.type,
        );
        if (!url) {
            setActionError('Nextcloud-URL nicht verfügbar.');
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [status?.displayBasePath, status?.serverUrl]);

    const pathSegments = useMemo(() => {
        if (browsePath === '/') return [] as string[];
        return browsePath.split('/').filter(Boolean);
    }, [browsePath]);

    const tabBar = (
        <div className="flex border-b border-slate-700/50 overflow-x-auto custom-scrollbar -mb-px">
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                        activeTab === tab.id
                            ? 'text-slate-100 border-violet-400'
                            : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-500'
                    }`}
                >
                    <i className={`fa-solid ${tab.icon} mr-2`} />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const conn = status?.connection ?? 'not_configured';

    if (!nextcloudEnabled) {
        return (
            <div className="h-full flex flex-col overflow-hidden animate-fade-in p-6">
                <EmptyState
                    icon="fa-cloud"
                    heading="Nextcloud deaktiviert"
                    description="Ein Admin kann das Modul unter Admin-Konsole → Optionale Features aktivieren."
                    accent="purple"
                />
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="h-full flex flex-col overflow-hidden animate-fade-in p-6">
                <EmptyState
                    icon="fa-lock"
                    heading="Kein Zugriff"
                    description="Bitte einen Admin, dir die Berechtigung nextcloud:view zu gewähren."
                    accent="purple"
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden animate-fade-in">
            <HeroShell
                chipLabel="MODULE · NEXTCLOUD"
                chipIcon="fa-cloud"
                chipAccent="purple"
                title="Nextcloud"
                subtitle="Dateien und Deck-Boards — Zugangsdaten nur serverseitig."
                stats={
                    <>
                        <HeroStat
                            icon="fa-plug"
                            label="Verbindung"
                            value={statusLoading ? '…' : connectionLabel(conn)}
                            accent={connectionAccent(conn)}
                            emphasize={conn === 'active'}
                        />
                        <HeroStat
                            icon="fa-folder-tree"
                            label="Basisordner"
                            value={status?.displayBasePath ?? '/'}
                            accent="purple"
                        />
                    </>
                }
                tabs={tabBar}
            />

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {statusError && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 text-sm text-red-300">
                        {statusError}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetricCard
                        label="Verbindung"
                        value={statusLoading ? '…' : connectionLabel(conn)}
                        sub={status?.error}
                        icon="fa-cloud"
                        accent={connectionAccent(conn)}
                        emphasize={conn === 'active'}
                    />
                    <MetricCard
                        label="Basisordner"
                        value={status?.displayBasePath ?? '/'}
                        sub={status?.configured ? 'WebDAV-Basis relativ zum Benutzer' : 'ENV NEXTCLOUD_BASE_PATH optional'}
                        icon="fa-folder"
                        accent="purple"
                    />
                </div>

                {conn === 'not_configured' && !statusLoading && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                        <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" aria-hidden />
                        <div>
                            <p className="text-sm font-bold text-amber-400">Nextcloud nicht konfiguriert</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Setze auf dem Server <code className="text-slate-300">NEXTCLOUD_URL</code>,{' '}
                                <code className="text-slate-300">NEXTCLOUD_USER</code> und{' '}
                                <code className="text-slate-300">NEXTCLOUD_APP_PASSWORD</code> in der Umgebung.
                                Secret-Werte werden im Frontend nie angezeigt.
                            </p>
                        </div>
                    </div>
                )}

                {actionError && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm text-red-300 flex items-start justify-between gap-3">
                        <span>{actionError}</span>
                        <button type="button" className="text-red-400 hover:text-red-200 shrink-0" onClick={() => setActionError(null)}>
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700/50 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                disabled={browsePath === '/' || filesLoading || conn !== 'active'}
                                onClick={() => setBrowsePath(parentPath(browsePath))}
                                className="text-xs font-bold uppercase tracking-wider text-violet-300 hover:text-violet-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <i className="fa-solid fa-arrow-up mr-1" /> Zurück
                            </button>
                            <nav className="flex flex-wrap items-center gap-1 text-xs font-mono text-slate-400">
                                <button type="button" className="hover:text-violet-300" onClick={() => setBrowsePath('/')}>/</button>
                                {pathSegments.map((seg, i) => {
                                    const target = `/${pathSegments.slice(0, i + 1).join('/')}`;
                                    return (
                                        <span key={target} className="flex items-center gap-1">
                                            <span className="text-slate-600">/</span>
                                            <button type="button" className="hover:text-violet-300" onClick={() => setBrowsePath(target)}>
                                                {seg}
                                            </button>
                                        </span>
                                    );
                                })}
                            </nav>
                            {canManage && conn === 'active' && (
                                <>
                                    <input
                                        ref={uploadInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => void handleUpload(e.target.files)}
                                    />
                                    <button
                                        type="button"
                                        disabled={uploading || filesLoading}
                                        onClick={() => uploadInputRef.current?.click()}
                                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30 disabled:opacity-40"
                                    >
                                        <i className={`fa-solid ${uploading ? 'fa-circle-notch animate-spin' : 'fa-upload'} mr-1`} />
                                        {uploading ? 'Hochladen…' : 'Upload'}
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => void loadFiles(browsePath)}
                                disabled={filesLoading || conn !== 'active'}
                                className="ml-auto text-xs text-slate-400 hover:text-slate-200 disabled:opacity-40"
                            >
                                <i className={`fa-solid fa-rotate-right ${filesLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {conn !== 'active' ? (
                            <EmptyState
                                icon="fa-cloud-slash"
                                heading="Keine Dateiliste"
                                description="Verbindung muss aktiv sein, um Dateien anzuzeigen."
                            />
                        ) : filesError ? (
                            <div className="p-6 text-sm text-red-300">{filesError}</div>
                        ) : filesLoading && entries.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                                <i className="fa-solid fa-circle-notch animate-spin mr-2" />Laden…
                            </div>
                        ) : entries.length === 0 ? (
                            <EmptyState icon="fa-folder-open" heading="Leerer Ordner" description="In diesem Pfad liegen keine Einträge." />
                        ) : (
                            <ul className="divide-y divide-slate-800/80">
                                {entries.map(entry => (
                                    <li key={`${entry.type}-${entry.path}`}>
                                        {entry.type === 'directory' ? (
                                            <button
                                                type="button"
                                                onClick={() => setBrowsePath(entry.path)}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                                            >
                                                <i className="fa-solid fa-folder text-amber-400/90 w-5" />
                                                <span className="font-medium text-slate-100">{entry.name}</span>
                                                <span className="ml-auto text-[10px] uppercase tracking-widest text-slate-500">Ordner</span>
                                            </button>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors">
                                                <i className="fa-solid fa-file text-violet-400/80 w-5 shrink-0" />
                                                <span className="font-medium text-slate-200 min-w-0 truncate flex-1">{entry.name}</span>
                                                <span className="text-xs font-mono text-slate-500 shrink-0">{formatBytes(entry.size)}</span>
                                                <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto sm:ml-auto justify-end">
                                                    {getPreviewKind(entry.name) !== 'none' && (
                                                        <button
                                                            type="button"
                                                            title="Vorschau"
                                                            onClick={() => void handlePreview(entry)}
                                                            className="p-2 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors"
                                                        >
                                                            <i className="fa-solid fa-eye text-xs" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Download"
                                                        onClick={() => void handleDownload(entry)}
                                                        className="p-2 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <i className="fa-solid fa-download text-xs" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="In Nextcloud öffnen"
                                                        onClick={() => openInNextcloud(entry)}
                                                        className="p-2 text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded-lg transition-colors"
                                                    >
                                                        <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {activeTab === 'decks' && (
                    <EmptyState
                        icon="fa-layer-group"
                        heading="Deck-Integration folgt"
                        description="Boards und Karten werden später über die Nextcloud Deck API angebunden."
                    />
                )}

                {activeTab === 'links' && (
                    <EmptyState
                        icon="fa-link"
                        heading="Verknüpfungen"
                        description="Verknüpfungen zwischen Org-Daten und Nextcloud-Objekten werden in einer späteren Phase ergänzt."
                    />
                )}

                {activeTab === 'settings' && (
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 max-w-lg">
                        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <i className="fa-solid fa-gear text-violet-400" />
                            Server-Konfiguration (ENV)
                        </h2>
                        <p className="text-xs text-slate-500 mb-4">
                            Nur gesetzt / fehlt — keine Secret-Werte im Browser.
                        </p>
                        <EnvSettingsPanel env={status?.env} />
                    </div>
                )}
            </div>

            <NextcloudFilePreviewModal
                isOpen={previewOpen}
                onClose={closePreview}
                filename={previewFilename}
                previewKind={previewKind}
                blobUrl={previewBlobUrl}
                textContent={previewText}
                loading={previewLoading}
                error={previewError}
            />
        </div>
    );
};

const EnvSettingsPanel: React.FC<{ env?: NextcloudEnvFlags }> = ({ env }) => {
    if (!env) {
        return <p className="text-sm text-slate-500">Status wird geladen…</p>;
    }
    return (
        <>
            <EnvRow label="NEXTCLOUD_URL" set={env.NEXTCLOUD_URL} />
            <EnvRow label="NEXTCLOUD_USER" set={env.NEXTCLOUD_USER} />
            <EnvRow label="NEXTCLOUD_APP_PASSWORD" set={env.NEXTCLOUD_APP_PASSWORD} />
            <EnvRow label="NEXTCLOUD_BASE_PATH" set={env.NEXTCLOUD_BASE_PATH} />
        </>
    );
};

export default NextcloudView;
