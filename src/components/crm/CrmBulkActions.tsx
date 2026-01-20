import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Square,
  ArrowRight,
  UserPlus,
  Calendar,
  Tag,
  Trash2,
  MoreHorizontal,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CrmInboxItem } from '@/hooks/useCrmInbox';
import type { FunnelStage } from '@/hooks/useFunnel';

interface CrmBulkActionsProps {
  items: CrmInboxItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  consultants: { id: string; full_name: string | null }[];
}

const STAGE_OPTIONS: { value: FunnelStage; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'first_contact_booked', label: 'Meeting Booked' },
  { value: 'met', label: 'Met' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'contracted', label: 'Contracted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export function CrmBulkActions({
  items,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  consultants,
}: CrmBulkActionsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: string;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  const handleBulkStageChange = async (stage: FunnelStage) => {
    setConfirmDialog({
      action: 'stage_change',
      title: `Move ${selectedCount} leads to ${STAGE_OPTIONS.find((s) => s.value === stage)?.label}?`,
      description: 'This will update the stage for all selected leads and log the change.',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({ stage, updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          // Log events
          for (const id of ids) {
            await supabase.from('funnel_events').insert({
              funnel_item_id: id,
              event_type: 'stage_changed',
              to_stage: stage,
              metadata: { bulk_action: true },
            });
          }

          toast.success(`${selectedCount} leads moved to ${STAGE_OPTIONS.find((s) => s.value === stage)?.label}`);
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error('Failed to update leads');
          console.error(error);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleBulkAssign = async (consultantId: string) => {
    const consultant = consultants.find((c) => c.id === consultantId);
    setConfirmDialog({
      action: 'assign',
      title: `Assign ${selectedCount} leads to ${consultant?.full_name || 'consultant'}?`,
      description: 'This will update the owner for all selected leads.',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({ owner_consultant_id: consultantId, updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          toast.success(`${selectedCount} leads assigned to ${consultant?.full_name}`);
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error('Failed to assign leads');
          console.error(error);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleBulkSetNextAction = async () => {
    // For now, set next action to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    setConfirmDialog({
      action: 'next_action',
      title: `Set next action for ${selectedCount} leads?`,
      description: `This will set the next action date to tomorrow (${tomorrow.toLocaleDateString()}) for all selected leads without a next action.`,
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({
              next_action_at: tomorrow.toISOString(),
              next_action_description: 'Follow up',
              updated_at: new Date().toISOString(),
            })
            .in('id', ids)
            .is('next_action_at', null);

          if (error) throw error;

          toast.success(`Next actions set for leads`);
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error('Failed to set next actions');
          console.error(error);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleBulkArchive = async () => {
    setConfirmDialog({
      action: 'archive',
      title: `Archive ${selectedCount} leads?`,
      description: 'This will move all selected leads to the archived stage. You can restore them later if needed.',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({ stage: 'archived', updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          toast.success(`${selectedCount} leads archived`);
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error('Failed to archive leads');
          console.error(error);
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
        {/* Select All Checkbox */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={allSelected ? onClearSelection : onSelectAll}
        >
          {allSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : someSelected ? (
            <div className="h-4 w-4 border-2 rounded bg-primary/20" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>

        {selectedCount > 0 ? (
          <>
            <Badge variant="secondary" className="text-xs">
              {selectedCount} selected
            </Badge>

            {/* Bulk Actions */}
            <div className="flex items-center gap-1 ml-2">
              {/* Stage Change */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1" disabled={isProcessing}>
                    <ArrowRight className="h-3.5 w-3.5" />
                    Move to
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {STAGE_OPTIONS.map((stage) => (
                    <DropdownMenuItem
                      key={stage.value}
                      onClick={() => handleBulkStageChange(stage.value)}
                    >
                      {stage.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assign */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1" disabled={isProcessing}>
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {consultants.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => handleBulkAssign(c.id)}>
                      {c.full_name || 'Unnamed'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" disabled={isProcessing}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleBulkSetNextAction}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Set Next Action (Tomorrow)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleBulkArchive}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Archive Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear Selection */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={onClearSelection}
              >
                Clear
              </Button>
            </div>

            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Select leads to perform bulk actions
          </span>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {confirmDialog?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog?.onConfirm().then(() => setConfirmDialog(null))}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
