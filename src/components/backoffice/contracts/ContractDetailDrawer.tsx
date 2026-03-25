import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Building2, FileText, Euro, Clock, Save, X } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { useUpdateContract, type StartupContract } from '@/hooks/useBackoffice';
import { ContractDiscountsPanel } from '@/components/contracts/ContractDiscountsPanel';
import { ContractIntelligenceCard } from '@/components/contracts/ContractIntelligenceCard';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  pending_signature: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-muted text-muted-foreground',
};

interface ContractDetailDrawerProps {
  contract: StartupContract | null;
  incubationTypes?: any[];
  buildings?: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDetailDrawer({ contract, incubationTypes, buildings, open, onOpenChange }: ContractDetailDrawerProps) {
  const { t } = useTranslation();
  const updateContract = useUpdateContract();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  if (!contract) return null;

  const startup = (contract.workspace as any)?.startup;
  const incubationType = contract.incubation_type as any;
  const building = contract.building as any;
  const startDate = new Date(contract.start_date);
  const months = differenceInMonths(new Date(), startDate);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const startEditing = () => {
    setEditValues({
      contract_number: contract.contract_number || '',
      status: contract.status,
      monthly_fee: contract.monthly_fee,
      start_date: contract.start_date,
      end_date: contract.end_date || '',
      notes: contract.notes || '',
      incubation_type_id: (incubationType as any)?.id || '',
      building_id: (building as any)?.id || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateContract.mutateAsync({
        id: contract.id,
        ...editValues,
        end_date: editValues.end_date || null,
        incubation_type_id: editValues.incubation_type_id || null,
        building_id: editValues.building_id || null,
        notes: editValues.notes || null,
      });
      setIsEditing(false);
      toast.success(t('contracts.updated', { defaultValue: 'Contract updated' }));
    } catch {
      toast.error(t('contracts.updateFailed', { defaultValue: 'Failed to update contract' }));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {startup?.name || t('common.unnamed', { defaultValue: 'Unnamed' })}
          </SheetTitle>
          <SheetDescription>
            {contract.contract_number || t('contracts.noNumber', { defaultValue: 'No contract number' })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pb-8">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Select value={editValues.status} onValueChange={(v) => setEditValues(p => ({ ...p, status: v }))}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>
                      {t(`admin.backoffice.contractStatus.${s}`, { defaultValue: s })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn('text-sm px-3 py-1', STATUS_COLORS[contract.status])}>
                {t(`admin.backoffice.contractStatus.${contract.status}`, { defaultValue: contract.status })}
              </Badge>
            )}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-1" /> {t('common.cancel', { defaultValue: 'Cancel' })}
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateContract.isPending}>
                    <Save className="h-4 w-4 mr-1" /> {t('common.save', { defaultValue: 'Save' })}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={startEditing}>
                  {t('common.edit', { defaultValue: 'Edit' })}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Contract Number */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('admin.backoffice.contractNumber', { defaultValue: 'Contract Number' })}</Label>
              {isEditing ? (
                <Input value={editValues.contract_number} onChange={e => setEditValues(p => ({ ...p, contract_number: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium">{contract.contract_number || '—'}</p>
              )}
            </div>

            {/* Monthly Fee */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {t('admin.backoffice.monthlyFee', { defaultValue: 'Monthly Fee' })}
              </Label>
              {isEditing ? (
                <Input type="number" step="0.01" value={editValues.monthly_fee} onChange={e => setEditValues(p => ({ ...p, monthly_fee: parseFloat(e.target.value) || 0 }))} />
              ) : (
                <p className="text-sm font-medium">€{contract.monthly_fee.toFixed(2)}</p>
              )}
            </div>

            {/* Incubation Type */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('admin.backoffice.type', { defaultValue: 'Incubation Type' })}</Label>
              {isEditing ? (
                <Select value={editValues.incubation_type_id} onValueChange={v => setEditValues(p => ({ ...p, incubation_type_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {incubationTypes?.map(it => (
                      <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{incubationType?.name || '—'}</p>
              )}
            </div>

            {/* Building */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {t('admin.backoffice.building', { defaultValue: 'Building' })}
              </Label>
              {isEditing ? (
                <Select value={editValues.building_id} onValueChange={v => setEditValues(p => ({ ...p, building_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">—</SelectItem>
                    {buildings?.filter(b => b.is_active).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{building?.name || '—'}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('contracts.startDate', { defaultValue: 'Start Date' })}
              </Label>
              {isEditing ? (
                <Input type="date" value={editValues.start_date} onChange={e => setEditValues(p => ({ ...p, start_date: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium">{format(startDate, 'dd MMM yyyy')}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('contracts.endDate', { defaultValue: 'End Date' })}
              </Label>
              {isEditing ? (
                <Input type="date" value={editValues.end_date} onChange={e => setEditValues(p => ({ ...p, end_date: e.target.value }))} />
              ) : (
                <p className="text-sm font-medium">{contract.end_date ? format(new Date(contract.end_date), 'dd MMM yyyy') : '—'}</p>
              )}
            </div>
          </div>

          {/* Incubation Time */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">{t('admin.backoffice.timeIncubated', { defaultValue: 'Time Incubated' })}</Label>
            </div>
            <p className={cn(
              'text-xl font-bold',
              years >= 3 && 'text-destructive',
              years === 2 && 'text-amber-600',
            )}>
              {years > 0 ? `${years} ${t('common.years', { defaultValue: 'years' })} ${remainingMonths} ${t('common.months', { defaultValue: 'months' })}` : `${months} ${t('common.months', { defaultValue: 'months' })}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.backoffice.startedOn', { defaultValue: 'Started on' })}: {format(startDate, 'dd MMM yyyy')}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('common.notes', { defaultValue: 'Notes' })}</Label>
            {isEditing ? (
              <Textarea value={editValues.notes} onChange={e => setEditValues(p => ({ ...p, notes: e.target.value }))} rows={3} />
            ) : (
              <p className="text-sm text-muted-foreground">{contract.notes || t('contracts.noNotes', { defaultValue: 'No notes' })}</p>
            )}
          </div>

          <Separator />

          {/* Discounts Panel */}
          <ContractDiscountsPanel
            contractId={contract.id}
            baseFee={contract.monthly_fee}
          />

          <Separator />

          {/* AI Analysis */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">{t('contracts.aiAnalysis', { defaultValue: 'AI Analysis' })}</Label>
            <ContractIntelligenceCard
              contractId={contract.id}
              contractLabel={startup?.name || 'Contract'}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
