export interface CalendarStatus {
    configured: boolean;
    available: boolean;
    error?: string;
}

export interface CalendarListItem {
    id: string;
    displayName: string;
    color?: string;
    url: string;
}

export interface CalendarEvent {
    id: string;
    uid: string;
    title: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    allDay?: boolean;
    calendarId: string;
    url?: string;
}
