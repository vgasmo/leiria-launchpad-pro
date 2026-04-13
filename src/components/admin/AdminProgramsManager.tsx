import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical, Wand2, FileEdit, Calendar, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Program {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  program_type?: 'incubation' | 'acceleration';
}

interface Stage {
  id: string;
  name: string;
  description: string | null;
  position: number;
  program_id: string;
}

function StagesManager({ programId }: { programId: string }) {
  const { t } = useTranslation();
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
        <span className="text-sm font-medium text-muted-foreground">{t('adminPrograms.stages')}</span>
        <Button variant="ghost" size="sm" onClick={handleCreate}>
          <Plus className="h-3 w-3 mr-1" />
          {t('adminPrograms.addStage')}
        </Button>
      </div>
      
      {stages?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('adminPrograms.noStages')}</p>
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
            <DialogTitle>{editingStage ? t('adminPrograms.editStage') : t('adminPrograms.newStage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('adminPrograms.name')} *</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t('adminPrograms.position')}</Label>
              <Input type="number" value={formData.position} onChange={e => setFormData(f => ({ ...f, position: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>{t('adminPrograms.description')}</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingStage(null); }}>{t('adminPrograms.cancel')}</Button>
            <Button onClick={handleSave}>{editingStage ? t('adminPrograms.update') : t('adminPrograms.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPrograms.deleteStage')}</AlertDialogTitle>
            <AlertDialogDescription>{t('adminPrograms.deleteStageDescription', { name: deleteTarget?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('adminPrograms.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t('adminPrograms.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminProgramsManager() {
  const { t } = useTranslation();
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

  const getProgramDraft = (programId: string) => drafts?.find(d => d.program_id === programId);
  const hasNewProgramDraft = drafts?.some(d => !d.program_id);

  const handleNewProgramWizard = async () => {
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
          <h2 className="text-lg font-semibold">{t('adminPrograms.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('adminPrograms.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {hasNewProgramDraft && (
            <Button variant="outline" onClick={() => {
              const existingDraft = drafts?.find(d => !d.program_id);
              if (existingDraft) navigate(`/admin/programs/new/${existingDraft.id}`);
            }}>
              <Wand2 className="h-4 w-4 mr-1" />
              {t('adminPrograms.continueDraft')}
            </Button>
          )}
          <Button onClick={handleNewProgramWizard} disabled={createDraft.isPending}>
            <Wand2 className="h-4 w-4 mr-1" />
            {t('adminPrograms.newProgramWizard')}
          </Button>
          <Button variant="outline" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('adminPrograms.quickCreate')}
          </Button>
        </div>
      </div>

      {programs?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('adminPrograms.emptyState')}
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
                          {program.is_active ? t('adminPrograms.active') : t('adminPrograms.inactive')}
                        </Badge>
                        {getProgramDraft(program.id) && (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            {t('adminPrograms.draft')}
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
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-3 w-3 mr-1" />
                          {t('adminPrograms.stages', 'Etapas')}
                          {expandedId === program.id ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetupProgram(program.id)}
                        disabled={createDraft.isPending}
                      >
                        <FileEdit className="h-3 w-3 mr-1" />
                        {getProgramDraft(program.id) ? t('adminPrograms.continueSetup') : t('adminPrograms.setup')}
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
            <DialogTitle>{editingProgram ? t('adminPrograms.editProgram') : t('adminPrograms.newProgram')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('adminPrograms.name')} *</Label>
              <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder={t('adminPrograms.namePlaceholder')} />
            </div>
            <div>
              <Label>{t('adminPrograms.description')}</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('adminPrograms.startDate')}</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>{t('adminPrograms.endDate')}</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreating(false); setEditingProgram(null); }}>{t('adminPrograms.cancel')}</Button>
            <Button onClick={handleSave}>{editingProgram ? t('adminPrograms.update') : t('adminPrograms.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPrograms.deleteProgram')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminPrograms.deleteProgramDescription', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('adminPrograms.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">{t('adminPrograms.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}