import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, Wand2, FileEdit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  usePrograms, 
  useCreateProgram, 
  useUpdateProgram, 
  useDeleteProgram,
  useStages,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
} from '@/hooks/useAdminData';
import { useProgramSetupDrafts, useCreateProgramDraft } from '@/hooks/useProgramSetup';
import { format } from 'date-fns';

interface Program {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface Stage {
  id: string;
  name: string;
  description: string | null;
  position: number;
  program_id: string;
}

function StagesManager({ programId }: { programId: string }) {
  const { data: stages, isLoading } = useStages(programId);
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();

  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', position: 0 });
  const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);

  const handleCreate = () => {
    const nextPos = stages?.length ? Math.max(...stages.map(s => s.position)) + 1 : 0;
    setFormData({ name: '', description: '', position: nextPos });
    setIsCreating(true);
  };

  const handleEdit = (stage: Stage) => {
    setFormData({ name: stage.name, description: stage.description || '', position: stage.position });
    setEditingStage(stage);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (editingStage) {
      await updateStage.mutateAsync({ id: editingStage.id, program_id: programId, ...formData });
    } else {
      await createStage.mutateAsync({ ...formData, program_id: programId });
    }
    setEditingStage(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStage.mutateAsync({ id: deleteTarget.id, program_id: programId });
    setDeleteTarget(null);
  };

  if (isLoading) return <Skeleton className="h-20 w-full" />;

  return (
    <div className="pl-6 border-l border-border/50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Stages</span>
        <Button variant="ghost" size="sm" onClick={handleCreate}>
          <Plus className="h-3 w-3 mr-1" />
          Add Stage
        </Button>
      </div>
      
      {stages?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stages yet</p>
      ) : (
        <div className="space-y-1">
          {stages?.map(stage => (
            <div key={stage.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 group">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground w-6">{stage.position}</span>
              <span className="flex-1 text-sm">{stage.name}</span>
              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(stage)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget(stage)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCreating || !!editingStage} onOpenChange={(open) => { if (!open) { setIsCreating(false); setEditingStage(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStage ? 'Edit Stage' : 'New Stage'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Position</Label>
              <Input type="number" value={formData.position} onChange={e => setFormData(f => ({ ...f, position: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingStage(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editingStage ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deleteTarget?.name}"? This cannot be undone.</AlertDialogDescription>
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

export function AdminProgramsManager() {
  const navigate = useNavigate();
  const { data: programs, isLoading } = usePrograms();
  const { data: drafts } = useProgramSetupDrafts();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const createDraft = useCreateProgramDraft();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', start_date: '', end_date: '' });

  // Find pending drafts for programs
  const getProgramDraft = (programId: string) => drafts?.find(d => d.program_id === programId);
  const hasNewProgramDraft = drafts?.some(d => !d.program_id);

  const handleNewProgramWizard = async () => {
    // Check if there's already a new program draft
    const existingDraft = drafts?.find(d => !d.program_id);
    if (existingDraft) {
      navigate(`/admin/programs/new/${existingDraft.id}`);
    } else {
      const draft = await createDraft.mutateAsync({});
      navigate(`/admin/programs/new/${draft.id}`);
    }
  };

  const handleSetupProgram = async (programId: string) => {
    const existingDraft = getProgramDraft(programId);
    if (existingDraft) {
      navigate(`/admin/programs/${programId}/setup/${existingDraft.id}`);
    } else {
      const draft = await createDraft.mutateAsync({ programId });
      navigate(`/admin/programs/${programId}/setup/${draft.id}`);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', start_date: '', end_date: '' });
    setIsCreating(true);
  };

  const handleEdit = (program: Program) => {
    setFormData({
      name: program.name,
      description: program.description || '',
      start_date: program.start_date || '',
      end_date: program.end_date || '',
    });
    setEditingProgram(program);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    if (editingProgram) {
      await updateProgram.mutateAsync({ 
        id: editingProgram.id, 
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
    } else {
      await createProgram.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      });
    }
    setEditingProgram(null);
    setIsCreating(false);
  };

  const handleToggleActive = async (program: Program) => {
    await updateProgram.mutateAsync({ id: program.id, is_active: !program.is_active });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProgram.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Programs & Stages</h2>
          <p className="text-sm text-muted-foreground">Manage incubation programs and their stages</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewProgramWizard} disabled={createDraft.isPending}>
            <Wand2 className="h-4 w-4 mr-1" />
            {hasNewProgramDraft ? 'Continue Draft' : 'New Program (Wizard)'}
          </Button>
          <Button variant="outline" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Quick Create
          </Button>
        </div>
      </div>

      {programs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No programs yet. Create your first program to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {programs?.map(program => (
            <Collapsible key={program.id} open={expandedId === program.id} onOpenChange={(open) => setExpandedId(open ? program.id : null)}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        {expandedId === program.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{program.name}</h3>
                        <Badge variant={program.is_active ? 'default' : 'secondary'}>
                          {program.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {getProgramDraft(program.id) && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Draft
                          </Badge>
                        )}
                      </div>
                      {program.description && <p className="text-sm text-muted-foreground truncate">{program.description}</p>}
                      {(program.start_date || program.end_date) && (
                        <p className="text-xs text-muted-foreground">
                          {program.start_date && format(new Date(program.start_date), 'MMM d, yyyy')}
                          {program.start_date && program.end_date && ' – '}
                          {program.end_date && format(new Date(program.end_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetupProgram(program.id)}
                        disabled={createDraft.isPending}
                      >
                        <FileEdit className="h-3 w-3 mr-1" />
                        {getProgramDraft(program.id) ? 'Continue Setup' : 'Setup'}
                      </Button>
                      <Switch checked={program.is_active} onCheckedChange={() => handleToggleActive(program)} />
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(program)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(program)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent className="mt-4">
                    <StagesManager programId={program.id} />
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <Dialog open={isCreating || !!editingProgram} onOpenChange={(open) => { if (!open) { setIsCreating(false); setEditingProgram(null); }}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Edit Program' : 'New Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Accelerator 2025" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingProgram(null); }}>Cancel</Button>
            <Button onClick={handleSave}>{editingProgram ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.name}"? This will also delete all stages. Workspaces using this program may be affected.
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
