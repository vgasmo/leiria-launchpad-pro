import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Search, Calendar, Percent } from 'lucide-react';
import { useContracts, useIncubationTypes, useCreateContract, useUpdateContract, type StartupContract, type IncubationType } from '@/hooks/useBackoffice';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  pending_signature: { label: 'Pending Signature', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
};

export function BackofficeContractsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<StartupContract | null>(null);

  const { data: contracts, isLoading } = useContracts(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: incubationTypes } = useIncubationTypes();
  const { data: workspaces } = useWorkspaces();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  const filteredContracts = contracts?.filter(c => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const startupName = (c.workspace as any)?.startup?.name?.toLowerCase() || '';
    const contractNum = c.contract_number?.toLowerCase() || '';
    return startupName.includes(search) || contractNum.includes(search);
  });

  const handleSave = async (formData: FormData) => {
    const payload: Record<string, unknown> = {
      workspace_id: formData.get('workspace_id') as string,
      incubation_type_id: formData.get('incubation_type_id') as string || null,
      contract_number: formData.get('contract_number') as string || null,
      status: formData.get('status') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || null,
      monthly_fee: parseFloat(formData.get('monthly_fee') as string) || 0,
      discount_percentage: parseFloat(formData.get('discount_percentage') as string) || 0,
      discount_reason: formData.get('discount_reason') as string || null,
      discount_applied_by: user?.id,
      equity_percentage: parseFloat(formData.get('equity_percentage') as string) || null,
      notes: formData.get('notes') as string || null,
    };

    if (selectedContract) {
      await updateContract.mutateAsync({ id: selectedContract.id, ...payload });
    } else {
      await createContract.mutateAsync(payload);
    }
    setDialogOpen(false);
    setSelectedContract(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('backoffice.searchContracts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('backoffice.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('backoffice.allStatuses')}</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedContract(null)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('backoffice.newContract')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedContract ? t('backoffice.editContract') : t('backoffice.newContract')}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('backoffice.startup')}</Label>
                  <Select name="workspace_id" defaultValue={selectedContract?.workspace_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('backoffice.selectStartup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces?.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.startup?.name || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.incubationType')}</Label>
                  <Select name="incubation_type_id" defaultValue={selectedContract?.incubation_type_id || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('backoffice.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {incubationTypes?.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} (€{t.base_monthly_fee}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.contractNumber')}</Label>
                  <Input
                    name="contract_number"
                    placeholder="INC-2025-001"
                    defaultValue={selectedContract?.contract_number || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.status')}</Label>
                  <Select name="status" defaultValue={selectedContract?.status || 'draft'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.startDate')}</Label>
                  <Input
                    type="date"
                    name="start_date"
                    defaultValue={selectedContract?.start_date || ''}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.endDate')}</Label>
                  <Input
                    type="date"
                    name="end_date"
                    defaultValue={selectedContract?.end_date || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.monthlyFee')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="monthly_fee"
                    defaultValue={selectedContract?.monthly_fee || 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.discount')} (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="discount_percentage"
                    defaultValue={selectedContract?.discount_percentage || 0}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>{t('backoffice.discountReason')}</Label>
                  <Input
                    name="discount_reason"
                    placeholder={t('backoffice.discountReasonPlaceholder')}
                    defaultValue={selectedContract?.discount_reason || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('backoffice.equity')} (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="equity_percentage"
                    defaultValue={selectedContract?.equity_percentage || ''}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>{t('backoffice.notes')}</Label>
                  <Textarea
                    name="notes"
                    defaultValue={selectedContract?.notes || ''}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('backoffice.contracts')}
            <Badge variant="secondary" className="ml-2">{filteredContracts?.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('backoffice.startup')}</TableHead>
                  <TableHead>{t('backoffice.contractNumber')}</TableHead>
                  <TableHead>{t('backoffice.type')}</TableHead>
                  <TableHead>{t('backoffice.status')}</TableHead>
                  <TableHead>{t('backoffice.startDate')}</TableHead>
                  <TableHead>{t('backoffice.monthlyFee')}</TableHead>
                  <TableHead>{t('backoffice.discount')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts?.map(contract => {
                  const statusConfig = STATUS_CONFIG[contract.status];
                  const startup = (contract.workspace as any)?.startup;
                  const incubationType = contract.incubation_type as IncubationType | null;
                  const effectiveFee = contract.monthly_fee * (1 - (contract.discount_percentage || 0) / 100);

                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {startup?.name || 'Unnamed'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contract.contract_number || '-'}
                      </TableCell>
                      <TableCell>
                        {incubationType?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusConfig?.className)}>
                          {statusConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(contract.start_date), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>€{contract.monthly_fee.toFixed(2)}</TableCell>
                      <TableCell>
                        {contract.discount_percentage > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Percent className="h-3 w-3" />
                            {contract.discount_percentage}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedContract(contract);
                            setDialogOpen(true);
                          }}
                        >
                          {t('common.edit')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredContracts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('backoffice.noContracts')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
