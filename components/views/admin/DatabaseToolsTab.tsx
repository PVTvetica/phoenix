
import React, { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';

import { TabPageHeader } from '../../shared/ui';
import { useNotification } from '../../../contexts/NotificationContext';

interface HealthCheckResult {
    check: string;
    status: 'OK' | 'WARNING' | 'ERROR';
    count: number;
    action?: string;
}

const DatabaseToolsTab: React.FC = () => {
    const { rpcAction, orgMeta } = useData();
    const { addToast, confirm } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const [healthReport, setHealthReport] = useState<HealthCheckResult[]>([]);

    // Pruning State
    const [retentionDays, setRetentionDays] = useState(90);
    const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set(['requests']));
    const [pruneResult, setPruneResult] = useState<Record<string, number> | null>(null);

    // Module reset state
    const [resettingModule, setResettingModule] = useState<null | 'finances' | 'quartermaster'>(null);
    const [resetResult, setResetResult] = useState<{ module: string; counts: Record<string, number> } | null>(null);

    // Maintenance mode + force-logout state
    const [maintMode, setMaintMode] = useState(false);
    const [maintMessage, setMaintMessage] = useState('');
    const [maintLoading, setMaintLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const s = await rpcAction('admin:get_platform_settings', {});
                setMaintMode(!!s?.maintenance_mode);
                setMaintMessage(s?.maintenance_message || '');
            } catch { /* non-fatal — defaults shown */ }
        })();
    }, [rpcAction]);

    const saveMaintenance = async () => {
        setMaintLoading(true);
        try {
            await rpcAction('admin:update_platform_settings', { maintenanceMode: maintMode, maintenanceMessage: maintMessage });
            addToast("Wartungseinstellungen gespeichert", <i className="fa-solid fa-check"></i>, 'bg-green-500/10 text-green-400 border-green-500/50', { description: maintMode ? 'Maintenance mode is ON — non-admin members are blocked.' : 'Maintenance mode is off.' });
        } catch (error) {
            console.error(error);
            addToast("Speichern fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: 'Wartungseinstellungen konnten nicht aktualisiert werden.' });
        } finally {
            setMaintLoading(false);
        }
    };

    const forceLogoutAll = async () => {
        const ok = await confirm({ title: 'Force Logout All Sessions', message: 'Force logout ALL active sessions? Everyone must log in again (takes effect within ~60 seconds). This cannot be undone.', confirmText: 'Force Logout', variant: 'danger' });
        if (!ok) return;
        setMaintLoading(true);
        try {
            await rpcAction('admin:force_logout_all', {});
            addToast("Sitzungen widerrufen", <i className="fa-solid fa-power-off"></i>, 'bg-amber-500/10 text-amber-400 border-amber-500/50', { description: 'Alle bestehenden Sitzungen werden in Kürze abgemeldet.' });
        } catch (error) {
            console.error(error);
            addToast("Abmeldung erzwingen fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, 'bg-red-500/10 text-red-400 border-red-500/50', { description: 'Sitzungen konnten nicht widerrufen werden.' });
        } finally {
            setMaintLoading(false);
        }
    };

    const financesEnabled = (orgMeta?.features?.finances?.enabled) === true;
    const quartermasterEnabled = (orgMeta?.features?.quartermaster?.enabled) === true;

    const runDiagnostics = async () => {
        setIsLoading(true);
        setHealthReport([]);
        try {
            const results = await rpcAction('admin:db:check', {});
            setHealthReport(results);
        } catch (error) {
            console.error(error);
            addToast("Diagnose fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Datenbank-Gesundheitscheck konnte nicht abgeschlossen werden." });
        } finally {
            setIsLoading(false);
        }
    };

    const runRepair = async () => {
        const confirmedRepair = await confirm({ title: 'Confirm Repair', message: 'This will attempt to fix broken records (e.g. invalid user roles). Continue?', confirmText: 'Repair', variant: 'danger' });
        if (!confirmedRepair) return;
        setIsLoading(true);
        try {
            const result = await rpcAction('admin:db:repair', {});
            addToast("Reparatur abgeschlossen", <i className="fa-solid fa-check"></i>, "bg-green-500/10 text-green-400 border-green-500/50", { description: result.message });
            runDiagnostics();
        } catch (error) {
            console.error(error);
            addToast("Reparatur fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Die Datenbankreparatur konnte nicht abgeschlossen werden." });
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTarget = (target: string) => {
        setSelectedTargets(prev => {
            const next = new Set(prev);
            if (next.has(target)) next.delete(target);
            else next.add(target);
            return next;
        });
    };

    const runModuleReset = async (module: 'finances' | 'quartermaster') => {
        const labels: Record<string, { name: string; describe: string; action: string }> = {
            finances: {
                name: 'Finances',
                describe: 'EVERY treasury account, ledger entry, deposit, withdrawal, transfer, payout, adjustment, and reversal',
                action: 'admin:db:reset_finances',
            },
            quartermaster: {
                name: 'Quartermaster',
                describe: 'EVERY catalog item (custom only), location, inventory row, movement, and issuance — past and present',
                action: 'admin:db:reset_quartermaster',
            },
        };
        const meta = labels[module];

        const confirmed = await confirm({
            title: `Reset ${meta.name} Data`,
            message: `WARNING: This will PERMANENTLY DELETE ${meta.describe} for this organization. The module configuration (feature flag, permissions) is preserved, but all records will be wiped to a clean slate. This action CANNOT be undone. Type the org name in the prompt to proceed? — confirm only if you are absolutely sure.`,
            confirmText: `Wipe ${meta.name}`,
            variant: 'danger',
        });
        if (!confirmed) return;

        const doubleConfirm = await confirm({
            title: 'Final Confirmation',
            message: `Last chance. All ${meta.name} data will be irreversibly destroyed for this organization. Continue?`,
            confirmText: 'Yes, wipe it',
            variant: 'danger',
        });
        if (!doubleConfirm) return;

        setResettingModule(module);
        setResetResult(null);
        try {
            const result = await rpcAction(meta.action, {});
            setResetResult({ module: meta.name, counts: result || {} });
            addToast(`${meta.name} Reset`, <i className="fa-solid fa-check"></i>, "bg-green-500/10 text-green-400 border-green-500/50", { description: `${meta.name} data wiped successfully.` });
        } catch (error) {
            console.error(error);
            addToast("Zurücksetzen fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: `Failed to reset ${meta.name} data.` });
        } finally {
            setResettingModule(null);
        }
    };

    const runPruning = async () => {
        if (selectedTargets.size === 0) {
            addToast("Keine Ziele ausgewählt", <i className="fa-solid fa-triangle-exclamation"></i>, "bg-amber-500/10 text-amber-400 border-amber-500/50", { description: "Bitte wähle mindestens einen Datentyp zum Bereinigen." });
            return;
        }
        const confirmedPrune = await confirm({ title: 'Confirm Pruning', message: `WARNING: This will PERMANENTLY DELETE data older than ${retentionDays} days for selected categories. This action cannot be undone.`, confirmText: 'Purge', variant: 'danger' });
        if (!confirmedPrune) return;

        setIsLoading(true);
        setPruneResult(null);
        try {
            const result = await rpcAction('admin:db:prune', {
                retentionDays,
                targets: Array.from(selectedTargets)
            });
            setPruneResult(result);
            // Refresh counts
            runDiagnostics();
        } catch (error) {
            console.error(error);
            addToast("Beschneiden fehlgeschlagen", <i className="fa-solid fa-xmark"></i>, "bg-red-500/10 text-red-400 border-red-500/50", { description: "Die Datenbereinigung konnte nicht abgeschlossen werden." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 animate-fade-in">
            <TabPageHeader
                title="System Database Tools"
                icon="fa-solid fa-server"
                accent="rose"
                subtitle="Integritätsprüfungen, Reparaturen alter Datenschemas und Speicheroptimierung durch Löschen alter Datensätze."
            />

            {/* Maintenance & Sessions */}
            <div className="bg-slate-900/40 rounded-xl border border-amber-500/30 overflow-hidden">
                <div className="px-6 py-4 bg-amber-500/5 border-b border-amber-500/20">
                    <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider"><i className="fa-solid fa-wrench mr-2"></i>Wartung & Sitzungen</h3>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMaintMode(v => !v)}
                                aria-pressed={maintMode}
                                aria-label="Toggle maintenance mode"
                                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${maintMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${maintMode ? 'translate-x-6' : ''}`}></span>
                            </button>
                            <span className="text-sm font-medium text-slate-200">{maintMode ? 'Maintenance Mode Active' : 'Maintenance Mode Disabled'}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">When enabled, non-admin members see a maintenance screen and dashboard data fetches are blocked (503). Admins retain full access.</p>
                    </div>
                    {maintMode && (
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Wartungsmeldung</label>
                            <textarea
                                className="w-full bg-black/30 border border-amber-500/30 rounded-md p-3 text-white text-sm focus:border-amber-500 focus:outline-hidden h-20"
                                value={maintMessage}
                                onChange={e => setMaintMessage(e.target.value)}
                                placeholder="The dashboard is undergoing scheduled maintenance. Please check back shortly."
                            />
                        </div>
                    )}
                    <button
                        onClick={saveMaintenance}
                        disabled={maintLoading}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-md font-bold uppercase transition-colors disabled:opacity-50"
                    >
                        {maintLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Save Maintenance Settings'}
                    </button>

                    <div className="pt-4 border-t border-slate-700/50">
                        <h4 className="text-sm font-bold text-red-400 mb-1"><i className="fa-solid fa-power-off mr-2"></i>Abmelden aller Sitzungen erzwingen</h4>
                        <p className="text-xs text-slate-500 mb-3">Invalidate every active session — e.g. after rotating secrets or a suspected compromise. Members must log in again within ~60 seconds.</p>
                        <button
                            onClick={forceLogoutAll}
                            disabled={maintLoading}
                            className="text-xs bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md font-bold uppercase transition-colors disabled:opacity-50"
                        >
                            <i className="fa-solid fa-power-off mr-2"></i>Jetzt alle Abmeldung erzwingen</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Diagnostics Panel */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Gesundheit und Integrität</h3>
                        <div className="flex gap-2">
                            {healthReport.some(r => r.status === 'WARNING') && (
                                <button
                                    onClick={runRepair}
                                    disabled={isLoading}
                                    className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-sm font-bold uppercase transition-colors disabled:opacity-50"
                                >Reparaturprobleme</button>
                            )}
                            <button
                                onClick={runDiagnostics}
                                disabled={isLoading}
                                className="text-[10px] bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-3 py-1 rounded-sm font-bold uppercase transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Run Diagnostics'}
                            </button>
                        </div>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto max-h-[400px]">
                        {healthReport.length > 0 ? (
                            <div className="space-y-3">
                                {healthReport.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-sm bg-slate-800/30 border border-slate-700/30">
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">{item.check}</p>
                                            <p className="text-xs text-slate-500">Records: {item.count}</p>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${item.status === 'OK' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                                                'text-amber-400 border-amber-500/30 bg-amber-500/10 animate-pulse'
                                            }`}>
                                            {item.status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-600">
                                <i className="fa-solid fa-stethoscope text-4xl mb-4 opacity-50"></i>
                                <p className="text-sm font-mono uppercase">Warten auf Diagnose</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Optimization Panel */}
                <div className="bg-slate-900/40 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Optimierung und Beschneidung</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Entferne alte Daten dauerhaft, um die Datenbankgröße zu reduzieren.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">Aufbewahrungsfrist:<span className="text-white text-lg ml-2">{retentionDays} Days</span>
                            </label>
                            <input
                                type="range"
                                min="30"
                                max="365"
                                step="30"
                                value={retentionDays}
                                onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                                <span>30 Days</span>
                                <span>1 Year</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase">Zieltabellen</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { id: 'requests', label: 'Service Requests' },
                                    { id: 'warrants', label: 'Closed Caution Notes' },
                                    { id: 'intel', label: 'Intel Reports' },
                                    { id: 'operations', label: 'Concluded Ops' },
                                    { id: 'hr', label: 'Rejected Applications' }
                                ].map(t => (
                                    <label key={t.id} className={`flex items-center p-3 rounded-sm border cursor-pointer transition-colors ${selectedTargets.has(t.id) ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedTargets.has(t.id)}
                                            onChange={() => toggleTarget(t.id)}
                                            className="form-checkbox h-4 w-4 text-red-600 bg-slate-900 border-slate-600 rounded-sm focus:ring-red-500"
                                        />
                                        <span className={`ml-3 text-xs font-bold ${selectedTargets.has(t.id) ? 'text-red-200' : 'text-slate-400'}`}>{t.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                            {pruneResult && (
                                <div className="text-xs text-green-400">
                                    <span className="font-bold">Beschneiden abgeschlossen:</span>
                                    <ul className="mt-1 list-disc list-inside opacity-80">
                                        {Object.entries(pruneResult).map(([k, v]) => (
                                            <li key={k}>{v} {k} deleted</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <button
                                onClick={runPruning}
                                disabled={isLoading || selectedTargets.size === 0}
                                className="ml-auto bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-red-900/20 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed uppercase tracking-wider text-xs transition-all active:scale-95"
                            >
                                {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Purge Old Data'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Module Reset Panel — only renders if at least one resettable feature is enabled */}
            {(financesEnabled || quartermasterEnabled) && (
                <div className="bg-slate-900/40 rounded-xl border border-red-500/30 overflow-hidden">
                    <div className="px-6 py-4 bg-red-950/30 border-b border-red-500/30">
                        <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider flex items-center">
                            <i className="fa-solid fa-radiation mr-2"></i>Modul-Reset (destruktiv)</h3>
                        <p className="text-[10px] text-red-200/70 mt-1">Permanently wipes all data for an optional module back to a clean slate. Module remains enabled; only the records are destroyed.</p>
                    </div>

                    <div className="p-6 space-y-4">
                        {financesEnabled && (
                            <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <i className="fa-solid fa-vault text-amber-300"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Finanzen zurücksetzen</h4>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Deletes every treasury account and the entire ledger (deposits, withdrawals, transfers, payouts, adjustments, reversals). The audit trail will be gone forever.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => runModuleReset('finances')}
                                    disabled={resettingModule !== null}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-red-900/20 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed uppercase tracking-wider text-xs transition-all active:scale-95 whitespace-nowrap"
                                >
                                    {resettingModule === 'finances' ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Reset Finances'}
                                </button>
                            </div>
                        )}

                        {quartermasterEnabled && (
                            <div className="flex items-start justify-between gap-4 p-4 bg-slate-800/40 border border-slate-700/40 rounded-lg">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                        <i className="fa-solid fa-warehouse text-orange-400"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Quartiermeister zurücksetzen</h4>
                                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                            Deletes every custom catalog item, location, inventory row, movement record, and issuance (active, returned, written off). Platform catalog rows are preserved.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => runModuleReset('quartermaster')}
                                    disabled={resettingModule !== null}
                                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg shadow-lg shadow-red-900/20 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed uppercase tracking-wider text-xs transition-all active:scale-95 whitespace-nowrap"
                                >
                                    {resettingModule === 'quartermaster' ? <i className="fa-solid fa-spinner animate-spin"></i> : 'Reset Quartermaster'}
                                </button>
                            </div>
                        )}

                        {resetResult && (
                            <div className="text-xs text-green-400 mt-2 p-3 bg-green-500/5 border border-green-500/20 rounded-sm">
                                <span className="font-bold">{resetResult.module} Reset Complete:</span>
                                <ul className="mt-1 list-disc list-inside opacity-80">
                                    {Object.entries(resetResult.counts).map(([k, v]) => (
                                        <li key={k}>{v} {k.replace(/_/g, ' ')} deleted</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseToolsTab;
