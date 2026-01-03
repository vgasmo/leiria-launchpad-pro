-- ============================================
-- CONSULTOR ASSISTIDO MODULE
-- Exercise Library, Support Materials, VP Wizard, Quality Gates
-- ============================================

-- 1. EXERCISE LIBRARY
CREATE TABLE public.exercise_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  purpose TEXT,
  startup_context_tags TEXT[] DEFAULT '{}',
  duration_minutes INTEGER DEFAULT 30,
  group_size TEXT DEFAULT '1:1' CHECK (group_size IN ('1:1', 'small_group', 'cohort')),
  materials_needed TEXT[] DEFAULT '{}',
  step_by_step JSONB DEFAULT '[]',
  facilitator_tips TEXT,
  success_criteria TEXT,
  common_pitfalls TEXT,
  variations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  owner_user_id UUID REFERENCES auth.users(id),
  program_id UUID REFERENCES public.programs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

-- RLS policies for exercise_library
CREATE POLICY "Anyone can view approved exercises"
  ON public.exercise_library FOR SELECT
  USING (status = 'approved' OR owner_user_id = auth.uid() OR is_admin());

CREATE POLICY "Staff can create exercises"
  ON public.exercise_library FOR INSERT
  WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'admin')
  ));

CREATE POLICY "Staff can update their exercises or admins can update any"
  ON public.exercise_library FOR UPDATE
  USING (owner_user_id = auth.uid() OR is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

CREATE POLICY "Admins can delete exercises"
  ON public.exercise_library FOR DELETE
  USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_exercise_library_updated_at
  BEFORE UPDATE ON public.exercise_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. EXERCISE ATTACHMENTS
CREATE TABLE public.exercise_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View attachments of viewable exercises"
  ON public.exercise_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.exercise_library e
    WHERE e.id = exercise_attachments.exercise_id
    AND (e.status = 'approved' OR e.owner_user_id = auth.uid() OR is_admin())
  ));

CREATE POLICY "Staff can manage attachments"
  ON public.exercise_attachments FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'admin')
  ));

-- 3. SESSION EXERCISES (link exercises to sessions)
CREATE TABLE public.session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, exercise_id)
);

ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

-- Helper function to get workspace_id from session
CREATE OR REPLACE FUNCTION public.get_session_workspace_id(_session_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT workspace_id FROM public.sessions WHERE id = _session_id
$$;

CREATE POLICY "View session exercises for accessible workspaces"
  ON public.session_exercises FOR SELECT
  USING (has_workspace_access(get_session_workspace_id(session_id)));

CREATE POLICY "Write session exercises for writable workspaces"
  ON public.session_exercises FOR ALL
  USING (can_write_workspace(get_session_workspace_id(session_id)));

-- 4. SUPPORT MATERIALS
CREATE TABLE public.support_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  startup_type TEXT, -- e.g., 'b2b', 'b2c', 'marketplace', 'deep_tech', 'impact'
  startup_stage TEXT, -- e.g., 'idea', 'early_traction', 'growth'
  category TEXT, -- 'guide', 'checklist', 'example', 'template'
  content_markdown TEXT,
  external_links JSONB DEFAULT '[]',
  file_path TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  owner_user_id UUID REFERENCES auth.users(id),
  program_id UUID REFERENCES public.programs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved support materials"
  ON public.support_materials FOR SELECT
  USING (status = 'approved' OR owner_user_id = auth.uid() OR is_admin());

CREATE POLICY "Staff can manage support materials"
  ON public.support_materials FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'admin')
  ));

CREATE TRIGGER update_support_materials_updated_at
  BEFORE UPDATE ON public.support_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. VALUE PROPOSITION ARTIFACTS
CREATE TABLE public.value_prop_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  json_fields JSONB NOT NULL DEFAULT '{}',
  outputs_text JSONB NOT NULL DEFAULT '{}', -- vp_statement, short_version, bullet_points, etc.
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.value_prop_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View VP artifacts for accessible workspaces"
  ON public.value_prop_artifacts FOR SELECT
  USING (has_workspace_access(workspace_id));

CREATE POLICY "Write VP artifacts for writable workspaces"
  ON public.value_prop_artifacts FOR ALL
  USING (can_write_workspace(workspace_id));

CREATE TRIGGER update_value_prop_artifacts_updated_at
  BEFORE UPDATE ON public.value_prop_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. QUALITY CHECKS CONFIG
CREATE TABLE public.quality_checks_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('session', 'proposal', 'followup')),
  criteria_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  weight INTEGER DEFAULT 10,
  is_required BOOLEAN DEFAULT false,
  check_function TEXT, -- e.g., 'has_agenda', 'has_objectives', 'has_outputs'
  program_id UUID REFERENCES public.programs(id), -- NULL = global
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(entity_type, criteria_key, program_id)
);

ALTER TABLE public.quality_checks_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quality config"
  ON public.quality_checks_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage quality config"
  ON public.quality_checks_config FOR ALL
  USING (is_admin());

-- 7. QUALITY CHECK RESULTS
CREATE TABLE public.quality_check_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('session', 'proposal', 'followup')),
  entity_id UUID NOT NULL,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  missing_items JSONB DEFAULT '[]',
  passed_items JSONB DEFAULT '[]',
  coach_hints JSONB DEFAULT '[]',
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  computed_by UUID REFERENCES auth.users(id),
  UNIQUE(entity_type, entity_id)
);

ALTER TABLE public.quality_check_results ENABLE ROW LEVEL SECURITY;

-- We need a generic function to check access based on entity type
CREATE OR REPLACE FUNCTION public.can_view_quality_result(_entity_type TEXT, _entity_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  IF _entity_type = 'session' THEN
    SELECT workspace_id INTO v_workspace_id FROM public.sessions WHERE id = _entity_id;
  ELSIF _entity_type = 'proposal' THEN
    SELECT workspace_id INTO v_workspace_id FROM public.template_instances WHERE id = _entity_id;
  ELSIF _entity_type = 'followup' THEN
    SELECT workspace_id INTO v_workspace_id FROM public.template_instances WHERE id = _entity_id;
  END IF;
  
  IF v_workspace_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN has_workspace_access(v_workspace_id);
END;
$$;

CREATE POLICY "View quality results for accessible entities"
  ON public.quality_check_results FOR SELECT
  USING (can_view_quality_result(entity_type, entity_id));

CREATE POLICY "Staff can manage quality results"
  ON public.quality_check_results FOR ALL
  USING (is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('consultor', 'admin')
  ));

-- 8. WORKSPACE QUALITY MODE SETTING
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS quality_mode TEXT DEFAULT 'advisory' CHECK (quality_mode IN ('advisory', 'strict'));

-- 9. SEED INITIAL QUALITY CONFIG
INSERT INTO public.quality_checks_config (entity_type, criteria_key, label, description, weight, is_required, check_function) VALUES
-- Session checks
('session', 'has_title', 'Has clear title', 'Session has a descriptive title', 10, true, 'has_title'),
('session', 'has_agenda', 'Has agenda', 'Session has a defined agenda or objectives', 20, true, 'has_agenda'),
('session', 'has_scheduled_time', 'Has scheduled time', 'Session has a specific date and time', 15, true, 'has_scheduled_time'),
('session', 'has_duration', 'Has duration estimate', 'Session duration is specified', 10, false, 'has_duration'),
('session', 'has_outputs', 'Has expected outputs', 'Session defines expected outcomes or deliverables', 15, false, 'has_outputs'),
('session', 'has_next_steps', 'Has next steps', 'Session includes planned next steps or action items', 15, false, 'has_next_steps'),
('session', 'has_notes', 'Has notes/summary', 'Session has documented notes or AI summary', 15, false, 'has_notes'),

-- Proposal checks
('proposal', 'has_problem', 'Problem defined', 'Proposal clearly defines the problem being solved', 20, true, 'has_problem'),
('proposal', 'has_solution', 'Solution described', 'Proposal describes the proposed solution', 20, true, 'has_solution'),
('proposal', 'has_value_prop', 'Value proposition', 'Proposal includes clear value proposition', 25, true, 'has_value_prop'),
('proposal', 'has_timeline', 'Timeline included', 'Proposal includes implementation timeline', 15, false, 'has_timeline'),
('proposal', 'has_metrics', 'Success metrics', 'Proposal defines success metrics or KPIs', 20, false, 'has_metrics'),

-- Follow-up checks
('followup', 'has_summary', 'Meeting summary', 'Follow-up includes meeting summary', 25, true, 'has_summary'),
('followup', 'has_decisions', 'Decisions documented', 'Key decisions are documented', 25, true, 'has_decisions'),
('followup', 'has_action_items', 'Action items listed', 'Action items with owners are listed', 25, true, 'has_action_items'),
('followup', 'has_next_meeting', 'Next meeting planned', 'Next meeting date/time is scheduled', 15, false, 'has_next_meeting'),
('followup', 'sent_timely', 'Sent within 24h', 'Follow-up sent within 24 hours', 10, false, 'sent_timely')
ON CONFLICT DO NOTHING;

-- 10. SEED SAMPLE EXERCISES (5 examples)
INSERT INTO public.exercise_library (title, purpose, startup_context_tags, duration_minutes, group_size, materials_needed, step_by_step, facilitator_tips, success_criteria, common_pitfalls, status) VALUES
(
  'Customer Discovery Interview Roleplay',
  'Practice conducting effective customer discovery interviews without leading questions or solution pitching',
  ARRAY['idea', 'validation', 'b2b', 'b2c'],
  30,
  '1:1',
  ARRAY['Interview script template', 'Stopwatch', 'Notes template'],
  '[{"step": 1, "title": "Brief the founder", "description": "Explain the goal: understand the customer problem deeply without mentioning the solution", "duration": 3},
    {"step": 2, "title": "Roleplay setup", "description": "Consultant plays a target customer persona. Give founder 2 minutes to prepare.", "duration": 5},
    {"step": 3, "title": "Interview simulation", "description": "Founder conducts 10-minute discovery interview while consultant takes notes on technique", "duration": 12},
    {"step": 4, "title": "Feedback session", "description": "Review what went well and what to improve. Focus on open-ended questions and active listening.", "duration": 10}]',
  'Watch for: leading questions, jumping to solutions, closed yes/no questions, not following up on interesting threads. Use gentle redirection: "Try asking that as an open question"',
  'Founder asks mostly open-ended questions, digs deeper with follow-ups, identifies at least 2 unexpected insights, avoids mentioning their solution',
  'Founders often try to validate their solution instead of understanding the problem. Remind them: the goal is learning, not selling.',
  'approved'
),
(
  'Value Proposition Canvas Workshop',
  'Map customer jobs, pains, and gains to product features for clear product-market fit articulation',
  ARRAY['idea', 'early_traction', 'b2b', 'b2c', 'marketplace'],
  45,
  'small_group',
  ARRAY['Value Proposition Canvas template (printed A3 or digital)', 'Sticky notes', 'Markers'],
  '[{"step": 1, "title": "Explain the framework", "description": "Present the Value Proposition Canvas: Customer Profile (jobs, pains, gains) and Value Map (products, pain relievers, gain creators)", "duration": 5},
    {"step": 2, "title": "Customer segment selection", "description": "Choose ONE specific customer segment to focus on", "duration": 5},
    {"step": 3, "title": "Customer Profile", "description": "Fill in customer jobs, pains, and gains based on research/interviews", "duration": 15},
    {"step": 4, "title": "Value Map", "description": "Map product/service features to pain relievers and gain creators", "duration": 15},
    {"step": 5, "title": "Fit analysis", "description": "Identify matches and gaps. Prioritize top 3 pain relievers and gain creators.", "duration": 5}]',
  'Keep teams focused on ONE segment. Push for specificity: "What specifically happens when they experience this pain?" Common escape is being too generic.',
  'Team produces a clear 1-sentence value proposition that directly addresses the top customer pain with a specific gain creator',
  'Teams try to address all customer segments at once. Canvas becomes too abstract. Features dont directly map to pains/gains.',
  'approved'
),
(
  'Pitch Deck Tear-Down',
  'Critically analyze and improve a startup pitch deck with structured feedback',
  ARRAY['fundraising', 'early_traction', 'growth'],
  40,
  '1:1',
  ARRAY['Current pitch deck (10-15 slides)', 'Scoring rubric', 'Best practices checklist'],
  '[{"step": 1, "title": "Silent review", "description": "Founder presents deck in silence - consultant notes first impressions", "duration": 5},
    {"step": 2, "title": "3-minute pitch", "description": "Founder pitches verbally while going through deck", "duration": 5},
    {"step": 3, "title": "Slide-by-slide review", "description": "Go through each slide: whats working, whats not, what questions arise", "duration": 20},
    {"step": 4, "title": "Prioritize improvements", "description": "Identify top 5 changes that would most improve the deck", "duration": 10}]',
  'Balance criticism with encouragement. Focus on clarity and narrative flow, not design. Ask: "What do you want the investor to feel/think/do after this slide?"',
  'Deck has clear narrative arc, each slide has one key message, problem/solution/traction are compelling, ask is clear and justified',
  'Getting lost in design details. Not addressing the "so what" for each slide. Missing clear ask and use of funds.',
  'approved'
),
(
  'Unit Economics Calculator Workshop',
  'Build and stress-test unit economics model to validate business viability',
  ARRAY['early_traction', 'growth', 'b2b', 'b2c', 'saas'],
  60,
  '1:1',
  ARRAY['Spreadsheet template', 'Industry benchmarks document', 'Calculator'],
  '[{"step": 1, "title": "Define the unit", "description": "What is one unit? (customer, transaction, subscription, etc.)", "duration": 5},
    {"step": 2, "title": "Revenue per unit", "description": "Calculate LTV: average revenue per unit × retention period", "duration": 15},
    {"step": 3, "title": "Cost per unit", "description": "Calculate CAC and variable costs per unit", "duration": 15},
    {"step": 4, "title": "Contribution margin", "description": "Calculate unit contribution margin and LTV:CAC ratio", "duration": 10},
    {"step": 5, "title": "Sensitivity analysis", "description": "Test: what happens if CAC doubles? Churn increases 50%? Price drops 20%?", "duration": 15}]',
  'Push for real data, not assumptions. If they dont have data, note it as a key gap to address. Challenge optimistic projections gently: "What evidence supports this retention rate?"',
  'Founder has working unit economics model with realistic inputs, understands key levers, identifies 2-3 actions to improve economics',
  'Using vanity metrics. Ignoring churn/refunds. Underestimating CAC. Not including all variable costs.',
  'approved'
),
(
  'Competitive Landscape Mapping',
  'Create comprehensive competitive analysis to identify positioning opportunities',
  ARRAY['idea', 'validation', 'early_traction', 'b2b', 'b2c'],
  35,
  'small_group',
  ARRAY['Whiteboard or digital canvas', 'Competitor research notes', '2x2 matrix template'],
  '[{"step": 1, "title": "Brainstorm competitors", "description": "List all competitors: direct, indirect, substitutes, and do-nothing option", "duration": 8},
    {"step": 2, "title": "Choose axes", "description": "Select 2 dimensions that matter most to target customers (price/quality, generalist/specialist, etc.)", "duration": 5},
    {"step": 3, "title": "Map competitors", "description": "Place each competitor on the 2x2 matrix", "duration": 10},
    {"step": 4, "title": "Identify whitespace", "description": "Find gaps in the market and position the startup", "duration": 7},
    {"step": 5, "title": "Defensive moat", "description": "Discuss: what makes this position defensible?", "duration": 5}]',
  'Challenge them to include non-obvious competitors. Ask: "What do customers do TODAY before your product exists?" Thats often the real competitor.',
  'Team has clear map with 8+ competitors, identifies defensible positioning, can articulate why customers would switch from alternatives',
  'Only listing direct competitors. Choosing axes that dont matter to customers. Positioning in crowded space without differentiation.',
  'approved'
)
ON CONFLICT DO NOTHING;

-- 11. SEED SAMPLE SUPPORT MATERIALS (2 examples)
INSERT INTO public.support_materials (title, description, startup_type, startup_stage, category, content_markdown, tags, status) VALUES
(
  'B2B Sales Process Guide',
  'Step-by-step guide for early-stage B2B startups to set up their first sales process',
  'b2b',
  'early_traction',
  'guide',
  '# B2B Sales Process for Early-Stage Startups

## Overview
This guide helps B2B founders set up a repeatable sales process when they have 0-10 customers.

## Phase 1: Founder-Led Sales (0-5 customers)

### Key Activities
1. **Define ICP (Ideal Customer Profile)**
   - Company size (employees, revenue)
   - Industry/vertical
   - Pain point intensity
   - Budget availability

2. **Build Target List**
   - Start with 50 target accounts
   - Research decision makers on LinkedIn
   - Find warm introductions when possible

3. **Outreach Cadence**
   - Day 1: Personalized email
   - Day 3: LinkedIn connection
   - Day 5: Follow-up email with value add
   - Day 10: Phone call if possible
   - Day 15: Break-up email

### Tracking
Use a simple spreadsheet:
| Company | Contact | Stage | Last Touch | Next Action | Notes |

## Phase 2: Documenting What Works (5-10 customers)

1. Record every sales call
2. Note objections and responses
3. Document winning pitch elements
4. Calculate conversion rates by stage

## Common Mistakes to Avoid
- Pitching before understanding the problem
- Not qualifying budget/authority early
- Long sales cycles without clear next steps
- Not following up consistently

## Resources
- [SPIN Selling Summary]
- [Email Template Library]
- [Objection Handling Scripts]',
  ARRAY['sales', 'b2b', 'founder-sales', 'outreach'],
  'approved'
),
(
  'Marketplace Launch Checklist',
  'Essential checklist for launching a two-sided marketplace, addressing chicken-and-egg problem',
  'marketplace',
  'idea',
  'checklist',
  '# Marketplace Launch Checklist

## Before Launch

### Supply Side (Sellers/Providers)
- [ ] Identified 20+ potential early suppliers
- [ ] Validated their willingness to join
- [ ] Onboarding process documented
- [ ] Pricing/commission structure defined
- [ ] Quality standards established

### Demand Side (Buyers/Consumers)
- [ ] Identified early adopter segment
- [ ] Validated demand exists
- [ ] Acquisition channel identified
- [ ] Value proposition clear

### Chicken-and-Egg Strategy
Choose ONE approach:
- [ ] **Single-player mode**: Product is useful without the other side
- [ ] **Subsidize one side**: Free or incentivized for supply
- [ ] **Managed supply**: Start with curated/fake supply
- [ ] **Events/concentrated demand**: Create spike demand moments
- [ ] **Geographic focus**: Win one city/area first

## Launch Week

### Day 1-3: Supply Activation
- [ ] Personally onboard first 10 suppliers
- [ ] Ensure profile quality is high
- [ ] Get commitment for response times

### Day 4-7: Demand Generation
- [ ] Launch demand acquisition
- [ ] Monitor first transactions closely
- [ ] Manually facilitate if needed

### Daily Monitoring
- [ ] Supply active rate (% responding within 24h)
- [ ] Demand conversion rate
- [ ] Transaction completion rate
- [ ] NPS/satisfaction scores

## Common Failure Modes
1. Launching both sides simultaneously with no liquidity
2. Not monitoring quality closely enough
3. Growing too fast before product-market fit
4. Ignoring supply-side experience',
  ARRAY['marketplace', 'launch', 'chicken-egg', 'two-sided'],
  'approved'
)
ON CONFLICT DO NOTHING;