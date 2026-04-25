/**
 * Shared Canonical Lifecycle Sync — Server-Side (CANONICAL TRUTH)
 *
 * SINGLE source of truth for contract lifecycle synchronization across ALL edge functions.
 * All webhook handlers and signing paths MUST use these helpers instead of inline sync logic.
 *
 * Synchronizes: startup_contracts → contract_intakes → funnel_items (CRM) → workspaces
 *
 * CRM stages used here MUST be valid values from public.funnel_items.stage
 * (fine-grained DB stages — see src/constants/funnelStages.ts FUNNEL_STAGES).
 * The 7 macro pipeline columns (lead/qualified/proposal_negotiation/...) are a
 * UI grouping and are NEVER written to the DB directly.
 *
 * Note: src/lib/contractLifecycleSync.ts is a CLIENT MIRROR for UI-initiated
 * manual transitions only — server is canonical.
 */

/**
 * When a contract is sent for signature:
 * 1. Update linked intake to 'signature_sent'
 * 2. Log audit event
 * 3. Sync CRM to 'proposal'
 */
export async function syncIntakeOnSent(
  supabase: any,
  contractId: string,
  performedBy: string | null,
  source: string,
): Promise<{ synced: boolean; intakeId?: string }> {
  const { data: intake } = await supabase
    .from('contract_intakes')
    .select('id, status, funnel_item_id')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!intake) return { synced: false }

  // Don't regress: skip if already at or past signature_sent
  const PAST_SENT = ['signature_sent', 'signed', 'activated']
  if (PAST_SENT.includes(intake.status)) {
    return { synced: false, intakeId: intake.id }
  }

  await supabase
    .from('contract_intakes')
    .update({ status: 'signature_sent' })
    .eq('id', intake.id)

  await supabase.from('intake_events').insert({
    intake_id: intake.id,
    event_type: 'lifecycle_sync_signature_sent',
    from_status: intake.status,
    to_status: 'signature_sent',
    performed_by: performedBy,
    metadata: { source, contract_id: contractId },
  })

  if (intake.funnel_item_id) {
    await supabase.from('funnel_items')
      .update({ stage: 'proposal' })
      .eq('id', intake.funnel_item_id)
  }

  return { synced: true, intakeId: intake.id }
}

/**
 * When a contract is completed/signed:
 * 1. Update linked intake: signed → activated
 * 2. Log audit events for each transition
 * 3. Sync CRM to 'contracted'
 * 4. Activate workspace (only from pre-active states)
 */
export async function syncIntakeOnCompleted(
  supabase: any,
  contractId: string,
  workspaceId: string | null,
  performedBy: string | null,
  source: string,
): Promise<{ synced: boolean; intakeId?: string }> {
  const { data: intake } = await supabase
    .from('contract_intakes')
    .select('id, status, funnel_item_id')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (intake) {
    // Transition: current → signed
    await supabase
      .from('contract_intakes')
      .update({ status: 'signed' })
      .eq('id', intake.id)

    await supabase.from('intake_events').insert({
      intake_id: intake.id,
      event_type: 'lifecycle_sync_signed',
      from_status: intake.status,
      to_status: 'signed',
      performed_by: performedBy,
      metadata: { source, contract_id: contractId },
    })

    // Transition: signed → activated
    await supabase
      .from('contract_intakes')
      .update({ status: 'activated' })
      .eq('id', intake.id)

    await supabase.from('intake_events').insert({
      intake_id: intake.id,
      event_type: 'lifecycle_sync_activated',
      from_status: 'signed',
      to_status: 'activated',
      performed_by: performedBy,
      metadata: { source, contract_id: contractId },
    })

    // Sync CRM macro stage
    if (intake.funnel_item_id) {
      await supabase.from('funnel_items')
        .update({ stage: 'contracted' })
        .eq('id', intake.funnel_item_id)
    }
  }

  // Activate workspace (canonical gate: only from pre-active states)
  if (workspaceId) {
    await supabase.from('workspaces')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', workspaceId)
      .in('status', ['pending', 'claimed', 'imported_unclaimed'])
  }

  return { synced: true, intakeId: intake?.id }
}
