/**
 * Stage-aware KPI suggestions for founders.
 * Implements item E from the founder UX audit.
 */

export interface SuggestedKpi {
  name: string;
  description: string;
  unit: string;
  category: string;
  stage: string[];
}

export const STAGE_KPI_SUGGESTIONS: Record<string, SuggestedKpi[]> = {
  ideation: [
    {
      name: 'Customer Interviews',
      description: 'Number of potential customer interviews conducted',
      unit: 'count',
      category: 'Validation',
      stage: ['ideation'],
    },
    {
      name: 'Problem Validation Score',
      description: 'How strongly do customers feel this problem?',
      unit: 'score',
      category: 'Validation',
      stage: ['ideation'],
    },
    {
      name: 'Waitlist Signups',
      description: 'People interested in your solution',
      unit: 'count',
      category: 'Traction',
      stage: ['ideation', 'validation'],
    },
  ],
  validation: [
    {
      name: 'MRR',
      description: 'Monthly Recurring Revenue',
      unit: '€',
      category: 'Revenue',
      stage: ['validation', 'mvp', 'growth', 'scale'],
    },
    {
      name: 'Paying Customers',
      description: 'Number of paying customers',
      unit: 'count',
      category: 'Traction',
      stage: ['validation', 'mvp', 'growth'],
    },
    {
      name: 'Conversion Rate',
      description: 'Visitors to signups or signups to paid',
      unit: '%',
      category: 'Conversion',
      stage: ['validation', 'mvp', 'growth'],
    },
  ],
  mvp: [
    {
      name: 'MRR',
      description: 'Monthly Recurring Revenue',
      unit: '€',
      category: 'Revenue',
      stage: ['validation', 'mvp', 'growth', 'scale'],
    },
    {
      name: 'Active Users',
      description: 'Monthly active users',
      unit: 'count',
      category: 'Traction',
      stage: ['mvp', 'growth', 'scale'],
    },
    {
      name: 'Churn Rate',
      description: 'Monthly customer churn percentage',
      unit: '%',
      category: 'Retention',
      stage: ['mvp', 'growth', 'scale'],
    },
    {
      name: 'NPS',
      description: 'Net Promoter Score',
      unit: 'score',
      category: 'Satisfaction',
      stage: ['mvp', 'growth', 'scale'],
    },
  ],
  growth: [
    {
      name: 'MRR',
      description: 'Monthly Recurring Revenue',
      unit: '€',
      category: 'Revenue',
      stage: ['validation', 'mvp', 'growth', 'scale'],
    },
    {
      name: 'CAC',
      description: 'Customer Acquisition Cost',
      unit: '€',
      category: 'Unit Economics',
      stage: ['growth', 'scale'],
    },
    {
      name: 'LTV',
      description: 'Customer Lifetime Value',
      unit: '€',
      category: 'Unit Economics',
      stage: ['growth', 'scale'],
    },
    {
      name: 'LTV:CAC Ratio',
      description: 'Lifetime value to acquisition cost ratio',
      unit: 'ratio',
      category: 'Unit Economics',
      stage: ['growth', 'scale'],
    },
    {
      name: 'Burn Rate',
      description: 'Monthly cash burn',
      unit: '€',
      category: 'Financial',
      stage: ['growth', 'scale'],
    },
    {
      name: 'Runway',
      description: 'Months of runway remaining',
      unit: 'months',
      category: 'Financial',
      stage: ['growth', 'scale'],
    },
  ],
  scale: [
    {
      name: 'ARR',
      description: 'Annual Recurring Revenue',
      unit: '€',
      category: 'Revenue',
      stage: ['scale'],
    },
    {
      name: 'MRR',
      description: 'Monthly Recurring Revenue',
      unit: '€',
      category: 'Revenue',
      stage: ['validation', 'mvp', 'growth', 'scale'],
    },
    {
      name: 'Gross Margin',
      description: 'Gross profit margin percentage',
      unit: '%',
      category: 'Financial',
      stage: ['scale'],
    },
    {
      name: 'Net Revenue Retention',
      description: 'Revenue retained from existing customers',
      unit: '%',
      category: 'Retention',
      stage: ['scale'],
    },
    {
      name: 'CAC Payback',
      description: 'Months to recover CAC',
      unit: 'months',
      category: 'Unit Economics',
      stage: ['growth', 'scale'],
    },
  ],
};

/**
 * Get KPI suggestions for a given stage.
 * Falls back to validation stage if unknown.
 */
export function getKpiSuggestionsForStage(stage: string | null | undefined): SuggestedKpi[] {
  const normalizedStage = stage?.toLowerCase() || 'validation';
  return STAGE_KPI_SUGGESTIONS[normalizedStage] || STAGE_KPI_SUGGESTIONS.validation;
}

/**
 * Get all unique KPI suggestions across all stages.
 */
export function getAllKpiSuggestions(): SuggestedKpi[] {
  const allKpis: SuggestedKpi[] = [];
  const seen = new Set<string>();
  
  Object.values(STAGE_KPI_SUGGESTIONS).flat().forEach(kpi => {
    if (!seen.has(kpi.name)) {
      seen.add(kpi.name);
      allKpis.push(kpi);
    }
  });
  
  return allKpis;
}
