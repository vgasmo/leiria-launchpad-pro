import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ActionStatus, MilestoneStatus } from '@/types/database';

interface StatusBadgeProps {
  status: ActionStatus | MilestoneStatus;
  className?: string;
}

const statusStyleConfig: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground border-border',
  not_started: 'bg-muted text-muted-foreground border-border',
  in_progress: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-health-healthy/10 text-health-healthy border-health-healthy/30',
  cancelled: 'bg-muted text-muted-foreground border-border line-through',
  delayed: 'bg-health-at-risk/10 text-health-at-risk border-health-at-risk/30',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  
  const styleClass = statusStyleConfig[status] || statusStyleConfig.pending;
  
  const getLabel = (s: string): string => {
    switch (s) {
      case 'pending':
        return t('status.pending', 'Pending');
      case 'not_started':
        return t('status.notStarted', 'Not Started');
      case 'in_progress':
        return t('status.inProgress', 'In Progress');
      case 'completed':
        return t('status.completed', 'Completed');
      case 'cancelled':
        return t('status.cancelled', 'Cancelled');
      case 'delayed':
        return t('status.delayed', 'Delayed');
      default:
        return t('status.pending', 'Pending');
    }
  };
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      styleClass,
      className
    )}>
      {getLabel(status)}
    </span>
  );
}
