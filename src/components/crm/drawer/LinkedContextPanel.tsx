/**
 * CRM Drawer - Linked Context Panel
 * Shows contract, workspace, and startup details when a funnel item has linked entities
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Building2, FileText, Briefcase, ExternalLink, MapPin, Calendar, Euro, Users } from 'lucide-react';
import { ContractDiscountsPanel } from '@/components/contracts/ContractDiscountsPanel';
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

  // Always fetch workspace contracts when workspace is linked
  const { data: workspaceContracts, isLoading: loadingWsContracts } = useQuery({
    queryKey: ['crm-workspace-contracts', linkedWorkspaceId],
    enabled: !!linkedWorkspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .select('id, contract_number, status, start_date, end_date, monthly_fee, currency, square_meters, incubation_type:incubation_types(name), building:buildings(name, code)')
        .eq('workspace_id', linkedWorkspaceId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const hasAnyLink = linkedWorkspaceId || linkedStartupId || linkedContractId;
  if (!hasAnyLink) return null;

  const isLoading = loadingWs || loadingContract || loadingWsContracts;

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

        {/* Contract Info — show linked contract OR all workspace contracts */}
        {contract ? (
          <ContractCard contract={contract} t={t} />
        ) : (workspaceContracts && workspaceContracts.length > 0) ? (
          <div className="border-t pt-2 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {t('crm.contract', { defaultValue: 'Contratos' })} ({workspaceContracts.length})
            </p>
            {workspaceContracts.map((c) => (
              <ContractCard key={c.id} contract={c} t={t} compact onLink={() => onLinkContract?.(c.id)} />
            ))}
          </div>
        ) : linkedWorkspaceId ? (
          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground italic">{t('crm.noContractsAvailable', { defaultValue: 'Sem contratos neste workspace' })}</p>
          </div>
        ) : null}