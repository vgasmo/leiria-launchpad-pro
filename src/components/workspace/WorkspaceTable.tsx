import { memo } from 'react';
import { format, isToday } from 'date-fns';
import { Calendar, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  // P0.5: Bulk selection support
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
  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">None scheduled</span>;
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return <span className="text-primary font-medium">Today</span>;
      }
      return format(date, 'MMM d, yyyy');
    } catch {
      return <span className="text-muted-foreground">-</span>;
    }
  };

  const truncateNotes = (notes: string | null, maxLength = 60) => {
    if (!notes) return null;
    return notes.length > maxLength ? notes.slice(0, maxLength) + '...' : notes;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {selectionEnabled && (
            <TableHead className="w-[40px]">
              <span className="sr-only">Select</span>
            </TableHead>
          )}
          <TableHead className="w-[200px]">Startup</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Health</TableHead>
          <TableHead className="text-center">Overdue</TableHead>
          <TableHead>Next Meeting</TableHead>
          <TableHead className="w-[200px]">Last Session</TableHead>
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
                    />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {workspace.startup?.name || 'Unnamed'}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
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
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatMeetingDate(workspace.nextMeetingDate)}
                </div>
              </TableCell>
              <TableCell>
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
                        {format(new Date(workspace.lastSession.scheduled_at), 'MMM d, yyyy')}
                      </p>
                      {workspace.lastSession.notes && (
                        <p className="text-xs">{truncateNotes(workspace.lastSession.notes, 150)}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-muted-foreground text-sm">No sessions</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
});
