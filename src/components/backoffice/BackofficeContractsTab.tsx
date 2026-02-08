import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, FileText, Search, Clock, AlertTriangle, Cake, Zap, Building2 } from 'lucide-react';
import { useContracts, useIncubationTypes, useBuildings, useCreateContract, useUpdateContract, type StartupContract, type IncubationType } from '@/hooks/useBackoffice';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { format, differenceInMonths, addYears, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  pending_signature: { label: 'Pending Signature', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
};

// Helper to calculate incubation tenure
function getIncubationTenure(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const months = differenceInMonths(now, start);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return { months, years, remainingMonths };
}

// Helper to check for anniversary alerts
function getAnniversaryAlert(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  const { years, months } = getIncubationTenure(startDate);
  
  // Check if approaching or past 3 years
  if (months >= 33) {
    const isOver3 = months >= 36;
    return {
      type: 'year3' as const,
      severity: 'critical' as const,
      message: isOver3 ? '3+ years - review required' : 'Approaching 3-year mark',
    };
  }
  
  // Check for upcoming anniversary (within 30 days)
  const nextAnniversary = addYears(start, years + 1);
  const daysUntil = differenceInDays(nextAnniversary, now);
  if (daysUntil > 0 && daysUntil <= 30) {
    return {
      type: 'anniversary' as const,
      severity: years >= 2 ? 'warning' as const : 'info' as const,
      message: `Year ${years + 1} anniversary in ${daysUntil} days`,
    };
  }
  
  return null;
}

export function BackofficeContractsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<StartupContract | null>(null);
  
  // Bulk contract creation state
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Set<string>>(new Set());
  const [bulkIncubationType, setBulkIncubationType] = useState<string>('');
  const [bulkBuilding, setBulkBuilding] = useState<string>('');
  const [isBulkCreating, setIsBulkCreating] = useState(false);

  const { data: contracts, isLoading } = useContracts(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const { data: incubationTypes } = useIncubationTypes();
  const { data: buildings } = useBuildings();
  const { data: workspaces } = useWorkspaces();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // Workspaces without contracts
  const workspacesWithoutContracts = useMemo(() => {
    if (!workspaces || !contracts) return [];
    const contractedWorkspaceIds = new Set(contracts.map(c => c.workspace_id));
    return workspaces.filter(w => !contractedWorkspaceIds.has(w.id));
  }, [workspaces, contracts]);

  const toggleWorkspaceSelection = (workspaceId: string) => {
    setSelectedWorkspaces(prev => {
      const next = new Set(prev);
      if (next.has(workspaceId)) {
        next.delete(workspaceId);
      } else {
        next.add(workspaceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedWorkspaces.size === workspacesWithoutContracts.length) {
      setSelectedWorkspaces(new Set());
    } else {
      setSelectedWorkspaces(new Set(workspacesWithoutContracts.map(w => w.id)));
    }
  };

  const handleBulkCreateContracts = async () => {
    if (selectedWorkspaces.size === 0) {
      toast.error(t('admin.backoffice.selectWorkspacesFirst', 'Select workspaces first'));
      return;
    }
    
    const selectedType = incubationTypes?.find(it => it.id === bulkIncubationType);
    
    setIsBulkCreating(true);
    let created = 0;
    let errors = 0;
    
    for (const workspaceId of selectedWorkspaces) {
      try {
        await createContract.mutateAsync({
          workspace_id: workspaceId,
          incubation_type_id: bulkIncubationType || null,
          building_id: bulkBuilding || null,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          monthly_fee: selectedType?.base_monthly_fee || 0,
        });
        created++;
      } catch (err) {
        errors++;
        console.error('Failed to create contract:', err);
      }
    }
    
    setIsBulkCreating(false);
    setSelectedWorkspaces(new Set());
    
    if (errors > 0) {
      toast.warning(t('admin.backoffice.bulkCreatePartial', { defaultValue: `Created ${created} contracts, ${errors} failed` }));
    } else {
      toast.success(t('admin.backoffice.bulkCreateSuccess', { defaultValue: `Created ${created} contracts` }));
    }
  };

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
      building_id: formData.get('building_id') as string || null,
      contract_number: formData.get('contract_number') as string || null,
      status: formData.get('status') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string || null,
      monthly_fee: parseFloat(formData.get('monthly_fee') as string) || 0,
      square_meters: parseFloat(formData.get('square_meters') as string) || null,
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
            placeholder={t('admin.backoffice.searchContracts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('admin.backoffice.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.backoffice.allStatuses')}</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{t(`admin.backoffice.contractStatus.${key}`, { defaultValue: config.label })}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedContract(null)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.backoffice.newContract')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedContract ? t('admin.backoffice.editContract') : t('admin.backoffice.newContract')}
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
                  <Label>{t('admin.backoffice.startup')}</Label>
                  <Select name="workspace_id" defaultValue={selectedContract?.workspace_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.backoffice.selectStartup')} />
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
                  <Label>{t('admin.backoffice.incubationType')}</Label>
                  <Select name="incubation_type_id" defaultValue={selectedContract?.incubation_type_id || undefined}>
                    <SelectTrigger>
                       <SelectValue placeholder={t('admin.backoffice.selectType')} />
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
                  <Label>{t('admin.backoffice.building')}</Label>
                  <Select name="building_id" defaultValue={selectedContract?.building_id || undefined}>
                    <SelectTrigger>
                       <SelectValue placeholder={t('admin.backoffice.selectBuilding')} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings?.filter(b => b.is_active).map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.contractNumber')}</Label>
                  <Input
                    name="contract_number"
                    placeholder="INC-2025-001"
                    defaultValue={selectedContract?.contract_number || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.status')}</Label>
                  <Select name="status" defaultValue={selectedContract?.status || 'draft'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                         <SelectItem key={key} value={key}>{t(`admin.backoffice.contractStatus.${key}`, { defaultValue: config.label })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.startDate')}</Label>
                  <Input
                    type="date"
                    name="start_date"
                    defaultValue={selectedContract?.start_date || ''}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.endDate')}</Label>
                  <Input
                    type="date"
                    name="end_date"
                    defaultValue={selectedContract?.end_date || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.monthlyFee')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="monthly_fee"
                    defaultValue={selectedContract?.monthly_fee || 0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.discount')} (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="discount_percentage"
                    defaultValue={selectedContract?.discount_percentage || 0}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                   <Label>{t('admin.backoffice.discountReason')}</Label>
                  <Input
                    name="discount_reason"
                    placeholder={t('admin.backoffice.discountReasonPlaceholder')}
                    defaultValue={selectedContract?.discount_reason || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('admin.backoffice.equity')} (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="equity_percentage"
                    defaultValue={selectedContract?.equity_percentage || ''}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>{t('admin.backoffice.notes')}</Label>
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

      {/* Workspaces Without Contracts - Bulk Create */}
      {workspacesWithoutContracts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Zap className="h-5 w-5" />
              {t('admin.backoffice.workspacesWithoutContracts', { defaultValue: 'Workspaces Without Contracts' })}
              <Badge variant="secondary" className="ml-2 bg-amber-200 dark:bg-amber-800">
                {workspacesWithoutContracts.length}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('admin.backoffice.bulkCreateDescription', { defaultValue: 'Select workspaces and create contracts in bulk' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Options */}
            <div className="flex flex-wrap gap-3 items-end bg-background/80 p-3 rounded-lg border">
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.backoffice.incubationType')}</Label>
                <Select value={bulkIncubationType} onValueChange={setBulkIncubationType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('admin.backoffice.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {incubationTypes?.map(it => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} (€{it.base_monthly_fee}/mo)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.backoffice.building')}</Label>
                <Select value={bulkBuilding} onValueChange={setBulkBuilding}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('admin.backoffice.selectBuilding')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none', 'None')}</SelectItem>
                    {buildings?.filter(b => b.is_active).map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {b.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleBulkCreateContracts}
                disabled={selectedWorkspaces.size === 0 || isBulkCreating}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                {isBulkCreating 
                  ? t('common.processing', 'Processing...') 
                  : t('admin.backoffice.createContractsCount', { defaultValue: `Create ${selectedWorkspaces.size} Contracts` })}
              </Button>
            </div>
            
            {/* Workspaces Selection Table */}
            <div className="max-h-64 overflow-auto border rounded-lg bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedWorkspaces.size === workspacesWithoutContracts.length && workspacesWithoutContracts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                     <TableHead>{t('admin.backoffice.startup')}</TableHead>
                    <TableHead>{t('admin.backoffice.stage', { defaultValue: 'Stage' })}</TableHead>
                    <TableHead>{t('admin.backoffice.createdAt', { defaultValue: 'Created' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspacesWithoutContracts.map(workspace => (
                    <TableRow key={workspace.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedWorkspaces.has(workspace.id)}
                          onCheckedChange={() => toggleWorkspaceSelection(workspace.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {workspace.startup?.name || t('common.unnamed', 'Unnamed')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {workspace.stage || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {workspace.created_at ? format(new Date(workspace.created_at), 'dd MMM yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('admin.backoffice.contracts')}
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
                   <TableHead>{t('admin.backoffice.startup')}</TableHead>
                  <TableHead>{t('admin.backoffice.contractNumber')}</TableHead>
                  <TableHead>{t('admin.backoffice.type')}</TableHead>
                  <TableHead>{t('admin.backoffice.building')}</TableHead>
                  <TableHead>{t('admin.backoffice.timeIncubated', { defaultValue: 'Time Incubated' })}</TableHead>
                  <TableHead>{t('admin.backoffice.status')}</TableHead>
                  <TableHead>{t('admin.backoffice.monthlyFee')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts?.map(contract => {
                  const statusConfig = STATUS_CONFIG[contract.status];
                  const startup = (contract.workspace as any)?.startup;
                  const incubationType = contract.incubation_type as IncubationType | null;
                  const building = contract.building as { name: string; city?: string } | null;
                  
                  // Calculate tenure and alerts
                  const tenure = getIncubationTenure(contract.start_date);
                  const alert = contract.status === 'active' ? getAnniversaryAlert(contract.start_date) : null;

                  return (
                    <TableRow 
                      key={contract.id}
                      className={cn(
                        alert?.severity === 'critical' && 'bg-red-50/50 dark:bg-red-950/10'
                      )}
                    >
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
                        {building ? (
                          <span className="text-sm">
                            {building.name}
                            {building.city && <span className="text-muted-foreground text-xs block">{building.city}</span>}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'flex items-center gap-1 text-sm',
                                  tenure.years >= 3 && 'text-red-600 font-medium',
                                  tenure.years === 2 && 'text-yellow-600'
                                )}>
                                  <Clock className="h-3 w-3" />
                                  {tenure.years > 0 ? (
                                    <span>{tenure.years}y {tenure.remainingMonths}m</span>
                                  ) : (
                                    <span>{tenure.months}m</span>
                                  )}
                                </div>
                                {alert && (
                                  <div className={cn(
                                    alert.severity === 'critical' && 'text-red-600',
                                    alert.severity === 'warning' && 'text-yellow-600',
                                    alert.severity === 'info' && 'text-blue-600',
                                  )}>
                                    {alert.type === 'year3' ? (
                                      <AlertTriangle className="h-4 w-4" />
                                    ) : (
                                      <Cake className="h-4 w-4" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <div>{t('admin.backoffice.startedOn', { defaultValue: 'Started' })}: {format(new Date(contract.start_date), 'dd MMM yyyy')}</div>
                                <div>{t('admin.backoffice.totalMonths', { defaultValue: 'Total' })}: {tenure.months} {t('admin.backoffice.months', { defaultValue: 'months' })}</div>
                                {alert && (
                                  <div className={cn(
                                    'mt-1 font-medium',
                                    alert.severity === 'critical' && 'text-red-400',
                                    alert.severity === 'warning' && 'text-yellow-400',
                                  )}>
                                    {alert.message}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs', statusConfig?.className)}>
                          {t(`admin.backoffice.contractStatus.${contract.status}`, { defaultValue: statusConfig?.label })}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          €{contract.monthly_fee.toFixed(2)}
                          {contract.discount_percentage > 0 && (
                            <span className="text-green-600 text-xs ml-1">
                              (-{contract.discount_percentage}%)
                            </span>
                          )}
                        </div>
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
                      {t('admin.backoffice.noContracts')}
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
