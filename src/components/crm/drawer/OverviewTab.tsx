import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Clock, X, Plus, DollarSign, CalendarDays, TrendingUp, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FunnelItem, FunnelStage, useUpdateFunnelItem } from '@/hooks/useFunnel';
import { LeadScoreCard } from '@/components/crm/LeadScoreCard';
import { getFunnelStageLabel } from '@/lib/stageLabels';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { STAGE_COLORS } from './RecordDrawerHeader';
import { CategoryBadge } from '@/components/ui/CategoryBadge';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OverviewTabProps {
  item: FunnelItem;
  nextActionAt: string | null;
  nextActionDescription: string | null;
  lastActivityAt: string | null;
  onSetNextAction: () => void;
  onClearNextAction: () => void;
  isClearingNextAction: boolean;
}

const DEFAULT_WIN_PROBABILITY: Record<string, number> = {
  new: 5, first_contact_booked: 10, met: 20, qualified: 40,
  proposal_sent: 60, negotiating: 75, contracted: 95,
};

export function OverviewTab({
  item,
  nextActionAt,
  nextActionDescription,
  lastActivityAt,
  onSetNextAction,
  onClearNextAction,
  isClearingNextAction,
}: OverviewTabProps) {
  const { t } = useTranslation();
  const stageColor = STAGE_COLORS[item.stage];
  const stageLabel = getFunnelStageLabel(t, item.stage);
  const updateItem = useUpdateFunnelItem();

  const [editingDeal, setEditingDeal] = useState(false);
  const [dealValue, setDealValue] = useState(item.deal_value?.toString() || '');
  const [dealCurrency, setDealCurrency] = useState(item.deal_currency || 'EUR');
  const [expectedClose, setExpectedClose] = useState(item.expected_close_date || '');
  const [winProb, setWinProb] = useState(
    (item.win_probability ?? DEFAULT_WIN_PROBABILITY[item.stage] ?? 0).toString()
  );

  const handleSaveDeal = () => {
    updateItem.mutate({
      id: item.id,
      deal_value: dealValue ? parseFloat(dealValue) : null,
      deal_currency: dealCurrency,
      expected_close_date: expectedClose || null,
      win_probability: winProb ? parseInt(winProb) : null,
    } as any);
    setEditingDeal(false);
  };

  const weightedValue = (item.deal_value || 0) * ((item.win_probability ?? DEFAULT_WIN_PROBABILITY[item.stage] ?? 0) / 100);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-auto">
      {/* Deal Value Card */}
      <Card className="border-primary/20">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              {t('crm.dealValue', { defaultValue: 'Valor do Deal' })}
            </span>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingDeal(!editingDeal)}>
              {editingDeal ? t('common.cancel') : t('common.edit', { defaultValue: 'Editar' })}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {editingDeal ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('crm.value', { defaultValue: 'Valor' })}</Label>
                  <Input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="0" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('crm.currency', { defaultValue: 'Moeda' })}</Label>
                  <Select value={dealCurrency} onValueChange={setDealCurrency}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR €</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="GBP">GBP £</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('crm.expectedClose', { defaultValue: 'Fecho previsto' })}</Label>
                  <Input type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('crm.winProbability', { defaultValue: 'Probabilidade (%)' })}</Label>
                  <Input type="number" min="0" max="100" value={winProb} onChange={e => setWinProb(e.target.value)} className="h-8" />
                </div>
              </div>
              <Button size="sm" className="w-full h-7 text-xs" onClick={handleSaveDeal} disabled={updateItem.isPending}>
                {t('common.save')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {item.deal_value ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: item.deal_currency || 'EUR' }).format(item.deal_value)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {t('crm.weighted', { defaultValue: 'Ponderado' })}: {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: item.deal_currency || 'EUR' }).format(weightedValue)}
                    </span>
                    <span>{item.win_probability ?? DEFAULT_WIN_PROBABILITY[item.stage] ?? 0}%</span>
                  </div>
                  {item.expected_close_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {t('crm.closeBy', { defaultValue: 'Fecho' })}: {new Date(item.expected_close_date).toLocaleDateString('pt-PT')}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('crm.noDealValue', { defaultValue: 'Sem valor atribuído — clique Editar' })}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Action Card */}
      <Card className={cn(
        nextActionAt && new Date(nextActionAt) < new Date() && 'border-warning/50 bg-warning/5'
      )}>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('crm.nextAction')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {nextActionAt ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className={cn(
                  'h-4 w-4',
                  new Date(nextActionAt) < new Date() ? 'text-warning' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-sm',
                  new Date(nextActionAt) < new Date() && 'text-warning font-medium'
                )}>
                  {formatRelativeTime(nextActionAt)}
                </span>
              </div>
              {nextActionDescription && (
                <p className="text-sm text-muted-foreground">{nextActionDescription}</p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSetNextAction} data-testid="next-action-open">
                  {t('crm.updateNextAction')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onClearNextAction}
                  disabled={isClearingNextAction}
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('crm.clearNextAction')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('crm.noNextActionSet')}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onSetNextAction} data-testid="next-action-open">
                <Plus className="h-3 w-3 mr-1" />
                {t('crm.setNextAction')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Score */}
      <LeadScoreCard
        item={{
          id: item.id,
          stage: item.stage,
          contact_name: item.contact_name,
          contact_email: item.contact_email,
          contact_phone: item.contact_phone,
          organization_name: item.organization_name,
          next_action_at: nextActionAt,
          last_activity_at: lastActivityAt,
          created_at: item.created_at,
          source: item.source,
          notes: item.notes,
        }}
      />

      {/* Startup Category */}
      {item.linked_workspace_id && (
        <StartupCategorySelector workspaceId={item.linked_workspace_id} />
      )}

      {/* Details */}
      <div className="grid gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.stage')}</span>
          <Badge className={cn(stageColor, 'text-white')}>{stageLabel}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.owner')}</span>
          <span>{item.owner?.full_name || t('crm.unassigned')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('crm.created')}</span>
          <span>{formatRelativeTime(item.created_at)}</span>
        </div>
        {item.source && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('crm.source')}</span>
            <span>{item.source}</span>
          </div>
        )}
        {item.contact_phone && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('crm.phone')}</span>
            <span>{item.contact_phone}</span>
          </div>
        )}
      </div>

      {item.notes && (
        <div className="pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{t('crm.notes')}</p>
          <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { value: 'A', label: 'A — Alto Potencial', color: 'text-emerald-600' },
  { value: 'B', label: 'B — Médio Potencial', color: 'text-blue-600' },
  { value: 'C', label: 'C — Baixo Potencial', color: 'text-amber-600' },
] as const;

function StartupCategorySelector({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current category
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    supabase
      .from('workspaces')
      .select('startup_category')
      .eq('id', workspaceId)
      .single()
      .then(({ data }) => {
        setCurrentCategory(data?.startup_category || null);
        setLoading(false);
      });
  }

  const handleChange = async (value: string) => {
    const newValue = value === 'none' ? null : value;
    setCurrentCategory(newValue);
    const { error } = await supabase
      .from('workspaces')
      .update({ startup_category: newValue } as any)
      .eq('id', workspaceId);
    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success(t('crm.categoryUpdated', { defaultValue: 'Categoria atualizada' }));
      queryClient.invalidateQueries({ queryKey: ['ecosystem-items'] });
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('crm.startupCategory', { defaultValue: 'Categoria' })}</span>
          </div>
          <div className="flex items-center gap-2">
            {currentCategory && <CategoryBadge category={currentCategory} />}
            <Select value={currentCategory || 'none'} onValueChange={handleChange}>
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue placeholder={t('crm.selectCategory', { defaultValue: 'Definir categoria' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('crm.noCategory', { defaultValue: 'Sem categoria' })}</SelectItem>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className={c.color}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
