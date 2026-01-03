import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateExercise, useUpdateExercise, Exercise } from '@/hooks/useExerciseLibrary';
import { CONTEXT_TAGS } from './ExerciseLibraryTab';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExerciseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
}

interface ExerciseStep {
  step: number;
  title: string;
  description: string;
  duration?: number;
}

export function ExerciseFormDialog({ open, onOpenChange, exercise }: ExerciseFormDialogProps) {
  const { t } = useTranslation();
  const createMutation = useCreateExercise();
  const updateMutation = useUpdateExercise();

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [groupSize, setGroupSize] = useState<'1:1' | 'small_group' | 'cohort'>('1:1');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [materialsNeeded, setMaterialsNeeded] = useState<string[]>(['']);
  const [steps, setSteps] = useState<ExerciseStep[]>([
    { step: 1, title: '', description: '', duration: 5 },
  ]);
  const [facilitatorTips, setFacilitatorTips] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [commonPitfalls, setCommonPitfalls] = useState('');
  const [variations, setVariations] = useState('');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (exercise) {
      setTitle(exercise.title);
      setPurpose(exercise.purpose || '');
      setDurationMinutes(exercise.duration_minutes);
      setGroupSize(exercise.group_size);
      setSelectedTags(exercise.startup_context_tags);
      setMaterialsNeeded(exercise.materials_needed.length > 0 ? exercise.materials_needed : ['']);
      setSteps(
        exercise.step_by_step.length > 0
          ? exercise.step_by_step
          : [{ step: 1, title: '', description: '', duration: 5 }]
      );
      setFacilitatorTips(exercise.facilitator_tips || '');
      setSuccessCriteria(exercise.success_criteria || '');
      setCommonPitfalls(exercise.common_pitfalls || '');
      setVariations(exercise.variations || '');
      setIsApproved(exercise.status === 'approved');
    } else {
      resetForm();
    }
  }, [exercise, open]);

  const resetForm = () => {
    setTitle('');
    setPurpose('');
    setDurationMinutes(30);
    setGroupSize('1:1');
    setSelectedTags([]);
    setMaterialsNeeded(['']);
    setSteps([{ step: 1, title: '', description: '', duration: 5 }]);
    setFacilitatorTips('');
    setSuccessCriteria('');
    setCommonPitfalls('');
    setVariations('');
    setIsApproved(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addMaterial = () => setMaterialsNeeded((prev) => [...prev, '']);
  const removeMaterial = (index: number) =>
    setMaterialsNeeded((prev) => prev.filter((_, i) => i !== index));
  const updateMaterial = (index: number, value: string) =>
    setMaterialsNeeded((prev) => prev.map((m, i) => (i === index ? value : m)));

  const addStep = () =>
    setSteps((prev) => [...prev, { step: prev.length + 1, title: '', description: '', duration: 5 }]);
  const removeStep = (index: number) =>
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 }))
    );
  const updateStep = (index: number, field: keyof ExerciseStep, value: string | number) =>
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const exerciseStatus: 'draft' | 'approved' = isApproved ? 'approved' : 'draft';

    const data = {
      title: title.trim(),
      purpose: purpose.trim() || null,
      duration_minutes: durationMinutes,
      group_size: groupSize,
      startup_context_tags: selectedTags,
      materials_needed: materialsNeeded.filter((m) => m.trim()),
      step_by_step: steps.filter((s) => s.title.trim() || s.description.trim()),
      facilitator_tips: facilitatorTips.trim() || null,
      success_criteria: successCriteria.trim() || null,
      common_pitfalls: commonPitfalls.trim() || null,
      variations: variations.trim() || null,
      status: exerciseStatus,
    };

    try {
      if (exercise) {
        await updateMutation.mutateAsync({ id: exercise.id, ...data });
        toast.success('Exercise updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Exercise created');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save exercise');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {exercise ? 'Edit Exercise' : 'Create New Exercise'}
          </DialogTitle>
          <DialogDescription>
            Define the exercise details, steps, and facilitation guidelines.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Customer Discovery Interview Roleplay"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="When and why to use this exercise"
                  rows={2}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                  min={5}
                  max={180}
                />
              </div>
              <div>
                <Label>Group Size</Label>
                <Select value={groupSize} onValueChange={(v) => setGroupSize(v as typeof groupSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">1:1</SelectItem>
                    <SelectItem value="small_group">Small Group (2-5)</SelectItem>
                    <SelectItem value="cohort">Cohort (6+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Context Tags */}
            <div>
              <Label>Context Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CONTEXT_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedTags.includes(tag) && 'bg-primary'
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Materials Needed */}
            <div>
              <Label>Materials Needed</Label>
              <div className="space-y-2 mt-2">
                {materialsNeeded.map((material, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={material}
                      onChange={(e) => updateMaterial(index, e.target.value)}
                      placeholder="e.g., Whiteboard, sticky notes"
                    />
                    {materialsNeeded.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeMaterial(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMaterial}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add material
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div>
              <Label>Step-by-Step Instructions</Label>
              <div className="space-y-3 mt-2">
                {steps.map((step, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Step {step.step}</span>
                      {steps.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_80px]">
                      <Input
                        value={step.title}
                        onChange={(e) => updateStep(index, 'title', e.target.value)}
                        placeholder="Step title"
                      />
                      <Input
                        type="number"
                        value={step.duration || ''}
                        onChange={(e) => updateStep(index, 'duration', parseInt(e.target.value) || 0)}
                        placeholder="min"
                        min={0}
                      />
                    </div>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, 'description', e.target.value)}
                      placeholder="What happens in this step"
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add step
                </Button>
              </div>
            </div>

            {/* Facilitation */}
            <div className="grid gap-4">
              <div>
                <Label>Facilitator Tips</Label>
                <Textarea
                  value={facilitatorTips}
                  onChange={(e) => setFacilitatorTips(e.target.value)}
                  placeholder="What to watch for, how to redirect, key observations"
                  rows={3}
                />
              </div>
              <div>
                <Label>Success Criteria</Label>
                <Textarea
                  value={successCriteria}
                  onChange={(e) => setSuccessCriteria(e.target.value)}
                  placeholder="How do you know the exercise went well?"
                  rows={2}
                />
              </div>
              <div>
                <Label>Common Pitfalls</Label>
                <Textarea
                  value={commonPitfalls}
                  onChange={(e) => setCommonPitfalls(e.target.value)}
                  placeholder="Mistakes to avoid, things that often go wrong"
                  rows={2}
                />
              </div>
              <div>
                <Label>Variations (optional)</Label>
                <Textarea
                  value={variations}
                  onChange={(e) => setVariations(e.target.value)}
                  placeholder="Alternative ways to run this exercise"
                  rows={2}
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium text-sm">Approved</p>
                <p className="text-xs text-muted-foreground">
                  Approved exercises are visible to all consultors
                </p>
              </div>
              <Switch checked={isApproved} onCheckedChange={setIsApproved} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {exercise ? 'Save Changes' : 'Create Exercise'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
