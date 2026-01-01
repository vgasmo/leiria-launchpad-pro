import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  MessageSquare, 
  Clock,
  FileText,
  ArrowRight,
  Briefcase,
  Users
} from 'lucide-react';
import { format, formatDistanceToNow, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffTasksPanel } from '@/components/staff/StaffTasksPanel';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';

interface MentorDashboardProps {
  workspaces: WorkspaceWithDetails[];
  isLoading: boolean;
}

export function MentorDashboard({ workspaces, isLoading }: MentorDashboardProps) {
  const navigate = useNavigate();

  // Sort by last session / next meeting for relationship depth
  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    return [...workspaces].sort((a, b) => {
      // Prioritize by upcoming meeting
      if (a.nextMeetingDate && !b.nextMeetingDate) return -1;
      if (!a.nextMeetingDate && b.nextMeetingDate) return 1;
      if (a.nextMeetingDate && b.nextMeetingDate) {
        return new Date(a.nextMeetingDate).getTime() - new Date(b.nextMeetingDate).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [workspaces]);

  // Get upcoming meetings this week
  const upcomingMeetings = useMemo(() => {
    if (!workspaces) return [];
    return workspaces
      .filter(w => w.nextMeetingDate)
      .sort((a, b) => 
        new Date(a.nextMeetingDate!).getTime() - new Date(b.nextMeetingDate!).getTime()
      )
      .slice(0, 5);
  }, [workspaces]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex gap-3">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No startups assigned yet</h3>
        <p className="text-muted-foreground mb-4">
          You'll see your mentored startups here once you're assigned to workspaces.
        </p>
        <Button variant="outline" onClick={() => navigate('/mentors')}>
          <Users className="mr-2 h-4 w-4" />
          View Connection Requests
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Tasks */}
      <StaffTasksPanel />

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Startups
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces.length}</div>
            <p className="text-xs text-muted-foreground">
              Active mentorships
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Meetings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              {workspaces.filter(w => w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))).length} today
            </p>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workspaces.reduce((sum, w) => sum + w.pendingActionsCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {workspaces.reduce((sum, w) => sum + w.overdueActionsCount, 0)} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Startup Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Startups</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedWorkspaces.map((workspace, index) => {
            const health = workspace.health_score_override || workspace.health_score;
            const lastInteraction = workspace.lastSession?.scheduled_at;
            
            return (
              <Card 
                key={workspace.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 animate-fade-in"
                style={{ animationDelay: `${150 + index * 50}ms` }}
                onClick={() => navigate(`/workspace/${workspace.id}`)}
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-14 w-14 rounded-xl">
                      <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-lg">
                        {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-1">
                        {workspace.startup?.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <HealthBadge score={health as HealthScore | null} size="sm" />
                        <StageBadge stage={workspace.stage} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Last Session */}
                  {workspace.lastSession ? (
                    <div className="bg-muted/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <FileText className="h-3 w-3" />
                        Last Session
                      </div>
                      <p className="text-sm font-medium truncate">{workspace.lastSession.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(workspace.lastSession.scheduled_at), { addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted/30 rounded-lg p-3 mb-3 text-center">
                      <p className="text-sm text-muted-foreground">No sessions yet</p>
                    </div>
                  )}

                  {/* Next Meeting */}
                  {workspace.nextMeetingDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Next:</span>
                      <span className={isToday(new Date(workspace.nextMeetingDate)) ? 'text-primary font-medium' : ''}>
                        {isToday(new Date(workspace.nextMeetingDate)) 
                          ? `Today at ${format(new Date(workspace.nextMeetingDate), 'h:mm a')}`
                          : format(new Date(workspace.nextMeetingDate), 'MMM d, h:mm a')
                        }
                      </span>
                    </div>
                  )}

                  {/* Action Items */}
                  {workspace.pendingActionsCount > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{workspace.pendingActionsCount} pending actions</span>
                      {workspace.overdueActionsCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {workspace.overdueActionsCount} overdue
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Upcoming Meetings Section */}
      {upcomingMeetings.length > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Upcoming Meetings</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMeetings.map(workspace => (
                <div
                  key={workspace.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={workspace.startup?.logo_url || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-sm font-semibold">
                      {workspace.startup?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{workspace.startup?.name}</h4>
                    <p className="text-sm text-muted-foreground">{workspace.program?.name}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${isToday(new Date(workspace.nextMeetingDate!)) ? 'text-primary' : ''}`}>
                      {isToday(new Date(workspace.nextMeetingDate!)) 
                        ? 'Today' 
                        : format(new Date(workspace.nextMeetingDate!), 'MMM d')
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(workspace.nextMeetingDate!), 'h:mm a')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
