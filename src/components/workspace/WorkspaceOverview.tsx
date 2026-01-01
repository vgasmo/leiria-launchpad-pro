import { useState, useEffect } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { 
  Calendar, 
  CheckCircle2, 
  Target, 
  TrendingUp, 
  TrendingDown,
  FileText,
  Plus,
  Video,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaceActions, useWorkspaceKpis, useWorkspaceMilestones, useWorkspaceMeetings, useWorkspaceSessions, useStages } from '@/hooks/useWorkspaceData';
import { HealthScorePanel } from '@/components/workspace/HealthScorePanel';
import { WorkspaceOnboardingWizard } from '@/components/workspace/WorkspaceOnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { StartupStage, HealthScore } from '@/types/database';
import type { Database } from '@/integrations/supabase/types';

interface WorkspaceOverviewProps {
  workspace: {
    id: string;
    startup_id: string;
    program_id: string;
    stage: StartupStage;
    stage_id: string | null;
    health_score: string | null;
    health_score_override: string | null;
    health_status: string | null;
    health_notes: string | null;
    startup: { name: string; description: string | null; logo_url?: string | null } | null;
    program: { name: string } | null;
  };
  canWrite: boolean;
}

export function WorkspaceOverview({ workspace, canWrite }: WorkspaceOverviewProps) {
  const queryClient = useQueryClient();
  const { data: actions, isLoading: actionsLoading } = useWorkspaceActions(workspace.id);
  const { data: kpiData, isLoading: kpisLoading } = useWorkspaceKpis(workspace.id);
  const { data: milestones, isLoading: milestonesLoading } = useWorkspaceMilestones(workspace.id);
  const { data: nextMeeting, isLoading: meetingLoading } = useWorkspaceMeetings(workspace.id);
  const { data: sessions, isLoading: sessionsLoading } = useWorkspaceSessions(workspace.id);
  const { data: stages } = useStages(workspace.program_id);
  
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);

  const effectiveHealth = workspace.health_score_override || workspace.health_score;
  
  // Check if workspace is "empty" and should show onboarding prompt
  const isWorkspaceEmpty = !kpisLoading && !milestonesLoading && !meetingLoading &&
    (kpiData?.current.length === 0) && 
    (milestones?.length === 0) && 
    !nextMeeting;

  const handleStageChange = async (newStage: StartupStage) => {
    const { error } = await supabase
      .from('workspaces')
      .update({ stage: newStage })
      .eq('id', workspace.id);

    if (error) {
      toast.error('Failed to update stage');
    } else {
      toast.success('Stage updated');
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
    }
  };

  // Calculate milestone counts
  const milestoneCounts = {
    planned: milestones?.filter(m => m.status === 'not_started').length || 0,
    inProgress: milestones?.filter(m => m.status === 'in_progress').length || 0,
    completed: milestones?.filter(m => m.status === 'completed').length || 0,
    delayed: milestones?.filter(m => m.status === 'delayed').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Wizard */}
      <WorkspaceOnboardingWizard
        open={showOnboardingWizard}
        onOpenChange={setShowOnboardingWizard}
        workspaceId={workspace.id}
        stage={workspace.stage}
        startupName={workspace.startup?.name || 'Workspace'}
      />
      
      {/* Onboarding CTA for empty workspaces */}
      {isWorkspaceEmpty && canWrite && (
        <Card className="border-dashed border-primary/50 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Get started with your workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up KPIs, milestones, and schedule your first meeting.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowOnboardingWizard(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Run Setup Wizard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Header */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 rounded-xl">
                <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-semibold">
                  {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-heading text-2xl font-bold">{workspace.startup?.name}</h2>
                <p className="text-muted-foreground">{workspace.program?.name}</p>
                {workspace.startup?.description && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-xl line-clamp-2">
                    {workspace.startup.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canWrite ? (
                <Select value={workspace.stage} onValueChange={(v) => handleStageChange(v as StartupStage)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['ideation', 'validation', 'mvp', 'growth', 'scale'] as const).map(stage => (
                      <SelectItem key={stage} value={stage} className="capitalize">
                        {stage}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <StageBadge stage={workspace.stage} />
              )}
              <HealthBadge score={effectiveHealth as HealthScore | null} size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Next Actions */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Next Actions
              </CardTitle>
              <Badge variant="secondary">{actions?.length || 0} open</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {actionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : actions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {actions?.slice(0, 5).map(action => (
                  <ActionItem key={action.id} action={action} />
                ))}
                {(actions?.length || 0) > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{(actions?.length || 0) - 5} more actions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs Snapshot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                KPIs Snapshot
              </CardTitle>
              {kpiData?.currentMonth && (
                <Badge variant="outline">
                  {format(new Date(kpiData.currentMonth), 'MMM yyyy')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {kpisLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : kpiData?.current.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No KPIs recorded this month</p>
                <Button variant="link" size="sm" className="mt-2">
                  Add KPI Entry
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {kpiData?.current.slice(0, 6).map(kpi => (
                  <KpiCard 
                    key={kpi.id} 
                    kpi={kpi} 
                    previousValue={kpiData.previous.find(
                      p => p.kpi_definition_id === kpi.kpi_definition_id
                    )?.value}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestones Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {milestonesLoading ? (
              <Skeleton className="h-24" />
            ) : milestones?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No milestones defined</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MilestoneCount label="Planned" count={milestoneCounts.planned} color="bg-muted" />
                <MilestoneCount label="In Progress" count={milestoneCounts.inProgress} color="bg-blue-500/10 text-blue-600" />
                <MilestoneCount label="Completed" count={milestoneCounts.completed} color="bg-green-500/10 text-green-600" />
                <MilestoneCount label="Delayed" count={milestoneCounts.delayed} color="bg-destructive/10 text-destructive" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Meeting/Session */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Upcoming
              </CardTitle>
              {canWrite && (
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Schedule
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {meetingLoading ? (
              <Skeleton className="h-20" />
            ) : !nextMeeting ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming meetings or sessions</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-primary font-medium">
                      {format(new Date(nextMeeting.starts_at), 'MMM')}
                    </span>
                    <span className="text-lg font-bold text-primary leading-none">
                      {format(new Date(nextMeeting.starts_at), 'd')}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{nextMeeting.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {nextMeeting.type === 'session' ? 'Session' : 'Meeting'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(nextMeeting.starts_at), 'h:mm a')} - {format(new Date(nextMeeting.ends_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
                {nextMeeting.join_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={nextMeeting.join_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Join
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Health Score Panel */}
        <HealthScorePanel
          workspaceId={workspace.id}
          healthScore={(workspace.health_score_override || workspace.health_score) as Database['public']['Enums']['health_score'] | null}
          healthStatus={workspace.health_status}
          healthNotes={workspace.health_notes}
          canWrite={canWrite}
        />
      </div>

      {/* Recent Sessions - Full Width */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Sessions
            </CardTitle>
            <Badge variant="secondary">{sessions?.length || 0} sessions</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : sessions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sessions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions?.map(session => (
                <SessionItem key={session.id} session={session} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionItem({ action }: { action: any }) {
  const isOverdue = action.due_date && isPast(new Date(action.due_date)) && !isToday(new Date(action.due_date));
  const isDueToday = action.due_date && isToday(new Date(action.due_date));

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
        action.status === 'in_progress' ? 'bg-blue-500' : 
        isOverdue ? 'bg-destructive' : 
        isDueToday ? 'bg-amber-500' : 'bg-muted-foreground'
      }`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{action.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {action.due_date && (
            <span className={isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-amber-600 font-medium' : ''}>
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today' : ''}
              {!isDueToday && format(new Date(action.due_date), 'MMM d')}
            </span>
          )}
          {action.priority && action.priority !== 'medium' && (
            <Badge variant={action.priority === 'urgent' || action.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1 py-0">
              {action.priority}
            </Badge>
          )}
        </div>
      </div>
      {action.owner && (
        <Avatar className="h-6 w-6">
          <AvatarImage src={action.owner.avatar_url} />
          <AvatarFallback className="text-[10px]">
            {action.owner.full_name?.slice(0, 2).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function KpiCard({ kpi, previousValue }: { kpi: any; previousValue?: number | null }) {
  const definition = kpi.kpi_definition;
  const currentValue = kpi.value;
  const hasChange = previousValue != null && currentValue != null;
  
  let trend: 'up' | 'down' | 'neutral' = 'neutral';
  let trendPercent = 0;
  
  if (hasChange && previousValue !== 0) {
    trendPercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    trend = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral';
  }

  // Determine if trend is good based on direction
  const isGoodTrend = definition?.direction === 'up' ? trend === 'up' : 
                      definition?.direction === 'down' ? trend === 'down' : true;

  const formatValue = (val: number) => {
    if (definition?.unit === '%') return `${val.toFixed(1)}%`;
    if (definition?.unit === '€' || definition?.unit === '$') {
      if (val >= 1000000) return `${definition.unit}${(val/1000000).toFixed(1)}M`;
      if (val >= 1000) return `${definition.unit}${(val/1000).toFixed(0)}k`;
      return `${definition.unit}${val.toFixed(0)}`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-1 truncate">{definition?.name || 'KPI'}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-bold">
          {currentValue != null ? formatValue(currentValue) : '-'}
        </p>
        {hasChange && trend !== 'neutral' && (
          <div className={`flex items-center text-xs ${isGoodTrend ? 'text-green-600' : 'text-destructive'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="ml-0.5">{Math.abs(trendPercent).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneCount({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`p-3 rounded-lg text-center ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs">{label}</p>
    </div>
  );
}

function SessionItem({ session }: { session: any }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{session.title}</p>
        <p className="text-sm text-muted-foreground">
          {format(new Date(session.scheduled_at), 'MMM d, yyyy')}
          {session.duration && ` • ${session.duration} min`}
        </p>
      </div>
      {session.notes && (
        <Badge variant="secondary" className="flex-shrink-0">
          Has notes
        </Badge>
      )}
    </div>
  );
}
