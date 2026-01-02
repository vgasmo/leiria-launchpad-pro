// KPI Auto-Generator for Program Setup Wizard
// Generates stage-appropriate KPI suggestions based on startup stage

import type { Database } from '@/integrations/supabase/types';

type StartupStage = Database['public']['Enums']['startup_stage'];

export interface GeneratedKpi {
  name: string;
  unit: string;
  category: string;
  description: string;
  direction: 'up' | 'down';
  is_required: boolean;
  order_index: number;
  target_value?: number;
}

interface StageKpiConfig {
  stage_key: StartupStage;
  kpis: GeneratedKpi[];
}

// Stage-specific KPI templates
const STAGE_KPI_TEMPLATES: Record<StartupStage, GeneratedKpi[]> = {
  ideation: [
    {
      name: 'Customer Interviews',
      unit: '#',
      category: 'discovery',
      description: 'Number of customer discovery interviews conducted',
      direction: 'up',
      is_required: true,
      order_index: 0,
      target_value: 20,
    },
    {
      name: 'ICP Defined',
      unit: 'score',
      category: 'discovery',
      description: 'Ideal Customer Profile clarity (0-100)',
      direction: 'up',
      is_required: true,
      order_index: 1,
      target_value: 80,
    },
    {
      name: 'Experiments Run',
      unit: '#',
      category: 'validation',
      description: 'Number of validation experiments conducted',
      direction: 'up',
      is_required: false,
      order_index: 2,
      target_value: 5,
    },
    {
      name: 'Value Proposition Score',
      unit: 'score',
      category: 'discovery',
      description: 'Value proposition validation score (0-100)',
      direction: 'up',
      is_required: true,
      order_index: 3,
      target_value: 70,
    },
    {
      name: 'Problem-Solution Fit',
      unit: '%',
      category: 'validation',
      description: 'Percentage of interviewees confirming problem-solution fit',
      direction: 'up',
      is_required: false,
      order_index: 4,
      target_value: 60,
    },
  ],
  validation: [
    {
      name: 'Landing Page Conversion',
      unit: '%',
      category: 'growth',
      description: 'Visitor to signup conversion rate',
      direction: 'up',
      is_required: true,
      order_index: 0,
      target_value: 5,
    },
    {
      name: 'Waitlist Signups',
      unit: '#',
      category: 'growth',
      description: 'Total email signups collected',
      direction: 'up',
      is_required: true,
      order_index: 1,
      target_value: 100,
    },
    {
      name: 'Weekly Active Users',
      unit: '#',
      category: 'engagement',
      description: 'Users active in the last 7 days',
      direction: 'up',
      is_required: true,
      order_index: 2,
      target_value: 50,
    },
    {
      name: 'Retention Rate',
      unit: '%',
      category: 'engagement',
      description: 'Week-over-week user retention',
      direction: 'up',
      is_required: false,
      order_index: 3,
      target_value: 40,
    },
    {
      name: 'Estimated CAC',
      unit: '€',
      category: 'revenue',
      description: 'Estimated customer acquisition cost',
      direction: 'down',
      is_required: false,
      order_index: 4,
    },
  ],
  mvp: [
    {
      name: 'MRR',
      unit: '€',
      category: 'revenue',
      description: 'Monthly Recurring Revenue',
      direction: 'up',
      is_required: true,
      order_index: 0,
    },
    {
      name: 'Monthly Churn Rate',
      unit: '%',
      category: 'retention',
      description: 'Percentage of customers lost per month',
      direction: 'down',
      is_required: true,
      order_index: 1,
      target_value: 5,
    },
    {
      name: 'Activation Rate',
      unit: '%',
      category: 'engagement',
      description: 'Percentage of signups completing key action',
      direction: 'up',
      is_required: true,
      order_index: 2,
      target_value: 40,
    },
    {
      name: 'NPS Score',
      unit: 'score',
      category: 'satisfaction',
      description: 'Net Promoter Score (-100 to 100)',
      direction: 'up',
      is_required: false,
      order_index: 3,
      target_value: 30,
    },
    {
      name: 'Paying Customers',
      unit: '#',
      category: 'revenue',
      description: 'Total number of paying customers',
      direction: 'up',
      is_required: true,
      order_index: 4,
      target_value: 10,
    },
  ],
  growth: [
    {
      name: 'MRR Growth Rate',
      unit: '%',
      category: 'revenue',
      description: 'Month-over-month MRR growth',
      direction: 'up',
      is_required: true,
      order_index: 0,
      target_value: 15,
    },
    {
      name: 'LTV:CAC Ratio',
      unit: 'ratio',
      category: 'unit_economics',
      description: 'Customer lifetime value to acquisition cost ratio',
      direction: 'up',
      is_required: true,
      order_index: 1,
      target_value: 3,
    },
    {
      name: 'Payback Period',
      unit: 'months',
      category: 'unit_economics',
      description: 'Months to recover customer acquisition cost',
      direction: 'down',
      is_required: true,
      order_index: 2,
      target_value: 12,
    },
    {
      name: 'Gross Margin',
      unit: '%',
      category: 'profitability',
      description: 'Revenue minus cost of goods sold percentage',
      direction: 'up',
      is_required: false,
      order_index: 3,
      target_value: 70,
    },
    {
      name: 'MAU',
      unit: '#',
      category: 'engagement',
      description: 'Monthly Active Users',
      direction: 'up',
      is_required: true,
      order_index: 4,
    },
  ],
  scale: [
    {
      name: 'ARR',
      unit: '€',
      category: 'revenue',
      description: 'Annual Recurring Revenue',
      direction: 'up',
      is_required: true,
      order_index: 0,
    },
    {
      name: 'Burn Rate',
      unit: '€',
      category: 'financial',
      description: 'Monthly cash burn',
      direction: 'down',
      is_required: true,
      order_index: 1,
    },
    {
      name: 'Runway',
      unit: 'months',
      category: 'financial',
      description: 'Months of runway remaining',
      direction: 'up',
      is_required: true,
      order_index: 2,
      target_value: 18,
    },
    {
      name: 'Headcount',
      unit: '#',
      category: 'team',
      description: 'Total full-time employees',
      direction: 'up',
      is_required: false,
      order_index: 3,
    },
    {
      name: 'Net Revenue Retention',
      unit: '%',
      category: 'retention',
      description: 'Revenue retention including expansion',
      direction: 'up',
      is_required: true,
      order_index: 4,
      target_value: 110,
    },
  ],
};

// Core KPIs that span across stages (pick from these for core)
const CORE_KPI_CANDIDATES = [
  'MRR',
  'ARR',
  'MAU',
  'Paying Customers',
  'Monthly Churn Rate',
  'LTV:CAC Ratio',
  'NPS Score',
  'Runway',
  'MRR Growth Rate',
  'Activation Rate',
];

export function generateKpisForStages(activeStages: StartupStage[]): StageKpiConfig[] {
  return activeStages.map((stage) => ({
    stage_key: stage,
    kpis: STAGE_KPI_TEMPLATES[stage] || [],
  }));
}

export function suggestCoreKpis(stageKpis: StageKpiConfig[]): GeneratedKpi[] {
  // Collect all unique KPIs across active stages
  const allKpis = stageKpis.flatMap((s) => s.kpis);
  const uniqueKpis = new Map<string, GeneratedKpi>();

  for (const kpi of allKpis) {
    if (!uniqueKpis.has(kpi.name)) {
      uniqueKpis.set(kpi.name, kpi);
    }
  }

  // Filter to core candidates that exist in active stages
  const coreKpis: GeneratedKpi[] = [];
  let orderIndex = 0;

  for (const candidateName of CORE_KPI_CANDIDATES) {
    const kpi = uniqueKpis.get(candidateName);
    if (kpi && coreKpis.length < 6) {
      coreKpis.push({ ...kpi, order_index: orderIndex++ });
    }
  }

  // Ensure minimum 3 core KPIs - add required KPIs if needed
  if (coreKpis.length < 3) {
    for (const kpi of allKpis) {
      if (kpi.is_required && !coreKpis.find((c) => c.name === kpi.name)) {
        coreKpis.push({ ...kpi, order_index: orderIndex++ });
        if (coreKpis.length >= 3) break;
      }
    }
  }

  return coreKpis.slice(0, 6);
}

export function getAllStageKeys(): StartupStage[] {
  return ['ideation', 'validation', 'mvp', 'growth', 'scale'];
}

export function getStageLabel(stage: StartupStage): string {
  const labels: Record<StartupStage, string> = {
    ideation: 'Ideation',
    validation: 'Validation',
    mvp: 'MVP',
    growth: 'Growth',
    scale: 'Scale',
  };
  return labels[stage];
}

export function getStageDescription(stage: StartupStage): string {
  const descriptions: Record<StartupStage, string> = {
    ideation: 'Problem discovery and initial validation',
    validation: 'Market validation and early traction',
    mvp: 'Minimum viable product and first customers',
    growth: 'Scaling acquisition and retention',
    scale: 'Expanding operations and market reach',
  };
  return descriptions[stage];
}