import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

/**
 * Premium loading state component with multiple variants.
 * P1: Human-centered loading feedback with Portuguese-first copy.
 */
export function LoadingState({ 
  variant = 'spinner', 
  size = 'md',
  message,
  className 
}: LoadingStateProps) {
  const { t } = useTranslation();
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  const containerSizes = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  };

  const defaultMessage = t('common.loading');

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      containerSizes[size],
      className
    )}>
      {variant === 'spinner' && (
        <div className="relative">
          <Loader2 className={cn(
            sizeClasses[size],
            'animate-spin text-primary'
          )} />
          <div className={cn(
            'absolute inset-0 animate-ping opacity-20',
            sizeClasses[size],
            'rounded-full bg-primary'
          )} />
        </div>
      )}
      
      {variant === 'dots' && (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-full bg-primary',
                size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-3 w-3',
                'animate-bounce'
              )}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
      
      {variant === 'pulse' && (
        <div className={cn(
          'rounded-full bg-primary/20 animate-pulse',
          size === 'sm' ? 'h-8 w-8' : size === 'md' ? 'h-12 w-12' : 'h-16 w-16'
        )}>
          <div className={cn(
            'h-full w-full rounded-full bg-primary/40 animate-ping',
          )} />
        </div>
      )}
      
      {variant === 'skeleton' && (
        <div className="space-y-2 w-full max-w-xs">
          <div className="h-3 w-full rounded bg-muted animate-shimmer" />
          <div className="h-3 w-3/4 rounded bg-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
          <div className="h-3 w-1/2 rounded bg-muted animate-shimmer" style={{ animationDelay: '200ms' }} />
        </div>
      )}
      
      {message !== null && (
        <p className={cn(
          'text-muted-foreground animate-fade-in',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {message ?? defaultMessage}
        </p>
      )}
    </div>
  );
}

/**
 * Full-page loading overlay for route transitions
 */
export function LoadingOverlay({ message }: { message?: string }) {
  const { t } = useTranslation();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">
          {message ?? t('common.loading')}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline loading indicator for buttons or small areas
 */
export function InlineLoading({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
  );
}
