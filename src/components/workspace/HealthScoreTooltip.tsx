import { useTranslation } from 'react-i18next';
import { HelpCircle, Activity, Calendar, BarChart3, ClipboardCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface HealthScoreTooltipProps {
  components?: {
    actions: number;
    sessions: number;
    kpis: number;
    checkins: number;
  } | null;
  numericScore?: number;
  variant?: 'icon' | 'inline';
  className?: string;
}

/**
 * Health score transparency tooltip explaining how the score is calculated.
 * Implements item G from the founder UX audit.
 */
export function HealthScoreTooltip({
  components,
  numericScore,
  variant = 'icon',
  className,
}: HealthScoreTooltipProps) {
  const { t } = useTranslation();

  const weights = { actions: 30, sessions: 20, kpis: 30, checkins: 20 };

  const content = (
    <div className="space-y-3 w-64">
      <div className="flex items-center gap-2 font-medium">
        <HelpCircle className="h-4 w-4 text-primary" />
        {t('healthTooltip.title', 'How is health calculated?')}
      </div>
      
      <p className="text-xs text-muted-foreground">
        {t('healthTooltip.description', 'Your health score is based on 4 factors weighted by importance:')}
      </p>

      <div className="space-y-2">
        {[
          { key: 'actions', icon: Activity, label: t('healthTooltip.actions', 'Action completion'), weight: weights.actions },
          { key: 'sessions', icon: Calendar, label: t('healthTooltip.sessions', 'Session attendance'), weight: weights.sessions },
          { key: 'kpis', icon: BarChart3, label: t('healthTooltip.kpis', 'KPI updates'), weight: weights.kpis },
          { key: 'checkins', icon: ClipboardCheck, label: t('healthTooltip.checkins', 'Weekly wins'), weight: weights.checkins },
        ].map(({ key, icon: Icon, label, weight }) => {
          const score = components?.[key as keyof typeof components] ?? 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  {label}
                </span>
                <span className="text-muted-foreground">
                  {weight}%
                </span>
              </div>
              {components && (
                <Progress value={score} className="h-1.5" />
              )}
            </div>
          );
        })}
      </div>

      {numericScore !== undefined && (
        <div className="pt-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t('healthTooltip.totalScore', 'Total score')}
          </span>
          <span className="font-bold text-sm">{numericScore}/100</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        {t('healthTooltip.tip', 'Tip: Complete your weekly wins and update KPIs to improve your score!')}
      </p>
    </div>
  );

  if (variant === 'inline') {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <button className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-help", className)}>
            <HelpCircle className="h-3 w-3" />
            {t('healthTooltip.whyThisScore', 'Why this score?')}
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-auto">
          {content}
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className={cn("text-muted-foreground hover:text-foreground transition-colors cursor-help", className)}>
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="p-3">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
