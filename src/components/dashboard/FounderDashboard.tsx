import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Target,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Plus,
  Rocket,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkspaceWithDetails, PendingWorkspace } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';

interface FounderDashboardProps {
  workspaces: WorkspaceWithDetails[];
  pendingWorkspaces: PendingWorkspace[];
  isLoading: boolean;
  onCreateStartup: () => void;
}

export function FounderDashboard({ 
  workspaces, 
  pendingWorkspaces,
  isLoading, 
  onCreateStartup 
}: FounderDashboardProps) {
  const navigate = useNavigate();

  // Get the primary workspace (founders typically have 1)
  const workspace = workspaces[0];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state
  if (pendingWorkspaces.length > 0 && workspaces.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  Application Under Review
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mb-4">
                  Your startup application is being reviewed by our team. You'll receive access to your workspace once approved.
                </p>
                
                <div className="space-y-3">
                  {pendingWorkspaces.map(pw => (
                    <div key={pw.id} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-background/50 rounded-lg">
                      <Rocket className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <span className="font-medium">{pw.startup?.name}</span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{pw.program?.name}</Badge>
                          <span>•</span>
                          <StageBadge stage={pw.stage} size="sm" />
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-muted-foreground">
          <p>We typically respond within 2-3 business days</p>
        </div>
      </div>
    );
  }

  // No workspace yet
  if (!workspace) {
    return (
      <Card className="p-12 text-center">
        <Rocket className="h-16 w-16 mx-auto text-primary mb-6" />
        <h3 className="text-2xl font-bold mb-2">Start Your Journey</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Create your startup profile to join our mentorship program and get access to expert guidance, resources, and a dedicated workspace.
        </p>
        <Button size="lg" onClick={onCreateStartup}>
          <Plus className="mr-2 h-5 w-5" />
          Create Your Startup
        </Button>
      </Card>
    );
  }

  const health = workspace.health_score_override || workspace.health_score;

  return (
    <div className="space-y-6">
      {/* Startup Header Card */}
      <Card className="overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 rounded-2xl border-4 border-background shadow-lg">
              <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
              <AvatarFallback className="rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
                {workspace.startup?.name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{workspace.startup?.name}</h1>
                <HealthBadge score={health as HealthScore | null} />
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  {workspace.program?.name}
                </Badge>
                <StageBadge stage={workspace.stage} />
              </div>
              {workspace.startup?.description && (
                <p className="text-muted-foreground mt-3 line-clamp-2">
                  {workspace.startup.description}
                </p>
              )}
            </div>
            <Button onClick={() => navigate(`/workspace/${workspace.id}`)}>
              Open Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace.pendingActionsCount}</div>
            {workspace.overdueActionsCount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {workspace.overdueActionsCount} overdue
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Meeting
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {workspace.nextMeetingDate ? (
              <>
                <div className={`text-xl font-bold ${isToday(new Date(workspace.nextMeetingDate)) ? 'text-primary' : ''}`}>
                  {isToday(new Date(workspace.nextMeetingDate)) 
                    ? 'Today' 
                    : format(new Date(workspace.nextMeetingDate), 'MMM d')
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(workspace.nextMeetingDate), 'h:mm a')}
                </p>
              </>
            ) : (
              <div className="text-lg text-muted-foreground">Not scheduled</div>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              KPI Status
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${workspace.hasCurrentMonthKpi ? 'text-green-600' : 'text-amber-600'}`}>
              {workspace.hasCurrentMonthKpi ? 'Up to date' : 'Needs update'}
            </div>
            <p className="text-xs text-muted-foreground">
              {workspace.lastKpiMonth 
                ? `Last: ${format(new Date(workspace.lastKpiMonth), 'MMM yyyy')}`
                : 'No entries yet'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Session
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {workspace.lastSession ? (
              <>
                <div className="text-lg font-medium truncate">{workspace.lastSession.title}</div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(workspace.lastSession.scheduled_at), { addSuffix: true })}
                </p>
              </>
            ) : (
              <div className="text-lg text-muted-foreground">No sessions yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="animate-fade-in" style={{ animationDelay: '250ms' }}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate(`/workspace/${workspace.id}?tab=kpis`)}>
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Update KPIs</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate(`/workspace/${workspace.id}?tab=actions`)}>
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>View Actions</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate(`/workspace/${workspace.id}?tab=milestones`)}>
              <Target className="h-5 w-5 text-primary" />
              <span>Milestones</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate(`/workspace/${workspace.id}?tab=documents`)}>
              <FileText className="h-5 w-5 text-primary" />
              <span>Documents</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
