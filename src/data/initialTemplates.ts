import type { TemplateSchema } from '@/hooks/useTemplates';

export const INITIAL_TEMPLATES: {
  name: string;
  description: string;
  category: string;
  schema_json: TemplateSchema;
}[] = [
  {
    name: 'Lean Canvas',
    description: 'One-page business model for startups',
    category: 'Strategy',
    schema_json: {
      sections: [
        {
          title: 'Problem',
          fields: [
            { id: 'problems', label: 'Top 3 Problems', type: 'textarea', rows: 3, placeholder: 'List the top 3 problems you are solving' },
            { id: 'existing_alternatives', label: 'Existing Alternatives', type: 'textarea', rows: 2, placeholder: 'How are these problems solved today?' },
          ],
        },
        {
          title: 'Solution',
          fields: [
            { id: 'solutions', label: 'Top 3 Features', type: 'textarea', rows: 3, placeholder: 'List the top 3 features that address the problems' },
          ],
        },
        {
          title: 'Key Metrics',
          fields: [
            { id: 'key_metrics', label: 'Key Activities You Measure', type: 'textarea', rows: 3, placeholder: 'What metrics define success?' },
          ],
        },
        {
          title: 'Unique Value Proposition',
          fields: [
            { id: 'uvp', label: 'Single, Clear Message', type: 'textarea', rows: 2, placeholder: 'What makes you different and worth paying attention to?' },
            { id: 'high_level_concept', label: 'High-Level Concept', type: 'text', placeholder: 'e.g., YouTube for Pets' },
          ],
        },
        {
          title: 'Unfair Advantage',
          fields: [
            { id: 'unfair_advantage', label: 'Unfair Advantage', type: 'textarea', rows: 2, placeholder: 'Something that cannot be easily copied or bought' },
          ],
        },
        {
          title: 'Channels',
          fields: [
            { id: 'channels', label: 'Path to Customers', type: 'textarea', rows: 2, placeholder: 'How will you reach your customers?' },
          ],
        },
        {
          title: 'Customer Segments',
          fields: [
            { id: 'customer_segments', label: 'Target Customers', type: 'textarea', rows: 2, placeholder: 'Who are your target customers?' },
            { id: 'early_adopters', label: 'Early Adopters', type: 'textarea', rows: 2, placeholder: 'Who will be your first customers?' },
          ],
        },
        {
          title: 'Cost Structure',
          fields: [
            { id: 'cost_structure', label: 'Fixed and Variable Costs', type: 'textarea', rows: 2, placeholder: 'List your main costs' },
          ],
        },
        {
          title: 'Revenue Streams',
          fields: [
            { id: 'revenue_streams', label: 'Revenue Model', type: 'textarea', rows: 2, placeholder: 'How will you make money?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Business Model Canvas',
    description: 'High-level business model overview',
    category: 'Strategy',
    schema_json: {
      sections: [
        {
          title: 'Key Partners',
          fields: [
            { id: 'key_partners', label: 'Strategic Partners & Suppliers', type: 'textarea', rows: 3, placeholder: 'Who are your key partners and suppliers?' },
          ],
        },
        {
          title: 'Key Activities',
          fields: [
            { id: 'key_activities', label: 'Core Activities', type: 'textarea', rows: 3, placeholder: 'What key activities does your value proposition require?' },
          ],
        },
        {
          title: 'Key Resources',
          fields: [
            { id: 'key_resources', label: 'Required Resources', type: 'textarea', rows: 3, placeholder: 'What key resources does your value proposition require?' },
          ],
        },
        {
          title: 'Value Propositions',
          fields: [
            { id: 'value_propositions', label: 'Value Delivered', type: 'textarea', rows: 3, placeholder: 'What value do you deliver to the customer?' },
          ],
        },
        {
          title: 'Customer Relationships',
          fields: [
            { id: 'customer_relationships', label: 'Relationship Types', type: 'textarea', rows: 3, placeholder: 'What type of relationship does each customer segment expect?' },
          ],
        },
        {
          title: 'Channels',
          fields: [
            { id: 'channels', label: 'Distribution Channels', type: 'textarea', rows: 3, placeholder: 'Through which channels do your customers want to be reached?' },
          ],
        },
        {
          title: 'Customer Segments',
          fields: [
            { id: 'customer_segments', label: 'Target Segments', type: 'textarea', rows: 3, placeholder: 'For whom are you creating value?' },
          ],
        },
        {
          title: 'Cost Structure',
          fields: [
            { id: 'cost_structure', label: 'Major Costs', type: 'textarea', rows: 3, placeholder: 'What are the most important costs inherent in your business model?' },
          ],
        },
        {
          title: 'Revenue Streams',
          fields: [
            { id: 'revenue_streams', label: 'Revenue Sources', type: 'textarea', rows: 3, placeholder: 'For what value are your customers willing to pay?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Quarterly OKRs',
    description: 'Objectives and Key Results for the quarter',
    category: 'Goals',
    schema_json: {
      sections: [
        {
          title: 'Objective 1',
          fields: [
            { id: 'objective_1', label: 'Objective', type: 'text', placeholder: 'What do you want to achieve?' },
            { id: 'kr_1_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_1_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_1_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome' },
          ],
        },
        {
          title: 'Objective 2',
          fields: [
            { id: 'objective_2', label: 'Objective', type: 'text', placeholder: 'What do you want to achieve?' },
            { id: 'kr_2_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_2_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_2_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome' },
          ],
        },
        {
          title: 'Objective 3',
          fields: [
            { id: 'objective_3', label: 'Objective', type: 'text', placeholder: 'What do you want to achieve?' },
            { id: 'kr_3_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_3_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_3_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome' },
          ],
        },
      ],
    },
  },
  {
    name: 'Go-to-Market Plan',
    description: 'Strategy for launching and growing your product',
    category: 'Growth',
    schema_json: {
      sections: [
        {
          title: 'Target Market',
          fields: [
            { id: 'target_audience', label: 'Target Audience', type: 'textarea', rows: 2, placeholder: 'Who is your ideal customer?' },
            { id: 'market_size', label: 'Market Size (TAM/SAM/SOM)', type: 'textarea', rows: 2, placeholder: 'Estimate your market size' },
            { id: 'buyer_personas', label: 'Buyer Personas', type: 'textarea', rows: 3, placeholder: 'Describe your key buyer personas' },
          ],
        },
        {
          title: 'Positioning',
          fields: [
            { id: 'positioning_statement', label: 'Positioning Statement', type: 'textarea', rows: 2, placeholder: 'How do you want to be perceived?' },
            { id: 'competitive_advantage', label: 'Competitive Advantage', type: 'textarea', rows: 2, placeholder: 'What makes you better than alternatives?' },
          ],
        },
        {
          title: 'Pricing Strategy',
          fields: [
            { id: 'pricing_model', label: 'Pricing Model', type: 'text', placeholder: 'e.g., Subscription, One-time, Freemium' },
            { id: 'price_points', label: 'Price Points', type: 'textarea', rows: 2, placeholder: 'List your pricing tiers' },
          ],
        },
        {
          title: 'Distribution Channels',
          fields: [
            { id: 'primary_channels', label: 'Primary Channels', type: 'textarea', rows: 2, placeholder: 'How will you reach customers?' },
            { id: 'partnerships', label: 'Channel Partnerships', type: 'textarea', rows: 2, placeholder: 'Any distribution partners?' },
          ],
        },
        {
          title: 'Marketing Strategy',
          fields: [
            { id: 'acquisition_channels', label: 'Acquisition Channels', type: 'textarea', rows: 2, placeholder: 'Content, Paid ads, SEO, etc.' },
            { id: 'launch_plan', label: 'Launch Plan', type: 'textarea', rows: 3, placeholder: 'Key activities for launch' },
          ],
        },
        {
          title: 'Sales Strategy',
          fields: [
            { id: 'sales_process', label: 'Sales Process', type: 'textarea', rows: 2, placeholder: 'How will you sell?' },
            { id: 'sales_targets', label: 'Sales Targets', type: 'textarea', rows: 2, placeholder: 'Revenue and customer targets' },
          ],
        },
      ],
    },
  },
  {
    name: 'Unit Economics',
    description: 'Key financial metrics per customer',
    category: 'Finance',
    schema_json: {
      sections: [
        {
          title: 'Customer Acquisition',
          fields: [
            { id: 'cac', label: 'Customer Acquisition Cost (CAC)', type: 'number', placeholder: '0' },
            { id: 'cac_breakdown', label: 'CAC Breakdown', type: 'textarea', rows: 2, placeholder: 'Marketing + Sales costs breakdown' },
          ],
        },
        {
          title: 'Customer Value',
          fields: [
            { id: 'arpu', label: 'Average Revenue Per User (ARPU)', type: 'number', placeholder: '0' },
            { id: 'ltv', label: 'Lifetime Value (LTV)', type: 'number', placeholder: '0' },
            { id: 'ltv_calculation', label: 'LTV Calculation', type: 'textarea', rows: 2, placeholder: 'How did you calculate LTV?' },
          ],
        },
        {
          title: 'Retention',
          fields: [
            { id: 'churn_rate', label: 'Monthly Churn Rate (%)', type: 'number', placeholder: '0' },
            { id: 'avg_customer_lifetime', label: 'Average Customer Lifetime (months)', type: 'number', placeholder: '0' },
          ],
        },
        {
          title: 'Margins',
          fields: [
            { id: 'gross_margin', label: 'Gross Margin (%)', type: 'number', placeholder: '0' },
            { id: 'contribution_margin', label: 'Contribution Margin (%)', type: 'number', placeholder: '0' },
          ],
        },
        {
          title: 'Key Ratios',
          fields: [
            { id: 'ltv_cac_ratio', label: 'LTV:CAC Ratio', type: 'text', placeholder: 'e.g., 3:1' },
            { id: 'payback_period', label: 'CAC Payback Period (months)', type: 'number', placeholder: '0' },
          ],
        },
        {
          title: 'Notes',
          fields: [
            { id: 'assumptions', label: 'Key Assumptions', type: 'textarea', rows: 3, placeholder: 'Document your assumptions' },
          ],
        },
      ],
    },
  },
  {
    name: 'Pitch Deck Checklist',
    description: 'Essential slides for your investor pitch',
    category: 'Fundraising',
    schema_json: {
      sections: [
        {
          title: 'Pitch Deck Slides',
          description: 'Check off each slide as you complete it',
          fields: [
            { id: 'slides', label: 'Required Slides', type: 'checklist', options: [
              'Title/Cover slide',
              'Problem statement',
              'Solution overview',
              'Market opportunity (TAM/SAM/SOM)',
              'Product demo/screenshots',
              'Business model',
              'Traction & metrics',
              'Competition & differentiation',
              'Go-to-market strategy',
              'Team',
              'Financial projections',
              'The ask (funding amount & use of funds)',
              'Contact information',
            ]},
          ],
        },
        {
          title: 'Supporting Materials',
          fields: [
            { id: 'supporting_docs', label: 'Additional Documents', type: 'checklist', options: [
              'Executive summary (1-pager)',
              'Financial model spreadsheet',
              'Product roadmap',
              'Customer testimonials',
              'Press coverage',
            ]},
          ],
        },
        {
          title: 'Notes',
          fields: [
            { id: 'pitch_notes', label: 'Preparation Notes', type: 'textarea', rows: 3, placeholder: 'Key talking points, investor feedback, etc.' },
          ],
        },
      ],
    },
  },
  {
    name: 'Fundraising Readiness',
    description: 'Assess your readiness for raising capital',
    category: 'Fundraising',
    schema_json: {
      sections: [
        {
          title: 'Business Fundamentals',
          fields: [
            { id: 'business_readiness', label: 'Business Readiness', type: 'checklist', options: [
              'Clear problem-solution fit validated',
              'Product-market fit evidence',
              'Repeatable sales process',
              'Unit economics are positive or improving',
              'Clear path to profitability',
            ]},
          ],
        },
        {
          title: 'Financial Readiness',
          fields: [
            { id: 'financial_readiness', label: 'Financial Readiness', type: 'checklist', options: [
              'Clean cap table',
              'Historical financials organized',
              '18-24 month financial projections',
              'Clear use of funds plan',
              'Runway calculation documented',
            ]},
          ],
        },
        {
          title: 'Legal & Compliance',
          fields: [
            { id: 'legal_readiness', label: 'Legal Readiness', type: 'checklist', options: [
              'Company properly incorporated',
              'IP properly assigned to company',
              'Employee/contractor agreements in place',
              'No outstanding legal issues',
              'Data privacy compliance (GDPR, etc.)',
            ]},
          ],
        },
        {
          title: 'Team & Operations',
          fields: [
            { id: 'team_readiness', label: 'Team Readiness', type: 'checklist', options: [
              'Founding team committed full-time',
              'Key roles identified and filled',
              'Advisory board in place',
              'Board structure defined',
            ]},
          ],
        },
        {
          title: 'Fundraising Materials',
          fields: [
            { id: 'materials_readiness', label: 'Materials Ready', type: 'checklist', options: [
              'Pitch deck completed',
              'Executive summary ready',
              'Data room organized',
              'Investor target list prepared',
              'Warm intros identified',
            ]},
          ],
        },
        {
          title: 'Target Raise',
          fields: [
            { id: 'raise_amount', label: 'Target Amount', type: 'text', placeholder: 'e.g., $500K - $1M' },
            { id: 'raise_timeline', label: 'Target Timeline', type: 'text', placeholder: 'e.g., Q1 2025' },
            { id: 'investor_types', label: 'Target Investor Types', type: 'textarea', rows: 2, placeholder: 'Angels, Pre-seed VCs, etc.' },
          ],
        },
      ],
    },
  },
];
