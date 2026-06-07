import apiService from './apiService';
import type { CalendarEvent, CalendarListItem, CalendarStatus } from './nextcloudCalendarTypes';

export type { CalendarEvent, CalendarListItem, CalendarStatus } from './nextcloudCalendarTypes';

class NextcloudCalendarService {
    async getStatus(): Promise<CalendarStatus> {
        return apiService.getCalendarStatus();
    }

    async getCalendars(): Promise<CalendarListItem[]> {
        const res = await apiService.getCalendars();
        return res.calendars;
    }

    async getEvents(calendarId: string, from?: string, to?: string): Promise<CalendarEvent[]> {
        const res = await apiService.getCalendarEvents(calendarId, from, to);
        return res.events;
    }
}

export const nextcloudCalendarService = new NextcloudCalendarService();
export default nextcloudCalendarService;
