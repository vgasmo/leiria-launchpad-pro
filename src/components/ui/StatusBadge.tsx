import { cn } from '@/lib/utils';
import { ActionStatus, MilestoneStatus } from '@/types/database';

interface StatusBadgeProps {
  status: ActionStatus | MilestoneStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-border' },
  not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground border-border' },
  in_progress: { label: 'In Progress', className: 'bg-primary/10 text-primary border-primary/30' },
  completed: { label: 'Completed', className: 'bg-health-healthy/10 text-health-healthy border-health-healthy/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border line-through' },
  delayed: { label: 'Delayed', className: 'bg-health-at-risk/10 text-health-at-risk border-health-at-risk/30' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
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
