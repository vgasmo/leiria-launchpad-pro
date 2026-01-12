/**
 * Session templates for different meeting types
 * These can be seeded to the database or used as defaults
 */
export interface SessionTemplateData {
  name: string;
  description: string;
  agenda_template: string;
  notes_template: string | null;
  is_global: boolean;
}

export const SESSION_TEMPLATES: SessionTemplateData[] = [
  {
    name: 'Onboarding Session',
    description: 'First meeting with a new startup to establish goals and expectations',
    agenda_template: `## Onboarding Session Agenda

### 1. Introductions (10 min)
- Meet the team
- Share backgrounds and roles

### 2. Startup Overview (15 min)
- Current stage and traction
- Key metrics and KPIs
- Immediate challenges

### 3. Program Expectations (10 min)
- Session cadence and format
- Communication channels
- Milestone and reporting requirements

### 4. Goal Setting (15 min)
- 30/60/90 day objectives
- Key outcomes for the program
- Success metrics

### 5. Next Steps (10 min)
- Immediate action items
- Resources and tools setup
- Schedule follow-up sessions`,
    notes_template: `## Session Notes

### Attendees:
- 

### Key Discussion Points:
- 

### Startup Background:
- Stage: 
- Team size: 
- Current challenges: 

### Goals Established:
1. 
2. 
3. 

### Action Items:
- [ ] `,
    is_global: true,
  },
  {
    name: 'Monthly Check-in',
    description: 'Regular monthly progress review and planning session',
    agenda_template: `## Monthly Check-in Agenda

### 1. Progress Review (15 min)
- Review last month's action items
- KPI updates and trends
- Milestone progress

### 2. Wins & Learnings (10 min)
- Key achievements this month
- Lessons learned
- Unexpected challenges

### 3. Current Blockers (15 min)
- What's slowing you down?
- Resource gaps
- Decision points needing input

### 4. Planning Ahead (15 min)
- Priorities for next month
- Key milestones coming up
- Support needed

### 5. Action Items (5 min)
- Capture specific next steps
- Assign owners and deadlines`,
    notes_template: null,
    is_global: true,
  },
  {
    name: 'Investor Prep',
    description: 'Prepare for investor meetings, pitch practice, and fundraising strategy',
    agenda_template: `## Investor Prep Session Agenda

### 1. Fundraising Status (10 min)
- Current round details (stage, target, timeline)
- Pipeline of investor conversations
- Recent meetings and feedback

### 2. Pitch Review (20 min)
- Walk through current pitch deck
- Key messaging and positioning
- Areas needing refinement

### 3. Q&A Preparation (15 min)
- Common investor questions
- Difficult questions and answers
- Market and competition responses

### 4. Materials Review (10 min)
- Dataroom readiness
- Financial model quality
- Supporting documents

### 5. Strategy & Next Steps (5 min)
- Target investor list
- Introduction requests
- Timeline and milestones`,
    notes_template: `## Investor Prep Notes

### Current Fundraising Status:
- Round: 
- Target: 
- Timeline: 

### Pitch Feedback:
- Strengths: 
- Areas to improve: 

### Key Q&A Prep:
| Question | Answer |
|----------|--------|
| | |

### Materials Checklist:
- [ ] Pitch deck updated
- [ ] Financial model current
- [ ] Dataroom organized
- [ ] Cap table clean

### Action Items:
- [ ] `,
    is_global: true,
  },
  {
    name: 'GTM Review',
    description: 'Go-to-market strategy review and sales/marketing optimization',
    agenda_template: `## Go-to-Market Review Agenda

### 1. Market Overview (10 min)
- Target market updates
- Competitive landscape changes
- Customer segment insights

### 2. Sales Performance (15 min)
- Pipeline review
- Conversion metrics
- Sales cycle analysis
- Lost deals and learnings

### 3. Marketing Effectiveness (15 min)
- Channel performance
- CAC and payback analysis
- Content and campaigns review

### 4. Product-Market Fit Signals (10 min)
- Customer feedback themes
- Retention and churn
- NPS and satisfaction scores

### 5. Optimization Priorities (10 min)
- Top experiments to run
- Resource allocation
- Next period focus`,
    notes_template: null,
    is_global: true,
  },
  {
    name: 'Hiring Strategy',
    description: 'Team building, hiring priorities, and organizational planning',
    agenda_template: `## Hiring Strategy Session Agenda

### 1. Current Team Assessment (10 min)
- Team structure and gaps
- Skill coverage matrix
- Performance and capacity

### 2. Hiring Priorities (15 min)
- Critical roles to fill
- Timeline and urgency
- Budget considerations

### 3. Candidate Pipeline (15 min)
- Active candidates
- Sourcing strategies
- Interview process review

### 4. Culture & Onboarding (10 min)
- Culture documentation
- Onboarding process
- Remote/hybrid considerations

### 5. Next Steps (10 min)
- Job descriptions to create/update
- Sourcing actions
- Interview scheduling`,
    notes_template: null,
    is_global: true,
  },
  {
    name: 'Fundraising Strategy',
    description: 'Deep dive into fundraising approach, investor targeting, and timeline',
    agenda_template: `## Fundraising Strategy Session Agenda

### 1. Readiness Assessment (10 min)
- Key metrics review
- Traction highlights
- Story and positioning

### 2. Round Structure (15 min)
- Target raise amount
- Valuation considerations
- Round type (SAFE, priced, etc.)
- Use of funds

### 3. Investor Targeting (15 min)
- Ideal investor profile
- Target list building
- Warm intro mapping
- Cold outreach strategy

### 4. Materials Preparation (15 min)
- Pitch deck status
- One-pager
- Financial model
- Dataroom

### 5. Timeline & Process (5 min)
- Fundraising timeline
- Meeting cadence
- Decision criteria`,
    notes_template: null,
    is_global: true,
  },
  {
    name: 'Product Roadmap',
    description: 'Product strategy, roadmap review, and feature prioritization',
    agenda_template: `## Product Roadmap Session Agenda

### 1. Product Vision Check (5 min)
- Vision alignment
- Strategic direction

### 2. Current Sprint/Cycle Review (15 min)
- What shipped
- What's in progress
- Blockers and delays

### 3. Roadmap Review (20 min)
- Upcoming priorities
- Feature requests and backlog
- Technical debt considerations

### 4. Customer Feedback (10 min)
- User research insights
- Feature requests patterns
- Churn/retention drivers

### 5. Prioritization (10 min)
- Impact vs effort analysis
- Dependencies
- Next cycle commitments`,
    notes_template: null,
    is_global: true,
  },
  {
    name: 'Crisis/Alerts Review',
    description: 'Address urgent issues, declining health scores, or critical alerts',
    agenda_template: `## Crisis Review Session Agenda

### 1. Situation Assessment (10 min)
- What triggered this session
- Current state of affairs
- Immediate risks

### 2. Root Cause Analysis (15 min)
- What went wrong
- Contributing factors
- Early warning signs missed

### 3. Immediate Actions (15 min)
- Emergency measures needed
- Resource reallocation
- Communication plan

### 4. Recovery Plan (15 min)
- Short-term stabilization
- Medium-term recovery
- Long-term prevention

### 5. Monitoring & Check-ins (5 min)
- Key metrics to watch
- Escalation triggers
- Follow-up cadence`,
    notes_template: `## Crisis Review Notes

### Issue Summary:
- 

### Root Cause:
- 

### Immediate Actions:
- [ ] 

### Recovery Timeline:
- Week 1: 
- Week 2: 
- Week 3: 

### Success Metrics:
- `,
    is_global: true,
  },
  {
    name: 'Board Meeting Prep',
    description: 'Prepare for board meetings, deck review, and presentation practice',
    agenda_template: `## Board Meeting Prep Agenda

### 1. Deck Review (20 min)
- Walk through current deck
- Narrative and flow
- Data accuracy check

### 2. Key Topics (15 min)
- Critical decisions for the board
- Information requests
- Approvals needed

### 3. Q&A Preparation (15 min)
- Anticipated questions
- Sensitive topics
- Answer preparation

### 4. Logistics & Materials (5 min)
- Meeting format and timing
- Pre-read distribution
- Follow-up items

### 5. Practice (5 min)
- Opening statement
- Key message reinforcement`,
    notes_template: null,
    is_global: true,
  },
];
