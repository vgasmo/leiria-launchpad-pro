import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OccupancyChartProps {
  occupied: number;
  available: number;
  maintenance: number;
  reserved?: number;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  label?: string;
}

const CHART_COLORS = {
  occupied: 'hsl(var(--primary))',
  available: 'hsl(var(--accent))',
  maintenance: 'hsl(var(--secondary))',
  reserved: 'hsl(var(--muted-foreground))',
};

export function SpaceOccupancyChart({
  occupied,
  available,
  maintenance,
  reserved = 0,
  size = 'md',
  showLegend = true,
  label,
}: OccupancyChartProps) {
  const { t } = useTranslation();
  const total = occupied + available + maintenance + reserved;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const data = useMemo(() => [
    { name: t('admin.backoffice.occupied', 'Occupied'), value: occupied, color: CHART_COLORS.occupied },
    { name: t('admin.backoffice.available', 'Available'), value: available, color: CHART_COLORS.available },
    { name: t('admin.backoffice.maintenance', 'Maintenance'), value: maintenance, color: CHART_COLORS.maintenance },
    ...(reserved > 0 ? [{ name: t('admin.backoffice.roomStatus.reserved', 'Reserved'), value: reserved, color: CHART_COLORS.reserved }] : []),
  ].filter(d => d.value > 0), [occupied, available, maintenance, reserved, t]);

  const dims = size === 'sm' ? 100 : size === 'md' ? 140 : 180;
  const innerR = size === 'sm' ? 28 : size === 'md' ? 40 : 52;
  const outerR = size === 'sm' ? 42 : size === 'md' ? 60 : 78;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ width: dims, height: dims }}>
        {t('admin.backoffice.noRooms', 'No rooms')}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dims, height: dims }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const item = payload[0];
                return (
                  <div className="bg-popover text-popover-foreground border rounded-lg px-3 py-1.5 shadow-md text-xs">
                    <span className="font-medium">{item.name}</span>: {item.value}
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={cn(
            'font-bold text-foreground',
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
          )}>
            {occupancyRate}%
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('admin.backoffice.occupancy', 'occupancy')}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
      {showLegend && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[10px] text-muted-foreground">{entry.name} ({entry.value})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
