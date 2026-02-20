import { useCallback, KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionsTab } from './SessionsTab';
import { CalendarTab } from './CalendarTab';

interface AgendaTabProps {
  workspaceId: string;
  canWrite: boolean;
  startupName?: string;
}

const VIEWS = ['list', 'calendar'] as const;
type AgendaView = typeof VIEWS[number];

export function AgendaTab({ workspaceId, canWrite, startupName }: AgendaTabProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read view from URL, default to 'list'
  const rawView = searchParams.get('view');
  const view: AgendaView = rawView === 'calendar' ? 'calendar' : 'list';

  const setView = useCallback((newView: AgendaView) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'agenda');
      if (newView === 'list') {
        next.delete('view');
      } else {
        next.set('view', newView);
      }
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  // Keyboard navigation for WAI-ARIA tabs
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = VIEWS.indexOf(view);
    let nextIndex = -1;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % VIEWS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + VIEWS.length) % VIEWS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = VIEWS.length - 1;
    }

    if (nextIndex >= 0) {
      e.preventDefault();
      setView(VIEWS[nextIndex]);
      // Focus the sibling tab button
      const tablist = (e.currentTarget as HTMLElement).closest('[role="tablist"]');
      const buttons = tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[nextIndex]?.focus();
    }
  }, [view, setView]);

  return (
    <div className="space-y-4">
      {/* WAI-ARIA view toggle */}
      <div
        role="tablist"
        aria-label={t('agenda.viewToggle', { defaultValue: 'Alternar vista da agenda' })}
        className="flex items-center gap-1 bg-muted/30 p-1 rounded-md w-fit"
      >
        <button
          role="tab"
          id="agenda-tab-list"
          aria-selected={view === 'list'}
          aria-controls="agenda-panel-list"
          tabIndex={view === 'list' ? 0 : -1}
          onClick={() => setView('list')}
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex items-center gap-2 h-8 px-3 text-sm font-medium rounded-sm transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            view === 'list'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          <List className="h-4 w-4" />
          {t('agenda.listView', { defaultValue: 'Lista' })}
        </button>
        <button
          role="tab"
          id="agenda-tab-calendar"
          aria-selected={view === 'calendar'}
          aria-controls="agenda-panel-calendar"
          tabIndex={view === 'calendar' ? 0 : -1}
          onClick={() => setView('calendar')}
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex items-center gap-2 h-8 px-3 text-sm font-medium rounded-sm transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            view === 'calendar'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          <Calendar className="h-4 w-4" />
          {t('agenda.calendarView', { defaultValue: 'Calendário' })}
        </button>
      </div>

      {/* Tab panels */}
      {view === 'list' ? (
        <div
          role="tabpanel"
          id="agenda-panel-list"
          aria-labelledby="agenda-tab-list"
          className="animate-fade-in"
        >
          <SessionsTab workspaceId={workspaceId} canWrite={canWrite} />
        </div>
      ) : (
        <div
          role="tabpanel"
          id="agenda-panel-calendar"
          aria-labelledby="agenda-tab-calendar"
          className="animate-fade-in"
        >
          <CalendarTab workspaceId={workspaceId} canWrite={canWrite} startupName={startupName} />
        </div>
      )}
    </div>
  );
}
