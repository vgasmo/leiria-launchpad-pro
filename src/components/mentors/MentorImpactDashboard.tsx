import { useTimeEntrySummary } from '@/hooks/useTimeTracking';
import { useMentorAverageRating } from '@/hooks/useSessionFeedback';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Star, Users, TrendingUp, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function MentorImpactDashboard() {
  const { user } = useAuth();
  const { data: timeSummary, isLoading: loadingTime } = useTimeEntrySummary();
  const { data: rating, isLoading: loadingRating } = useMentorAverageRating(user?.id);

  if (loadingTime || loadingRating) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const startupsHelped = timeSummary?.byWorkspace.length || 0;
  const monthlyGoal = 20; // hours per month goal
  const monthlyProgress = timeSummary ? (timeSummary.thisMonth / monthlyGoal) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Your Impact
        </h2>
        <p className="text-muted-foreground">Track your mentoring contributions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{timeSummary?.totalHours.toFixed(1) || 0}h</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Hours Contributed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{timeSummary?.thisMonth.toFixed(1) || 0}h</span>
            </div>
            <p className="text-sm text-muted-foreground">Hours This Month</p>
            <div className="mt-2">
              <Progress value={Math.min(monthlyProgress, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(monthlyProgress)}% of {monthlyGoal}h goal</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{startupsHelped}</span>
            </div>
            <p className="text-sm text-muted-foreground">Startups Helped</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{rating?.average || '-'}</span>
              <span className="text-sm text-muted-foreground">/ 5</span>
            </div>
            <p className="text-sm text-muted-foreground">Average Session Rating ({rating?.count || 0} reviews)</p>
          </CardContent>
        </Card>
      </div>

      {timeSummary?.byWorkspace.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Hours by Startup</CardTitle>
            <CardDescription>Breakdown of time invested</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeSummary.byWorkspace
                .sort((a, b) => b.hours - a.hours)
                .map(ws => (
                  <div key={ws.workspace_id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{ws.name}</p>
                      <Progress value={(ws.hours / timeSummary.totalHours) * 100} className="h-2 mt-1" />
                    </div>
                    <span className="text-sm font-medium whitespace-nowrap">{ws.hours.toFixed(1)}h</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
