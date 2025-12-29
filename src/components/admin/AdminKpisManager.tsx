import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Target, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useKpiDefinitions, 
  useCreateKpiDefinition, 
  useUpdateKpiDefinition, 
  useDeleteKpiDefinition,
  useWorkspaceKpis,
  useUpsertWorkspaceKpi,
  useAllWorkspaces,
} from '@/hooks/useAdminData';

interface KpiDefinition {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  category: string | null;
  direction: string | null;
  is_global: boolean;
  program_id: string | null;
}

const CATEGORIES = ['Growth', 'Revenue', 'Product', 'Team', 'Fundraising', 'Other'];
const DIRECTIONS = [
  { value: 'up', label: 'Higher is better' },
  { value: 'down', label: 'Lower is better' },
  { value: 'target', label: 'Target value' },
];

export function AdminKpisManager() {
  const { data: kpis, isLoading } = useKpiDefinitions();
  const { data: workspaceKpis } = useWorkspaceKpis();
  const { data: workspaces } = useAllWorkspaces();

  const createKpi = useCreateKpiDefinition();
  const updateKpi = useUpdateKpiDefinition();
  const deleteKpi = useDeleteKpiDefinition();
  const upsertWorkspaceKpi = useUpsertWorkspaceKpi();

  const [editingKpi, setEditingKpi] = useState<KpiDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KpiDefinition | null>(null);
  const [configWsKpi, setConfigWsKpi] = useState<KpiDefinition | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: '',
    category: '',
    direction: 'up',
    is_global: true,
  });

  const handleCreate = () => {
    setFormData({ name: '', description: '', unit: '', category: '', direction: 'up', is_global: true });
    setIsCreating(true);
  };

  const handleEdit = (kpi: KpiDefinition) => {
    setFormData({
      name: kpi.name,
      description: kpi.description || '',
      unit: kpi.unit || '',
      category: kpi.category || '',
      direction: kpi.direction || 'up',
      is_global: kpi.is_global,
    });
    setEditingKpi(kpi);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (editingKpi) {
      await updateKpi.mutateAsync({ id: editingKpi.id, ...formData });
    } else {
      await createKpi.mutateAsync(formData);
    }
    setEditingKpi(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteKpi.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getWorkspaceKpiConfig = (wsId: string, kpiId: string) => {
    return workspaceKpis?.find(wk => wk.workspace_id === wsId && wk.kpi_definition_id === kpiId);
  };

  const handleToggleRequired = async (wsId: string, kpiId: string, currentRequired: boolean) => {
    await upsertWorkspaceKpi.mutateAsync({ 
      workspace_id: wsId, 
      kpi_definition_id: kpiId, 
      required: !currentRequired,
      active: true,
    });
  };

  const handleSetTarget = async (wsId: string, kpiId: string, target: number | undefined) => {
    await upsertWorkspaceKpi.mutateAsync({ 
      workspace_id: wsId, 
      kpi_definition_id: kpiId, 
      target_value: target,
      active: true,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const groupedKpis = kpis?.reduce((acc, kpi) => {
    const cat = kpi.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(kpi);
    return acc;
  }, {} as Record<string, KpiDefinition[]>) || {};

  return (
    <div className="space-y-6">
      <Tabs defaultValue="definitions">
        <TabsList>
          <TabsTrigger value="definitions">KPI Definitions</TabsTrigger>
          <TabsTrigger value="workspace-config">Workspace Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="definitions" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">KPI Definitions</h2>
              <p className="text-sm text-muted-foreground">Define metrics that startups will track</p>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New KPI
            </Button>
          </div>

          {Object.keys(groupedKpis).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No KPI definitions yet. Create your first KPI to get started.
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedKpis).map(([category, catKpis]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {catKpis.map(kpi => (
                    <Card key={kpi.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{kpi.name}</h4>
                              {kpi.unit && <span className="text-xs text-muted-foreground">({kpi.unit})</span>}
                            </div>
                            {kpi.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{kpi.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {DIRECTIONS.find(d => d.value === kpi.direction)?.label || kpi.direction}
                              </Badge>
                              {kpi.is_global && <Badge variant="secondary" className="text-xs">Global</Badge>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(kpi)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(kpi)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="workspace-config" className="space-y-6 mt-6">
          <div>
            <h2 className="text-lg font-semibold">Workspace KPI Configuration</h2>
            <p className="text-sm text-muted-foreground">Set required KPIs and targets per workspace</p>
          </div>

          {workspaces?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No workspaces found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workspaces?.map(ws => (
                <Card key={ws.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">
                      {ws.startup?.name || 'Unknown'} 
                      <span className="text-muted-foreground font-normal ml-2">({ws.program?.name})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {kpis?.map(kpi => {
                        const config = getWorkspaceKpiConfig(ws.id, kpi.id);
                        return (
                          <div key={kpi.id} className="flex items-center gap-3 p-2 rounded bg-muted/30">
                            <Checkbox 
                              checked={config?.required || false}
                              onCheckedChange={() => handleToggleRequired(ws.id, kpi.id, config?.required || false)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm">{kpi.name}</span>
                              {config?.required && (
                                <span className="text-xs text-muted-foreground ml-1">(required)</span>
                              )}
                            </div>
                            {config?.target_value !== undefined && config?.target_value !== null && (
                              <Badge variant="outline" className="text-xs">
                                Target: {config.target_value}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreating || !!editingKpi} onOpenChange={(open) => { if (!open) { setIsCreating(false); setEditingKpi(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKpi ? 'Edit KPI' : 'New KPI Definition'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Monthly Recurring Revenue" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit</Label>
                <Input value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))} placeholder="e.g., USD, %, users" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Direction</Label>
              <Select value={formData.direction} onValueChange={v => setFormData(f => ({ ...f, direction: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_global} onCheckedChange={v => setFormData(f => ({ ...f, is_global: v }))} />
              <Label>Global (available to all programs)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingKpi(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editingKpi ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI Definition</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This will remove all recorded values for this KPI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
