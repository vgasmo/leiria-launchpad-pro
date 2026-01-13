import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { EmptyStateIllustration } from '@/components/ui/EmptyStateIllustration';

type IllustrationType = 'no-data' | 'no-results' | 'success' | 'error' | 'empty-inbox' | 'welcome' | 'rocket' | 'chart' | 'documents' | 'team';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
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
 * Unified empty state component - compact, clear, single CTA focus.
 * P2: Now supports SVG illustrations for richer visual feedback.
 */
export function EmptyState({
  icon: Icon,
  illustration,
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
      variant === 'inline' ? 'py-6' : 'py-10',
      className
    )}>
      {illustration ? (
        <EmptyStateIllustration 
          type={illustration} 
          size={variant === 'inline' ? 'sm' : 'md'}
          className="mb-3"
        />
      ) : Icon ? (
        <div className={cn(
          "rounded-full flex items-center justify-center mb-3",
          variant === 'muted' 
            ? "h-10 w-10 bg-muted" 
            : "h-12 w-12 bg-muted/60"
        )}>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      ) : null}
      
      <h3 className="font-medium text-foreground text-sm mb-1">
        {title}
      </h3>
      
      <p className="text-xs text-muted-foreground max-w-xs px-4 leading-relaxed">
        {description}
      </p>
      
      {value && (
        <p className="text-xs text-primary/80 font-medium max-w-xs mt-1 px-4">
          {value}
        </p>
      )}
      
      {action && (
        <Button 
          size="sm" 
          onClick={action.onClick} 
          className="mt-4 h-8 text-xs gap-1.5"
        >
          {action.icon && <action.icon className="h-3.5 w-3.5" />}
          {action.label}
        </Button>
      )}
      
      {secondaryAction && (
        <Button 
          variant="link" 
          size="sm" 
          onClick={secondaryAction.onClick}
          className="mt-1 h-6 text-xs text-muted-foreground"
        >
          {secondaryAction.label}
        </Button>
      )}
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Card className={cn(
      "border-dashed",
      variant === 'muted' && "bg-muted/30 border-muted"
    )}>
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
}
