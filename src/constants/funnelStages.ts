/**
 * Centralized funnel stage constants for CRM pipeline.
 * Single source of truth for stage values and labels.
 */

export const FUNNEL_STAGES = [
  'new',
  'first_contact_booked',
  'met',
  'qualified',
  'proposal_sent',
  'negotiating',
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
  contracted: 'pipeline.stages.contracted',
  incubating: 'pipeline.stages.incubating',
  accelerating: 'pipeline.stages.accelerating',
  rejected: 'pipeline.stages.rejected',
  archived: 'pipeline.stages.archived',
};

/** @deprecated Use STAGE_LABEL_KEYS with t() instead */
export const STAGE_LABELS: Record<FunnelStage, string> = {
  new: 'New',
  first_contact_booked: 'Meeting Booked',
  met: 'Met',
  qualified: 'Qualified',
  proposal_sent: 'Proposal Sent',
  negotiating: 'Negotiating',
  contracted: 'Contracted',
  incubating: 'Incubating',
  accelerating: 'Accelerating',
  rejected: 'Rejected',
  archived: 'Archived',
};

/** Stage options for dropdowns */
export const STAGE_OPTIONS: { value: FunnelStage; label: string }[] = FUNNEL_STAGES.map((s) => ({
  value: s,
  label: STAGE_LABELS[s],
}));

/** Pipeline stage options (excludes incubating/accelerating) */
export const PIPELINE_STAGE_OPTIONS = PIPELINE_STAGES.map((s) => ({
  value: s,
  label: STAGE_LABELS[s],
}));
