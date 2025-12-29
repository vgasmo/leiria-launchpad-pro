import { useState, useMemo } from 'react';
import { format, startOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, CheckCircle, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  useWorkspaceKpiDefinitions, 
  useKpiValues, 
  useUserWorkspaceRole,
  useUpsertKpiValue,
  useMarkCheckinComplete,
  type WorkspaceKpi,
  type KpiValue,
} from '@/hooks/useKpis';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface KpisTabProps {
  workspaceId: string;
  canWrite: boolean;
}

export function KpisTab({ workspaceId }: KpisTabProps) {
  const { isAdmin } = useAuth();
  const { data: workspaceKpis, isLoading: loadingKpis } = useWorkspaceKpiDefinitions(workspaceId);
  const { data: kpiValues, isLoading: loadingValues } = useKpiValues(workspaceId, 12);
  const { data: userRole } = useUserWorkspaceRole(workspaceId);
  const upsertKpi = useUpsertKpiValue(workspaceId);
  const markCheckin = useMarkCheckinComplete(workspaceId);

  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [editedValues, setEditedValues] = useState<Record<string, { value: string; notes: string }>>({});
  const [savingKpis, setSavingKpis] = useState<Set<string>>(new Set());

  // Check if user can edit KPIs (founder or admin)
  const canEditKpis = isAdmin || userRole === 'founder';

  const selectedMonthStr = format(selectedMonth, 'yyyy-MM-dd');

  // Get values for selected month
  const monthValues = useMemo(() => {
    if (!kpiValues) return {};
    return kpiValues
      .filter(v => v.period_month === selectedMonthStr)
      .reduce((acc, v) => {
        acc[v.kpi_definition_id] = v;
        return acc;
      }, {} as Record<string, KpiValue>);
  }, [kpiValues, selectedMonthStr]);

  // Get chart data for each KPI (last 12 months)
  const chartDataByKpi = useMemo(() => {
    if (!kpiValues || !workspaceKpis) return {};
    
    const result: Record<string, { month: string; value: number | null; label: string }[]> = {};
    
    workspaceKpis.forEach(wk => {
      const kpiId = wk.kpi_definition_id;
      const values = kpiValues.filter(v => v.kpi_definition_id === kpiId);
      
      // Generate last 12 months
      const months: { month: string; value: number | null; label: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = startOfMonth(subMonths(new Date(), i));
        const monthStr = format(monthDate, 'yyyy-MM-dd');
        const val = values.find(v => v.period_month === monthStr);
        months.push({
          month: monthStr,
          value: val?.value ?? null,
          label: format(monthDate, 'MMM'),
        });
      }
      result[kpiId] = months;
    });
    
    return result;
  }, [kpiValues, workspaceKpis]);

  const handlePrevMonth = () => setSelectedMonth(m => subMonths(m, 1));
  const handleNextMonth = () => {
    const next = addMonths(selectedMonth, 1);
    if (next <= startOfMonth(new Date())) {
      setSelectedMonth(next);
    }
  };

  const handleValueChange = (kpiId: string, field: 'value' | 'notes', val: string) => {
    setEditedValues(prev => ({
      ...prev,
      [kpiId]: {
        ...prev[kpiId],
        value: prev[kpiId]?.value ?? (monthValues[kpiId]?.value?.toString() || ''),
        notes: prev[kpiId]?.notes ?? (monthValues[kpiId]?.notes || ''),
        [field]: val,
      },
    }));
  };

  const handleSaveKpi = async (wk: WorkspaceKpi) => {
    const kpiId = wk.kpi_definition_id;
    const edited = editedValues[kpiId];
    const existing = monthValues[kpiId];
    
    const valueStr = edited?.value ?? existing?.value?.toString() ?? '';
    const notes = edited?.notes ?? existing?.notes ?? '';
    const value = valueStr === '' ? null : parseFloat(valueStr);

    if (valueStr !== '' && isNaN(value as number)) {
      toast.error('Please enter a valid number');
      return;
    }

    setSavingKpis(prev => new Set(prev).add(kpiId));
    
    try {
      await upsertKpi.mutateAsync({
        kpi_definition_id: kpiId,
        period_month: selectedMonthStr,
        value,
        target_value: wk.target_value,
        notes: notes || null,
        existingId: existing?.id,
      });
      
      // Clear edited state for this KPI
      setEditedValues(prev => {
        const newState = { ...prev };
        delete newState[kpiId];
        return newState;
      });
      
      toast.success('KPI saved');
    } catch {
      toast.error('Failed to save KPI');
    } finally {
      setSavingKpis(prev => {
        const newSet = new Set(prev);
        newSet.delete(kpiId);
        return newSet;
      });
    }
  };

  const handleMarkCheckin = async () => {
    try {
      await markCheckin.mutateAsync();
      toast.success('Check-in marked as complete');
    } catch {
      toast.error('Failed to mark check-in');
    }
  };

  const isLoading = loadingKpis || loadingValues;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!workspaceKpis?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No KPIs configured for this workspace. Ask an admin to set up KPIs for tracking.
        </CardContent>
      </Card>
    );
  }

  const isCurrentMonth = format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center">
            <span className="font-medium">{format(selectedMonth, 'MMMM yyyy')}</span>
            {isCurrentMonth && (
              <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
            )}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {canEditKpis && (
          <Button 
            variant="outline" 
            onClick={handleMarkCheckin}
            disabled={markCheckin.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Check-in Complete
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {workspaceKpis.map(wk => (
          <KpiCard
            key={wk.id}
            workspaceKpi={wk}
            currentValue={monthValues[wk.kpi_definition_id]}
            editedValue={editedValues[wk.kpi_definition_id]}
            chartData={chartDataByKpi[wk.kpi_definition_id] || []}
            canEdit={canEditKpis}
            isSaving={savingKpis.has(wk.kpi_definition_id)}
            onValueChange={(field, val) => handleValueChange(wk.kpi_definition_id, field, val)}
            onSave={() => handleSaveKpi(wk)}
          />
        ))}
      </div>
    </div>
  );
}

interface KpiCardProps {
  workspaceKpi: WorkspaceKpi;
  currentValue: KpiValue | undefined;
  editedValue: { value: string; notes: string } | undefined;
  chartData: { month: string; value: number | null; label: string }[];
  canEdit: boolean;
  isSaving: boolean;
  onValueChange: (field: 'value' | 'notes', val: string) => void;
  onSave: () => void;
}

function KpiCard({
  workspaceKpi,
  currentValue,
  editedValue,
  chartData,
  canEdit,
  isSaving,
  onValueChange,
  onSave,
}: KpiCardProps) {
  const def = workspaceKpi.definition;
  if (!def) return null;

  const displayValue = editedValue?.value ?? currentValue?.value?.toString() ?? '';
  const displayNotes = editedValue?.notes ?? currentValue?.notes ?? '';
  
  // Check if there are unsaved changes
  const hasChanges = editedValue !== undefined;

  // Calculate trend from chart data
  const recentValues = chartData.filter(d => d.value !== null).slice(-2);
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (recentValues.length >= 2) {
    const [prev, curr] = recentValues;
    if (curr.value! > prev.value!) trend = 'up';
    else if (curr.value! < prev.value!) trend = 'down';
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = def.direction === 'up' 
    ? (trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground')
    : (trend === 'down' ? 'text-green-600' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground');

  // Filter chart data to only include non-null values for the line
  const chartDataFiltered = chartData.map(d => ({
    ...d,
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {def.name}
              {workspaceKpi.required && (
                <Badge variant="outline" className="text-xs">Required</Badge>
              )}
            </CardTitle>
            {def.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
            )}
          </div>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current value display/input */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            {canEdit ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Value</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={displayValue}
                    onChange={e => onValueChange('value', e.target.value)}
                    placeholder="Enter value"
                    className="h-9"
                  />
                  {def.unit && (
                    <span className="text-sm text-muted-foreground shrink-0">{def.unit}</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-2xl font-bold">
                  {currentValue?.value !== null && currentValue?.value !== undefined 
                    ? currentValue.value.toLocaleString() 
                    : '—'}
                </span>
                {def.unit && (
                  <span className="text-sm text-muted-foreground ml-1">{def.unit}</span>
                )}
              </div>
            )}
          </div>

          {workspaceKpi.target_value !== null && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Target</div>
              <div className="text-sm font-medium">
                {workspaceKpi.target_value.toLocaleString()}
                {def.unit && <span className="text-muted-foreground ml-0.5">{def.unit}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {canEdit ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              value={displayNotes}
              onChange={e => onValueChange('notes', e.target.value)}
              placeholder="Add context..."
              rows={2}
              className="text-sm"
            />
          </div>
        ) : currentValue?.notes ? (
          <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
            {currentValue.notes}
          </div>
        ) : null}

        {/* Save button */}
        {canEdit && hasChanges && (
          <Button size="sm" onClick={onSave} disabled={isSaving} className="w-full">
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        )}

        {/* Chart */}
        <div className="h-24 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDataFiltered}>
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  fontSize: 12,
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                }}
                formatter={(value: number) => [
                  value !== null ? `${value.toLocaleString()}${def.unit ? ` ${def.unit}` : ''}` : 'No data',
                  def.name
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
