
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../../shared/ui/EmptyState';
import MetricCard from '../../shared/ui/MetricCard';
import nextcloudCalendarService, {
    CalendarEvent,
    CalendarListItem,
    CalendarStatus,
} from '../../../services/nextcloudCalendarService';
import NextcloudEventDetailModal from './NextcloudEventDetailModal';
import {
    buildRangeIso,
    calendarStatusAccent,
    calendarStatusLabel,
    formatEventDate,
    formatEventTime,
    type CalendarRangeDays,
} from './nextcloudCalendarUtils';

interface Props {
    serverUrl?: string;
    active: boolean;
}

const RANGE_OPTIONS: { days: CalendarRangeDays; label: string }[] = [
    { days: 7, label: '7 Tage' },
    { days: 30, label: '30 Tage' },
    { days: 90, label: '90 Tage' },
];

const NextcloudCalendarTab: React.FC<Props> = ({ serverUrl, active }) => {
    const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [calendars, setCalendars] = useState<CalendarListItem[]>([]);
    const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);
    const [rangeDays, setRangeDays] = useState<CalendarRangeDays>(30);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const loadStatus = useCallback(async () => {
        setStatusLoading(true);
        setLoadError(null);
        try {
            const s = await nextcloudCalendarService.getStatus();
            setCalStatus(s);
            if (s.available) {
                const list = await nextcloudCalendarService.getCalendars();
                setCalendars(list);
                if (list.length > 0) {
                    setSelectedCalendarId((prev) => (prev && list.some(c => c.id === prev) ? prev : list[0].id));
                } else {
                    setSelectedCalendarId(null);
                }
            } else {
                setCalendars([]);
                setSelectedCalendarId(null);
            }
        } catch {
            setCalStatus({ configured: true, available: false, error: 'Kalender-Integration nicht verfügbar' });
            setCalendars([]);
        } finally {
            setStatusLoading(false);
        }
    }, []);

    const loadEvents = useCallback(async (calendarId: string, days: CalendarRangeDays) => {
        setEventsLoading(true);
        setLoadError(null);
        try {
            const { from, to } = buildRangeIso(days);
            const list = await nextcloudCalendarService.getEvents(calendarId, from, to);
            setEvents(list);
        } catch (e) {
            setEvents([]);
            setLoadError(e instanceof Error ? e.message : 'Termine konnten nicht geladen werden.');
        } finally {
            setEventsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (active) void loadStatus();
    }, [active, loadStatus]);

    useEffect(() => {
        if (active && calStatus?.available && selectedCalendarId) {
            void loadEvents(selectedCalendarId, rangeDays);
        }
    }, [active, calStatus?.available, selectedCalendarId, rangeDays, loadEvents]);

    const selectedCalendar = useMemo(
        () => calendars.find(c => c.id === selectedCalendarId) ?? null,
        [calendars, selectedCalendarId],
    );

    const openEventDetail = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setDetailOpen(true);
    };

    if (statusLoading) {
        return (
            <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                <i className="fa-solid fa-circle-notch animate-spin mr-2" />Kalender wird geladen…
            </div>
        );
    }

    if (!calStatus?.configured) {
        return (
            <EmptyState
                icon="fa-calendar"
                heading="Nicht konfiguriert"
                description="Nextcloud-Zugangsdaten fehlen auf dem Server. Kalender-Integration ist nicht eingerichtet."
                accent="purple"
            />
        );
    }

    if (!calStatus.available) {
        return (
            <div className="space-y-4">
                <MetricCard
                    label="Kalender"
                    value="Fehler"
                    sub={calStatus.error}
                    icon="fa-calendar"
                    accent="red"
                />
                <EmptyState
                    icon="fa-calendar-xmark"
                    heading="Kalender-Integration nicht verfügbar"
                    description={calStatus.error ?? 'CalDAV-Endpunkt ist nicht erreichbar.'}
                    accent="purple"
                />
            </div>
        );
    }

    const statusLabel = calendarStatusLabel(calStatus);

    return (
        <div className="space-y-4">
            <MetricCard
                label="Kalender"
                value={statusLabel}
                sub="CalDAV read-only · keine Terminbearbeitung"
                icon="fa-calendar"
                accent={calendarStatusAccent(calStatus)}
                emphasize={statusLabel === 'Aktiv'}
            />

            <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Kalender
                    </label>
                    <select
                        value={selectedCalendarId ?? ''}
                        onChange={(e) => setSelectedCalendarId(e.target.value || null)}
                        disabled={eventsLoading || calendars.length === 0}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    >
                        {calendars.map(c => (
                            <option key={c.id} value={c.id}>{c.displayName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Zeitraum
                    </span>
                    <div className="flex gap-1">
                        {RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.days}
                                type="button"
                                onClick={() => setRangeDays(opt.days)}
                                className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg border transition-colors ${
                                    rangeDays === opt.days
                                        ? 'bg-purple-600/25 border-purple-500/40 text-purple-100'
                                        : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (selectedCalendarId) void loadEvents(selectedCalendarId, rangeDays);
                    }}
                    disabled={eventsLoading || !selectedCalendarId}
                    className="p-2 text-slate-400 hover:text-slate-200 disabled:opacity-40 ml-auto"
                    title="Aktualisieren"
                >
                    <i className={`fa-solid fa-rotate-right ${eventsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                Wiederholende Termine werden per ICS-Expansion angezeigt; sehr komplexe RRULEs können unvollständig sein (max. 500 Vorkommen).
            </p>

            {loadError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                    {loadError}
                </div>
            )}

            {calendars.length === 0 ? (
                <EmptyState
                    icon="fa-calendar"
                    heading="Keine Kalender gefunden"
                    description="Für den Service-User sind keine CalDAV-Kalender sichtbar."
                    accent="purple"
                />
            ) : eventsLoading ? (
                <div className="p-8 text-center text-slate-500 text-sm font-mono uppercase tracking-widest">
                    <i className="fa-solid fa-circle-notch animate-spin mr-2" />Termine laden…
                </div>
            ) : events.length === 0 ? (
                <EmptyState
                    icon="fa-calendar-check"
                    heading="Keine Termine im Zeitraum"
                    description={`In „${selectedCalendar?.displayName ?? 'Kalender'}" liegen im gewählten Zeitraum keine Events.`}
                    accent="purple"
                />
            ) : (
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden">
                    <ul className="divide-y divide-slate-800/80">
                        {events.map(ev => (
                            <li key={ev.id}>
                                <button
                                    type="button"
                                    onClick={() => openEventDetail(ev)}
                                    className="w-full flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
                                >
                                    <div className="w-24 shrink-0">
                                        <p className="text-xs font-mono text-violet-300">{formatEventDate(ev.start, ev.allDay)}</p>
                                        <p className="text-[10px] text-slate-500">{formatEventTime(ev.start, ev.allDay)}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-100 truncate">{ev.title}</p>
                                        {ev.location && (
                                            <p className="text-xs text-slate-500 truncate">
                                                <i className="fa-solid fa-location-dot mr-1 text-slate-600" />
                                                {ev.location}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-600 shrink-0">
                                        {selectedCalendar?.displayName ?? ev.calendarId}
                                    </span>
                                    <i className="fa-solid fa-chevron-right text-slate-600 text-xs shrink-0" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <NextcloudEventDetailModal
                isOpen={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setSelectedEvent(null);
                }}
                event={selectedEvent}
                calendar={selectedCalendar}
                serverUrl={serverUrl}
            />
        </div>
    );
};

export default NextcloudCalendarTab;
