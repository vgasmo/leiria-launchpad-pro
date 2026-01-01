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
    description: 'Script for conducting customer discovery interviews',
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
    name: 'Hypothesis Testing Canvas',
    description: 'Define and test your business assumptions',
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
            { id: 'experiment_type', label: 'Experiment Type', type: 'text', placeholder: 'Interview, landing page, prototype test, etc.' },
            { id: 'success_criteria', label: 'Success Criteria', type: 'textarea', rows: 2, placeholder: 'What results would validate this hypothesis?' },
            { id: 'failure_criteria', label: 'Failure Criteria', type: 'textarea', rows: 2, placeholder: 'What results would invalidate this hypothesis?' },
            { id: 'sample_size', label: 'Required Sample Size', type: 'text', placeholder: 'How many data points do you need?' },
          ],
        },
        {
          title: 'Results',
          fields: [
            { id: 'actual_results', label: 'Actual Results', type: 'textarea', rows: 3, placeholder: 'What happened in the experiment?' },
            { id: 'validated', label: 'Hypothesis Status', type: 'text', placeholder: 'Validated / Invalidated / Inconclusive' },
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn? What changes will you make?' },
            { id: 'next_experiment', label: 'Next Experiment', type: 'textarea', rows: 2, placeholder: 'What will you test next?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Lean Canvas',
    description: 'One-page business model for startups',
    category: 'Strategy',
    stage: 'ideation',
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

  // ============ VALIDATION STAGE TEMPLATES ============
  {
    name: 'Customer Interview Summary',
    description: 'Consolidate insights from multiple customer interviews',
    category: 'Validation',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Interview Overview',
          fields: [
            { id: 'total_interviews', label: 'Total Interviews Conducted', type: 'number', placeholder: '0' },
            { id: 'customer_segments', label: 'Customer Segments Interviewed', type: 'textarea', rows: 2, placeholder: 'List the different types of customers' },
            { id: 'date_range', label: 'Date Range', type: 'text', placeholder: 'From - To' },
          ],
        },
        {
          title: 'Problem Patterns',
          description: 'What problems came up most frequently?',
          fields: [
            { id: 'top_problems', label: 'Top 3 Problems Mentioned', type: 'textarea', rows: 3, placeholder: '1. Problem A (mentioned by X people)\n2. Problem B\n3. Problem C' },
            { id: 'problem_severity', label: 'Problem Severity Assessment', type: 'textarea', rows: 2, placeholder: 'How severe are these problems? Hair on fire vs nice to have?' },
          ],
        },
        {
          title: 'Solution Preferences',
          fields: [
            { id: 'desired_features', label: 'Most Requested Features', type: 'textarea', rows: 3, placeholder: 'What solutions or features did customers mention?' },
            { id: 'pricing_feedback', label: 'Pricing Feedback', type: 'textarea', rows: 2, placeholder: 'What price points did customers mention?' },
          ],
        },
        {
          title: 'Validated Insights',
          fields: [
            { id: 'validated_assumptions', label: 'Validated Assumptions', type: 'textarea', rows: 3, placeholder: 'What assumptions were confirmed?' },
            { id: 'invalidated_assumptions', label: 'Invalidated Assumptions', type: 'textarea', rows: 3, placeholder: 'What assumptions were proven wrong?' },
            { id: 'surprises', label: 'Surprising Findings', type: 'textarea', rows: 2, placeholder: 'What unexpected insights emerged?' },
          ],
        },
        {
          title: 'Next Steps',
          fields: [
            { id: 'pivot_considerations', label: 'Pivot/Persevere Decision', type: 'textarea', rows: 2, placeholder: 'Based on findings, should you pivot or continue?' },
            { id: 'action_items', label: 'Action Items', type: 'textarea', rows: 3, placeholder: 'What will you do based on these insights?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Value Proposition Canvas',
    description: 'Map customer needs to your product features',
    category: 'Strategy',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Customer Profile',
          description: 'Understand your customer deeply',
          fields: [
            { id: 'customer_jobs', label: 'Customer Jobs', type: 'textarea', rows: 3, placeholder: 'What tasks are they trying to accomplish? Functional, social, emotional jobs?' },
            { id: 'pains', label: 'Pains', type: 'textarea', rows: 3, placeholder: 'What annoys them? What risks do they fear? What obstacles exist?' },
            { id: 'gains', label: 'Gains', type: 'textarea', rows: 3, placeholder: 'What outcomes do they want? What would delight them?' },
          ],
        },
        {
          title: 'Value Map',
          description: 'How your product addresses customer needs',
          fields: [
            { id: 'products_services', label: 'Products & Services', type: 'textarea', rows: 3, placeholder: 'What are you offering?' },
            { id: 'pain_relievers', label: 'Pain Relievers', type: 'textarea', rows: 3, placeholder: 'How does your product eliminate or reduce pains?' },
            { id: 'gain_creators', label: 'Gain Creators', type: 'textarea', rows: 3, placeholder: 'How does your product create gains?' },
          ],
        },
        {
          title: 'Fit Assessment',
          fields: [
            { id: 'fit_score', label: 'Problem-Solution Fit Score (1-10)', type: 'number', placeholder: '0' },
            { id: 'strongest_fit', label: 'Where is the fit strongest?', type: 'textarea', rows: 2, placeholder: 'Which pain/gain has the best match?' },
            { id: 'gaps', label: 'Where are the gaps?', type: 'textarea', rows: 2, placeholder: 'What pains/gains are not addressed?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Landing Page Test',
    description: 'Track results from your validation landing page',
    category: 'Validation',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Test Setup',
          fields: [
            { id: 'landing_url', label: 'Landing Page URL', type: 'text', placeholder: 'https://...' },
            { id: 'value_proposition', label: 'Value Proposition Tested', type: 'textarea', rows: 2, placeholder: 'What message/offer are you testing?' },
            { id: 'traffic_sources', label: 'Traffic Sources', type: 'textarea', rows: 2, placeholder: 'Google Ads, Facebook, LinkedIn, etc.' },
            { id: 'budget_spent', label: 'Budget Spent', type: 'text', placeholder: 'Total ad spend' },
          ],
        },
        {
          title: 'Metrics',
          fields: [
            { id: 'visitors', label: 'Total Visitors', type: 'number', placeholder: '0' },
            { id: 'signups', label: 'Email Signups/Leads', type: 'number', placeholder: '0' },
            { id: 'conversion_rate', label: 'Conversion Rate (%)', type: 'number', placeholder: '0' },
            { id: 'cost_per_lead', label: 'Cost Per Lead', type: 'text', placeholder: 'Budget / Signups' },
          ],
        },
        {
          title: 'Qualitative Feedback',
          fields: [
            { id: 'user_feedback', label: 'User Feedback/Comments', type: 'textarea', rows: 3, placeholder: 'What did users say?' },
            { id: 'objections', label: 'Common Objections', type: 'textarea', rows: 2, placeholder: 'Why did people not sign up?' },
          ],
        },
        {
          title: 'Conclusions',
          fields: [
            { id: 'test_result', label: 'Test Result', type: 'text', placeholder: 'Pass / Fail / Inconclusive' },
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn from this test?' },
            { id: 'next_test', label: 'Next Test', type: 'textarea', rows: 2, placeholder: 'What will you test next?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Competitor Analysis',
    description: 'Analyze your competitive landscape',
    category: 'Strategy',
    stage: 'validation',
    schema_json: {
      sections: [
        {
          title: 'Direct Competitors',
          fields: [
            { id: 'competitor_1', label: 'Competitor 1', type: 'text', placeholder: 'Company name' },
            { id: 'competitor_1_strengths', label: 'Strengths', type: 'textarea', rows: 2, placeholder: 'What do they do well?' },
            { id: 'competitor_1_weaknesses', label: 'Weaknesses', type: 'textarea', rows: 2, placeholder: 'Where do they fall short?' },
            { id: 'competitor_1_pricing', label: 'Pricing', type: 'text', placeholder: 'Their pricing model' },
          ],
        },
        {
          title: 'Indirect Competitors',
          fields: [
            { id: 'indirect_competitors', label: 'Alternative Solutions', type: 'textarea', rows: 3, placeholder: 'How else do customers solve this problem? (spreadsheets, manual processes, etc.)' },
          ],
        },
        {
          title: 'Your Differentiation',
          fields: [
            { id: 'unique_features', label: 'Your Unique Features', type: 'textarea', rows: 2, placeholder: 'What can you do that they cannot?' },
            { id: 'target_niche', label: 'Your Target Niche', type: 'textarea', rows: 2, placeholder: 'What segment are you focusing on that they ignore?' },
            { id: 'positioning', label: 'Positioning Statement', type: 'textarea', rows: 2, placeholder: 'For [target] who [need], our product is [category] that [benefit]' },
          ],
        },
      ],
    },
  },

  // ============ MVP STAGE TEMPLATES ============
  {
    name: 'MVP Feature Prioritization',
    description: 'Prioritize features for your minimum viable product',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Core Value Proposition',
          fields: [
            { id: 'core_problem', label: 'Core Problem to Solve', type: 'textarea', rows: 2, placeholder: 'What is the ONE problem your MVP must solve?' },
            { id: 'success_definition', label: 'MVP Success Definition', type: 'textarea', rows: 2, placeholder: 'How will you know if the MVP is successful?' },
          ],
        },
        {
          title: 'Must-Have Features',
          description: 'Features that are essential for the MVP to work',
          fields: [
            { id: 'must_have', label: 'Must-Have Features', type: 'textarea', rows: 4, placeholder: '1. Feature A - Why it is essential\n2. Feature B - Why it is essential\n3. Feature C - Why it is essential' },
          ],
        },
        {
          title: 'Should-Have Features',
          description: 'Important but can be simplified or added in v1.1',
          fields: [
            { id: 'should_have', label: 'Should-Have Features', type: 'textarea', rows: 3, placeholder: 'Features that would improve the MVP but are not critical' },
          ],
        },
        {
          title: 'Nice-to-Have Features',
          description: 'Can wait for later versions',
          fields: [
            { id: 'nice_to_have', label: 'Nice-to-Have Features', type: 'textarea', rows: 3, placeholder: 'Features that can definitely wait' },
          ],
        },
        {
          title: 'Scope Control',
          fields: [
            { id: 'not_building', label: 'What We Are NOT Building', type: 'textarea', rows: 2, placeholder: 'Explicitly list features that are out of scope' },
            { id: 'timeline', label: 'Target Launch Date', type: 'text', placeholder: 'When will MVP be ready?' },
            { id: 'constraints', label: 'Key Constraints', type: 'textarea', rows: 2, placeholder: 'Time, budget, team limitations' },
          ],
        },
      ],
    },
  },
  {
    name: 'User Story Map',
    description: 'Map user journeys and prioritize development',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'User Persona',
          fields: [
            { id: 'persona_name', label: 'Persona Name', type: 'text', placeholder: 'e.g., Marketing Manager Maria' },
            { id: 'persona_goal', label: 'Primary Goal', type: 'text', placeholder: 'What is their main objective?' },
          ],
        },
        {
          title: 'User Journey Steps',
          description: 'Break down the user journey into major steps',
          fields: [
            { id: 'step_1', label: 'Step 1: Discovery', type: 'textarea', rows: 2, placeholder: 'How do they find/access the product?' },
            { id: 'step_2', label: 'Step 2: Onboarding', type: 'textarea', rows: 2, placeholder: 'First-time user experience' },
            { id: 'step_3', label: 'Step 3: Core Action', type: 'textarea', rows: 2, placeholder: 'The main action they take' },
            { id: 'step_4', label: 'Step 4: Value Delivery', type: 'textarea', rows: 2, placeholder: 'When do they get value?' },
            { id: 'step_5', label: 'Step 5: Return', type: 'textarea', rows: 2, placeholder: 'What brings them back?' },
          ],
        },
        {
          title: 'Stories per Step',
          fields: [
            { id: 'stories_mvp', label: 'MVP Stories (Release 1)', type: 'textarea', rows: 4, placeholder: 'As a [user], I want to [action] so that [benefit]\n...' },
            { id: 'stories_v2', label: 'Version 2 Stories', type: 'textarea', rows: 3, placeholder: 'Stories for the next release' },
          ],
        },
      ],
    },
  },
  {
    name: 'MVP Launch Checklist',
    description: 'Pre-launch checklist for your MVP',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Product Readiness',
          fields: [
            { id: 'product_checklist', label: 'Product Checklist', type: 'checklist', options: [
              'Core features working end-to-end',
              'Critical bugs fixed',
              'Basic error handling in place',
              'Mobile/responsive tested',
              'Performance acceptable',
              'Security basics covered (auth, data protection)',
            ]},
          ],
        },
        {
          title: 'Analytics & Tracking',
          fields: [
            { id: 'analytics_checklist', label: 'Analytics Setup', type: 'checklist', options: [
              'Analytics tool integrated',
              'Key events tracked (signup, activation, core actions)',
              'Funnel tracking configured',
              'Error tracking enabled',
            ]},
          ],
        },
        {
          title: 'Customer Support',
          fields: [
            { id: 'support_checklist', label: 'Support Readiness', type: 'checklist', options: [
              'Contact/feedback mechanism in place',
              'FAQ or help docs created',
              'Team knows how to handle issues',
            ]},
          ],
        },
        {
          title: 'Launch Plan',
          fields: [
            { id: 'launch_date', label: 'Launch Date', type: 'text', placeholder: 'When are you launching?' },
            { id: 'initial_users', label: 'Initial Users', type: 'textarea', rows: 2, placeholder: 'Who are your first users? How will you reach them?' },
            { id: 'success_metrics', label: 'Week 1 Success Metrics', type: 'textarea', rows: 2, placeholder: 'What metrics will you track in the first week?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Technical Architecture',
    description: 'Document your MVP technical decisions',
    category: 'Product',
    stage: 'mvp',
    schema_json: {
      sections: [
        {
          title: 'Stack Overview',
          fields: [
            { id: 'frontend', label: 'Frontend', type: 'text', placeholder: 'React, Vue, etc.' },
            { id: 'backend', label: 'Backend', type: 'text', placeholder: 'Node.js, Python, etc.' },
            { id: 'database', label: 'Database', type: 'text', placeholder: 'PostgreSQL, MongoDB, etc.' },
            { id: 'hosting', label: 'Hosting/Infrastructure', type: 'text', placeholder: 'AWS, Vercel, etc.' },
          ],
        },
        {
          title: 'Key Decisions',
          fields: [
            { id: 'why_stack', label: 'Why This Stack?', type: 'textarea', rows: 3, placeholder: 'Justify your technology choices' },
            { id: 'tradeoffs', label: 'Trade-offs Made', type: 'textarea', rows: 2, placeholder: 'What did you sacrifice for speed?' },
            { id: 'tech_debt', label: 'Known Technical Debt', type: 'textarea', rows: 2, placeholder: 'What will need to be fixed later?' },
          ],
        },
        {
          title: 'Third-Party Services',
          fields: [
            { id: 'services', label: 'External Services Used', type: 'textarea', rows: 3, placeholder: 'Auth0, Stripe, SendGrid, etc. and why' },
            { id: 'costs', label: 'Monthly Cost Estimate', type: 'text', placeholder: 'Expected infrastructure costs' },
          ],
        },
      ],
    },
  },

  // ============ GROWTH STAGE TEMPLATES ============
  {
    name: 'Growth Experiment Tracker',
    description: 'Track and analyze growth experiments',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Experiment Overview',
          fields: [
            { id: 'experiment_name', label: 'Experiment Name', type: 'text', placeholder: 'Name of the experiment' },
            { id: 'growth_lever', label: 'Growth Lever', type: 'text', placeholder: 'Acquisition, Activation, Retention, Revenue, Referral' },
            { id: 'hypothesis', label: 'Hypothesis', type: 'textarea', rows: 2, placeholder: 'If we [action], then [metric] will [change] by [amount]' },
          ],
        },
        {
          title: 'Experiment Design',
          fields: [
            { id: 'test_description', label: 'What are you testing?', type: 'textarea', rows: 2, placeholder: 'Describe the change or test' },
            { id: 'control_group', label: 'Control Group', type: 'text', placeholder: 'Current experience' },
            { id: 'test_group', label: 'Test Group', type: 'text', placeholder: 'New experience' },
            { id: 'success_metric', label: 'Primary Success Metric', type: 'text', placeholder: 'What metric determines success?' },
            { id: 'sample_size', label: 'Required Sample Size', type: 'text', placeholder: 'How many users/events needed?' },
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
            { id: 'learnings', label: 'Key Learnings', type: 'textarea', rows: 3, placeholder: 'What did you learn?' },
            { id: 'next_steps', label: 'Next Steps', type: 'textarea', rows: 2, placeholder: 'What will you do next?' },
          ],
        },
      ],
    },
  },
  {
    name: 'Go-to-Market Plan',
    description: 'Strategy for launching and growing your product',
    category: 'Growth',
    stage: 'growth',
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
    name: 'Customer Success Playbook',
    description: 'Onboarding and retention strategies',
    category: 'Growth',
    stage: 'growth',
    schema_json: {
      sections: [
        {
          title: 'Onboarding Journey',
          fields: [
            { id: 'activation_moment', label: 'Aha Moment', type: 'textarea', rows: 2, placeholder: 'When do users first experience value?' },
            { id: 'onboarding_steps', label: 'Onboarding Steps', type: 'textarea', rows: 3, placeholder: 'Key steps to get users to the aha moment' },
            { id: 'time_to_value', label: 'Target Time-to-Value', type: 'text', placeholder: 'How quickly should users see value?' },
          ],
        },
        {
          title: 'Health Metrics',
          fields: [
            { id: 'health_indicators', label: 'Customer Health Indicators', type: 'textarea', rows: 3, placeholder: 'What signals indicate a healthy customer?' },
            { id: 'churn_signals', label: 'Churn Warning Signs', type: 'textarea', rows: 2, placeholder: 'What signals indicate a customer might churn?' },
          ],
        },
        {
          title: 'Retention Tactics',
          fields: [
            { id: 'engagement_tactics', label: 'Engagement Tactics', type: 'textarea', rows: 3, placeholder: 'How do you keep users engaged?' },
            { id: 'win_back_strategy', label: 'Win-Back Strategy', type: 'textarea', rows: 2, placeholder: 'How do you re-engage churned users?' },
          ],
        },
      ],
    },
  },

  // ============ SCALE STAGE TEMPLATES ============
  {
    name: 'Business Model Canvas',
    description: 'High-level business model overview',
    category: 'Strategy',
    stage: 'scale',
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
    stage: 'scale',
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

  // ============ FUNDRAISING TEMPLATES (All stages) ============
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
