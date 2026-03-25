/**
 * CRM Drawer - Linked Context Panel
 * Shows contract, workspace, and startup details when a funnel item has linked entities
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, FileText, Briefcase, ExternalLink, MapPin, Calendar, Euro, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface LinkedContextPanelProps {
  linkedWorkspaceId: string | null;
  linkedStartupId: string | null;
  linkedContractId: string | null;
  funnelItemId: string;
  onLinkContract?: (contractId: string | null) => void;
}

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  draft: 'bg-muted text-muted-foreground',
  pending_signature: 'bg-amber-500/15 text-amber-700 border-amber-200',
  suspended: 'bg-destructive/15 text-destructive',
  terminated: 'bg-destructive/15 text-destructive',
  expired: 'bg-muted text-muted-foreground',
};

export function LinkedContextPanel({ linkedWorkspaceId, linkedStartupId, linkedContractId, funnelItemId, onLinkContract }: LinkedContextPanelProps) {
  const { t } = useTranslation();
  const [showContractPicker, setShowContractPicker] = useState(false);

  // Fetch workspace + startup info
  const { data: workspace, isLoading: loadingWs } = useQuery({
    queryKey: ['crm-linked-workspace', linkedWorkspaceId],
    enabled: !!linkedWorkspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, stage, status, startup:startups(id, name, sector, main_contact_email, main_contact_name), program:programs(id, name)')
        .eq('id', linkedWorkspaceId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked contract
  const { data: contract, isLoading: loadingContract } = useQuery({
    queryKey: ['crm-linked-contract', linkedContractId],
    enabled: !!linkedContractId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .select('id, contract_number, status, start_date, end_date, monthly_fee, currency, discount_percentage, square_meters, incubation_type:incubation_types(name), building:buildings(name, code)')
        .eq('id', linkedContractId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch available contracts for linking (when workspace is known)
  const { data: availableContracts } = useQuery({
    queryKey: ['crm-available-contracts', linkedWorkspaceId],
    enabled: !!linkedWorkspaceId && showContractPicker,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .select('id, contract_number, status, monthly_fee, currency')
        .eq('workspace_id', linkedWorkspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const hasAnyLink = linkedWorkspaceId || linkedStartupId || linkedContractId;
  if (!hasAnyLink) return null;

  const isLoading = loadingWs || loadingContract;

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-3 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-muted/30">
      <CardContent className="p-3 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          {t('crm.linkedContext', { defaultValue: 'Contexto Vinculado' })}
        </p>

        {/* Workspace / Startup Info */}
        {workspace && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {(workspace as any).startup?.name || 'Workspace'}
              </span>
              <Link to={`/workspace/${workspace.id}`}>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {t('common.open', { defaultValue: 'Abrir' })}
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {workspace.stage && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {String(workspace.stage)}
                </Badge>
              )}
              {(workspace as any).program?.name && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {(workspace as any).program.name}
                </Badge>
              )}
              {(workspace as any).startup?.sector && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {(workspace as any).startup.sector}
                </Badge>
              )}
            </div>
            {(workspace as any).startup?.main_contact_email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {(workspace as any).startup.main_contact_name} — {(workspace as any).startup.main_contact_email}
              </p>
            )}
          </div>
        )}

        {/* Contract Info */}
        {contract ? (
          <div className="border-t pt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                {(contract as any).contract_number || t('crm.contract', { defaultValue: 'Contrato' })}
              </span>
              <Badge className={cn('text-[10px] h-5', CONTRACT_STATUS_COLORS[(contract as any).status] || '')}>
                {(contract as any).status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {(contract as any).monthly_fee ? `${(contract as any).monthly_fee} ${(contract as any).currency}/mês` : '—'}
              </span>
              {(contract as any).square_meters && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {(contract as any).square_meters} m²
                </span>
              )}
              {(contract as any).start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date((contract as any).start_date).toLocaleDateString('pt-PT')}
                  {(contract as any).end_date ? ` → ${new Date((contract as any).end_date).toLocaleDateString('pt-PT')}` : ''}
                </span>
              )}
              {(contract as any).building?.name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {(contract as any).building.name}
                </span>
              )}
            </div>
            {(contract as any).incubation_type?.name && (
              <Badge variant="outline" className="text-[10px] h-5">
                {(contract as any).incubation_type.name}
              </Badge>
            )}
            {(contract as any).discount_percentage > 0 && (
              <p className="text-[10px] text-amber-600">
                {t('crm.discount', { defaultValue: 'Desconto' })}: {(contract as any).discount_percentage}%
              </p>
            )}
          </div>
        ) : linkedWorkspaceId && !linkedContractId ? (
          <div className="border-t pt-2">
            {showContractPicker ? (
              <div className="space-y-2">
                <Select onValueChange={(val) => { onLinkContract?.(val); setShowContractPicker(false); }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('crm.selectContract', { defaultValue: 'Selecionar contrato...' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContracts?.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.contract_number || c.id.slice(0, 8)} — {c.status} {c.monthly_fee ? `(${c.monthly_fee} ${c.currency})` : ''}
                      </SelectItem>
                    ))}
                    {(!availableContracts || availableContracts.length === 0) && (
                      <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                        {t('crm.noContractsAvailable', { defaultValue: 'Sem contratos neste workspace' })}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowContractPicker(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="h-7 text-xs w-full gap-1" onClick={() => setShowContractPicker(true)}>
                <FileText className="h-3 w-3" />
                {t('crm.linkContract', { defaultValue: 'Vincular Contrato' })}
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
