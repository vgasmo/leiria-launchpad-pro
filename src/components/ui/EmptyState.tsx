import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  value?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'muted' | 'inline';
  className?: string;
}

/**
 * Unified empty state component for consistent messaging across the app.
 * Shows value proposition + clear action to guide founders.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  value,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      variant === 'inline' ? 'py-8' : 'py-12 md:py-16',
      className
    )}>
      <div className={cn(
        "rounded-full flex items-center justify-center mb-4",
        variant === 'muted' 
          ? "h-12 w-12 bg-muted" 
          : "h-16 w-16 bg-primary/10"
      )}>
        <Icon className={cn(
          variant === 'muted' 
            ? "h-6 w-6 text-muted-foreground" 
            : "h-8 w-8 text-primary"
        )} />
      </div>
      
      <h3 className={cn(
        "font-heading font-semibold text-foreground mb-2",
        variant === 'inline' ? 'text-lg' : 'text-xl'
      )}>
        {title}
      </h3>
      
      <p className="text-muted-foreground max-w-md mb-2 px-4">
        {description}
      </p>
      
      {value && (
        <p className="text-sm text-primary/80 font-medium max-w-sm mb-4 px-4">
          {value}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Card className={cn(
      variant === 'muted' && "bg-muted/50 border-muted"
    )}>
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
}
