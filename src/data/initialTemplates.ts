import type { TemplateSchema } from '@/hooks/useTemplates';

export const INITIAL_TEMPLATES: {
  name: string;
  description: string;
  category: string;
  stage?: string; // ideation, validation, mvp, growth, scale
  schema_json: TemplateSchema;
}[] = [
  // ============ IDEATION STAGE TEMPLATES ============
  {
    name: 'Problem Discovery Interview',
    description: 'Script for conducting customer discovery interviews to validate problem-solution fit',
    category: 'Validation',
    stage: 'ideation',
    schema_json: {
      sections: [
        {
          title: 'Interview Basics',
          fields: [
            { id: 'interviewee_name', label: 'Interviewee Name', type: 'text', placeholder: 'Name of the person interviewed' },
            { id: 'interviewee_role', label: 'Role/Title', type: 'text', placeholder: 'Their job role or title' },
            { id: 'interview_date', label: 'Date', type: 'text', placeholder: 'Interview date' },
            { id: 'interview_context', label: 'How did you find them?', type: 'text', placeholder: 'Referral, LinkedIn, etc.' },
          ],
        },
        {
          title: 'Problem Exploration',
          description: 'Ask open-ended questions to understand their pain points',
          fields: [
            { id: 'daily_workflow', label: 'Walk me through your day/process', type: 'textarea', rows: 3, placeholder: 'Describe their workflow related to the problem area' },
            { id: 'biggest_challenges', label: 'What are the biggest challenges?', type: 'textarea', rows: 3, placeholder: 'What frustrates them most?' },
            { id: 'problem_frequency', label: 'How often does this problem occur?', type: 'text', placeholder: 'Daily, weekly, monthly?' },
            { id: 'problem_impact', label: 'What happens when this problem occurs?', type: 'textarea', rows: 2, placeholder: 'Time lost, money lost, stress, etc.' },
          ],
        },
        {
          title: 'Current Solutions',
          fields: [
            { id: 'current_solutions', label: 'How do you solve this problem today?', type: 'textarea', rows: 2, placeholder: 'Tools, workarounds, manual processes' },
            { id: 'solution_satisfaction', label: 'How satisfied are you with current solutions?', type: 'text', placeholder: '1-10 scale and why' },
            { id: 'switching_barriers', label: 'What would make you switch to something new?', type: 'textarea', rows: 2, placeholder: 'Key requirements for a new solution' },
          ],
        },
        {
          title: 'Budget & Decision Making',
          fields: [
            { id: 'budget', label: 'What do you currently spend on this?', type: 'text', placeholder: 'Time and money' },
            { id: 'decision_makers', label: 'Who else is involved in buying decisions?', type: 'text', placeholder: 'Decision makers and influencers' },
          ],
        },
        {
          title: 'Key Insights',
          fields: [
            { id: 'key_quotes', label: 'Key Quotes', type: 'textarea', rows: 3, placeholder: 'Notable quotes from the interview' },
            { id: 'insights', label: 'Main Insights', type: 'textarea', rows: 3, placeholder: 'What did you learn?' },
            { id: 'follow_up', label: 'Follow-up Actions', type: 'textarea', rows: 2, placeholder: 'Next steps with this contact' },
          ],
        },
      ],
    },
  },
  {
    name: 'Lean Canvas',
    description: 'One-page business model for early-stage startups based on Ash Maurya\'s framework',
    category: 'Strategy',
    stage: 'ideation',
    schema_json: {
      sections: [
        {
          title: 'Problem',
          fields: [
            { id: 'problems', label: 'Top 3 Problems', type: 'textarea', rows: 3, placeholder: '1. Problem A\n2. Problem B\n3. Problem C' },
            { id: 'existing_alternatives', label: 'Existing Alternatives', type: 'textarea', rows: 2, placeholder: 'How are these problems solved today?' },
          ],
        },
        {
          title: 'Customer Segments',
          fields: [
            { id: 'customer_segments', label: 'Target Customers', type: 'textarea', rows: 2, placeholder: 'Who are your target customers?' },
            { id: 'early_adopters', label: 'Early Adopters', type: 'textarea', rows: 2, placeholder: 'Who will be your first customers? What characteristics define them?' },
          ],
        },
        {
          title: 'Unique Value Proposition',
          fields: [
            { id: 'uvp', label: 'Single, Clear Message', type: 'textarea', rows: 2, placeholder: 'What makes you different and worth paying attention to?' },
            { id: 'high_level_concept', label: 'High-Level Concept', type: 'text', placeholder: 'e.g., "YouTube for Pets" or "Airbnb for Office Space"' },
          ],
        },
        {
          title: 'Solution',
          fields: [
            { id: 'solutions', label: 'Top 3 Features', type: 'textarea', rows: 3, placeholder: '1. Feature addressing Problem 1\n2. Feature addressing Problem 2\n3. Feature addressing Problem 3' },
          ],
        },
        {
          title: 'Unfair Advantage',
          fields: [
            { id: 'unfair_advantage', label: 'Unfair Advantage', type: 'textarea', rows: 2, placeholder: 'Something that cannot be easily copied or bought (insider information, team expertise, network effects, etc.)' },
          ],
        },
        {
          title: 'Channels',
          fields: [
            { id: 'channels', label: 'Path to Customers', type: 'textarea', rows: 2, placeholder: 'How will you reach your customers? (Content marketing, SEO, paid ads, partnerships, etc.)' },
          ],
        },
        {
          title: 'Key Metrics',
          fields: [
            { id: 'key_metrics', label: 'Key Activities You Measure', type: 'textarea', rows: 3, placeholder: 'What metrics define success? (Activation rate, retention, revenue, etc.)' },
          ],
        },
        {
          title: 'Cost Structure',
          fields: [
            { id: 'cost_structure', label: 'Fixed and Variable Costs', type: 'textarea', rows: 2, placeholder: 'Customer acquisition costs, hosting, salaries, etc.' },
          ],
        },
        {
          title: 'Revenue Streams',
          fields: [
            { id: 'revenue_streams', label: 'Revenue Model', type: 'textarea', rows: 2, placeholder: 'How will you make money? (Subscription, one-time, freemium, etc.)' },
          ],
        },
      ],
    },
  },
  {
    name: 'Founder Story & Vision',
    description: 'Document your founding story and long-term vision for investors and team alignment',
    category: 'Strategy',
    stage: 'ideation',
    schema_json: {
      sections: [
        {
          title: 'The Origin Story',
          description: 'Every great startup has a compelling origin story',
          fields: [
            { id: 'personal_connection', label: 'Personal Connection to Problem', type: 'textarea', rows: 3, placeholder: 'Why do YOU care about solving this problem? What personal experience led you here?' },
            { id: 'aha_moment', label: 'The Aha Moment', type: 'textarea', rows: 2, placeholder: 'Describe the specific moment when you realized this needed to exist' },
            { id: 'why_now', label: 'Why Now?', type: 'textarea', rows: 2, placeholder: 'What has changed that makes this the right time?' },
          ],
        },
        {
          title: 'Vision & Mission',
          fields: [
            { id: 'vision', label: '10-Year Vision', type: 'textarea', rows: 2, placeholder: 'What does the world look like if you succeed massively?' },
            { id: 'mission', label: 'Mission Statement', type: 'textarea', rows: 2, placeholder: 'Your company\'s purpose in one sentence' },
            { id: 'values', label: 'Core Values', type: 'textarea', rows: 3, placeholder: 'What principles guide your decisions?' },
          ],
        },
        {
          title: 'The Team',
          fields: [
            { id: 'founder_backgrounds', label: 'Founder Backgrounds', type: 'textarea', rows: 3, placeholder: 'Why is this the right team to solve this problem?' },
            { id: 'key_hires', label: 'Key Hires Needed', type: 'textarea', rows: 2, placeholder: 'What roles are critical to add in the next 12 months?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Hypothesis Testing Canvas',
    description: 'Define and test your riskiest business assumptions systematically',
    category: 'Validation',
    stage: 'ideation',
    schema_json: {
      sections: [
        {
          title: 'Core Hypotheses',
          description: 'List your riskiest assumptions that must be true for your startup to succeed',
          fields: [
            { id: 'problem_hypothesis', label: 'Problem Hypothesis', type: 'textarea', rows: 2, placeholder: '[Customer segment] experiences [problem] when trying to [activity]' },
            { id: 'solution_hypothesis', label: 'Solution Hypothesis', type: 'textarea', rows: 2, placeholder: '[Customer segment] will use [solution] to [achieve outcome]' },
            { id: 'business_hypothesis', label: 'Business Model Hypothesis', type: 'textarea', rows: 2, placeholder: '[Customer segment] will pay [price] for [value proposition]' },
          ],
        },
        {
          title: 'Experiment Design',
          fields: [
            { id: 'experiment_type', label: 'Experiment Type', type: 'text', placeholder: 'Interview, landing page, prototype test, concierge, wizard of oz, etc.' },
            { id: 'success_criteria', label: 'Success Criteria', type: 'textarea', rows: 2, placeholder: 'What results would validate this hypothesis? Be specific with numbers.' },
            { id: 'failure_criteria', label: 'Failure Criteria', type: 'textarea', rows: 2, placeholder: 'What results would invalidate this hypothesis?' },
            { id: 'sample_size', label: 'Required Sample Size', type: 'text', placeholder: 'How many data points do you need for statistical significance?' },
          ],
        },
        {
          title: 'Results & Learning',
          fields: [
            { id: 'actual_results', label: 'Actual Results', type: 'textarea', rows: 3, placeholder: 'What happened in the experiment? Include raw numbers.' },
            { id: 'validated', label: 'Hypothesis Status', type: 'text', placeholder: 'Validated / Invalidated / Inconclusive' },
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn? What pivot or persevere decision will you make?' },
            { id: 'next_experiment', label: 'Next Experiment', type: 'textarea', rows: 2, placeholder: 'What will you test next based on these learnings?' },
          ],
        },
      ],
    },
  },

  // ============ VALIDATION STAGE TEMPLATES ============
  {
    name: 'Customer Interview Summary',
    description: 'Consolidate insights from multiple customer interviews into actionable patterns',
    category: 'Validation',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Interview Overview',
          fields: [
            { id: 'total_interviews', label: 'Total Interviews Conducted', type: 'number', placeholder: '0' },
            { id: 'customer_segments', label: 'Customer Segments Interviewed', type: 'textarea', rows: 2, placeholder: 'List the different types of customers and count for each' },
            { id: 'date_range', label: 'Date Range', type: 'text', placeholder: 'From - To' },
          ],
        },
        {
          title: 'Problem Patterns',
          description: 'What problems came up most frequently?',
          fields: [
            { id: 'top_problems', label: 'Top 3 Problems Mentioned', type: 'textarea', rows: 3, placeholder: '1. Problem A (mentioned by X people, severity: high/medium/low)\n2. Problem B\n3. Problem C' },
            { id: 'problem_severity', label: 'Problem Severity Assessment', type: 'textarea', rows: 2, placeholder: 'Are these hair-on-fire problems or nice-to-haves? What evidence supports this?' },
          ],
        },
        {
          title: 'Solution Preferences',
          fields: [
            { id: 'desired_features', label: 'Most Requested Features', type: 'textarea', rows: 3, placeholder: 'What solutions or features did customers mention most?' },
            { id: 'pricing_feedback', label: 'Pricing Feedback', type: 'textarea', rows: 2, placeholder: 'What price points did customers mention? Any willingness-to-pay signals?' },
          ],
        },
        {
          title: 'Validated Insights',
          fields: [
            { id: 'validated_assumptions', label: 'Validated Assumptions', type: 'textarea', rows: 3, placeholder: 'What assumptions were confirmed by the data?' },
            { id: 'invalidated_assumptions', label: 'Invalidated Assumptions', type: 'textarea', rows: 3, placeholder: 'What assumptions were proven wrong? This is valuable learning!' },
            { id: 'surprises', label: 'Surprising Findings', type: 'textarea', rows: 2, placeholder: 'What unexpected insights emerged?' },
          ],
        },
        {
          title: 'Decision & Next Steps',
          fields: [
            { id: 'pivot_considerations', label: 'Pivot/Persevere Decision', type: 'textarea', rows: 2, placeholder: 'Based on findings, should you pivot, persevere, or iterate?' },
            { id: 'action_items', label: 'Action Items', type: 'textarea', rows: 3, placeholder: 'What specific actions will you take based on these insights?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Value Proposition Canvas',
    description: 'Map customer needs to your product features for product-market fit',
    category: 'Strategy',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Customer Profile',
          description: 'Understand your customer deeply before designing solutions',
          fields: [
            { id: 'customer_jobs', label: 'Customer Jobs', type: 'textarea', rows: 3, placeholder: 'Functional jobs: What tasks are they trying to accomplish?\nSocial jobs: How do they want to be perceived?\nEmotional jobs: How do they want to feel?' },
            { id: 'pains', label: 'Pains', type: 'textarea', rows: 3, placeholder: 'What annoys them before, during, and after the job?\nWhat risks do they fear?\nWhat obstacles prevent them from getting the job done?' },
            { id: 'gains', label: 'Gains', type: 'textarea', rows: 3, placeholder: 'What outcomes do they expect?\nWhat would exceed their expectations?\nWhat would make their life easier?' },
          ],
        },
        {
          title: 'Value Map',
          description: 'How your product addresses customer needs',
          fields: [
            { id: 'products_services', label: 'Products & Services', type: 'textarea', rows: 3, placeholder: 'What products and services do you offer that help customers get jobs done?' },
            { id: 'pain_relievers', label: 'Pain Relievers', type: 'textarea', rows: 3, placeholder: 'How does your product eliminate or reduce customer pains? Be specific.' },
            { id: 'gain_creators', label: 'Gain Creators', type: 'textarea', rows: 3, placeholder: 'How does your product create customer gains? Be specific.' },
          ],
        },
        {
          title: 'Fit Assessment',
          fields: [
            { id: 'fit_score', label: 'Problem-Solution Fit Score (1-10)', type: 'number', placeholder: '0' },
            { id: 'strongest_fit', label: 'Where is the fit strongest?', type: 'textarea', rows: 2, placeholder: 'Which pain/gain has the best match with your solution?' },
            { id: 'gaps', label: 'Where are the gaps?', type: 'textarea', rows: 2, placeholder: 'What customer pains/gains are NOT addressed by your current solution?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Landing Page Test',
    description: 'Track and analyze results from your validation landing page experiments',
    category: 'Validation',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Test Setup',
          fields: [
            { id: 'landing_url', label: 'Landing Page URL', type: 'text', placeholder: 'https://...' },
            { id: 'value_proposition', label: 'Value Proposition Tested', type: 'textarea', rows: 2, placeholder: 'What specific message/offer are you testing?' },
            { id: 'traffic_sources', label: 'Traffic Sources', type: 'textarea', rows: 2, placeholder: 'Google Ads, Facebook, LinkedIn, Product Hunt, etc.' },
            { id: 'budget_spent', label: 'Budget Spent', type: 'text', placeholder: 'Total ad spend for this test' },
            { id: 'test_duration', label: 'Test Duration', type: 'text', placeholder: 'How long did the test run?' },
          ],
        },
        {
          title: 'Metrics',
          fields: [
            { id: 'visitors', label: 'Total Visitors', type: 'number', placeholder: '0' },
            { id: 'signups', label: 'Email Signups/Leads', type: 'number', placeholder: '0' },
            { id: 'conversion_rate', label: 'Conversion Rate (%)', type: 'number', placeholder: '0' },
            { id: 'cost_per_lead', label: 'Cost Per Lead', type: 'text', placeholder: 'Budget / Signups' },
            { id: 'bounce_rate', label: 'Bounce Rate (%)', type: 'number', placeholder: '0' },
          ],
        },
        {
          title: 'Qualitative Feedback',
          fields: [
            { id: 'user_feedback', label: 'User Feedback/Comments', type: 'textarea', rows: 3, placeholder: 'What did users say in feedback forms, support emails, etc.?' },
            { id: 'objections', label: 'Common Objections', type: 'textarea', rows: 2, placeholder: 'Why did people not sign up? What objections came up?' },
          ],
        },
        {
          title: 'Conclusions',
          fields: [
            { id: 'test_result', label: 'Test Result', type: 'text', placeholder: 'Pass / Fail / Inconclusive' },
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn from this test?' },
            { id: 'next_test', label: 'Next Test', type: 'textarea', rows: 2, placeholder: 'What will you test next based on these results?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Competitor Analysis',
    description: 'Analyze your competitive landscape and identify differentiation opportunities',
    category: 'Strategy',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Direct Competitors',
          description: 'Companies solving the same problem for the same customers',
          fields: [
            { id: 'competitor_1_name', label: 'Competitor 1 Name', type: 'text', placeholder: 'Company name' },
            { id: 'competitor_1_strengths', label: 'Competitor 1 Strengths', type: 'textarea', rows: 2, placeholder: 'What do they do well?' },
            { id: 'competitor_1_weaknesses', label: 'Competitor 1 Weaknesses', type: 'textarea', rows: 2, placeholder: 'Where do they fall short?' },
            { id: 'competitor_1_pricing', label: 'Competitor 1 Pricing', type: 'text', placeholder: 'Their pricing model and price points' },
            { id: 'competitor_2_name', label: 'Competitor 2 Name', type: 'text', placeholder: 'Company name' },
            { id: 'competitor_2_strengths', label: 'Competitor 2 Strengths', type: 'textarea', rows: 2, placeholder: 'What do they do well?' },
            { id: 'competitor_2_weaknesses', label: 'Competitor 2 Weaknesses', type: 'textarea', rows: 2, placeholder: 'Where do they fall short?' },
          ],
        },
        {
          title: 'Indirect Competitors',
          fields: [
            { id: 'indirect_competitors', label: 'Alternative Solutions', type: 'textarea', rows: 3, placeholder: 'How else do customers solve this problem? (spreadsheets, manual processes, hiring, doing nothing, etc.)' },
          ],
        },
        {
          title: 'Your Differentiation',
          fields: [
            { id: 'unique_features', label: 'Your Unique Features', type: 'textarea', rows: 2, placeholder: 'What can you do that competitors cannot?' },
            { id: 'target_niche', label: 'Your Target Niche', type: 'textarea', rows: 2, placeholder: 'What specific segment are you focusing on that competitors ignore?' },
            { id: 'positioning', label: 'Positioning Statement', type: 'textarea', rows: 2, placeholder: 'For [target] who [need], our product is a [category] that [key benefit]. Unlike [competitor], we [key differentiator].' },
          ],
        },
      ],
    },
  },
  {
    name: 'Pricing Strategy',
    description: 'Define your pricing model and test willingness to pay',
    category: 'Strategy',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Value Metric',
          description: 'What unit of value do customers pay for?',
          fields: [
            { id: 'value_metric', label: 'Value Metric', type: 'text', placeholder: 'e.g., per user, per transaction, per GB, per project' },
            { id: 'why_this_metric', label: 'Why This Metric?', type: 'textarea', rows: 2, placeholder: 'How does this align with how customers perceive value?' },
          ],
        },
        {
          title: 'Pricing Model',
          fields: [
            { id: 'model_type', label: 'Model Type', type: 'text', placeholder: 'Subscription, one-time, freemium, usage-based, etc.' },
            { id: 'tiers', label: 'Pricing Tiers', type: 'textarea', rows: 4, placeholder: 'Free: [features]\nBasic: $X/mo - [features]\nPro: $Y/mo - [features]\nEnterprise: Custom' },
          ],
        },
        {
          title: 'Competitive Pricing',
          fields: [
            { id: 'competitor_pricing', label: 'Competitor Pricing', type: 'textarea', rows: 3, placeholder: 'What do competitors charge? How does your pricing compare?' },
            { id: 'pricing_position', label: 'Pricing Position', type: 'text', placeholder: 'Premium, mid-market, or budget positioning?' },
          ],
        },
        {
          title: 'Willingness to Pay',
          fields: [
            { id: 'wtp_research', label: 'WTP Research Results', type: 'textarea', rows: 3, placeholder: 'What price points did customers mention in interviews? What would make them switch?' },
            { id: 'price_sensitivity', label: 'Price Sensitivity', type: 'textarea', rows: 2, placeholder: 'How sensitive are customers to price? What evidence do you have?' },
          ],
        },
      ],
    },
  },

  // ============ MVP STAGE TEMPLATES ============
  {
    name: 'MVP Feature Prioritization',
    description: 'Prioritize features for your minimum viable product using MoSCoW method',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Core Value Proposition',
          fields: [
            { id: 'core_problem', label: 'Core Problem to Solve', type: 'textarea', rows: 2, placeholder: 'What is the ONE problem your MVP must solve brilliantly?' },
            { id: 'success_definition', label: 'MVP Success Definition', type: 'textarea', rows: 2, placeholder: 'How will you know if the MVP is successful? Be specific with metrics.' },
          ],
        },
        {
          title: 'Must-Have Features',
          description: 'Features that are essential for the MVP to work - without these, there\'s no product',
          fields: [
            { id: 'must_have', label: 'Must-Have Features', type: 'textarea', rows: 4, placeholder: '1. Feature A - Why it is essential\n2. Feature B - Why it is essential\n3. Feature C - Why it is essential' },
          ],
        },
        {
          title: 'Should-Have Features',
          description: 'Important features that can be simplified or added in v1.1',
          fields: [
            { id: 'should_have', label: 'Should-Have Features', type: 'textarea', rows: 3, placeholder: 'Features that would significantly improve the MVP but are not critical for launch' },
          ],
        },
        {
          title: 'Could-Have Features',
          description: 'Nice-to-have features for later versions',
          fields: [
            { id: 'could_have', label: 'Could-Have Features', type: 'textarea', rows: 3, placeholder: 'Features that can definitely wait for v2 or later' },
          ],
        },
        {
          title: 'Scope Control',
          fields: [
            { id: 'not_building', label: 'What We Are NOT Building', type: 'textarea', rows: 2, placeholder: 'Explicitly list features that are out of scope - this prevents scope creep' },
            { id: 'timeline', label: 'Target Launch Date', type: 'text', placeholder: 'When will MVP be ready?' },
            { id: 'constraints', label: 'Key Constraints', type: 'textarea', rows: 2, placeholder: 'Time, budget, team limitations that affect scope' },
          ],
        },
      ],
    },
  },
  {
    name: 'User Story Map',
    description: 'Map user journeys and prioritize development based on user flow',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'User Persona',
          fields: [
            { id: 'persona_name', label: 'Persona Name', type: 'text', placeholder: 'e.g., Marketing Manager Maria' },
            { id: 'persona_goal', label: 'Primary Goal', type: 'text', placeholder: 'What is their main objective when using your product?' },
            { id: 'persona_context', label: 'Context', type: 'textarea', rows: 2, placeholder: 'When and where do they use your product? What triggers usage?' },
          ],
        },
        {
          title: 'User Journey Steps',
          description: 'Break down the user journey into major steps',
          fields: [
            { id: 'step_1', label: 'Step 1: Discovery', type: 'textarea', rows: 2, placeholder: 'How do they find/access the product?' },
            { id: 'step_2', label: 'Step 2: Onboarding', type: 'textarea', rows: 2, placeholder: 'First-time user experience - what do they need to do?' },
            { id: 'step_3', label: 'Step 3: Core Action', type: 'textarea', rows: 2, placeholder: 'The main action they take - the reason they came' },
            { id: 'step_4', label: 'Step 4: Value Delivery', type: 'textarea', rows: 2, placeholder: 'When do they get value? What is the "aha moment"?' },
            { id: 'step_5', label: 'Step 5: Return', type: 'textarea', rows: 2, placeholder: 'What brings them back? What habit do they form?' },
          ],
        },
        {
          title: 'Stories per Step',
          fields: [
            { id: 'stories_mvp', label: 'MVP Stories (Release 1)', type: 'textarea', rows: 4, placeholder: 'As a [user], I want to [action] so that [benefit]\n...' },
            { id: 'stories_v2', label: 'Version 2 Stories', type: 'textarea', rows: 3, placeholder: 'Stories for the next release after MVP' },
          ],
        },
      ],
    },
  },
  {
    name: 'MVP Launch Checklist',
    description: 'Comprehensive pre-launch checklist for your MVP',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Product Readiness',
          fields: [
            { id: 'core_features', label: 'Core Features Status', type: 'textarea', rows: 3, placeholder: 'List core features and their status (complete/in progress/blocked)' },
            { id: 'critical_bugs', label: 'Critical Bugs', type: 'textarea', rows: 2, placeholder: 'List any critical bugs that must be fixed before launch' },
            { id: 'mobile_tested', label: 'Mobile/Responsive Tested?', type: 'text', placeholder: 'Yes/No - on which devices?' },
          ],
        },
        {
          title: 'Analytics & Tracking',
          fields: [
            { id: 'analytics_tool', label: 'Analytics Tool', type: 'text', placeholder: 'Which analytics tool is integrated?' },
            { id: 'key_events', label: 'Key Events Tracked', type: 'textarea', rows: 3, placeholder: 'Signup, activation, core action, purchase, etc.' },
            { id: 'error_tracking', label: 'Error Tracking', type: 'text', placeholder: 'How are you tracking errors? (Sentry, LogRocket, etc.)' },
          ],
        },
        {
          title: 'Customer Support',
          fields: [
            { id: 'support_channel', label: 'Support Channel', type: 'text', placeholder: 'Email, chat, help desk?' },
            { id: 'faq_docs', label: 'FAQ/Help Docs Created?', type: 'text', placeholder: 'Yes/No - URL if yes' },
            { id: 'support_coverage', label: 'Support Coverage', type: 'text', placeholder: 'Who handles support? Response time expectations?' },
          ],
        },
        {
          title: 'Launch Plan',
          fields: [
            { id: 'launch_date', label: 'Launch Date', type: 'text', placeholder: 'When are you launching?' },
            { id: 'initial_users', label: 'Initial Users', type: 'textarea', rows: 2, placeholder: 'Who are your first 10-50 users? How will you reach them?' },
            { id: 'success_metrics', label: 'Week 1 Success Metrics', type: 'textarea', rows: 2, placeholder: 'What metrics will you track in the first week?' },
            { id: 'rollback_plan', label: 'Rollback Plan', type: 'textarea', rows: 2, placeholder: 'What happens if something goes wrong?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Technical Architecture Doc',
    description: 'Document your MVP technical decisions and architecture',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Stack Overview',
          fields: [
            { id: 'frontend', label: 'Frontend', type: 'text', placeholder: 'React, Vue, Next.js, etc.' },
            { id: 'backend', label: 'Backend', type: 'text', placeholder: 'Node.js, Python, Supabase, etc.' },
            { id: 'database', label: 'Database', type: 'text', placeholder: 'PostgreSQL, MongoDB, etc.' },
            { id: 'hosting', label: 'Hosting/Infrastructure', type: 'text', placeholder: 'Vercel, AWS, Railway, etc.' },
          ],
        },
        {
          title: 'Key Decisions',
          fields: [
            { id: 'why_stack', label: 'Why This Stack?', type: 'textarea', rows: 3, placeholder: 'Justify your technology choices' },
            { id: 'tradeoffs', label: 'Trade-offs Made', type: 'textarea', rows: 2, placeholder: 'What did you sacrifice for speed?' },
            { id: 'tech_debt', label: 'Known Technical Debt', type: 'textarea', rows: 2, placeholder: 'What will need to be fixed/refactored later?' },
          ],
        },
        {
          title: 'Third-Party Services',
          fields: [
            { id: 'services', label: 'External Services Used', type: 'textarea', rows: 3, placeholder: 'Auth, payments, email, analytics, etc. and why you chose them' },
            { id: 'costs', label: 'Monthly Cost Estimate', type: 'text', placeholder: 'Expected infrastructure costs at launch' },
          ],
        },
        {
          title: 'Security',
          fields: [
            { id: 'auth_method', label: 'Authentication Method', type: 'text', placeholder: 'How do users authenticate?' },
            { id: 'data_protection', label: 'Data Protection', type: 'textarea', rows: 2, placeholder: 'How is sensitive data protected?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Product Requirements Doc (PRD)',
    description: 'Detailed product requirements document for a feature or release',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Overview',
          fields: [
            { id: 'feature_name', label: 'Feature/Release Name', type: 'text', placeholder: 'Name of the feature or release' },
            { id: 'problem_statement', label: 'Problem Statement', type: 'textarea', rows: 2, placeholder: 'What problem does this solve?' },
            { id: 'success_metrics', label: 'Success Metrics', type: 'textarea', rows: 2, placeholder: 'How will we measure success?' },
          ],
        },
        {
          title: 'User Stories',
          fields: [
            { id: 'user_stories', label: 'User Stories', type: 'textarea', rows: 4, placeholder: 'As a [user type], I want to [action] so that [benefit]' },
          ],
        },
        {
          title: 'Functional Requirements',
          fields: [
            { id: 'requirements', label: 'Detailed Requirements', type: 'textarea', rows: 5, placeholder: 'List all functional requirements with acceptance criteria' },
          ],
        },
        {
          title: 'Non-Functional Requirements',
          fields: [
            { id: 'performance', label: 'Performance Requirements', type: 'textarea', rows: 2, placeholder: 'Load time, response time, etc.' },
            { id: 'security', label: 'Security Requirements', type: 'textarea', rows: 2, placeholder: 'Authentication, authorization, data protection' },
          ],
        },
        {
          title: 'Out of Scope',
          fields: [
            { id: 'out_of_scope', label: 'What is NOT Included', type: 'textarea', rows: 2, placeholder: 'Explicitly list what is not part of this release' },
          ],
        },
      ],
    },
  },

  // ============ GROWTH STAGE TEMPLATES ============
  {
    name: 'Growth Experiment Tracker',
    description: 'Track and analyze growth experiments systematically',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Experiment Overview',
          fields: [
            { id: 'experiment_name', label: 'Experiment Name', type: 'text', placeholder: 'Name of the experiment' },
            { id: 'growth_lever', label: 'Growth Lever', type: 'text', placeholder: 'Acquisition, Activation, Retention, Revenue, or Referral' },
            { id: 'hypothesis', label: 'Hypothesis', type: 'textarea', rows: 2, placeholder: 'If we [action], then [metric] will [change] by [amount] because [reason]' },
            { id: 'ice_score', label: 'ICE Score (Impact/Confidence/Effort)', type: 'text', placeholder: 'e.g., 8/7/4 = 6.3' },
          ],
        },
        {
          title: 'Experiment Design',
          fields: [
            { id: 'test_description', label: 'What are you testing?', type: 'textarea', rows: 2, placeholder: 'Describe the change or test in detail' },
            { id: 'control_group', label: 'Control Group', type: 'text', placeholder: 'Current experience' },
            { id: 'test_group', label: 'Test Group', type: 'text', placeholder: 'New experience' },
            { id: 'success_metric', label: 'Primary Success Metric', type: 'text', placeholder: 'What metric determines success?' },
            { id: 'sample_size', label: 'Required Sample Size', type: 'text', placeholder: 'How many users/events needed for statistical significance?' },
          ],
        },
        {
          title: 'Results',
          fields: [
            { id: 'start_date', label: 'Start Date', type: 'text', placeholder: 'When did the experiment start?' },
            { id: 'end_date', label: 'End Date', type: 'text', placeholder: 'When did it end?' },
            { id: 'control_results', label: 'Control Results', type: 'text', placeholder: 'Metric value for control' },
            { id: 'test_results', label: 'Test Results', type: 'text', placeholder: 'Metric value for test' },
            { id: 'lift', label: 'Lift (%)', type: 'text', placeholder: 'Percentage improvement' },
            { id: 'statistical_significance', label: 'Statistically Significant?', type: 'text', placeholder: 'Yes/No and confidence level' },
          ],
        },
        {
          title: 'Decision & Learnings',
          fields: [
            { id: 'decision', label: 'Decision', type: 'text', placeholder: 'Ship / Iterate / Kill' },
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn that applies beyond this experiment?' },
            { id: 'next_steps', label: 'Next Steps', type: 'textarea', rows: 2, placeholder: 'What will you do next based on these results?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Go-to-Market Plan',
    description: 'Comprehensive strategy for launching and growing your product in market',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Target Market',
          fields: [
            { id: 'target_audience', label: 'Target Audience', type: 'textarea', rows: 2, placeholder: 'Who is your ideal customer? Be specific.' },
            { id: 'market_size', label: 'Market Size (TAM/SAM/SOM)', type: 'textarea', rows: 2, placeholder: 'Total Addressable Market / Serviceable / Obtainable' },
            { id: 'buyer_personas', label: 'Buyer Personas', type: 'textarea', rows: 3, placeholder: 'Describe your key buyer personas with demographics, psychographics, behaviors' },
          ],
        },
        {
          title: 'Positioning & Messaging',
          fields: [
            { id: 'positioning_statement', label: 'Positioning Statement', type: 'textarea', rows: 2, placeholder: 'For [target] who [need], [product] is a [category] that [benefit]' },
            { id: 'key_messages', label: 'Key Messages', type: 'textarea', rows: 3, placeholder: 'Top 3 messages for each persona' },
            { id: 'competitive_advantage', label: 'Competitive Advantage', type: 'textarea', rows: 2, placeholder: 'What makes you better than alternatives?' },
          ],
        },
        {
          title: 'Pricing & Packaging',
          fields: [
            { id: 'pricing_model', label: 'Pricing Model', type: 'text', placeholder: 'e.g., Subscription, One-time, Freemium, Usage-based' },
            { id: 'price_points', label: 'Price Points', type: 'textarea', rows: 2, placeholder: 'List your pricing tiers and what\'s included' },
          ],
        },
        {
          title: 'Distribution & Channels',
          fields: [
            { id: 'primary_channels', label: 'Primary Acquisition Channels', type: 'textarea', rows: 2, placeholder: 'Content, paid ads, SEO, partnerships, etc.' },
            { id: 'partnerships', label: 'Channel Partnerships', type: 'textarea', rows: 2, placeholder: 'Any distribution partners? Integrations? Affiliates?' },
          ],
        },
        {
          title: 'Launch Plan',
          fields: [
            { id: 'launch_timeline', label: 'Launch Timeline', type: 'textarea', rows: 3, placeholder: 'Key milestones and dates' },
            { id: 'launch_activities', label: 'Launch Activities', type: 'textarea', rows: 3, placeholder: 'PR, content, product hunt, social, email, etc.' },
          ],
        },
      ],
    },
  },
  {
    name: 'Customer Success Playbook',
    description: 'Onboarding, activation, and retention strategies',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Onboarding Journey',
          fields: [
            { id: 'activation_moment', label: 'Aha Moment', type: 'textarea', rows: 2, placeholder: 'When do users first experience value? What action defines "activated"?' },
            { id: 'onboarding_steps', label: 'Onboarding Steps', type: 'textarea', rows: 3, placeholder: 'Key steps to get users to the aha moment as fast as possible' },
            { id: 'time_to_value', label: 'Target Time-to-Value', type: 'text', placeholder: 'How quickly should users see value? (e.g., 5 minutes, 1 day)' },
            { id: 'onboarding_emails', label: 'Onboarding Email Sequence', type: 'textarea', rows: 3, placeholder: 'Day 0, Day 1, Day 3, Day 7 - what do you send?' },
          ],
        },
        {
          title: 'Health Metrics',
          fields: [
            { id: 'health_indicators', label: 'Customer Health Indicators', type: 'textarea', rows: 3, placeholder: 'What signals indicate a healthy, engaged customer?' },
            { id: 'churn_signals', label: 'Churn Warning Signs', type: 'textarea', rows: 2, placeholder: 'What signals indicate a customer might churn?' },
            { id: 'health_score', label: 'Health Score Definition', type: 'textarea', rows: 2, placeholder: 'How do you calculate customer health score?' },
          ],
        },
        {
          title: 'Retention Tactics',
          fields: [
            { id: 'engagement_tactics', label: 'Engagement Tactics', type: 'textarea', rows: 3, placeholder: 'How do you keep users engaged? (emails, in-app messages, features)' },
            { id: 'win_back_strategy', label: 'Win-Back Strategy', type: 'textarea', rows: 2, placeholder: 'How do you re-engage churned or at-risk users?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Sales Playbook',
    description: 'Sales process, objections, and closing strategies for B2B startups',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Ideal Customer Profile',
          fields: [
            { id: 'icp', label: 'Ideal Customer Profile', type: 'textarea', rows: 3, placeholder: 'Company size, industry, revenue, tech stack, etc.' },
            { id: 'buyer_persona', label: 'Buyer Persona', type: 'textarea', rows: 2, placeholder: 'Title, responsibilities, goals, challenges' },
            { id: 'buying_signals', label: 'Buying Signals', type: 'textarea', rows: 2, placeholder: 'What indicates a prospect is ready to buy?' },
          ],
        },
        {
          title: 'Sales Process',
          fields: [
            { id: 'stages', label: 'Sales Stages', type: 'textarea', rows: 3, placeholder: 'Lead → Qualified → Demo → Proposal → Negotiation → Closed' },
            { id: 'qualification_criteria', label: 'Qualification Criteria (BANT/MEDDIC)', type: 'textarea', rows: 2, placeholder: 'Budget, Authority, Need, Timeline, etc.' },
          ],
        },
        {
          title: 'Objection Handling',
          fields: [
            { id: 'common_objections', label: 'Common Objections & Responses', type: 'textarea', rows: 4, placeholder: 'Objection: "Too expensive"\nResponse: ...' },
          ],
        },
        {
          title: 'Competitive Positioning',
          fields: [
            { id: 'vs_competitor', label: 'Competitive Battlecards', type: 'textarea', rows: 3, placeholder: 'How to position against key competitors' },
          ],
        },
      ],
    },
  },

  // ============ SCALE STAGE TEMPLATES ============
  {
    name: 'Business Model Canvas',
    description: 'High-level business model overview for scaling companies',
    category: 'Strategy',
    stage: 'scale',
    schema_json: {
      sections: [
        {
          title: 'Key Partners',
          fields: [
            { id: 'key_partners', label: 'Strategic Partners & Suppliers', type: 'textarea', rows: 3, placeholder: 'Who are your key partners and suppliers? What do they provide?' },
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
            { id: 'key_resources', label: 'Required Resources', type: 'textarea', rows: 3, placeholder: 'What key resources does your value proposition require? (people, tech, capital, IP)' },
          ],
        },
        {
          title: 'Value Propositions',
          fields: [
            { id: 'value_propositions', label: 'Value Delivered', type: 'textarea', rows: 3, placeholder: 'What value do you deliver to each customer segment?' },
          ],
        },
        {
          title: 'Customer Relationships',
          fields: [
            { id: 'customer_relationships', label: 'Relationship Types', type: 'textarea', rows: 3, placeholder: 'What type of relationship does each customer segment expect? (self-service, dedicated support, community)' },
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
            { id: 'customer_segments', label: 'Target Segments', type: 'textarea', rows: 3, placeholder: 'For whom are you creating value? What are your most important segments?' },
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
            { id: 'revenue_streams', label: 'Revenue Sources', type: 'textarea', rows: 3, placeholder: 'For what value are your customers willing to pay? How do they pay?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Quarterly OKRs',
    description: 'Objectives and Key Results for the quarter',
    category: 'Goals',
    stage: 'scale',
    schema_json: {
      sections: [
        {
          title: 'Objective 1',
          fields: [
            { id: 'objective_1', label: 'Objective', type: 'textarea', rows: 2, placeholder: 'What inspirational outcome do you want to achieve?' },
            { id: 'kr_1_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_1_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_1_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome with target number' },
          ],
        },
        {
          title: 'Objective 2',
          fields: [
            { id: 'objective_2', label: 'Objective', type: 'textarea', rows: 2, placeholder: 'What inspirational outcome do you want to achieve?' },
            { id: 'kr_2_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_2_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_2_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome with target number' },
          ],
        },
        {
          title: 'Objective 3',
          fields: [
            { id: 'objective_3', label: 'Objective', type: 'textarea', rows: 2, placeholder: 'What inspirational outcome do you want to achieve?' },
            { id: 'kr_3_1', label: 'Key Result 1', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_3_2', label: 'Key Result 2', type: 'text', placeholder: 'Measurable outcome with target number' },
            { id: 'kr_3_3', label: 'Key Result 3', type: 'text', placeholder: 'Measurable outcome with target number' },
          ],
        },
      ],
    },
  },
  {
    name: 'Board Meeting Prep',
    description: 'Prepare for board meetings with structured updates',
    category: 'Governance',
    stage: 'scale',
    schema_json: {
      sections: [
        {
          title: 'Executive Summary',
          fields: [
            { id: 'highlights', label: 'Key Highlights', type: 'textarea', rows: 3, placeholder: 'Top 3-5 wins this period' },
            { id: 'lowlights', label: 'Key Challenges', type: 'textarea', rows: 3, placeholder: 'Top 3-5 challenges or misses' },
            { id: 'asks', label: 'Asks from the Board', type: 'textarea', rows: 2, placeholder: 'What do you need from board members?' },
          ],
        },
        {
          title: 'Financial Update',
          fields: [
            { id: 'revenue', label: 'Revenue Update', type: 'textarea', rows: 2, placeholder: 'ARR/MRR, growth rate, vs. plan' },
            { id: 'burn_runway', label: 'Burn Rate & Runway', type: 'textarea', rows: 2, placeholder: 'Monthly burn, months of runway' },
            { id: 'fundraising', label: 'Fundraising Update', type: 'textarea', rows: 2, placeholder: 'If applicable' },
          ],
        },
        {
          title: 'Product & Engineering',
          fields: [
            { id: 'product_updates', label: 'Product Updates', type: 'textarea', rows: 3, placeholder: 'Key launches, roadmap progress' },
            { id: 'technical_updates', label: 'Technical/Engineering Updates', type: 'textarea', rows: 2, placeholder: 'Infrastructure, security, tech debt' },
          ],
        },
        {
          title: 'Go-to-Market',
          fields: [
            { id: 'sales_update', label: 'Sales Update', type: 'textarea', rows: 2, placeholder: 'Pipeline, deals closed, sales metrics' },
            { id: 'marketing_update', label: 'Marketing Update', type: 'textarea', rows: 2, placeholder: 'Lead gen, brand, campaigns' },
          ],
        },
        {
          title: 'Team',
          fields: [
            { id: 'team_updates', label: 'Team Updates', type: 'textarea', rows: 2, placeholder: 'Hires, departures, org changes' },
            { id: 'culture_updates', label: 'Culture & Morale', type: 'textarea', rows: 2, placeholder: 'Team health, engagement' },
          ],
        },
        {
          title: 'Discussion Topics',
          fields: [
            { id: 'discussion_topics', label: 'Topics for Discussion', type: 'textarea', rows: 3, placeholder: 'Strategic decisions, advice needed, etc.' },
          ],
        },
      ],
    },
  },
  {
    name: 'Team Scaling Plan',
    description: 'Plan for growing your team and organization',
    category: 'Team',
    stage: 'scale',
    schema_json: {
      sections: [
        {
          title: 'Current State',
          fields: [
            { id: 'current_team', label: 'Current Team Size & Structure', type: 'textarea', rows: 3, placeholder: 'How many people? What departments? Org chart?' },
            { id: 'gaps', label: 'Current Capability Gaps', type: 'textarea', rows: 2, placeholder: 'What skills or roles are missing?' },
          ],
        },
        {
          title: 'Hiring Plan',
          fields: [
            { id: 'q1_hires', label: 'Q1 Hires', type: 'textarea', rows: 2, placeholder: 'Role, level, priority' },
            { id: 'q2_hires', label: 'Q2 Hires', type: 'textarea', rows: 2, placeholder: 'Role, level, priority' },
            { id: 'q3_q4_hires', label: 'Q3-Q4 Hires', type: 'textarea', rows: 2, placeholder: 'Role, level, priority' },
          ],
        },
        {
          title: 'Org Design',
          fields: [
            { id: 'future_org', label: 'Target Org Structure', type: 'textarea', rows: 3, placeholder: 'What does the org look like at 2x, 5x current size?' },
            { id: 'leadership', label: 'Leadership Needs', type: 'textarea', rows: 2, placeholder: 'What leadership roles need to be filled or developed?' },
          ],
        },
        {
          title: 'Culture & Processes',
          fields: [
            { id: 'values', label: 'Core Values to Preserve', type: 'textarea', rows: 2, placeholder: 'What culture elements must be protected as you scale?' },
            { id: 'processes', label: 'Processes to Implement', type: 'textarea', rows: 2, placeholder: 'What processes are needed for a larger team?' },
          ],
        },
      ],
    },
  },

  // ============ FUNDRAISING TEMPLATES (All stages) ============
  {
    name: 'Investor Update',
    description: 'Monthly or quarterly update email template for investors',
    category: 'Fundraising',
    schema_json: {
      sections: [
        {
          title: 'Key Metrics',
          fields: [
            { id: 'revenue', label: 'Revenue (MRR/ARR)', type: 'text', placeholder: '$X (Y% MoM growth)' },
            { id: 'customers', label: 'Customers/Users', type: 'text', placeholder: 'X total (Y new this month)' },
            { id: 'burn_runway', label: 'Burn Rate & Runway', type: 'text', placeholder: '$X/month burn, Y months runway' },
            { id: 'other_metrics', label: 'Other Key Metrics', type: 'textarea', rows: 2, placeholder: 'NPS, churn, activation rate, etc.' },
          ],
        },
        {
          title: 'Highlights',
          fields: [
            { id: 'wins', label: 'Key Wins', type: 'textarea', rows: 3, placeholder: '• Win 1\n• Win 2\n• Win 3' },
          ],
        },
        {
          title: 'Challenges',
          fields: [
            { id: 'challenges', label: 'Challenges & Learnings', type: 'textarea', rows: 3, placeholder: '• Challenge 1 and what we learned\n• Challenge 2' },
          ],
        },
        {
          title: 'Asks',
          fields: [
            { id: 'asks', label: 'How You Can Help', type: 'textarea', rows: 3, placeholder: '• Intro to X company\n• Referral for VP Sales role\n• Feedback on pricing' },
          ],
        },
        {
          title: 'Next Month Focus',
          fields: [
            { id: 'next_month', label: 'Focus for Next Period', type: 'textarea', rows: 2, placeholder: 'What are you focused on next?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Unit Economics',
    description: 'Calculate and document your key unit economics metrics',
    category: 'Finance',
    schema_json: {
      sections: [
        {
          title: 'Customer Acquisition',
          fields: [
            { id: 'cac', label: 'Customer Acquisition Cost (CAC)', type: 'text', placeholder: '$X' },
            { id: 'cac_breakdown', label: 'CAC Breakdown', type: 'textarea', rows: 2, placeholder: 'Marketing: $X, Sales: $Y, Other: $Z' },
            { id: 'cac_payback', label: 'CAC Payback Period', type: 'text', placeholder: 'X months' },
          ],
        },
        {
          title: 'Customer Value',
          fields: [
            { id: 'arpu', label: 'Average Revenue Per User (ARPU)', type: 'text', placeholder: '$X/month' },
            { id: 'gross_margin', label: 'Gross Margin (%)', type: 'text', placeholder: 'X%' },
            { id: 'churn_rate', label: 'Monthly Churn Rate', type: 'text', placeholder: 'X%' },
            { id: 'ltv', label: 'Lifetime Value (LTV)', type: 'text', placeholder: '$X' },
            { id: 'ltv_calculation', label: 'LTV Calculation', type: 'textarea', rows: 2, placeholder: 'Show your calculation: ARPU × Gross Margin / Churn Rate' },
          ],
        },
        {
          title: 'Key Ratios',
          fields: [
            { id: 'ltv_cac', label: 'LTV:CAC Ratio', type: 'text', placeholder: 'X:1 (target >3:1)' },
            { id: 'magic_number', label: 'Magic Number', type: 'text', placeholder: 'Net New ARR / Sales & Marketing Spend' },
          ],
        },
        {
          title: 'Improvement Plan',
          fields: [
            { id: 'improvement_levers', label: 'Levers to Improve Unit Economics', type: 'textarea', rows: 3, placeholder: 'How can you reduce CAC, increase LTV, or improve margins?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Pitch Deck Outline',
    description: 'Structure your investor pitch deck',
    category: 'Fundraising',
    schema_json: {
      sections: [
        {
          title: 'Title & Hook',
          fields: [
            { id: 'one_liner', label: 'One-liner Description', type: 'text', placeholder: 'What do you do in one sentence?' },
            { id: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Memorable tagline or hook' },
          ],
        },
        {
          title: 'Problem',
          fields: [
            { id: 'problem', label: 'Problem Statement', type: 'textarea', rows: 3, placeholder: 'What problem are you solving? Why does it matter?' },
            { id: 'who_has_problem', label: 'Who Has This Problem?', type: 'textarea', rows: 2, placeholder: 'Describe the people/companies affected' },
          ],
        },
        {
          title: 'Solution',
          fields: [
            { id: 'solution', label: 'Your Solution', type: 'textarea', rows: 3, placeholder: 'How do you solve the problem? What makes it unique?' },
            { id: 'demo', label: 'Product Demo/Screenshots', type: 'textarea', rows: 2, placeholder: 'Describe what you\'ll show' },
          ],
        },
        {
          title: 'Market',
          fields: [
            { id: 'market_size', label: 'Market Size', type: 'textarea', rows: 2, placeholder: 'TAM, SAM, SOM with sources' },
            { id: 'why_now', label: 'Why Now?', type: 'textarea', rows: 2, placeholder: 'What has changed that makes this the right time?' },
          ],
        },
        {
          title: 'Business Model',
          fields: [
            { id: 'business_model', label: 'How You Make Money', type: 'textarea', rows: 2, placeholder: 'Revenue model, pricing, unit economics' },
          ],
        },
        {
          title: 'Traction',
          fields: [
            { id: 'traction', label: 'Traction & Milestones', type: 'textarea', rows: 3, placeholder: 'Revenue, users, growth rate, key customers, partnerships' },
          ],
        },
        {
          title: 'Competition',
          fields: [
            { id: 'competition', label: 'Competitive Landscape', type: 'textarea', rows: 2, placeholder: 'Who else is solving this? Why will you win?' },
          ],
        },
        {
          title: 'Team',
          fields: [
            { id: 'team', label: 'Founding Team', type: 'textarea', rows: 3, placeholder: 'Why is this the right team? Relevant experience?' },
          ],
        },
        {
          title: 'The Ask',
          fields: [
            { id: 'raise_amount', label: 'Raise Amount', type: 'text', placeholder: 'How much are you raising?' },
            { id: 'use_of_funds', label: 'Use of Funds', type: 'textarea', rows: 2, placeholder: 'How will you use the money?' },
            { id: 'milestones', label: 'Milestones to Achieve', type: 'textarea', rows: 2, placeholder: 'What will you accomplish with this funding?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Due Diligence Prep',
    description: 'Prepare for investor due diligence with organized documentation',
    category: 'Fundraising',
    schema_json: {
      sections: [
        {
          title: 'Corporate Documents',
          fields: [
            { id: 'incorporation', label: 'Incorporation Documents', type: 'text', placeholder: 'Location and status' },
            { id: 'cap_table', label: 'Cap Table Status', type: 'text', placeholder: 'Is it clean and up to date?' },
            { id: 'prior_funding', label: 'Prior Funding Documents', type: 'textarea', rows: 2, placeholder: 'SAFEs, notes, previous rounds' },
          ],
        },
        {
          title: 'Financials',
          fields: [
            { id: 'financial_statements', label: 'Financial Statements', type: 'text', placeholder: 'P&L, balance sheet, cash flow - how current?' },
            { id: 'projections', label: 'Financial Projections', type: 'text', placeholder: 'Do you have 3-year projections?' },
            { id: 'metrics_dashboard', label: 'Metrics Dashboard', type: 'text', placeholder: 'How do you track key metrics?' },
          ],
        },
        {
          title: 'Legal',
          fields: [
            { id: 'ip_status', label: 'IP Status', type: 'textarea', rows: 2, placeholder: 'Patents, trademarks, IP assignment agreements' },
            { id: 'contracts', label: 'Key Contracts', type: 'textarea', rows: 2, placeholder: 'Customer contracts, vendor agreements, partnerships' },
            { id: 'litigation', label: 'Litigation/Disputes', type: 'text', placeholder: 'Any pending or threatened?' },
          ],
        },
        {
          title: 'Team',
          fields: [
            { id: 'employment', label: 'Employment Agreements', type: 'text', placeholder: 'Do all employees have signed agreements?' },
            { id: 'vesting', label: 'Vesting Schedules', type: 'text', placeholder: 'Standard vesting for all equity holders?' },
            { id: 'key_person', label: 'Key Person Dependencies', type: 'textarea', rows: 2, placeholder: 'Any single points of failure?' },
          ],
        },
        {
          title: 'Product & Technology',
          fields: [
            { id: 'tech_architecture', label: 'Technical Architecture', type: 'text', placeholder: 'Is documentation available?' },
            { id: 'security', label: 'Security & Compliance', type: 'textarea', rows: 2, placeholder: 'SOC 2, GDPR, security practices' },
          ],
        },
      ],
    },
  },

  // ============ OPERATIONAL TEMPLATES ============
  {
    name: 'Weekly Standup Notes',
    description: 'Capture weekly team standup discussions and decisions',
    category: 'Operations',
    schema_json: {
      sections: [
        {
          title: 'Meeting Info',
          fields: [
            { id: 'date', label: 'Date', type: 'text', placeholder: 'Meeting date' },
            { id: 'attendees', label: 'Attendees', type: 'text', placeholder: 'Who attended?' },
          ],
        },
        {
          title: 'Last Week',
          fields: [
            { id: 'completed', label: 'Completed', type: 'textarea', rows: 4, placeholder: '• Task 1\n• Task 2\n• Task 3' },
            { id: 'blockers_resolved', label: 'Blockers Resolved', type: 'textarea', rows: 2, placeholder: 'What got unblocked?' },
          ],
        },
        {
          title: 'This Week',
          fields: [
            { id: 'priorities', label: 'Priorities', type: 'textarea', rows: 4, placeholder: '• Priority 1\n• Priority 2\n• Priority 3' },
            { id: 'blockers', label: 'Current Blockers', type: 'textarea', rows: 2, placeholder: 'What\'s blocking progress?' },
          ],
        },
        {
          title: 'Decisions & Action Items',
          fields: [
            { id: 'decisions', label: 'Decisions Made', type: 'textarea', rows: 2, placeholder: 'Key decisions from this meeting' },
            { id: 'action_items', label: 'Action Items', type: 'textarea', rows: 3, placeholder: '• Action item 1 - Owner - Due date\n• Action item 2' },
          ],
        },
      ],
    },
  },
  {
    name: 'Post-Mortem Analysis',
    description: 'Analyze incidents or failures to prevent recurrence',
    category: 'Operations',
    schema_json: {
      sections: [
        {
          title: 'Incident Overview',
          fields: [
            { id: 'incident_title', label: 'Incident Title', type: 'text', placeholder: 'Brief description of the incident' },
            { id: 'date_time', label: 'Date & Time', type: 'text', placeholder: 'When did it happen?' },
            { id: 'duration', label: 'Duration', type: 'text', placeholder: 'How long did it last?' },
            { id: 'severity', label: 'Severity', type: 'text', placeholder: 'Critical / High / Medium / Low' },
            { id: 'impact', label: 'Impact', type: 'textarea', rows: 2, placeholder: 'Who/what was affected? Revenue impact?' },
          ],
        },
        {
          title: 'Timeline',
          fields: [
            { id: 'timeline', label: 'Timeline of Events', type: 'textarea', rows: 4, placeholder: '10:00 - First alert\n10:05 - Investigation started\n10:30 - Root cause identified\n11:00 - Fix deployed' },
          ],
        },
        {
          title: 'Root Cause Analysis',
          fields: [
            { id: 'root_cause', label: 'Root Cause', type: 'textarea', rows: 3, placeholder: 'What was the underlying cause? Use 5 Whys if helpful.' },
            { id: 'contributing_factors', label: 'Contributing Factors', type: 'textarea', rows: 2, placeholder: 'What else contributed to this happening?' },
          ],
        },
        {
          title: 'Action Items',
          fields: [
            { id: 'immediate_actions', label: 'Immediate Actions Taken', type: 'textarea', rows: 2, placeholder: 'What did you do to fix it?' },
            { id: 'preventive_actions', label: 'Preventive Actions', type: 'textarea', rows: 3, placeholder: 'What will you do to prevent this from happening again? Owner? Due date?' },
          ],
        },
        {
          title: 'Lessons Learned',
          fields: [
            { id: 'lessons', label: 'Lessons Learned', type: 'textarea', rows: 3, placeholder: 'What did we learn? What went well in the response?' },
          ],
        },
      ],
    },
  },
];
