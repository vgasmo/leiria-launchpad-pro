import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

const sizeConfig = {
  sm: { size: 32, stroke: 3, fontSize: 'text-[10px]' },
  md: { size: 48, stroke: 4, fontSize: 'text-xs' },
  lg: { size: 64, stroke: 5, fontSize: 'text-sm' },
};

const colorConfig = {
  primary: 'stroke-primary',
  success: 'stroke-success',
  warning: 'stroke-warning',
  destructive: 'stroke-destructive',
};

/**
 * Circular progress indicator with smooth animation.
 * P1: Premium visual feedback for progress tracking.
 */
export function ProgressRing({
  progress,
  size = 'md',
  showLabel = true,
  className,
  strokeWidth,
  color = 'primary',
}: ProgressRingProps) {
  const config = sizeConfig[size];
  const actualSize = config.size;
  const actualStroke = strokeWidth ?? config.stroke;
  const radius = (actualSize - actualStroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={actualSize}
        height={actualSize}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={actualSize / 2}
          cy={actualSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={actualStroke}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={actualSize / 2}
          cy={actualSize / 2}
          r={radius}
          fill="none"
          strokeWidth={actualStroke}
          strokeLinecap="round"
          className={cn(colorConfig[color], 'transition-all duration-500 ease-out')}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {showLabel && (
        <span className={cn(
          'absolute inset-0 flex items-center justify-center font-medium',
          config.fontSize
        )}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}

/**
 * Mini progress indicator for inline use
 */
export function MiniProgress({ 
  progress, 
  className 
}: { 
  progress: number; 
  className?: string;
}) {
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}
