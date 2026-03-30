/**
 * Stage label utilities with i18n support
 * Provides consistent stage labeling across the application
 */

import type { FunnelStage } from '@/constants/funnelStages';
import type { StartupStage } from '@/types/database';
import type { TFunction } from 'i18next';

// Translation key mapping for funnel stages
export const FUNNEL_STAGE_KEYS: Record<FunnelStage, string> = {
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

// Translation key mapping for startup stages
export const STARTUP_STAGE_KEYS: Record<StartupStage, string> = {
  ideation: 'stages.ideation',
  validation: 'stages.validation',
  mvp: 'stages.mvp',
  growth: 'stages.growth',
  scale: 'stages.scale',
};

/**
 * Get funnel stage label using translation function
 */
export function getFunnelStageLabel(
  t: TFunction,
  stage: FunnelStage
): string {
  const key = FUNNEL_STAGE_KEYS[stage];
  // Fallback to capitalized stage name
  const fallback = stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return t(key, fallback);
}

/**
 * Get startup stage label using translation function
 */
export function getStartupStageLabel(
  t: TFunction,
  stage: StartupStage
): string {
  const key = STARTUP_STAGE_KEYS[stage];
  // Fallback to capitalized stage name
  const fallback = stage.charAt(0).toUpperCase() + stage.slice(1);
  return t(key, fallback);
}

/**
 * Get funnel stage options for dropdowns with i18n support
 */
export function getFunnelStageOptions(
  t: TFunction,
  stages: readonly FunnelStage[]
): { value: FunnelStage; label: string }[] {
  return stages.map(stage => ({
    value: stage,
    label: getFunnelStageLabel(t, stage),
  }));
}

/**
 * Get startup stage options for dropdowns with i18n support
 */
export function getStartupStageOptions(
  t: TFunction,
  stages: readonly StartupStage[]
): { value: StartupStage; label: string }[] {
  return stages.map(stage => ({
    value: stage,
    label: getStartupStageLabel(t, stage),
  }));
}
