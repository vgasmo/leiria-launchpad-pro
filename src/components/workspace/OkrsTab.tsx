import { useState } from 'react';
import { useObjectives, useCreateObjective, useUpdateObjective, useDeleteObjective, useCreateKeyResult, useUpdateKeyResult, useDeleteKeyResult, Objective, KeyResult } from '@/hooks/useObjectives';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Target, Plus, ChevronDown, ChevronRight, Pencil, Trash2, TrendingUp } from 'lucide-react';

interface OkrsTabProps {
  workspaceId: string;
  canWrite?: boolean;
}

const QUARTERS = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4', '2025-Q4', '2025-Q3'];
const STATUSES = ['active', 'achieved', 'missed', 'deferred'];

export function OkrsTab({ workspaceId, canWrite = false }: OkrsTabProps) {
  const { data: objectives, isLoading } = useObjectives(workspaceId);
  const createObjective = useCreateObjective();
  const updateObjective = useUpdateObjective();
  const deleteObjective = useDeleteObjective();
  const createKeyResult = useCreateKeyResult();
  const updateKeyResult = useUpdateKeyResult();
  const deleteKeyResult = useDeleteKeyResult();
  
  const [objDialogOpen, setObjDialogOpen] = useState(false);
  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [expandedObjs, setExpandedObjs] = useState<Set<string>>(new Set());
  
  const [objForm, setObjForm] = useState({ title: '', description: '', quarter: '2026-Q1' });
  const [krForm, setKrForm] = useState({ title: '', target_value: '', unit: '' });

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedObjs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedObjs(next);
  };

  const openAddObjective = () => {
    setEditingObj(null);
    setObjForm({ title: '', description: '', quarter: '2026-Q1' });
    setObjDialogOpen(true);
  };

  const openEditObjective = (obj: Objective) => {
    setEditingObj(obj);
    setObjForm({ title: obj.title, description: obj.description || '', quarter: obj.quarter || '2026-Q1' });
    setObjDialogOpen(true);
  };

  const openAddKeyResult = (objectiveId: string) => {
    setSelectedObjId(objectiveId);
    setKrForm({ title: '', target_value: '', unit: '' });
    setKrDialogOpen(true);
  };

  const handleSaveObjective = async () => {
    if (!objForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      if (editingObj) {
        await updateObjective.mutateAsync({ id: editingObj.id, ...objForm });
        toast.success('Objective updated');
      } else {
        await createObjective.mutateAsync({ workspace_id: workspaceId, ...objForm });
        toast.success('Objective created');
      }
      setObjDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save objective');
    }
  };

  const handleSaveKeyResult = async () => {
    if (!krForm.title.trim() || !krForm.target_value) {
      toast.error('Title and target value are required');
      return;
    }
    try {
      await createKeyResult.mutateAsync({
        objective_id: selectedObjId!,
        title: krForm.title,
        target_value: parseFloat(krForm.target_value),
        unit: krForm.unit || undefined,
      });
      toast.success('Key result added');
      setKrDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add key result');
    }
  };

  const handleDeleteObjective = async (id: string) => {
    if (!confirm('Delete this objective and all its key results?')) return;
    try {
      await deleteObjective.mutateAsync(id);
      toast.success('Objective deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete objective');
    }
  };

  const handleUpdateKrValue = async (kr: KeyResult, newValue: number) => {
    try {
      await updateKeyResult.mutateAsync({ id: kr.id, current_value: newValue });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  const handleDeleteKeyResult = async (id: string) => {
    if (!confirm('Delete this key result?')) return;
    try {
      await deleteKeyResult.mutateAsync(id);
      toast.success('Key result deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'bg-green-500/10 text-green-600';
      case 'missed': return 'bg-red-500/10 text-red-600';
      case 'deferred': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-blue-500/10 text-blue-600';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              OKRs
            </CardTitle>
            <CardDescription>Track objectives and key results</CardDescription>
          </div>
          {canWrite && (
            <Button onClick={openAddObjective}>
              <Plus className="h-4 w-4 mr-2" />
              Add Objective
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!objectives?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No objectives set yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {objectives.map(obj => (
                <Collapsible key={obj.id} open={expandedObjs.has(obj.id)} onOpenChange={() => toggleExpanded(obj.id)}>
                  <div className="rounded-lg border bg-card">
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/50 flex items-start gap-3">
                        {expandedObjs.has(obj.id) ? <ChevronDown className="h-5 w-5 mt-0.5" /> : <ChevronRight className="h-5 w-5 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{obj.title}</h4>
                            <Badge className={getStatusColor(obj.status)}>{obj.status}</Badge>
                            {obj.quarter && <Badge variant="outline">{obj.quarter}</Badge>}
                          </div>
                          {obj.description && <p className="text-sm text-muted-foreground">{obj.description}</p>}
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={obj.progress} className="flex-1 h-2" />
                            <span className="text-sm font-medium">{Math.round(obj.progress)}%</span>
                          </div>
                        </div>
                        {canWrite && (
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => openEditObjective(obj)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteObjective(obj.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t">
                        <div className="flex items-center justify-between py-3">
                          <span className="text-sm font-medium">Key Results</span>
                          {canWrite && (
                            <Button variant="outline" size="sm" onClick={() => openAddKeyResult(obj.id)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add KR
                            </Button>
                          )}
                        </div>
                        {obj.key_results?.length ? (
                          <div className="space-y-3">
                            {obj.key_results.map(kr => (
                              <div key={kr.id} className="flex items-center gap-3 p-3 rounded bg-muted/30">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{kr.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {canWrite ? (
                                      <Input
                                        type="number"
                                        className="w-20 h-7 text-sm"
                                        value={kr.current_value}
                                        onChange={e => handleUpdateKrValue(kr, parseFloat(e.target.value) || 0)}
                                      />
                                    ) : (
                                      <span className="text-sm">{kr.current_value}</span>
                                    )}
                                    <span className="text-sm text-muted-foreground">/ {kr.target_value} {kr.unit}</span>
                                    <Progress value={(kr.current_value / kr.target_value) * 100} className="flex-1 h-1.5" />
                                  </div>
                                </div>
                                {canWrite && (
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteKeyResult(kr.id)} className="text-destructive h-7 w-7">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No key results yet</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={objDialogOpen} onOpenChange={setObjDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingObj ? 'Edit Objective' : 'Add Objective'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={objForm.title} onChange={e => setObjForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={objForm.description} onChange={e => setObjForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={objForm.quarter} onValueChange={v => setObjForm(f => ({ ...f, quarter: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveObjective}>{editingObj ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={krDialogOpen} onOpenChange={setKrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Key Result</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Result *</Label>
              <Input value={krForm.title} onChange={e => setKrForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Increase MRR" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Value *</Label>
                <Input type="number" value={krForm.target_value} onChange={e => setKrForm(f => ({ ...f, target_value: e.target.value }))} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={krForm.unit} onChange={e => setKrForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g., %, users, €" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKrDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveKeyResult}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
