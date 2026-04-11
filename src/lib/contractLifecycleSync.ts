/**
 * Canonical Contract Lifecycle Sync
 * 
 * Ensures that when contract signature events occur (sent, signed, activated),
 * the linked contract_intakes and CRM funnel_items are kept in sync.
 * 
 * This is the SINGLE source of truth for lifecycle synchronization.
 * All manual buttons, webhooks, and bulk paths must use these helpers.
 */
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { INTAKE_TO_CRM_STAGE, type IntakeState } from '@/constants/intakeStates';

/**
 * After a contract signature event, sync the linked intake and CRM stage.
 * 
 * @param contractId - The startup_contracts.id
 * @param targetIntakeStatus - The intake status to transition to
 * @param userId - The user performing the action (for audit trail)
 */
export async function syncIntakeOnContractEvent(
  contractId: string,
  targetIntakeStatus: IntakeState,
  userId?: string,
): Promise<{ synced: boolean; intakeId?: string; error?: string }> {
  try {
    // Find the linked intake
    const { data: intake, error: findErr } = await supabase
      .from('contract_intakes')
      .select('id, status, funnel_item_id')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr) {
      logger.warn('lifecycle_sync_find_failed', { contractId, error: findErr.message });
      return { synced: false, error: findErr.message };
    }

    if (!intake) {
      // No intake linked — this is valid for legacy/manual contracts
      logger.info('lifecycle_sync_no_intake', { contractId, targetIntakeStatus });
      return { synced: false, error: 'no_linked_intake' };
    }

    // Don't regress intake status (e.g., don't go from 'activated' back to 'signed')
    const STATUS_ORDER: IntakeState[] = [
      'draft_internal', 'intake_requested', 'intake_in_progress', 'intake_submitted',
      'review_pending', 'changes_requested', 'approved_for_signature',
      'signature_sent', 'signed', 'activated',
    ];
    const currentIdx = STATUS_ORDER.indexOf(intake.status as IntakeState);
    const targetIdx = STATUS_ORDER.indexOf(targetIntakeStatus);
    
    if (currentIdx >= targetIdx && intake.status !== 'cancelled') {
      logger.info('lifecycle_sync_skip_regression', {
        contractId, intakeId: intake.id,
        currentStatus: intake.status, targetStatus: targetIntakeStatus,
      });
      return { synced: false, intakeId: intake.id, error: 'would_regress' };
    }

    // Update intake status
    const { error: updateErr } = await supabase
      .from('contract_intakes')
      .update({ status: targetIntakeStatus })
      .eq('id', intake.id);

    if (updateErr) {
      logger.error('lifecycle_sync_update_failed', { intakeId: intake.id, error: updateErr.message });
      return { synced: false, intakeId: intake.id, error: updateErr.message };
    }

    // Log audit event
    await supabase.from('intake_events').insert({
      intake_id: intake.id,
      event_type: `lifecycle_sync_${targetIntakeStatus}`,
      from_status: intake.status,
      to_status: targetIntakeStatus,
      performed_by: userId || null,
      metadata: { source: 'contract_lifecycle_sync', contract_id: contractId },
    });

    // Sync CRM stage
    if (intake.funnel_item_id) {
      const crmStage = INTAKE_TO_CRM_STAGE[targetIntakeStatus];
      if (crmStage) {
        await supabase.from('funnel_items')
          .update({ stage: crmStage })
          .eq('id', intake.funnel_item_id);
        logger.info('lifecycle_sync_crm_updated', {
          funnelItemId: intake.funnel_item_id, crmStage,
        });
      }
    }

    logger.info('lifecycle_sync_completed', {
      contractId, intakeId: intake.id,
      fromStatus: intake.status, toStatus: targetIntakeStatus,
    });

    return { synced: true, intakeId: intake.id };
  } catch (err: any) {
    logger.error('lifecycle_sync_error', { contractId, error: err?.message });
    return { synced: false, error: err?.message };
  }
}

/**
 * Full canonical "mark as signed" flow:
 * 1. Update startup_contracts (signed_at, signature_status, status)
 * 2. Sync intake to 'signed'
 * 3. Activate workspace (only if contract is truly signed)
 * 4. Sync intake to 'activated'
 * 5. Sync CRM stage
 */
export async function canonicalMarkAsSigned(
  contractId: string,
  workspaceId: string | null,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update contract to signed
    const { error: contractErr } = await supabase
      .from('startup_contracts')
      .update({
        signature_status: 'signed',
        signed_at: new Date().toISOString(),
        status: 'active',
      } as any)
      .eq('id', contractId);

    if (contractErr) throw contractErr;

    // 2. Sync intake to 'signed'
    await syncIntakeOnContractEvent(contractId, 'signed', userId);

    // 3. Activate workspace only if contract is truly signed
    if (workspaceId) {
      // Only activate workspaces that are in pre-active states
      await supabase.from('workspaces')
        .update({ status: 'active', updated_at: new Date().toISOString() } as any)
        .eq('id', workspaceId)
        .in('status', ['pending', 'claimed', 'imported_unclaimed']);
    }

    // 4. Sync intake to 'activated'
    await syncIntakeOnContractEvent(contractId, 'activated', userId);

    return { success: true };
  } catch (err: any) {
    logger.error('canonical_mark_signed_error', { contractId, error: err?.message });
    return { success: false, error: err?.message };
  }
}

/**
 * Canonical "mark as sent for signature" flow:
 * 1. Update startup_contracts signature fields
 * 2. Sync intake to 'signature_sent'
 */
export async function canonicalMarkAsSent(
  contractId: string,
  provider: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('startup_contracts')
      .update({
        status: 'pending_signature',
        signature_provider: provider,
        signature_status: 'sent_for_signature',
        signature_requested_at: new Date().toISOString(),
      } as any)
      .eq('id', contractId);

    if (error) throw error;

    // Sync intake
    await syncIntakeOnContractEvent(contractId, 'signature_sent', userId);

    return { success: true };
  } catch (err: any) {
    logger.error('canonical_mark_sent_error', { contractId, error: err?.message });
    return { success: false, error: err?.message };
  }
}
