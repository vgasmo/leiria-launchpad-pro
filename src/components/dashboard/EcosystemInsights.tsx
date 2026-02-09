import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Info,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EcosystemInsight, InsightSeverity } from '@/hooks/useEcosystemInsights';

interface EcosystemInsightsProps {
  insights: EcosystemInsight[];
  className?: string;
}

const severityConfig: Record<InsightSeverity, {
  icon: typeof AlertTriangle;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}> = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-destructive/5 dark:bg-destructive/10',
    border: 'border-destructive/20',
    text: 'text-destructive',
    iconColor: 'text-destructive',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    border: 'border-amber-200/50 dark:border-amber-800/30',
    text: 'text-amber-700 dark:text-amber-400',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-primary/5',
    border: 'border-primary/10',
    text: 'text-primary',
    iconColor: 'text-primary',
  },
  positive: {
    icon: CheckCircle2,
    bg: 'bg-green-50/50 dark:bg-green-900/10',
    border: 'border-green-200/50 dark:border-green-800/30',
    text: 'text-green-700 dark:text-green-400',
    iconColor: 'text-green-500',
  },
};

export function EcosystemInsights({ insights, className }: EcosystemInsightsProps) {
  const navigate = useNavigate();

  if (insights.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
        <Lightbulb className="h-4 w-4" />
        <span>Insights</span>
      </div>
      {insights.map((insight) => {
        const config = severityConfig[insight.severity];
        const Icon = config.icon;
        return (
          <div
            key={insight.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-xl border transition-colors',
              config.bg,
              config.border,
            )}
          >
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.iconColor)} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', config.text)}>
                {insight.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {insight.description}
              </p>
            </div>
            {insight.actionLabel && insight.actionHref && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-xs h-7 gap-1"
                onClick={() => navigate(insight.actionHref!)}
              >
                {insight.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
