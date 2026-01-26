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
import { PIPELINE_STAGES, type FunnelStage } from '@/constants/funnelStages';
import { getFunnelStageLabel, getFunnelStageOptions } from '@/lib/stageLabels';

interface CrmBulkActionsProps {
  items: CrmInboxItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  consultants: { id: string; full_name: string | null }[];
}

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

  // Build stage options with i18n
  const STAGE_OPTIONS = [
    ...getFunnelStageOptions(t, PIPELINE_STAGES),
    { value: 'rejected' as FunnelStage, label: t('pipeline.stages.rejected', 'Rejected') },
    { value: 'archived' as FunnelStage, label: t('pipeline.stages.archived', 'Archived') },
  ];

  const handleBulkStageChange = async (newStage: FunnelStage) => {
    const stageLabel = getFunnelStageLabel(t, newStage);
    setConfirmDialog({
      action: 'stage_change',
      title: t('crm.bulk.moveConfirmTitle', 'Move {{count}} leads to {{stage}}?', { count: selectedCount, stage: stageLabel }),
      description: t('crm.bulk.moveConfirmDesc', 'This will update the stage for all selected leads, log the change, and trigger any configured emails.'),
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          
          // Fetch current stages for each item (needed for email trigger)
          const { data: currentItems } = await supabase
            .from('funnel_items')
            .select('id, stage')
            .in('id', ids);
          
          const stageMap = new Map(currentItems?.map(i => [i.id, i.stage]) || []);
          
          const { error } = await supabase
            .from('funnel_items')
            .update({ stage: newStage, updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          // Log events and trigger emails for each item
          for (const id of ids) {
            const oldStage = stageMap.get(id);
            
            await supabase.from('funnel_events').insert({
              funnel_item_id: id,
              event_type: 'stage_changed',
              from_stage: oldStage,
              to_stage: newStage,
              metadata: { bulk_action: true },
            });
            
            // Trigger CRM stage transition email (fire-and-forget)
            if (oldStage && oldStage !== newStage) {
              supabase.functions.invoke('send-crm-stage-transition-email', {
                body: { funnel_item_id: id, from_stage: oldStage, to_stage: newStage },
              }).catch((err) => console.warn('CRM email trigger failed (bulk):', err));
            }
          }

          toast.success(t('crm.bulk.moveSuccess', '{{count}} leads moved to {{stage}}', { count: selectedCount, stage: stageLabel }));
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error(t('crm.bulk.moveFailed', 'Failed to update leads'));
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
      title: t('crm.bulk.assignConfirmTitle', 'Assign {{count}} leads to {{name}}?', { count: selectedCount, name: consultant?.full_name || t('common.unknown', 'Unknown') }),
      description: t('crm.bulk.assignConfirmDesc', 'This will update the owner for all selected leads.'),
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({ owner_consultant_id: consultantId, updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          toast.success(t('crm.bulk.assignSuccess', '{{count}} leads assigned to {{name}}', { count: selectedCount, name: consultant?.full_name }));
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error(t('crm.bulk.assignFailed', 'Failed to assign leads'));
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
      title: t('crm.bulk.nextActionConfirmTitle', 'Set next action for {{count}} leads?', { count: selectedCount }),
      description: t('crm.bulk.nextActionConfirmDesc', 'This will set the next action date to tomorrow ({{date}}) for all selected leads without a next action.', { date: tomorrow.toLocaleDateString() }),
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

          toast.success(t('crm.bulk.nextActionSuccess', 'Next actions set for leads'));
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error(t('crm.bulk.nextActionFailed', 'Failed to set next actions'));
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
      title: t('crm.bulk.archiveConfirmTitle', 'Archive {{count}} leads?', { count: selectedCount }),
      description: t('crm.bulk.archiveConfirmDesc', 'This will move all selected leads to the archived stage. You can restore them later if needed.'),
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          const ids = Array.from(selectedIds);
          const { error } = await supabase
            .from('funnel_items')
            .update({ stage: 'archived', updated_at: new Date().toISOString() })
            .in('id', ids);

          if (error) throw error;

          toast.success(t('crm.bulk.archiveSuccess', '{{count}} leads archived', { count: selectedCount }));
          queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] });
          queryClient.invalidateQueries({ queryKey: ['crm-inbox'] });
          onClearSelection();
        } catch (error) {
          toast.error(t('crm.bulk.archiveFailed', 'Failed to archive leads'));
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
              {t('crm.bulk.selectedCount', '{{count}} selected', { count: selectedCount })}
            </Badge>

            {/* Bulk Actions */}
            <div className="flex items-center gap-1 ml-2">
              {/* Stage Change */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1" disabled={isProcessing}>
                    <ArrowRight className="h-3.5 w-3.5" />
                    {t('crm.bulk.moveTo', 'Move to')}
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
                    {t('crm.bulk.assign', 'Assign')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {consultants.map((c) => (
                    <DropdownMenuItem key={c.id} onClick={() => handleBulkAssign(c.id)}>
                      {c.full_name || t('common.unknown', 'Unknown')}
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
                    {t('crm.bulk.setNextAction', 'Set Next Action (Tomorrow)')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleBulkArchive}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('crm.bulk.archiveSelected', 'Archive Selected')}
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
                {t('common.clear', 'Clear')}
              </Button>
            </div>

            {isProcessing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t('crm.bulk.selectLeads', 'Select leads to perform bulk actions')}
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
            <AlertDialogCancel disabled={isProcessing}>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog?.onConfirm().then(() => setConfirmDialog(null))}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.loading', 'Processing...')}
                </>
              ) : (
                t('common.confirm', 'Confirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
