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

  // P0: Compact stats in single row for less clutter
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Your Impact
        </h2>
      </div>

      {/* P0: Single row compact stats */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between divide-x">
            <div className="flex-1 text-center px-3">
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{timeSummary?.totalHours.toFixed(0) || 0}h</span>
              </div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            
            <div className="flex-1 text-center px-3">
              <div className="flex items-center justify-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{timeSummary?.thisMonth.toFixed(0) || 0}h</span>
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            
            <div className="flex-1 text-center px-3">
              <div className="flex items-center justify-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold">{startupsHelped}</span>
              </div>
              <p className="text-xs text-muted-foreground">Startups</p>
            </div>
            
            <div className="flex-1 text-center px-3">
              <div className="flex items-center justify-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-xl font-bold">{rating?.average || '-'}</span>
              </div>
              <p className="text-xs text-muted-foreground">{rating?.count || 0} reviews</p>
            </div>
          </div>
          
          {/* Monthly goal progress - compact */}
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Monthly goal</span>
              <Progress value={Math.min(monthlyProgress, 100)} className="h-1.5 flex-1" />
              <span className="text-xs font-medium">{Math.round(monthlyProgress)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
