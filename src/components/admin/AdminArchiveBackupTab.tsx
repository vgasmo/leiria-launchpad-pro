/**
 * AdminArchiveBackupTab — Admin visibility for contract archival + ecosystem snapshots.
 * Provides operational status, retry controls, and health signals.
 * Separated from core contract/intake surfaces per domain modularization policy.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Archive, Database, RefreshCw, CheckCircle2, XCircle, Clock,
  ExternalLink, AlertTriangle, Play, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─── Contract Archive Section ──────────────────────────────

function ContractArchiveStatus() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: archivedContracts, isLoading } = useQuery({
    queryKey: ['contract-archive-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startup_contracts')
        .select('id, contract_number, organization_name, signed_at, archive_status, archived_at, archive_location_url, archive_attempt_count, last_archive_error, archive_filename')
        .not('signed_at', 'is', null)
        .order('signed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await invokeWithAuth('archive-contracts-to-sharepoint', {
        body: { contract_id: contractId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(t('admin.archive.retryTriggered', { defaultValue: 'Arquivo re-tentado com sucesso' }));
      queryClient.invalidateQueries({ queryKey: ['contract-archive-status'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao re-tentar arquivo');
    },
  });

  const runAllMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('archive-contracts-to-sharepoint', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      const processed = data?.results?.length || 0;
      const succeeded = data?.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Arquivo executado: ${succeeded}/${processed} contrato(s) processado(s)`);
      queryClient.invalidateQueries({ queryKey: ['contract-archive-status'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao executar arquivo');
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              {t('admin.archive.contractArchive', { defaultValue: 'Arquivo de Contratos — SharePoint' })}
            </CardTitle>
            <CardDescription>
              {t('admin.archive.contractArchiveDesc', { defaultValue: 'Contratos assinados são arquivados automaticamente no SharePoint 7 dias após a assinatura.' })}
            </CardDescription>
          </div>
          {stats.pending > 0 && (
            <Button
              variant="outline"
              onClick={() => runAllMutation.mutate()}
              disabled={runAllMutation.isPending}
            >
              {runAllMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Executar agora
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Contratos assinados</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Arquivados</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Com erro</div>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Assinado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Arquivado em</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {archivedContracts?.slice(0, 20).map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-mono text-sm">
                  {contract.contract_number || contract.id.slice(0, 8)}
                </TableCell>
                <TableCell>{contract.organization_name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy') : '—'}
                </TableCell>
                <TableCell>
                  {statusBadge(contract.archive_status, contract.archive_attempt_count || 0)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {contract.archived_at ? format(new Date(contract.archived_at), 'dd/MM/yyyy HH:mm') : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {contract.archive_location_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={contract.archive_location_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {(contract.archive_status === 'failed' || contract.archive_status === 'pending' || !contract.archive_status) && (contract.archive_attempt_count || 0) < 5 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => retryMutation.mutate(contract.id)}
                        disabled={retryMutation.isPending}
                        title={contract.archive_status === 'failed' ? 'Re-tentar' : 'Arquivar agora'}
                      >
                        {retryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {stats.failed > 0 && (
          <div className="text-sm text-destructive flex items-center gap-2 p-3 rounded-lg bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            {stats.failed} contrato(s) com erro de arquivo. Verifique a configuração do MS Graph / SharePoint.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Ecosystem Snapshot Section ──────────────────────────────

function EcosystemSnapshotStatus() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: snapshots, isLoading } = useQuery({
    queryKey: ['ecosystem-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecosystem_snapshots')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeWithAuth('run-ecosystem-snapshot', {});
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Snapshot concluído — ${data?.total_records || '?'} registos exportados`);
      queryClient.invalidateQueries({ queryKey: ['ecosystem-snapshots'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao criar snapshot');
      queryClient.invalidateQueries({ queryKey: ['ecosystem-snapshots'] });
    },
  });

  const statusBadge = (status: string) => {
    if (status === 'completed') return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
    if (status === 'running') return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />A executar</Badge>;
    if (status === 'failed') return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const lastSuccess = snapshots?.find(s => s.status === 'completed');
  const lastFailed = snapshots?.find(s => s.status === 'failed');

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('admin.archive.ecosystemSnapshots', { defaultValue: 'Snapshots do Ecossistema' })}
            </CardTitle>
            <CardDescription>
              {t('admin.archive.ecosystemSnapshotsDesc', { defaultValue: 'Backups periódicos dos dados críticos do ecossistema para resiliência e auditoria.' })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
          >
            {triggerMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Executar agora
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground mb-1">Último snapshot bem-sucedido</div>
            {lastSuccess ? (
              <div className="text-sm font-medium">
                {format(new Date(lastSuccess.completed_at!), 'dd/MM/yyyy HH:mm')}
                <span className="text-muted-foreground ml-2">
                  ({Object.values(lastSuccess.record_counts as Record<string, number> || {}).reduce((a: number, b: number) => a + b, 0)} registos)
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum</div>
            )}
          </div>
          {lastFailed && (
            <div className="p-3 rounded-lg bg-destructive/5">
              <div className="text-xs text-destructive mb-1">Último erro</div>
              <div className="text-sm text-destructive">{lastFailed.last_error?.slice(0, 100)}</div>
            </div>
          )}
        </div>

        {/* Recent snapshots */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Domínios</TableHead>
              <TableHead>Registos</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots?.map((snap) => {
              const counts = snap.record_counts as Record<string, number> | null;
              const totalRecords = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
              const domainCount = counts ? Object.keys(counts).length : 0;
              return (
                <TableRow key={snap.id}>
                  <TableCell className="text-sm">
                    {format(new Date(snap.started_at), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>{statusBadge(snap.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{domainCount}</TableCell>
                  <TableCell className="text-sm font-mono">{totalRecords}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {snap.is_scheduled ? 'Agendado' : 'Manual'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!snapshots || snapshots.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum snapshot encontrado. Execute o primeiro acima.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Main Export ──────────────────────────────

export function AdminArchiveBackupTab() {
  return (
    <div className="space-y-6">
      <ContractArchiveStatus />
      <Separator />
      <EcosystemSnapshotStatus />
    </div>
  );
}
