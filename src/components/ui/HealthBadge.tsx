import { cn } from '@/lib/utils';
import { HealthScore } from '@/types/database';
import { useTranslation } from 'react-i18next';

interface HealthBadgeProps {
  score: HealthScore | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const healthClassNames: Record<HealthScore, string> = {
  critical: 'bg-health-critical/10 text-health-critical border-health-critical/30',
  at_risk: 'bg-health-at-risk/10 text-health-at-risk border-health-at-risk/30',
  stable: 'bg-health-stable/10 text-health-stable border-health-stable/30',
  healthy: 'bg-health-healthy/10 text-health-healthy border-health-healthy/30',
  thriving: 'bg-health-thriving/10 text-health-thriving border-health-thriving/30',
};

const healthLabelKeys: Record<HealthScore, string> = {
  critical: 'health.levels.critical',
  at_risk: 'health.levels.atRisk',
  stable: 'health.levels.stable',
  healthy: 'health.levels.healthy',
  thriving: 'health.levels.thriving',
};

export function HealthBadge({ score, size = 'md', className }: HealthBadgeProps) {
  const { t } = useTranslation();
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-medium',
  };

  if (!score) {
    return (
      <span className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeClasses[size],
        "bg-muted text-muted-foreground border-border",
        className
      )}>
        {t('health.levels.unknown')}
      </span>
    );
  }

  const labelKey = healthLabelKeys[score];
  const colorClass = healthClassNames[score];
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium",
      sizeClasses[size],
      colorClass,
      className
    )}>
      <span className={cn(
        'rounded-full mr-1.5',
        size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2',
        score === 'critical' && 'bg-health-critical',
        score === 'at_risk' && 'bg-health-at-risk',
        score === 'stable' && 'bg-health-stable',
        score === 'healthy' && 'bg-health-healthy',
        score === 'thriving' && 'bg-health-thriving',
      )} />
      {t(labelKey)}
    </span>
  );
}
