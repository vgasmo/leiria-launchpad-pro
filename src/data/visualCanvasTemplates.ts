import type { TemplateSchema } from '@/hooks/useTemplates';

// New visual canvas templates for E3 requirement
export const VISUAL_CANVAS_TEMPLATES: {
  name: string;
  description: string;
  category: string;
  stage?: string;
  canvas_type?: string;
  schema_json: TemplateSchema;
}[] = [
  // 1. Go-To-Market Canvas
  {
    name: 'Go-To-Market Canvas',
    description: 'Plan your market entry strategy with a visual canvas covering target market, positioning, channels, and launch plan',
    category: 'Strategy',
    stage: 'mvp',
    canvas_type: 'gtm',
    schema_json: {
      sections: [
        {
          title: 'Target Market',
          fields: [
            { id: 'target_market', label: 'Primary Target Market', type: 'textarea', rows: 3, placeholder: 'Who is your ideal customer? Define demographics, firmographics, and psychographics.' },
            { id: 'market_size', label: 'Market Size (TAM/SAM/SOM)', type: 'textarea', rows: 2, placeholder: 'Total Addressable Market, Serviceable Market, and your realistic target.' },
          ],
        },
        {
          title: 'Positioning & Messaging',
          fields: [
            { id: 'positioning', label: 'Market Positioning', type: 'textarea', rows: 2, placeholder: 'How do you want to be perceived relative to competitors?' },
            { id: 'key_messages', label: 'Key Messages', type: 'textarea', rows: 3, placeholder: 'Top 3-5 messages that resonate with your target audience.' },
          ],
        },
        {
          title: 'Channels & Tactics',
          fields: [
            { id: 'acquisition_channels', label: 'Acquisition Channels', type: 'textarea', rows: 3, placeholder: 'How will you reach customers? (Content, SEO, Paid ads, Partnerships, etc.)' },
            { id: 'sales_motion', label: 'Sales Motion', type: 'textarea', rows: 2, placeholder: 'Self-serve, sales-led, product-led, hybrid?' },
          ],
        },
        {
          title: 'Launch Plan',
          fields: [
            { id: 'launch_milestones', label: 'Launch Milestones', type: 'textarea', rows: 3, placeholder: 'Key milestones and dates for your go-to-market launch.' },
            { id: 'success_metrics', label: 'Success Metrics', type: 'textarea', rows: 2, placeholder: 'How will you measure GTM success? (Leads, conversions, revenue)' },
          ],
        },
      ],
    },
  },
  // 2. ICP/Persona Board
  {
    name: 'ICP & Persona Board',
    description: 'Define your Ideal Customer Profile and buyer personas with detailed characteristics, goals, and pain points',
    category: 'Validation',
    stage: 'validation',
    canvas_type: 'icp',
    schema_json: {
      sections: [
        {
          title: 'Ideal Customer Profile (Company)',
          fields: [
            { id: 'company_size', label: 'Company Size', type: 'textarea', rows: 2, placeholder: 'Number of employees, revenue range, team structure.' },
            { id: 'industry', label: 'Industry/Vertical', type: 'textarea', rows: 2, placeholder: 'Which industries or verticals are best fit?' },
            { id: 'tech_stack', label: 'Tech Stack / Tools Used', type: 'textarea', rows: 2, placeholder: 'What tools do they already use? What integrations matter?' },
          ],
        },
        {
          title: 'Buyer Persona',
          fields: [
            { id: 'persona_name', label: 'Persona Name & Title', type: 'text', placeholder: 'e.g., "Marketing Mary" - VP of Marketing' },
            { id: 'demographics', label: 'Demographics', type: 'textarea', rows: 2, placeholder: 'Age, education, experience level, reporting structure.' },
            { id: 'goals', label: 'Goals & Motivations', type: 'textarea', rows: 3, placeholder: 'What are they trying to achieve? What does success look like?' },
          ],
        },
        {
          title: 'Pain Points & Behaviors',
          fields: [
            { id: 'pain_points', label: 'Key Pain Points', type: 'textarea', rows: 3, placeholder: 'What frustrates them? What problems keep them up at night?' },
            { id: 'buying_behavior', label: 'Buying Behavior', type: 'textarea', rows: 2, placeholder: 'How do they research and buy solutions? Who influences them?' },
            { id: 'objections', label: 'Common Objections', type: 'textarea', rows: 2, placeholder: 'What objections might they raise about your solution?' },
          ],
        },
      ],
    },
  },
  // 3. Pricing & Packaging Board
  {
    name: 'Pricing & Packaging Canvas',
    description: 'Design your pricing strategy, tiers, and packaging to maximize value capture and customer fit',
    category: 'Strategy',
    stage: 'mvp',
    canvas_type: 'pricing',
    schema_json: {
      sections: [
        {
          title: 'Pricing Strategy',
          fields: [
            { id: 'pricing_model', label: 'Pricing Model', type: 'textarea', rows: 2, placeholder: 'Subscription, usage-based, one-time, freemium, hybrid?' },
            { id: 'value_metric', label: 'Value Metric', type: 'textarea', rows: 2, placeholder: 'What unit do you charge for? (seats, API calls, storage, etc.)' },
          ],
        },
        {
          title: 'Tier Structure',
          fields: [
            { id: 'tier_free', label: 'Free Tier (if applicable)', type: 'textarea', rows: 2, placeholder: 'Features, limits, conversion triggers.' },
            { id: 'tier_starter', label: 'Starter Tier', type: 'textarea', rows: 2, placeholder: 'Price, features, target customer.' },
            { id: 'tier_pro', label: 'Pro/Growth Tier', type: 'textarea', rows: 2, placeholder: 'Price, features, target customer.' },
            { id: 'tier_enterprise', label: 'Enterprise Tier', type: 'textarea', rows: 2, placeholder: 'Custom pricing, enterprise features, requirements.' },
          ],
        },
        {
          title: 'Competitive Positioning',
          fields: [
            { id: 'competitor_pricing', label: 'Competitor Pricing', type: 'textarea', rows: 3, placeholder: 'How do competitors price? Where do you position?' },
            { id: 'willingness_to_pay', label: 'Willingness to Pay Research', type: 'textarea', rows: 2, placeholder: 'What have customers said about pricing? Any data?' },
          ],
        },
      ],
    },
  },
  // 4. Growth Loops Board
  {
    name: 'Growth Loops Canvas',
    description: 'Map your growth loops and viral mechanics to identify sustainable growth engines',
    category: 'Strategy',
    stage: 'growth',
    canvas_type: 'growth_loops',
    schema_json: {
      sections: [
        {
          title: 'Core Growth Loop',
          fields: [
            { id: 'loop_trigger', label: 'Loop Trigger', type: 'textarea', rows: 2, placeholder: 'What action triggers the loop? (signup, usage, etc.)' },
            { id: 'loop_action', label: 'Value Creation', type: 'textarea', rows: 2, placeholder: 'What value is created that can be shared or attract others?' },
            { id: 'loop_output', label: 'New User Acquisition', type: 'textarea', rows: 2, placeholder: 'How does the value create new users? (referral, content, network effect)' },
          ],
        },
        {
          title: 'Viral Mechanics',
          fields: [
            { id: 'viral_coefficient', label: 'Target Viral Coefficient', type: 'text', placeholder: 'K-factor: how many new users does each user bring?' },
            { id: 'viral_mechanics', label: 'Viral Mechanics', type: 'textarea', rows: 3, placeholder: 'Referrals, invites, sharing, social proof, user-generated content.' },
          ],
        },
        {
          title: 'Retention Loops',
          fields: [
            { id: 'habit_loop', label: 'Habit Formation', type: 'textarea', rows: 2, placeholder: 'What creates habitual usage? (notifications, rewards, social)' },
            { id: 'reactivation', label: 'Reactivation Triggers', type: 'textarea', rows: 2, placeholder: 'How do you bring churned users back?' },
          ],
        },
        {
          title: 'Metrics & Targets',
          fields: [
            { id: 'growth_metrics', label: 'Growth Metrics', type: 'textarea', rows: 3, placeholder: 'DAU/MAU ratio, referral rate, viral coefficient, time to value.' },
          ],
        },
      ],
    },
  },
  // 5. OKRs / North Star Metric Board
  {
    name: 'OKRs & North Star Canvas',
    description: 'Define your North Star Metric and quarterly OKRs to align team focus and measure progress',
    category: 'Strategy',
    stage: 'growth',
    canvas_type: 'okrs',
    schema_json: {
      sections: [
        {
          title: 'North Star Metric',
          fields: [
            { id: 'north_star', label: 'North Star Metric', type: 'textarea', rows: 2, placeholder: 'The single metric that best captures the value you deliver to customers.' },
            { id: 'north_star_rationale', label: 'Why This Metric?', type: 'textarea', rows: 2, placeholder: 'Why does this metric matter? How does it correlate with revenue?' },
            { id: 'current_value', label: 'Current Value', type: 'text', placeholder: 'Current North Star Metric value' },
            { id: 'target_value', label: 'Target Value (12 months)', type: 'text', placeholder: 'Where do you want to be in 12 months?' },
          ],
        },
        {
          title: 'Quarterly Objectives',
          fields: [
            { id: 'objective_1', label: 'Objective 1', type: 'textarea', rows: 2, placeholder: 'Ambitious, qualitative goal for this quarter.' },
            { id: 'kr_1_1', label: 'Key Result 1.1', type: 'text', placeholder: 'Measurable outcome (e.g., Increase X from Y to Z)' },
            { id: 'kr_1_2', label: 'Key Result 1.2', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_1_3', label: 'Key Result 1.3', type: 'text', placeholder: 'Measurable outcome' },
          ],
        },
        {
          title: 'Objective 2',
          fields: [
            { id: 'objective_2', label: 'Objective 2', type: 'textarea', rows: 2, placeholder: 'Second major objective for this quarter.' },
            { id: 'kr_2_1', label: 'Key Result 2.1', type: 'text', placeholder: 'Measurable outcome' },
            { id: 'kr_2_2', label: 'Key Result 2.2', type: 'text', placeholder: 'Measurable outcome' },
          ],
        },
      ],
    },
  },
  // 6. Fundraising Readiness Board
  {
    name: 'Fundraising Readiness Canvas',
    description: 'Prepare for your fundraise with a comprehensive checklist of materials, metrics, and investor targets',
    category: 'Funding',
    stage: 'growth',
    canvas_type: 'fundraising',
    schema_json: {
      sections: [
        {
          title: 'Investment Thesis',
          fields: [
            { id: 'round_target', label: 'Round Target', type: 'text', placeholder: 'Amount raising (e.g., $2M Seed)' },
            { id: 'use_of_funds', label: 'Use of Funds', type: 'textarea', rows: 3, placeholder: 'How will you deploy the capital? (Hiring, marketing, R&D)' },
            { id: 'runway', label: 'Runway Target', type: 'text', placeholder: 'How many months of runway? (e.g., 18-24 months)' },
          ],
        },
        {
          title: 'Metrics & Traction',
          fields: [
            { id: 'key_metrics', label: 'Key Metrics to Highlight', type: 'textarea', rows: 3, placeholder: 'MRR, growth rate, CAC/LTV, retention, etc.' },
            { id: 'traction_story', label: 'Traction Story', type: 'textarea', rows: 2, placeholder: 'Compelling narrative around your growth and momentum.' },
          ],
        },
        {
          title: 'Materials Checklist',
          fields: [
            { id: 'materials', label: 'Materials Status', type: 'checklist', options: [
              'Pitch deck (10-15 slides)',
              'Executive summary (1-pager)',
              'Financial model (3-year projections)',
              'Data room organized',
              'Cap table clean',
              'Legal docs ready',
            ]},
          ],
        },
        {
          title: 'Investor Targeting',
          fields: [
            { id: 'investor_profile', label: 'Ideal Investor Profile', type: 'textarea', rows: 2, placeholder: 'What type of investor are you looking for? (Stage, check size, value-add)' },
            { id: 'target_investors', label: 'Target Investors (Top 20)', type: 'textarea', rows: 4, placeholder: 'List your top 20 target investors with status.' },
          ],
        },
      ],
    },
  },
  // 7. Sales Pipeline Board
  {
    name: 'Sales Pipeline Canvas',
    description: 'Visualize and manage your sales pipeline from lead to close with stages, metrics, and forecasting',
    category: 'Strategy',
    stage: 'growth',
    canvas_type: 'sales_pipeline',
    schema_json: {
      sections: [
        {
          title: 'Pipeline Overview',
          fields: [
            { id: 'total_pipeline', label: 'Total Pipeline Value', type: 'text', placeholder: '$XXX,XXX' },
            { id: 'weighted_pipeline', label: 'Weighted Pipeline', type: 'text', placeholder: 'Pipeline adjusted by probability' },
            { id: 'average_deal_size', label: 'Average Deal Size', type: 'text', placeholder: '$X,XXX' },
          ],
        },
        {
          title: 'Stage Breakdown',
          fields: [
            { id: 'stage_lead', label: 'Lead Stage', type: 'textarea', rows: 2, placeholder: 'Number of leads, total value, conversion rate to next stage.' },
            { id: 'stage_qualified', label: 'Qualified Stage', type: 'textarea', rows: 2, placeholder: 'Number qualified, total value, average time in stage.' },
            { id: 'stage_proposal', label: 'Proposal Stage', type: 'textarea', rows: 2, placeholder: 'Number with proposals, total value, win rate.' },
            { id: 'stage_negotiation', label: 'Negotiation Stage', type: 'textarea', rows: 2, placeholder: 'Number negotiating, total value, expected close date.' },
          ],
        },
        {
          title: 'Sales Metrics',
          fields: [
            { id: 'sales_cycle', label: 'Average Sales Cycle', type: 'text', placeholder: 'Days from lead to close' },
            { id: 'win_rate', label: 'Win Rate', type: 'text', placeholder: 'Percentage of deals won' },
            { id: 'forecast', label: 'This Quarter Forecast', type: 'textarea', rows: 2, placeholder: 'Expected closes and revenue this quarter.' },
          ],
        },
      ],
    },
  },
  // 8. Product Roadmap (Now/Next/Later)
  {
    name: 'Product Roadmap Canvas',
    description: 'Plan your product roadmap with a Now/Next/Later framework for clear prioritization',
    category: 'Strategy',
    stage: 'mvp',
    canvas_type: 'roadmap',
    schema_json: {
      sections: [
        {
          title: 'Now (This Quarter)',
          description: 'Features and improvements we are actively building',
          fields: [
            { id: 'now_features', label: 'Current Sprint/Quarter Focus', type: 'textarea', rows: 4, placeholder: 'List features currently in development with expected delivery dates.' },
            { id: 'now_rationale', label: 'Why These Now?', type: 'textarea', rows: 2, placeholder: 'What drives the prioritization of these features?' },
          ],
        },
        {
          title: 'Next (Next Quarter)',
          description: 'Features planned for the next cycle',
          fields: [
            { id: 'next_features', label: 'Planned Features', type: 'textarea', rows: 4, placeholder: 'Features queued for next quarter with rough estimates.' },
            { id: 'next_dependencies', label: 'Dependencies & Blockers', type: 'textarea', rows: 2, placeholder: 'What needs to happen before these can start?' },
          ],
        },
        {
          title: 'Later (6+ Months)',
          description: 'Vision features and long-term bets',
          fields: [
            { id: 'later_features', label: 'Future Vision', type: 'textarea', rows: 4, placeholder: 'Big bets and vision features for the future.' },
            { id: 'later_research', label: 'Research Needed', type: 'textarea', rows: 2, placeholder: 'What do we need to learn before committing to these?' },
          ],
        },
        {
          title: 'Not Doing',
          fields: [
            { id: 'not_doing', label: 'Explicitly Not Building', type: 'textarea', rows: 3, placeholder: 'Features we have decided NOT to build and why.' },
          ],
        },
      ],
    },
  },
];
