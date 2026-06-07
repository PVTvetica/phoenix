
import React, { useEffect, useState } from 'react';
import type { CalendarEvent, CalendarListItem } from '../../../services/nextcloudCalendarTypes';
import { buildCalendarOpenUrl, formatEventRange } from './nextcloudCalendarUtils';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent | null;
    calendar?: CalendarListItem | null;
    serverUrl?: string;
}

const NextcloudEventDetailModal: React.FC<Props> = ({
    isOpen,
    onClose,
    event,
    calendar,
    serverUrl,
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

    if (!isOpen || !event) return null;

    const openUrl = buildCalendarOpenUrl(serverUrl, event);

    return (
        <div
            className={`fixed inset-0 z-[120] flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            role="dialog"
            aria-modal="true"
            aria-label={`Termin: ${event.title}`}
        >
            <button
                type="button"
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Schließen"
            />
            <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-950 border border-purple-500/30 rounded-xl shadow-2xl shadow-purple-950/40 overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-purple-950/30">
                    <div className="min-w-0 flex items-center gap-2">
                        <i className="fa-solid fa-calendar-day text-purple-400 shrink-0" />
                        <span className="text-sm font-bold text-white truncate">{event.title}</span>
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

                <div className="flex-1 overflow-auto p-4 space-y-4 text-sm">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Zeitraum</p>
                        <p className="text-slate-200">{formatEventRange(event)}</p>
                    </div>

                    {calendar && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Kalender</p>
                            <p className="text-slate-200 flex items-center gap-2">
                                {calendar.color && (
                                    <span
                                        className="w-3 h-3 rounded-full shrink-0 border border-slate-600"
                                        style={{ backgroundColor: calendar.color }}
                                        aria-hidden
                                    />
                                )}
                                {calendar.displayName}
                            </p>
                        </div>
                    )}

                    {event.location && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Ort</p>
                            <p className="text-slate-200">{event.location}</p>
                        </div>
                    )}

                    {event.description && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Beschreibung</p>
                            <p className="text-slate-300 whitespace-pre-wrap break-words">{event.description}</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
                    {openUrl && (
                        <a
                            href={openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 inline-flex items-center gap-1"
                        >
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                            In Nextcloud öffnen
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-200 hover:bg-purple-600/30"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NextcloudEventDetailModal;
