import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PriorityBadge, WorkspacePriority } from '@/components/ui/PriorityBadge';
import { Star, ArrowUp, Minus, Archive, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PrioritySelectorProps {
  workspaceId: string;
  currentPriority: WorkspacePriority | null;
  currentNotes?: string | null;
  onUpdate?: () => void;
  disabled?: boolean;
}

const priorities: { value: WorkspacePriority; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'star', 
    label: 'Star', 
    description: 'Top performer, high potential',
    icon: <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
  },
  { 
    value: 'high', 
    label: 'High', 
    description: 'Promising, needs attention',
    icon: <ArrowUp className="h-4 w-4 text-blue-500" />
  },
  { 
    value: 'standard', 
    label: 'Standard', 
    description: 'Normal cadence',
    icon: <Minus className="h-4 w-4 text-muted-foreground" />
  },
  { 
    value: 'maintenance', 
    label: 'Maintenance', 
    description: 'Monthly check-in only',
    icon: <Archive className="h-4 w-4 text-muted-foreground/60" />
  },
];

export function PrioritySelector({ 
  workspaceId, 
  currentPriority, 
  currentNotes,
  onUpdate,
  disabled 
}: PrioritySelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<WorkspacePriority>(currentPriority || 'standard');
  const [notes, setNotes] = useState(currentNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          priority_level: selectedPriority,
          priority_notes: notes || null,
          priority_set_at: new Date().toISOString(),
          priority_set_by: user.id,
        })
        .eq('id', workspaceId);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        workspace_id: workspaceId,
        entity_type: 'workspace',
        entity_id: workspaceId,
        action: 'priority_changed',
        metadata: {
          from: currentPriority || 'standard',
          to: selectedPriority,
          notes: notes || null,
        },
      });

      toast({
        title: t('priority.updated', 'Priority updated'),
        description: t('priority.updatedDescription', 'Workspace priority has been updated'),
      });

      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      onUpdate?.();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('priority.updateFailed', 'Failed to update priority'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-0 hover:bg-transparent"
          disabled={disabled}
        >
          <PriorityBadge priority={currentPriority} size="sm" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">
              {t('priority.setLevel', 'Set Priority Level')}
            </h4>
            <div className="space-y-1">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPriority(p.value)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors",
                    selectedPriority === p.value 
                      ? "bg-primary/10 border border-primary/30" 
                      : "hover:bg-muted"
                  )}
                >
                  {p.icon}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="priority-notes" className="text-sm">
              {t('priority.notes', 'Notes (optional)')}
            </Label>
            <Textarea
              id="priority-notes"
              placeholder={t('priority.notesPlaceholder', 'Why this priority level?')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-20 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t('common.save', 'Save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
