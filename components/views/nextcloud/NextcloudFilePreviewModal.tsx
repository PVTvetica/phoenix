
import React, { useEffect, useState } from 'react';
import type { NextcloudPreviewKind } from '../../../services/nextcloudTypes';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    filename: string;
    previewKind: NextcloudPreviewKind;
    blobUrl: string | null;
    textContent?: string | null;
    loading: boolean;
    error: string | null;
}

const NextcloudFilePreviewModal: React.FC<Props> = ({
    isOpen,
    onClose,
    filename,
    previewKind,
    blobUrl,
    textContent,
    loading,
    error,
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setVisible(false);
            return;
        }
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Vorschau: ${filename}`}
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Schließen"
            />
            <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-950 border border-purple-500/30 rounded-xl shadow-2xl shadow-purple-950/40 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-purple-950/30">
                    <div className="min-w-0 flex items-center gap-2">
                        <i className="fa-solid fa-eye text-purple-400 shrink-0" />
                        <span className="text-sm font-bold text-white truncate">{filename}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Schließen"
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto min-h-[240px] bg-slate-900/80 flex items-center justify-center p-4">
                    {loading && (
                        <div className="text-sm text-slate-500 font-mono uppercase tracking-widest">
                            <i className="fa-solid fa-circle-notch animate-spin mr-2" />Laden…
                        </div>
                    )}
                    {!loading && error && (
                        <div className="text-sm text-red-300 text-center max-w-md">{error}</div>
                    )}
                    {!loading && !error && previewKind === 'image' && blobUrl && (
                        <img
                            src={blobUrl}
                            alt={filename}
                            className="max-w-full max-h-[75vh] object-contain rounded-lg border border-slate-700/50"
                        />
                    )}
                    {!loading && !error && previewKind === 'pdf' && blobUrl && (
                        <iframe
                            src={blobUrl}
                            title={filename}
                            className="w-full h-[75vh] rounded-lg border border-slate-700/50 bg-white"
                        />
                    )}
                    {!loading && !error && previewKind === 'text' && textContent != null && (
                        <pre className="w-full max-h-[75vh] overflow-auto text-left text-sm text-slate-200 font-mono whitespace-pre-wrap break-words bg-slate-950/80 border border-slate-700/50 rounded-lg p-4">
                            {textContent}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NextcloudFilePreviewModal;
