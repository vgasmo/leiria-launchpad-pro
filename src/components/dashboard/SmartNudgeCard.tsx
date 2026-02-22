import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lightbulb, ArrowRight, BarChart3, ListChecks, Calendar, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SmartNudge } from '@/hooks/useSmartNudges';

const NUDGE_ICONS: Record<SmartNudge['type'], React.ElementType> = {
  kpi_stale: BarChart3,
  action_overdue: ListChecks,
  no_sessions: Calendar,
  checkin_pending: ClipboardCheck,
  milestone_overdue: ListChecks,
};

interface SmartNudgeCardProps {
  nudges: SmartNudge[];
}

export function SmartNudgeCard({ nudges }: SmartNudgeCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (nudges.length === 0) return null;

  return (
    <Card className="border-accent/30 bg-accent/5 dark:bg-accent/10">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className="p-1.5 rounded-lg bg-accent/20">
            <Lightbulb className="h-4 w-4 text-accent-foreground" />
          </div>
          {t('smartNudges.title', { defaultValue: 'Smart Suggestions' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {nudges.map((nudge) => {
          const Icon = NUDGE_ICONS[nudge.type];
          return (
            <div
              key={nudge.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                'bg-background/60 border border-border/40',
                'hover:bg-background/80 hover:border-border/60',
              )}
            >
              <div className={cn(
                'p-1.5 rounded-md shrink-0 mt-0.5',
                nudge.severity === 'warning' 
                  ? 'bg-warning/10 text-warning' 
                  : 'bg-primary/10 text-primary',
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{nudge.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(nudge.href)}
                className="shrink-0 text-xs gap-1 h-7 px-2"
              >
                {nudge.cta}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
