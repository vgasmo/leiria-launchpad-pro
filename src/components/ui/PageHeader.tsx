import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Optional status badge rendered next to the title */
  badge?: ReactNode;
}

/**
 * Consistent page header component with standardized typography and layout.
 * Use this at the top of pages for visual hierarchy and clarity.
 */
export function PageHeader({ 
  title, 
  subtitle, 
  icon,
  actions,
  badge,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8",
      className
    )}>
      <div className="flex items-start gap-3.5">
        {icon && (
          <div className="h-11 w-11 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight leading-tight">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1.5 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
