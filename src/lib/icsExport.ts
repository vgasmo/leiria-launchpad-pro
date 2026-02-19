/**
 * ICS Calendar Export Utility
 * Generates .ics files for session events
 */

interface ICSEvent {
  title: string;
  description?: string;
  startDate: Date;
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  organizer?: string;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICSContent(event: ICSEvent): string {
  const start = formatICSDate(event.startDate);
  const end = formatICSDate(new Date(event.startDate.getTime() + event.durationMinutes * 60000));
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@startupleiria`;
  
  let description = event.description || '';
  if (event.meetingLink) {
    description += (description ? '\\n\\n' : '') + `Link: ${event.meetingLink}`;
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Startup Leiria//Ecosystem OS//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeICSText(description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }
  if (event.meetingLink) {
    lines.push(`URL:${event.meetingLink}`);
  }
  
  lines.push(
    `DTSTAMP:${formatICSDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

export function downloadICSFile(event: ICSEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
