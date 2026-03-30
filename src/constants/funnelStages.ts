/**
 * Centralized funnel stage constants for CRM pipeline.
 * Single source of truth for stage values and labels.
 * 
 * V2: Redesigned to reflect the real contracting lifecycle:
 *   Lead → Qualified → Proposal → Intake Request → Customer Filling → Submitted → Review → Approved → Sent for Signature → Signed → Operational
 */

export const FUNNEL_STAGES = [
  'new',
  'first_contact_booked',
  'met',
  'qualified',
  'proposal_sent',
  'negotiating',
  'intake_requested',
  'intake_filling',
  'intake_submitted',
  'intake_review',
  'intake_changes_requested',
  'approved_for_signature',
  'sent_for_signature',
  'contracted',
  'incubating',
  'accelerating',
  'rejected',
  'archived',
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_TYPES = [
  'lead',
  'contract',
  'startup_candidate',
  'startup_active',
] as const;

export type FunnelType = (typeof FUNNEL_TYPES)[number];

/** Stages visible in the main pipeline Kanban board */
export const PIPELINE_STAGES: FunnelStage[] = [
  'new',
  'first_contact_booked',
  'met',
  'qualified',
  'proposal_sent',
  'negotiating',
  'intake_requested',
  'intake_filling',
  'intake_submitted',
  'intake_review',
  'approved_for_signature',
  'sent_for_signature',
  'contracted',
];

/** i18n label keys for each stage – resolve via t(STAGE_LABEL_KEYS[stage]) */
export const STAGE_LABEL_KEYS: Record<FunnelStage, string> = {
  new: 'pipeline.stages.new',
  first_contact_booked: 'pipeline.stages.first_contact_booked',
  met: 'pipeline.stages.met',
  qualified: 'pipeline.stages.qualified',
  proposal_sent: 'pipeline.stages.proposal_sent',
  negotiating: 'pipeline.stages.negotiating',
  intake_requested: 'pipeline.stages.intake_requested',
  intake_filling: 'pipeline.stages.intake_filling',
  intake_submitted: 'pipeline.stages.intake_submitted',
  intake_review: 'pipeline.stages.intake_review',
  intake_changes_requested: 'pipeline.stages.intake_changes_requested',
  approved_for_signature: 'pipeline.stages.approved_for_signature',
  sent_for_signature: 'pipeline.stages.sent_for_signature',
  contracted: 'pipeline.stages.contracted',
  incubating: 'pipeline.stages.incubating',
  accelerating: 'pipeline.stages.accelerating',
  rejected: 'pipeline.stages.rejected',
  archived: 'pipeline.stages.archived',
};

/** @deprecated Use STAGE_LABEL_KEYS with t() instead — kept only for non-i18n fallback contexts */
export const STAGE_LABELS: Record<FunnelStage, string> = {
  new: 'Novo',
  first_contact_booked: 'Reunião Marcada',
  met: 'Reunião Realizada',
  qualified: 'Qualificado',
  proposal_sent: 'Proposta Enviada',
  negotiating: 'Negociação',
  intake_requested: 'Pedido Enviado',
  intake_filling: 'A Preencher',
  intake_submitted: 'Submetido',
  intake_review: 'Em Revisão',
  intake_changes_requested: 'Correções Pedidas',
  approved_for_signature: 'Aprovado p/ Assinatura',
  sent_for_signature: 'Enviado p/ Assinatura',
  contracted: 'Contratado',
  incubating: 'Em Incubação',
  accelerating: 'Em Aceleração',
  rejected: 'Rejeitado',
  archived: 'Arquivado',
};
