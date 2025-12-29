import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color = 'currentColor',
  showDot = true 
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  const lastPoint = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const x = width;
    const y = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
    return { x, y };
  }, [data, width, height]);

  const trend = useMemo(() => {
    if (!data || data.length < 2) return 'neutral';
    return data[data.length - 1] > data[0] ? 'up' : data[data.length - 1] < data[0] ? 'down' : 'neutral';
  }, [data]);

  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-muted/30 rounded" />;
  }

  const trendColor = trend === 'up' 
    ? 'hsl(var(--success))' 
    : trend === 'down' 
    ? 'hsl(var(--destructive))' 
    : color;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-300"
      />
      {showDot && lastPoint && (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2}
          fill={trendColor}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}
