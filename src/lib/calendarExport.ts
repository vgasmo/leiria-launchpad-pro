import { format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  url?: string;
}

/**
 * Generates an ICS file content for calendar events
 */
export function generateICS(events: CalendarEvent[]): string {
  const formatDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");
  const escapeText = (text: string) => text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');

  const icsEvents = events.map(event => `BEGIN:VEVENT
UID:${event.id}@startupleiria.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${escapeText(event.title)}
${event.description ? `DESCRIPTION:${escapeText(event.description)}` : ''}
${event.location ? `LOCATION:${escapeText(event.location)}` : ''}
${event.url ? `URL:${event.url}` : ''}
END:VEVENT`).join('\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Startup Leiria//Session Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Startup Leiria Sessions
${icsEvents}
END:VCALENDAR`;
}

/**
 * Downloads an ICS file with the given events
 */
export function downloadICS(events: CalendarEvent[], filename = 'sessions.ics') {
  const icsContent = generateICS(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a Google Calendar link for a single event
 */
export function getGoogleCalendarLink(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    ...(event.description && { details: event.description }),
    ...(event.location && { location: event.location }),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an Outlook calendar link for a single event
 */
export function getOutlookCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    ...(event.description && { body: event.description }),
    ...(event.location && { location: event.location }),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
