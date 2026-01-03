import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth } from 'date-fns';
import { TrendingUp, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceKpiDefinitions, useKpiValues, useUpsertKpiValue } from '@/hooks/useKpis';
import { toast } from 'sonner';

interface QuickKpiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  programId: string;
}

export function QuickKpiModal({ open, onOpenChange, workspaceId, programId }: QuickKpiModalProps) {
  const { t } = useTranslation();
  const { data: workspaceKpis } = useWorkspaceKpiDefinitions(workspaceId);
  const { data: kpiValues } = useKpiValues(workspaceId);
  const upsertKpi = useUpsertKpiValue(workspaceId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  
  // Get top 3 core/important KPIs that don't have values this month
  const kpisToShow = useMemo(() => {
    if (!workspaceKpis) return [];
    
    const currentMonthValues = kpiValues?.filter(v => v.period_month === currentMonth) || [];
    const filledKpiIds = new Set(currentMonthValues.map(v => v.kpi_definition_id));
    
    return workspaceKpis
      .filter(wk => wk.definition && !filledKpiIds.has(wk.kpi_definition_id))
      .slice(0, 3)
      .map(wk => wk.definition!);
  }, [workspaceKpis, kpiValues, currentMonth]);

  const handleSubmit = async () => {
    const entriesToSubmit = Object.entries(values).filter(([, v]) => v.trim() !== '');
    
    if (entriesToSubmit.length === 0) {
      toast.error(t('quickKpi.enterAtLeastOne'));
      return;
    }

    setSubmitting(true);
    try {
      for (const [kpiDefId, value] of entriesToSubmit) {
        await upsertKpi.mutateAsync({
          kpi_definition_id: kpiDefId,
          period_month: currentMonth,
          value: parseFloat(value),
        });
      }
      toast.success(t('quickKpi.saved'));
      setValues({});
      onOpenChange(false);
    } catch (error) {
      toast.error(t('quickKpi.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('quickKpi.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {t('quickKpi.description', { month: format(new Date(), 'MMMM yyyy') })}
          </p>
          
          {kpisToShow.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('quickKpi.allFilled')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kpisToShow.map(kpi => (
                <div key={kpi.id} className="space-y-1.5">
                  <Label htmlFor={kpi.id} className="text-sm flex items-center justify-between">
                    <span>{kpi.name}</span>
                    {kpi.unit && <span className="text-muted-foreground text-xs">{kpi.unit}</span>}
                  </Label>
                  <Input
                    id={kpi.id}
                    type="number"
                    placeholder={`Enter ${kpi.name.toLowerCase()}`}
                    value={values[kpi.id] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [kpi.id]: e.target.value }))}
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || kpisToShow.length === 0}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {t('quickKpi.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
