import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SessionsTab } from './SessionsTab';
import { CalendarTab } from './CalendarTab';

interface AgendaTabProps {
  workspaceId: string;
  canWrite: boolean;
  startupName?: string;
}

export function AgendaTab({ workspaceId, canWrite, startupName }: AgendaTabProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'calendar'>('list');

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md w-fit">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('list')}
          className={cn(
            'gap-2 h-8 px-3 text-sm',
            view === 'list' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <List className="h-4 w-4" />
          {t('agenda.listView', { defaultValue: 'Sessões' })}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('calendar')}
          className={cn(
            'gap-2 h-8 px-3 text-sm',
            view === 'calendar' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="h-4 w-4" />
          {t('agenda.calendarView', { defaultValue: 'Calendário' })}
        </Button>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <SessionsTab workspaceId={workspaceId} canWrite={canWrite} />
      ) : (
        <CalendarTab workspaceId={workspaceId} canWrite={canWrite} startupName={startupName} />
      )}
    </div>
  );
}
