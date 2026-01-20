import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, isToday, isTomorrow, differenceInHours, differenceInMinutes } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  ArrowRight,
  AlertCircle,
  Target,
  FileText,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Separator } from '@/components/ui/separator';
import { WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { HealthScore } from '@/types/database';
import { cn } from '@/lib/utils';

interface MentorSessionPrepCardProps {
  workspace: WorkspaceWithDetails;
  meetingDate: Date;
  className?: string;
}

/**
 * Enhanced session prep card for mentors.
 * Shows comprehensive prep context when a session is approaching.
 */
export function MentorSessionPrepCard({ workspace, meetingDate, className }: MentorSessionPrepCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const hoursUntil = differenceInHours(meetingDate, new Date());
  const minutesUntil = differenceInMinutes(meetingDate, new Date());
  const isImminent = hoursUntil <= 1;
  const isUrgent = hoursUntil <= 3;

  const health = workspace.health_score_override || workspace.health_score;

  const getTimeLabel = () => {
    if (isToday(meetingDate)) {
      if (minutesUntil <= 60) {
        return t('session.inMinutes', 'In {{minutes}} min', { minutes: minutesUntil });
      }
      return t('session.todayAt', 'Today at {{time}}', { time: format(meetingDate, 'h:mm a') });
    }
    if (isTomorrow(meetingDate)) {
      return t('session.tomorrowAt', 'Tomorrow at {{time}}', { time: format(meetingDate, 'h:mm a') });
    }
    return format(meetingDate, 'MMM d, h:mm a');
  };

  // Prep suggestions based on workspace state
  const prepSuggestions = useMemo(() => {
    const suggestions: { icon: typeof Target; text: string; priority: 'high' | 'medium' | 'low' }[] = [];

    if (workspace.overdueActionsCount > 0) {
      suggestions.push({
        icon: AlertCircle,
        text: t('sessionPrep.reviewOverdue', 'Review {{count}} overdue actions', { count: workspace.overdueActionsCount }),
        priority: 'high',
      });
    }

    if (!workspace.hasCurrentMonthKpi) {
      suggestions.push({
        icon: TrendingUp,
        text: t('sessionPrep.askAboutKpis', 'Ask about this month\'s KPIs'),
        priority: 'medium',
      });
    }

    if (workspace.lastSession) {
      suggestions.push({
        icon: FileText,
        text: t('sessionPrep.reviewLastSession', 'Review notes from last session'),
        priority: 'low',
      });
    }

    if (health === 'at_risk' || health === 'critical') {
      suggestions.push({
        icon: MessageSquare,
        text: t('sessionPrep.discussChallenges', 'Discuss current challenges'),
        priority: 'high',
      });
    }

    return suggestions.slice(0, 3);
  }, [workspace, health, t]);

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isImminent 
        ? 'border-red-400/50 bg-gradient-to-br from-red-50/80 via-orange-50/50 to-transparent dark:from-red-950/30 dark:via-orange-950/20' 
        : isUrgent
        ? 'border-amber-400/50 bg-gradient-to-br from-amber-50/80 via-yellow-50/50 to-transparent dark:from-amber-950/30 dark:via-yellow-950/20'
        : 'border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              isImminent 
                ? 'bg-red-500 text-white animate-pulse' 
                : isUrgent
                ? 'bg-amber-500 text-white'
                : 'bg-primary/10 text-primary'
            )}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t('sessionPrep.upcomingSession', 'Upcoming Session')}
              </CardTitle>
              <p className={cn(
                'text-sm font-medium',
                isImminent ? 'text-red-600 dark:text-red-400' : isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
              )}>
                {getTimeLabel()}
              </p>
            </div>
          </div>
          <Button 
            variant={isUrgent ? 'default' : 'outline'} 
            size="sm"
            onClick={() => navigate(`/workspace/${workspace.id}?tab=sessions`)}
            className={isUrgent ? 'shadow-md' : ''}
          >
            {t('sessionPrep.prepare', 'Prepare')}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Startup Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border">
          <Avatar className="h-12 w-12 rounded-xl">
            <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold">
              {workspace.startup?.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{workspace.startup?.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <HealthBadge score={health as HealthScore | null} size="sm" />
              <StageBadge stage={workspace.stage} size="sm" />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{workspace.pendingActionsCount}</p>
            <p className="text-xs text-muted-foreground">{t('sessionPrep.pending', 'Pending')}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className={cn('text-lg font-bold', workspace.overdueActionsCount > 0 && 'text-destructive')}>
              {workspace.overdueActionsCount}
            </p>
            <p className="text-xs text-muted-foreground">{t('common.overdue', 'Overdue')}</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold flex items-center justify-center gap-1">
              {workspace.hasCurrentMonthKpi ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </p>
            <p className="text-xs text-muted-foreground">{t('sessionPrep.kpis', 'KPIs')}</p>
          </div>
        </div>

        {/* Prep Suggestions */}
        {prepSuggestions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                {t('sessionPrep.suggestions', 'Prep suggestions')}
              </div>
              <ul className="space-y-1.5">
                {prepSuggestions.map((suggestion, idx) => {
                  const Icon = suggestion.icon;
                  return (
                    <li 
                      key={idx}
                      className={cn(
                        'flex items-center gap-2 text-sm p-2 rounded-md',
                        suggestion.priority === 'high' && 'bg-destructive/5 text-destructive',
                        suggestion.priority === 'medium' && 'bg-amber-500/5 text-amber-700 dark:text-amber-400',
                        suggestion.priority === 'low' && 'bg-muted/50 text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{suggestion.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {/* Last Session Reference */}
        {workspace.lastSession && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{t('sessionPrep.lastSession', 'Last session')}: </span>
              <span className="font-medium text-foreground">{workspace.lastSession.title}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
