import { cn } from '@/lib/utils';
import { HealthScore } from '@/types/database';

interface HealthBadgeProps {
  score: HealthScore | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const healthConfig: Record<HealthScore, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-health-critical/10 text-health-critical border-health-critical/30' },
  at_risk: { label: 'At Risk', className: 'bg-health-at-risk/10 text-health-at-risk border-health-at-risk/30' },
  stable: { label: 'Stable', className: 'bg-health-stable/10 text-health-stable border-health-stable/30' },
  healthy: { label: 'Healthy', className: 'bg-health-healthy/10 text-health-healthy border-health-healthy/30' },
  thriving: { label: 'Thriving', className: 'bg-health-thriving/10 text-health-thriving border-health-thriving/30' },
};

export function HealthBadge({ score, size = 'md', className }: HealthBadgeProps) {
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
        Not Set
      </span>
    );
  }

  const config = healthConfig[score];
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium",
      sizeClasses[size],
      config.className,
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
      {config.label}
    </span>
  );
}
