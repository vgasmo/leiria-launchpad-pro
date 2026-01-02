import { useMemo } from 'react';
import { useHealthHistory } from '@/hooks/useHealthHistory';
import { cn } from '@/lib/utils';

interface HealthSparklineProps {
  workspaceId: string;
  days?: number;
  width?: number;
  height?: number;
  className?: string;
  showDots?: boolean;
}

export function HealthSparkline({ 
  workspaceId, 
  days = 30, 
  width = 80, 
  height = 24,
  className,
  showDots = false,
}: HealthSparklineProps) {
  const { data: history, isLoading } = useHealthHistory(workspaceId, days);

  const pathData = useMemo(() => {
    if (!history || history.length < 2) return null;

    const scores = history.map(h => h.score_numeric);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    const points = scores.map((score, i) => {
      const x = (i / (scores.length - 1)) * width;
      const y = height - ((score - min) / range) * height;
      return { x, y, score };
    });

    const path = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    return { path, points, scores };
  }, [history, width, height]);

  if (isLoading || !pathData) {
    return (
      <div 
        className={cn("bg-muted/50 rounded animate-pulse", className)} 
        style={{ width, height }} 
      />
    );
  }

  const { path, points, scores } = pathData;
  const trend = scores[scores.length - 1] - scores[0];
  const strokeColor = trend >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={2}
          fill={strokeColor}
          className="opacity-50"
        />
      ))}
      {/* Current point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={strokeColor}
      />
    </svg>
  );
}
