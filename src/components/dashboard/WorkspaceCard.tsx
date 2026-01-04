import { memo } from 'react';
import { format } from 'date-fns';
import { Calendar, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Sparkline } from '@/components/ui/Sparkline';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';
import { cn } from '@/lib/utils';

interface WorkspaceCardProps {
  workspace: WorkspaceWithDetails;
  onClick: () => void;
  kpiTrend?: number[];
}

export const WorkspaceCard = memo(function WorkspaceCard({ workspace, onClick, kpiTrend }: WorkspaceCardProps) {
  const effectiveHealth = workspace.health_score_override || workspace.health_score;
  const hasOverdue = workspace.overdueActionsCount > 0;

  return (
    <Card 
      interactive
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        hasOverdue && 'border-amber-200 dark:border-amber-800'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage 
              src={workspace.startup?.logo_url || undefined} 
              className="object-cover"
            />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
              {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {workspace.startup?.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {workspace.program?.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1" data-tour="health-badge">
            <HealthBadge score={effectiveHealth as HealthScore | null} size="sm" />
            {workspace.priority_level && workspace.priority_level !== 'standard' && (
              <PriorityBadge priority={workspace.priority_level} size="sm" showLabel={false} />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-1">Stage</p>
            <StageBadge stage={workspace.stage} size="sm" />
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-1">Actions</p>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">{workspace.pendingActionsCount}</span>
              {hasOverdue && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {workspace.overdueActionsCount} overdue
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* KPI Trend */}
        {kpiTrend && kpiTrend.length >= 2 && (
          <div className="bg-muted/30 rounded-lg p-2.5 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">KPI Trend</p>
              <Sparkline data={kpiTrend} width={80} height={24} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          {workspace.nextMeetingDate ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(workspace.nextMeetingDate), 'MMM d')}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">No meetings</span>
          )}
          {workspace.lastSession ? (
            <div className="flex items-center gap-1 max-w-[120px]">
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{workspace.lastSession.title}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60">No sessions</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
