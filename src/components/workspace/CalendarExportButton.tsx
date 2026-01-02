import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadICS, getGoogleCalendarLink, getOutlookCalendarLink } from '@/lib/calendarExport';
import { addHours, parseISO } from 'date-fns';

interface Session {
  id: string;
  title: string;
  scheduled_at: string;
  duration?: number | null;
  location?: string | null;
  notes?: string | null;
}

interface CalendarExportButtonProps {
  sessions: Session[];
  workspaceName?: string;
}

export function CalendarExportButton({ sessions, workspaceName }: CalendarExportButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const convertToEvents = () => {
    return sessions.map(session => {
      const startDate = parseISO(session.scheduled_at);
      const endDate = addHours(startDate, (session.duration || 60) / 60);
      
      return {
        id: session.id,
        title: session.title,
        description: session.notes || undefined,
        startDate,
        endDate,
        location: session.location || undefined,
      };
    });
  };

  const handleDownloadICS = () => {
    const events = convertToEvents();
    const filename = workspaceName 
      ? `${workspaceName.replace(/\s+/g, '-').toLowerCase()}-sessions.ics`
      : 'sessions.ics';
    downloadICS(events, filename);
    setIsOpen(false);
  };

  const handleGoogleCalendar = () => {
    if (sessions.length === 0) return;
    
    // For single session, open directly
    if (sessions.length === 1) {
      const events = convertToEvents();
      window.open(getGoogleCalendarLink(events[0]), '_blank');
    } else {
      // For multiple, download ICS and prompt to import
      handleDownloadICS();
    }
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    if (sessions.length === 0) return;
    
    if (sessions.length === 1) {
      const events = convertToEvents();
      window.open(getOutlookCalendarLink(events[0]), '_blank');
    } else {
      handleDownloadICS();
    }
    setIsOpen(false);
  };

  if (sessions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          {t('integrations.exportCalendar')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          {t('integrations.downloadICS')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
