import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isToday } from 'date-fns';
import { pt as ptLocale, enUS } from 'date-fns/locale';
import { Calendar, FileText, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';

interface WorkspaceTableProps {
  workspaces: WorkspaceWithDetails[];
  onRowClick: (id: string) => void;
  selectionEnabled?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const WorkspaceTable = memo(function WorkspaceTable({
  workspaces,
  onRowClick,
  selectionEnabled = false,
  selectedIds = new Set(),
  onToggleSelect,
}: WorkspaceTableProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('pt') ? ptLocale : enUS;

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">{t('workspaceTable.noneScheduled', { defaultValue: 'None scheduled' })}</span>;
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return <span className="text-primary font-medium">{t('workspaceTable.today', { defaultValue: 'Today' })}</span>;
      }
      return format(date, 'dd MMM yyyy', { locale: dateLocale });
    } catch {
      return <span className="text-muted-foreground">-</span>;
    }
  };

  const truncateNotes = (notes: string | null, maxLength = 60) => {
    if (!notes) return null;
    return notes.length > maxLength ? notes.slice(0, maxLength) + '...' : notes;
  };

  return (
    <>
      {/* ── Mobile: stacked cards ── */}
      <div className="flex flex-col gap-3 md:hidden p-4">
        {workspaces.map((workspace) => {
          const effectiveHealth = workspace.health_score_override || workspace.health_score;
          return (
            <Card
              key={workspace.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onRowClick(workspace.id)}
            >
              <CardContent className="p-4 space-y-3">
                {/* Row 1: Avatar + Name */}
                <div className="flex items-center gap-3">
                  {selectionEnabled && (
                    <Checkbox
                      checked={selectedIds.has(workspace.id)}
                      onCheckedChange={() => onToggleSelect?.(workspace.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <Avatar className="h-9 w-9 rounded-lg shrink-0">
                    <AvatarImage
                      src={workspace.startup?.logo_url || undefined}
                      className="object-cover"
                      alt={workspace.startup?.name || 'Startup logo'}
                    />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{workspace.startup?.name || t('common.unnamed', { defaultValue: 'Unnamed' })}</p>
                    <Badge variant="outline" className="font-normal text-xs mt-0.5">
                      {workspace.program?.name || '-'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={(e) => { e.stopPropagation(); onRowClick(workspace.id); }}
                    aria-label={t('workspaceTable.openWorkspace', { defaultValue: 'Open workspace' })}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Row 2: Priority + Health + Overdue */}
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={workspace.priority_level} size="sm" />
                  <HealthBadge score={effectiveHealth} />
                  {workspace.overdueActionsCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {workspace.overdueActionsCount} {t('workspaceTable.overdue', { defaultValue: 'overdue' })}
                    </Badge>
                  )}
                </div>

                {/* Row 3: Next meeting */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatMeetingDate(workspace.nextMeetingDate)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Desktop: standard table ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 hidden md:block">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectionEnabled && (
                <TableHead className="w-[40px]">
                  <span className="sr-only">{t('common.select', { defaultValue: 'Select' })}</span>
                </TableHead>
              )}
              <TableHead className="w-[180px] sm:w-[200px]">Startup</TableHead>
              <TableHead className="hidden sm:table-cell">{t('workspace.program', { defaultValue: 'Program' })}</TableHead>
              <TableHead>{t('workspaceTable.priority', { defaultValue: 'Priority' })}</TableHead>
              <TableHead>{t('workspace.healthScore', { defaultValue: 'Health' })}</TableHead>
              <TableHead className="text-center">{t('workspaceTable.overdue', { defaultValue: 'Overdue' })}</TableHead>
              <TableHead className="hidden md:table-cell">{t('workspaceTable.nextMeeting', { defaultValue: 'Next Meeting' })}</TableHead>
              <TableHead className="hidden lg:table-cell w-[200px]">{t('workspaceTable.lastSession', { defaultValue: 'Last Session' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.map((workspace) => {
              const effectiveHealth = workspace.health_score_override || workspace.health_score;
              const isSelected = selectedIds.has(workspace.id);

              return (
                <TableRow
                  key={workspace.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => onRowClick(workspace.id)}
                >
                  {selectionEnabled && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect?.(workspace.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={workspace.startup?.logo_url || undefined}
                          className="object-cover"
                          alt={workspace.startup?.name || 'Startup logo'}
                        />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                          {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold truncate">{workspace.startup?.name || t('common.unnamed', { defaultValue: 'Unnamed' })}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowClick(workspace.id);
                            }}
                            aria-label={t('workspaceTable.openWorkspace', { defaultValue: 'Open workspace' })}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className="font-normal">
                      {workspace.program?.name || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={workspace.priority_level} size="sm" />
                  </TableCell>
                  <TableCell>
                    <HealthBadge score={effectiveHealth} />
                  </TableCell>
                  <TableCell className="text-center">
                    {workspace.overdueActionsCount > 0 ? (
                      <Badge variant="destructive" className="min-w-[2rem]">
                        {workspace.overdueActionsCount}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatMeetingDate(workspace.nextMeetingDate)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {workspace.lastSession ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 max-w-[180px]">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm">{workspace.lastSession.title}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[300px]">
                          <p className="font-medium">{workspace.lastSession.title}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {format(new Date(workspace.lastSession.scheduled_at), 'dd MMM yyyy', { locale: dateLocale })}
                          </p>
                          {workspace.lastSession.notes && (
                            <p className="text-xs">{truncateNotes(workspace.lastSession.notes, 150)}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-sm">{t('workspaceTable.noSessions', { defaultValue: 'No sessions' })}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
});