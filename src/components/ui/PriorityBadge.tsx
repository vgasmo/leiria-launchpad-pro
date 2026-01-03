import { cn } from '@/lib/utils';
import { Star, ArrowUp, Minus, Archive } from 'lucide-react';

export type WorkspacePriority = 'star' | 'high' | 'standard' | 'maintenance';

interface PriorityBadgeProps {
  priority: WorkspacePriority | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const priorityConfig: Record<WorkspacePriority, { 
  label: string; 
  icon: React.ReactNode;
  className: string;
}> = {
  star: { 
    label: 'Star', 
    icon: <Star className="h-3 w-3 fill-current" />,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' 
  },
  high: { 
    label: 'High', 
    icon: <ArrowUp className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' 
  },
  standard: { 
    label: 'Standard', 
    icon: <Minus className="h-3 w-3" />,
    className: 'bg-muted text-muted-foreground border-border' 
  },
  maintenance: { 
    label: 'Maintenance', 
    icon: <Archive className="h-3 w-3" />,
    className: 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600' 
  },
};

export function PriorityBadge({ priority, size = 'md', showLabel = true, className }: PriorityBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-2.5 py-1.5 gap-2 font-medium',
  };

  const normalizedPriority = priority || 'standard';
  const config = priorityConfig[normalizedPriority];
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border font-medium",
      sizeClasses[size],
      config.className,
      className
    )}>
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export function getPriorityLabel(priority: WorkspacePriority | null | undefined): string {
  return priorityConfig[priority || 'standard'].label;
}

export function getPriorityOrder(priority: WorkspacePriority | null | undefined): number {
  const order: Record<WorkspacePriority, number> = {
    star: 0,
    high: 1,
    standard: 2,
    maintenance: 3,
  };
  return order[priority || 'standard'];
}
