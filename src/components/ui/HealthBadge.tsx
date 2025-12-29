import { cn } from '@/lib/utils';
import { HealthScore } from '@/types/database';

interface HealthBadgeProps {
  score: HealthScore | null;
  className?: string;
}

const healthConfig: Record<HealthScore, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-health-critical/10 text-health-critical border-health-critical/30' },
  at_risk: { label: 'At Risk', className: 'bg-health-at-risk/10 text-health-at-risk border-health-at-risk/30' },
  stable: { label: 'Stable', className: 'bg-health-stable/10 text-health-stable border-health-stable/30' },
  healthy: { label: 'Healthy', className: 'bg-health-healthy/10 text-health-healthy border-health-healthy/30' },
  thriving: { label: 'Thriving', className: 'bg-health-thriving/10 text-health-thriving border-health-thriving/30' },
};

export function HealthBadge({ score, className }: HealthBadgeProps) {
  if (!score) {
    return (
      <span className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
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
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}
