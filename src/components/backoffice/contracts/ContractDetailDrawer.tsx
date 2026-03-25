import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, Building2, FileText, Euro, Clock, Save, X, Pencil, Info, 
  TrendingUp, AlertTriangle, ExternalLink, Receipt, LinkIcon, Calculator,
  FileDown, Loader2, Shield, RefreshCw, CheckCircle2, XCircle, Send
} from 'lucide-react';
import { format, differenceInMonths, differenceInDays, addYears } from 'date-fns';
import { useUpdateContract, type StartupContract } from '@/hooks/useBackoffice';
import { useCurrentPricingTable, findMatchingPricingLine, getIncubationYear } from '@/hooks/backoffice/usePricingLines';
import { ContractDiscountsPanel } from '@/components/contracts/ContractDiscountsPanel';
import { ContractIntelligenceCard } from '@/components/contracts/ContractIntelligenceCard';
import { PricingBreakdown } from '@/components/contracts/PricingBreakdown';
import { calculateContractPricing, type PricingInput } from '@/lib/pricingEngine';
import { supabase } from '@/lib/supabaseClient';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired'];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
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
  const navigate = useNavigate();
  const contractId = contract?.id ?? '';
  const updateContract = useUpdateContract();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('details');
  const { data: pricingTable } = useCurrentPricingTable();

  // Fetch discounts for pricing engine
  const { data: discounts } = useQuery({
    queryKey: ['contract-discounts', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const { data, error } = await supabase
        .from('contract_discounts')
        .select('*')
        .eq('contract_id', contract.id)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!contract?.id,
  });

  // Fetch linked invoices count
  const { data: invoiceCount } = useQuery({
    queryKey: ['contract-invoice-count', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return 0;
      const { count, error } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contract.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!contract?.id,
  });

  // Fetch linked funnel item
  const { data: linkedFunnelItem } = useQuery({
    queryKey: ['contract-funnel-link', contract?.id],
    queryFn: async () => {
      if (!contract?.funnel_item_id) return null;
      const { data, error } = await supabase
        .from('funnel_items')
        .select('id, organization_name, contact_name, stage')
        .eq('id', contract.funnel_item_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!contract?.funnel_item_id,
  });

  const startup = contract ? (contract.workspace as any)?.startup : null;
  const incubationType = contract ? contract.incubation_type as any : null;
  const building = contract ? contract.building as any : null;
  const startDate = contract ? new Date(contract.start_date) : new Date();
  const now = new Date();
  const months = contract ? differenceInMonths(now, startDate) : 0;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  const nextAnniversary = addYears(startDate, years + 1);
  const daysUntilAnniversary = differenceInDays(nextAnniversary, now);
  const endDate = contract?.end_date ? new Date(contract.end_date) : null;
  const daysUntilEnd = endDate ? differenceInDays(endDate, now) : null;

  // Calculate pricing using the canonical engine with pricing lines
  const pricing = useMemo(() => {
    if (!incubationType || !contract) return null;

    // Find matching pricing line from the official table
    const matchedLine = pricingTable?.lines
      ? findMatchingPricingLine(pricingTable.lines, incubationType.id, contract.square_meters)
      : null;

    const incubationYear = getIncubationYear(contract.start_date);

    const input: PricingInput = {
      incubationType: {
        id: incubationType.id,
        name: incubationType.name,
        base_monthly_fee: incubationType.base_monthly_fee || 0,
        base_currency: incubationType.base_currency || 'EUR',
        price_per_sqm: incubationType.price_per_sqm,
        requires_space: incubationType.requires_space || false,
        is_virtual: incubationType.is_virtual || false,
        equity_percentage: incubationType.equity_percentage,
        contract_type: incubationType.contract_type,
      },
      building: building ? { id: building.id, name: building.name, code: building.code } : null,
      squareMeters: contract.square_meters,
      discounts: discounts || [],
      contractStartDate: contract.start_date,
      pricingLine: matchedLine ? {
        id: matchedLine.id,
        designation: matchedLine.designation,
        startup_monthly_fee: matchedLine.startup_monthly_fee,
        non_startup_monthly_fee: matchedLine.non_startup_monthly_fee,
        startup_annual_increase_pct: matchedLine.startup_annual_increase_pct,
        non_startup_annual_increase_pct: matchedLine.non_startup_annual_increase_pct,
        area_sqm: matchedLine.area_sqm,
        is_per_sqm: matchedLine.is_per_sqm,
        is_post_incubation: matchedLine.is_post_incubation,
        max_duration_months: matchedLine.max_duration_months,
        billing_frequency: matchedLine.billing_frequency,
        location_type: matchedLine.location_type,
      } : undefined,
      incubationYear,
      pricingVersionCode: pricingTable?.version?.version_code || 'V11-MAR-2026',
      startupCategory: 'startup',
    };
    return calculateContractPricing(input);
  }, [incubationType, building, contract, discounts, pricingTable]);

  // Generate PDF mutation
  const generatePdf = useMutation({
    mutationFn: async () => {
      const result = await invokeWithAuth<{ documentBase64?: string; fileName?: string }>('generate-contract-pdf', { body: { contractId: contract?.id } });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data) => {
      toast.success(t('contractDetail.pdfGenerated', { defaultValue: 'PDF do contrato gerado com sucesso' }));
      // Auto-download
      if (data?.documentBase64) {
        const byteChars = atob(data.documentBase64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.fileName || 'contrato.pdf';
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (err) => {
      console.error('PDF generation error:', err);
      toast.error(t('contractDetail.pdfGenerationFailed', { defaultValue: 'Erro ao gerar PDF' }));
    },
  });

  if (!contract) return null;

  const startEditing = () => {
    setEditValues({
      contract_number: contract.contract_number || '',
      status: contract.status,
      monthly_fee: contract.monthly_fee,
      start_date: contract.start_date,
      end_date: contract.end_date || '',
      notes: contract.notes || '',
      incubation_type_id: incubationType?.id || '',
      building_id: building?.id || '',
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
      toast.success(t('contracts.updated'));
    } catch {
      toast.error(t('contracts.updateFailed'));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setIsEditing(false); setActiveTab('details'); } }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader className="pb-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="truncate">{startup?.name || t('common.unnamed')}</span>
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {contract.contract_number || t('contracts.noNumber')}
                  <span className="text-muted-foreground/50">·</span>
                  <Badge className={cn('text-[10px] h-5', STATUS_COLORS[contract.status])}>
                    {t(`admin.backoffice.contractStatus.${contract.status}`, { defaultValue: contract.status })}
                  </Badge>
                </SheetDescription>
              </div>
              <div className="flex gap-1.5 shrink-0 ml-3">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 px-2">
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateContract.isPending} className="h-8 gap-1.5">
                      <Save className="h-3.5 w-3.5" />
                      {t('common.save')}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={startEditing} className="h-8 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Incubation Timeline Bar */}
          <div className={cn(
            'mt-3 flex items-center gap-3 rounded-lg px-3 py-2',
            years >= 3 ? 'bg-destructive/10 text-destructive' :
            years >= 2 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
            'bg-primary/5 text-foreground'
          )}>
            <Clock className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold">
                {years > 0
                  ? `${years} ${t('common.years')} ${remainingMonths > 0 ? `${remainingMonths} ${t('common.months')}` : ''}`
                  : `${months} ${t('common.months')}`
                }
              </span>
              <span className="text-xs ml-2 opacity-70">
                {t('admin.backoffice.startedOn')}: {format(startDate, 'dd MMM yyyy')}
              </span>
            </div>
            {years >= 3 && <AlertTriangle className="h-4 w-4 shrink-0" />}
          </div>

          {/* Quick alerts */}
          {(daysUntilEnd !== null && daysUntilEnd <= 90 && daysUntilEnd > 0) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('lifecycle.renewalWarningDesc', { days: daysUntilEnd })}
            </div>
          )}
          {(daysUntilAnniversary > 0 && daysUntilAnniversary <= 30) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded-lg px-3 py-1.5">
              <Info className="h-3.5 w-3.5" />
              {t('lifecycle.anniversary', { year: years + 1 })} — {daysUntilAnniversary} {t('lifecycle.daysRemaining', { count: daysUntilAnniversary })}
            </div>
          )}

          {/* Quick Cross-Links Bar */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {contract.workspace_id && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => navigate(`/workspace/${contract.workspace_id}`)}
              >
                <ExternalLink className="h-3 w-3" />
                {t('contractDetail.viewWorkspace')}
              </Button>
            )}
            {linkedFunnelItem && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => navigate('/admin?tab=funnel')}
              >
                <LinkIcon className="h-3 w-3" />
                {t('contractDetail.viewInCRM')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => navigate('/admin?tab=backoffice')}
            >
              <Receipt className="h-3 w-3" />
              {t('contractDetail.viewInvoices')} {invoiceCount ? `(${invoiceCount})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => generatePdf.mutate()}
              disabled={generatePdf.isPending}
            >
              {generatePdf.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileDown className="h-3 w-3" />}
              {t('contractDetail.generatePDF', { defaultValue: 'Gerar PDF' })}
            </Button>
            {/* Generate public signing link for founder */}
            {['draft', 'pending_signature'].includes(contract.status) && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('public-contract-onboarding', {
                      body: { action: 'generate_token', contractId: contract.id },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    const url = data.url || `${window.location.origin}/contract-signing/${data.token}`;
                    await navigator.clipboard.writeText(url);
                    toast.success(t('contractDetail.linkGenerated', { defaultValue: 'Link público gerado e copiado! Envie ao founder.' }));
                  } catch (err: any) {
                    toast.error(err?.message || 'Erro ao gerar link');
                  }
                }}
              >
                <ExternalLink className="h-3 w-3" />
                {t('contractDetail.generatePublicLink', { defaultValue: 'Gerar Link Público' })}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 gap-1.5 text-xs">
                <Info className="h-3.5 w-3.5" />
                {t('common.details')}
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex-1 gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />
                {t('contractDetail.signatureTab', { defaultValue: 'Assinatura' })}
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1 gap-1.5 text-xs">
                <Calculator className="h-3.5 w-3.5" />
                {t('contractDetail.pricingTab')}
              </TabsTrigger>
              <TabsTrigger value="discounts" className="flex-1 gap-1.5 text-xs">
                <Euro className="h-3.5 w-3.5" />
                {t('admin.backoffice.discounts')}
              </TabsTrigger>
              <TabsTrigger value="intelligence" className="flex-1 gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('contracts.aiAnalysis')}
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-4 space-y-5 pb-8">
              {/* Status (editable) */}
              {isEditing && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('admin.backoffice.status')}</Label>
                  <Select value={editValues.status} onValueChange={(v) => setEditValues(p => ({ ...p, status: v }))}>
                    <SelectTrigger>
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
                </div>
              )}

              {/* Key Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <FieldDisplay
                  label={t('admin.backoffice.contractNumber')}
                  icon={<FileText className="h-3 w-3" />}
                >
                  {isEditing ? (
                    <Input value={editValues.contract_number} onChange={e => setEditValues(p => ({ ...p, contract_number: e.target.value }))} className="h-8 text-sm" />
                  ) : (
                    <span className="text-sm font-medium">{contract.contract_number || '—'}</span>
                  )}
                </FieldDisplay>

                <FieldDisplay
                  label={t('admin.backoffice.monthlyFee')}
                  icon={<Euro className="h-3 w-3" />}
                >
                  {isEditing ? (
                    <Input type="number" step="0.01" value={editValues.monthly_fee} onChange={e => setEditValues(p => ({ ...p, monthly_fee: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" />
                  ) : (
                    <span className="text-sm font-semibold">€{contract.monthly_fee.toFixed(2)}</span>
                  )}
                </FieldDisplay>

                <FieldDisplay label={t('admin.backoffice.type')}>
                  {isEditing ? (
                    <Select
                      value={editValues.incubation_type_id || '__none__'}
                      onValueChange={v => setEditValues(p => ({ ...p, incubation_type_id: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {incubationTypes?.map(it => (
                          <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm font-medium">{incubationType?.name || '—'}</span>
                  )}
                </FieldDisplay>

                <FieldDisplay
                  label={t('admin.backoffice.building')}
                  icon={<Building2 className="h-3 w-3" />}
                >
                  {isEditing ? (
                    <Select
                      value={editValues.building_id || '__none__'}
                      onValueChange={v => setEditValues(p => ({ ...p, building_id: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {buildings?.filter(b => b.is_active).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm font-medium">{building?.name || '—'}</span>
                  )}
                </FieldDisplay>

                <FieldDisplay
                  label={t('contracts.startDate')}
                  icon={<Calendar className="h-3 w-3" />}
                >
                  {isEditing ? (
                    <Input type="date" value={editValues.start_date} onChange={e => setEditValues(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm" />
                  ) : (
                    <span className="text-sm font-medium">{format(startDate, 'dd MMM yyyy')}</span>
                  )}
                </FieldDisplay>

                <FieldDisplay
                  label={t('contracts.endDate')}
                  icon={<Calendar className="h-3 w-3" />}
                >
                  {isEditing ? (
                    <Input type="date" value={editValues.end_date} onChange={e => setEditValues(p => ({ ...p, end_date: e.target.value }))} className="h-8 text-sm" />
                  ) : (
                    <span className="text-sm font-medium">{contract.end_date ? format(new Date(contract.end_date), 'dd MMM yyyy') : '—'}</span>
                  )}
                </FieldDisplay>
              </div>

              <Separator />

              {/* Linked Entities Summary */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {t('contractDetail.linkedEntities')}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {incubationType && (
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                      <Badge variant="outline" className="text-[10px]">{incubationType.name}</Badge>
                    </div>
                  )}
                  {building && (
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                      <Building2 className="h-3 w-3" />
                      {building.name}
                    </div>
                  )}
                  {contract.square_meters && (
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                      📐 {contract.square_meters} m²
                    </div>
                  )}
                  {linkedFunnelItem && (
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                      <LinkIcon className="h-3 w-3" />
                      CRM: {linkedFunnelItem.organization_name || linkedFunnelItem.contact_name}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{t('common.notes')}</Label>
                {isEditing ? (
                  <Textarea value={editValues.notes} onChange={e => setEditValues(p => ({ ...p, notes: e.target.value }))} rows={3} className="text-sm" />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes || t('contracts.noNotes')}</p>
                )}
              </div>
            </TabsContent>

            {/* Signature Tab */}
            <TabsContent value="signature" className="mt-4 space-y-4 pb-8">
              <SignatureProviderPanel contract={contract} />
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-4 pb-8">
              {pricing ? (
                <PricingBreakdown pricing={pricing} />
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{t('pricing.noIncubationType', { defaultValue: 'Select an incubation type to see pricing breakdown' })}</p>
                </div>
              )}
            </TabsContent>

            {/* Discounts Tab */}
            <TabsContent value="discounts" className="mt-4 pb-8">
              <ContractDiscountsPanel
                contractId={contract.id}
                monthlyFee={contract.monthly_fee}
                isStaff={true}
              />
            </TabsContent>

            {/* Intelligence Tab */}
            <TabsContent value="intelligence" className="mt-4 pb-8">
              <ContractIntelligenceCard
                contractId={contract.id}
                contractLabel={startup?.name || t('common.unnamed')}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Small helper for consistent field display */
function FieldDisplay({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-medium">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
