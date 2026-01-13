// Default playbooks data for all startup stages
// Used to seed the database with initial playbooks when a program is created

export interface PlaybookSeed {
  stage: 'ideation' | 'validation' | 'mvp' | 'traction' | 'growth' | 'scale';
  title: string;
  description: string;
  is_active: boolean;
  items: {
    item_type: 'milestone' | 'action';
    title: string;
    description: string | null;
    relative_due_days: number | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
    order_index: number;
    metadata_json: Record<string, unknown>;
  }[];
}

export const DEFAULT_PLAYBOOKS: PlaybookSeed[] = [
  // ============ IDEATION STAGE ============
  {
    stage: 'ideation',
    title: 'Problem Discovery',
    description: 'Validate that you\'re solving a real problem worth solving. Focus on customer interviews and problem validation.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Complete 20 Customer Discovery Interviews', description: 'Talk to 20+ potential customers to validate the problem exists', relative_due_days: 21, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Create interview script with open-ended questions', description: 'Focus on understanding their pain points, not pitching your solution', relative_due_days: 3, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Identify and list 50 potential interview targets', description: 'Mix of early adopters and mainstream customers', relative_due_days: 5, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Conduct first 5 interviews and document learnings', description: 'Iterate on script based on initial feedback', relative_due_days: 10, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'milestone', title: 'Define Problem Statement', description: 'Articulate the core problem you\'re solving and for whom', relative_due_days: 28, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_problem' } },
      { item_type: 'action', title: 'Fill out Problem Discovery template', description: 'Document customer pain points and severity', relative_due_days: 25, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_problem' } },
      { item_type: 'action', title: 'Create Lean Canvas v1', description: 'First draft of your business model hypothesis', relative_due_days: 28, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_problem' } },
    ],
  },
  {
    stage: 'ideation',
    title: 'Founder Foundation',
    description: 'Build a strong foundation for your startup journey with clear vision, team alignment, and initial resources.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Complete Founder Vision Document', description: 'Document your vision, mission, and founding story', relative_due_days: 14, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_vision' } },
      { item_type: 'action', title: 'Write your founding story and personal connection to the problem', description: 'Why you? Why now?', relative_due_days: 7, priority: 'medium', order_index: 1, metadata_json: { milestone_ref: 'ms_vision' } },
      { item_type: 'action', title: 'Define 3-5 core values for your startup', description: 'Principles that will guide decision making', relative_due_days: 10, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_vision' } },
      { item_type: 'milestone', title: 'Establish Team Agreements', description: 'Align on roles, equity, and working agreements with co-founders', relative_due_days: 21, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_team' } },
      { item_type: 'action', title: 'Complete co-founder alignment discussion', description: 'Roles, responsibilities, commitment levels', relative_due_days: 14, priority: 'high', order_index: 4, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'action', title: 'Draft initial equity split proposal', description: 'Consider vesting schedules and cliff periods', relative_due_days: 21, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_team' } },
    ],
  },

  // ============ VALIDATION STAGE ============
  {
    stage: 'validation',
    title: 'Solution Validation',
    description: 'Test your solution hypothesis with real experiments. Move from problem understanding to solution fit.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Complete Solution Experiments', description: 'Run 3+ experiments to validate solution approach', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Define 3 riskiest assumptions about your solution', description: 'What must be true for your solution to work?', relative_due_days: 5, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Design experiment for assumption #1', description: 'Define success criteria before running', relative_due_days: 10, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Run landing page test with value proposition', description: 'Measure sign-up conversion rates', relative_due_days: 20, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'milestone', title: 'Achieve Product-Market Fit Signals', description: 'Get early indicators of demand and willingness to pay', relative_due_days: 45, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Get 10 letters of intent or pre-orders', description: 'Demonstrate real demand, not just interest', relative_due_days: 35, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Conduct pricing experiments with 5 prospects', description: 'Test different price points and packaging', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_pmf' } },
    ],
  },
  {
    stage: 'validation',
    title: 'Market Analysis',
    description: 'Understand your market, competition, and positioning. Build a defensible market strategy.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Complete Competitive Analysis', description: 'Map the competitive landscape and identify your differentiation', relative_due_days: 21, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_competition' } },
      { item_type: 'action', title: 'Identify 5-10 direct and indirect competitors', description: 'Include alternatives and substitutes', relative_due_days: 7, priority: 'medium', order_index: 1, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'action', title: 'Create competitive positioning map', description: 'Plot competitors on key differentiating axes', relative_due_days: 14, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'action', title: 'Define your unique value proposition vs alternatives', description: '10x better on what dimension?', relative_due_days: 21, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'milestone', title: 'Define Target Market Size', description: 'Calculate TAM, SAM, SOM with bottom-up validation', relative_due_days: 28, priority: 'medium', order_index: 4, metadata_json: { ref: 'ms_market' } },
      { item_type: 'action', title: 'Calculate bottom-up market size from customer interviews', description: 'Use real data, not top-down guesses', relative_due_days: 25, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_market' } },
    ],
  },

  // ============ MVP STAGE ============
  {
    stage: 'mvp',
    title: 'MVP Development',
    description: 'Build and launch your minimum viable product. Focus on learning, not perfection.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Define MVP Scope', description: 'Identify the smallest product that tests your core hypothesis', relative_due_days: 14, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_scope' } },
      { item_type: 'action', title: 'List all potential features and prioritize ruthlessly', description: 'Focus on the core value proposition only', relative_due_days: 7, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_scope' } },
      { item_type: 'action', title: 'Create user stories for MVP features only', description: 'Define done criteria for each story', relative_due_days: 10, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_scope' } },
      { item_type: 'milestone', title: 'Launch MVP to Beta Users', description: 'Get your product in the hands of real users', relative_due_days: 60, priority: 'critical', order_index: 3, metadata_json: { ref: 'ms_launch' } },
      { item_type: 'action', title: 'Build core functionality (sprint 1-2)', description: 'Focus on the single most important feature', relative_due_days: 30, priority: 'critical', order_index: 4, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'action', title: 'Recruit 10-20 beta users from interview pipeline', description: 'People who expressed strong interest', relative_due_days: 45, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'action', title: 'Set up basic analytics and feedback collection', description: 'Track key usage metrics from day 1', relative_due_days: 50, priority: 'high', order_index: 6, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'milestone', title: 'Validate with Beta Users', description: 'Collect feedback and measure engagement', relative_due_days: 75, priority: 'critical', order_index: 7, metadata_json: { ref: 'ms_validate' } },
      { item_type: 'action', title: 'Conduct user feedback sessions with 5 beta users', description: 'Watch them use the product, don\'t just ask questions', relative_due_days: 65, priority: 'high', order_index: 8, metadata_json: { milestone_ref: 'ms_validate' } },
      { item_type: 'action', title: 'Measure Sean Ellis test (40% "very disappointed")', description: 'Would users be disappointed if product disappeared?', relative_due_days: 75, priority: 'high', order_index: 9, metadata_json: { milestone_ref: 'ms_validate' } },
    ],
  },
  {
    stage: 'mvp',
    title: 'Technical Foundation',
    description: 'Build a solid technical foundation that can scale. Focus on architecture decisions that matter.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Establish Development Process', description: 'Set up efficient development workflow and tools', relative_due_days: 14, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_devops' } },
      { item_type: 'action', title: 'Set up version control and code review process', description: 'Git workflow, PR reviews', relative_due_days: 5, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_devops' } },
      { item_type: 'action', title: 'Configure CI/CD pipeline for automated testing', description: 'Tests run on every commit', relative_due_days: 10, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_devops' } },
      { item_type: 'milestone', title: 'Implement Core Infrastructure', description: 'Production-ready infrastructure for MVP', relative_due_days: 30, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_infra' } },
      { item_type: 'action', title: 'Set up production hosting environment', description: 'Cloud provider, domains, SSL', relative_due_days: 20, priority: 'high', order_index: 4, metadata_json: { milestone_ref: 'ms_infra' } },
      { item_type: 'action', title: 'Implement authentication and authorization', description: 'User accounts and security basics', relative_due_days: 25, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_infra' } },
      { item_type: 'action', title: 'Set up monitoring and error tracking', description: 'Know when things break', relative_due_days: 30, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_infra' } },
    ],
  },

  // ============ TRACTION STAGE ============
  {
    stage: 'traction',
    title: 'Product-Market Fit Validation',
    description: 'Confirm and strengthen product-market fit with metrics and customer evidence.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Achieve PMF Score > 40%', description: 'Run Sean Ellis test - 40%+ users would be "very disappointed" without product', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Survey 100+ active users with PMF question', description: 'How disappointed would you be if you could no longer use [product]?', relative_due_days: 14, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Interview top 10 "very disappointed" users', description: 'Understand what makes them love the product', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'milestone', title: 'Document Repeatable Value Delivery', description: 'Identify and document the core value loop', relative_due_days: 45, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_value' } },
      { item_type: 'action', title: 'Map the user journey from signup to "aha moment"', description: 'When do users first experience value?', relative_due_days: 35, priority: 'medium', order_index: 4, metadata_json: { milestone_ref: 'ms_value' } },
      { item_type: 'action', title: 'Reduce time to value by 50%', description: 'Remove friction in onboarding', relative_due_days: 45, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_value' } },
    ],
  },
  {
    stage: 'traction',
    title: 'Early Revenue Engine',
    description: 'Build repeatable revenue with early customers. Focus on learning what sells.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Achieve First $10K MRR', description: 'Prove customers will pay and stay', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Convert 10 paying customers', description: 'Focus on customers with strongest problem fit', relative_due_days: 30, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Document 3 case studies with early customers', description: 'Capture transformation stories and results', relative_due_days: 45, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Implement basic churn tracking', description: 'Understand why customers leave', relative_due_days: 50, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'milestone', title: 'Validate Pricing Model', description: 'Find the right price point and packaging', relative_due_days: 45, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_pricing' } },
      { item_type: 'action', title: 'Test 3 different price points with prospects', description: 'A/B test or conversational pricing discovery', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pricing' } },
      { item_type: 'action', title: 'Define tier structure based on customer feedback', description: 'What features drive upgrade decisions?', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_pricing' } },
    ],
  },
  {
    stage: 'traction',
    title: 'Retention & Engagement',
    description: 'Build sticky product usage and reduce churn before scaling acquisition.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Achieve 90%+ Monthly Retention', description: 'Keep customers engaged and active', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_retention' } },
      { item_type: 'action', title: 'Implement weekly engagement tracking', description: 'Define and measure key engagement actions', relative_due_days: 14, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'action', title: 'Build automated onboarding sequence', description: 'Guide users to first value quickly', relative_due_days: 30, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'action', title: 'Create win-back campaign for churned users', description: 'Understand and address churn reasons', relative_due_days: 45, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'milestone', title: 'Build Customer Success Foundation', description: 'Proactive customer success for top accounts', relative_due_days: 45, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_cs' } },
      { item_type: 'action', title: 'Define health score for customer accounts', description: 'Predict churn before it happens', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_cs' } },
      { item_type: 'action', title: 'Implement regular check-ins with top 10 customers', description: 'Monthly or quarterly success reviews', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_cs' } },
    ],
  },

  // ============ GROWTH STAGE ============
  {
    stage: 'growth',
    title: 'Growth Engine',
    description: 'Build repeatable growth loops. Move from finding product-market fit to scaling acquisition.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Identify Primary Growth Channel', description: 'Find your most effective acquisition channel', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_channel' } },
      { item_type: 'action', title: 'Analyze current acquisition sources and conversion rates', description: 'Where do your best customers come from?', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'action', title: 'Run 3 small experiments across different channels', description: 'Test paid, organic, partnerships', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'action', title: 'Double down on best performing channel', description: 'Optimize and scale what works', relative_due_days: 30, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'milestone', title: 'Achieve Positive Unit Economics', description: 'Customer LTV > CAC with healthy margin', relative_due_days: 60, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_economics' } },
      { item_type: 'action', title: 'Calculate current LTV and CAC accurately', description: 'Use cohort analysis for LTV', relative_due_days: 40, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_economics' } },
      { item_type: 'action', title: 'Identify levers to improve LTV (retention, expansion)', description: 'What drives customer value?', relative_due_days: 50, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_economics' } },
      { item_type: 'milestone', title: 'Build Referral/Viral Loop', description: 'Turn happy customers into acquisition channel', relative_due_days: 90, priority: 'high', order_index: 7, metadata_json: { ref: 'ms_viral' } },
      { item_type: 'action', title: 'Implement referral program or viral mechanics', description: 'Make sharing valuable for users', relative_due_days: 75, priority: 'medium', order_index: 8, metadata_json: { milestone_ref: 'ms_viral' } },
    ],
  },
  {
    stage: 'growth',
    title: 'Sales & Revenue',
    description: 'Build a repeatable sales process. Move from founder-led sales to a scalable revenue engine.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Document Sales Playbook', description: 'Codify what works in your sales process', relative_due_days: 30, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Map the customer buying journey', description: 'From awareness to purchase to success', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Create sales scripts and objection handling guides', description: 'Based on what founders have learned', relative_due_days: 20, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Define qualification criteria (BANT or similar)', description: 'Know when to pursue vs pass', relative_due_days: 25, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'milestone', title: 'Hire First Sales Rep', description: 'Transition from founder-led to team-led sales', relative_due_days: 60, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_hire' } },
      { item_type: 'action', title: 'Define ideal sales hire profile', description: 'Skills, experience, cultural fit', relative_due_days: 40, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_hire' } },
      { item_type: 'action', title: 'Create onboarding and training program', description: 'How will you ramp new salespeople?', relative_due_days: 55, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_hire' } },
    ],
  },

  // ============ SCALE STAGE ============
  {
    stage: 'scale',
    title: 'Operational Excellence',
    description: 'Build systems and processes that enable sustainable growth. Focus on repeatability and efficiency.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Implement Scalable Operations', description: 'Processes and systems that work at 10x scale', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_ops' } },
      { item_type: 'action', title: 'Document all critical business processes', description: 'SOPs for repeatable activities', relative_due_days: 20, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'action', title: 'Implement business systems (CRM, ERP, etc.)', description: 'Tools that support scale', relative_due_days: 40, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'action', title: 'Create KPI dashboards for all departments', description: 'Real-time visibility into business health', relative_due_days: 50, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'milestone', title: 'Build Management Team', description: 'Hire functional leaders to run key areas', relative_due_days: 90, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_team' } },
      { item_type: 'action', title: 'Identify gaps in leadership team', description: 'What roles are critical for next stage?', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'action', title: 'Define career paths and org structure', description: 'How will the team grow?', relative_due_days: 60, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'milestone', title: 'Establish Board Governance', description: 'Formal governance for investor relations', relative_due_days: 120, priority: 'high', order_index: 7, metadata_json: { ref: 'ms_governance' } },
      { item_type: 'action', title: 'Create board meeting cadence and materials template', description: 'Monthly updates, quarterly deep dives', relative_due_days: 100, priority: 'medium', order_index: 8, metadata_json: { milestone_ref: 'ms_governance' } },
    ],
  },
  {
    stage: 'scale',
    title: 'Fundraising & Growth Capital',
    description: 'Prepare for and execute a successful fundraise. Build investor relationships strategically.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Complete Fundraising Readiness', description: 'All materials and metrics ready for investor conversations', relative_due_days: 45, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_ready' } },
      { item_type: 'action', title: 'Complete Fundraising Readiness template', description: 'Assess gaps in your story and metrics', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'action', title: 'Create investor pitch deck (10-15 slides)', description: 'Compelling narrative with strong data', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'action', title: 'Prepare data room with all due diligence materials', description: 'Financials, legal, team, metrics', relative_due_days: 40, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'milestone', title: 'Build Investor Pipeline', description: 'Identify and warm up target investors', relative_due_days: 60, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_pipeline' } },
      { item_type: 'action', title: 'Research and list 50 target investors', description: 'Stage-appropriate, thesis-aligned', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pipeline' } },
      { item_type: 'action', title: 'Get warm intros to top 20 targets', description: 'Work your network and advisors', relative_due_days: 50, priority: 'high', order_index: 6, metadata_json: { milestone_ref: 'ms_pipeline' } },
      { item_type: 'milestone', title: 'Close Funding Round', description: 'Sign term sheet and complete closing', relative_due_days: 120, priority: 'critical', order_index: 7, metadata_json: { ref: 'ms_close' } },
      { item_type: 'action', title: 'Run parallel investor process (4-6 weeks)', description: 'Create urgency with multiple conversations', relative_due_days: 90, priority: 'critical', order_index: 8, metadata_json: { milestone_ref: 'ms_close' } },
      { item_type: 'action', title: 'Negotiate and sign term sheet', description: 'Focus on key terms, not just valuation', relative_due_days: 100, priority: 'critical', order_index: 9, metadata_json: { milestone_ref: 'ms_close' } },
    ],
  },
];
