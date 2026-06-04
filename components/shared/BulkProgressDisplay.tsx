import React from 'react';
import type { BulkState, BulkResult } from '../../hooks/useBulkProgress';

interface Props {
    state: BulkState;
    processed: number;
    total: number;
    aggregate: BulkResult;
    onCancel: () => void;
    error?: string;
}

/**
 * Renders the in-flight state of a useBulkProgress run — progress bar,
 * counts, Cancel button. Hosted inside a
 * modal body (replaces the modal's input form during dispatch). Compact
 * by design so the modal doesn't grow during dispatch.
 *
 * The modal's parent decides what to render once state flips to `done`,
 * `cancelled`, or `error` — typically: toast + auto-close.
 */
const BulkProgressDisplay: React.FC<Props> = ({
    state,
    processed,
    total,
    aggregate,
    onCancel,
    error,
}) => {
    const pct = total === 0 ? 0 : Math.min(100, Math.round((processed / total) * 100));

    return (
        <div className="space-y-4">
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <div className="text-sm text-white">
                        {state === 'running' && (
                            <>Verarbeitung<span className="font-bold">{processed}</span> of {total}…
                            </>
                        )}
                        {state === 'done' && (
                            <span className="text-emerald-300">
                                <i className="fa-solid fa-circle-check mr-2" />
                                Complete — {aggregate.updated} updated{aggregate.skipped > 0 ? `, ${aggregate.skipped} skipped` : ''}.
                            </span>
                        )}
                        {state === 'cancelled' && (
                            <span className="text-amber-300">
                                <i className="fa-solid fa-circle-stop mr-2" />
                                Cancelled — {aggregate.updated} of {total} were updated.
                            </span>
                        )}
                        {state === 'error' && (
                            <span className="text-rose-300">
                                <i className="fa-solid fa-triangle-exclamation mr-2" />Fehler</span>
                        )}
                    </div>
                    {state === 'running' && (
                        <button
                            onClick={onCancel}
                            className="text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors"
                        >Abbrechen</button>
                    )}
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-200 ${
                            state === 'error' ? 'bg-rose-500' : state === 'cancelled' ? 'bg-amber-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800 border border-white/5 rounded px-3 py-2">
                    <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Aktualisiert</div>
                    <div className="text-white font-bold text-base">{aggregate.updated}</div>
                </div>
                <div className="bg-slate-800 border border-white/5 rounded px-3 py-2">
                    <div className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">Übersprungen</div>
                    <div className="text-white font-bold text-base">{aggregate.skipped}</div>
                </div>
            </div>

            {state === 'error' && error && (
                <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded">
                    {error}
                </div>
            )}

            {state === 'running' && total > 25 && (
                <p className="text-[11px] text-slate-500">
                    Applies in batches of 25. Cancelling stops sending further batches; ones already sent will have completed.
                </p>
            )}
        </div>
    );
};

export default BulkProgressDisplay;
