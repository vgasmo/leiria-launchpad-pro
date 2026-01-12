-- Feature flags table for gating new functionality
CREATE TABLE public.feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'program')),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage flags; staff can read
CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.is_admin());

CREATE POLICY "Staff can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (public.is_staff());

-- Founders can read global flags (to check if features are enabled for them)
CREATE POLICY "Founders can read global flags"
  ON public.feature_flags FOR SELECT
  USING (scope = 'global');

-- Founders can read program-scoped flags for their programs
CREATE POLICY "Founders can read program flags"
  ON public.feature_flags FOR SELECT
  USING (
    scope = 'program' AND 
    program_id IN (
      SELECT w.program_id FROM public.workspaces w
      JOIN public.workspace_users wu ON wu.workspace_id = w.id
      WHERE wu.user_id = auth.uid() AND wu.active = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default flags (all OFF)
INSERT INTO public.feature_flags (key, enabled, scope, description) VALUES
  ('public_first_contact_booking', false, 'global', 'Enable public booking links for first contact sessions'),
  ('funnel_ui', false, 'global', 'Enable leads/funnel management UI in admin'),
  ('strict_calendar_validation', false, 'global', 'Require Graph API validation before booking (fail-closed)'),
  ('founder_gamification', false, 'global', 'Enable XP, badges, and streak tracking for founders'),
  ('traction_stage', false, 'global', 'Enable traction stage between MVP and growth');