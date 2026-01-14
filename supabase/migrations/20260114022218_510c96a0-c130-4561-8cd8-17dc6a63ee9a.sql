-- ==============================================
-- CRM-LITE V1: DATA MODEL EXTENSIONS
-- ==============================================

-- 1) Extend communication_log for unified activity timeline
ALTER TABLE public.communication_log
ADD COLUMN IF NOT EXISTS funnel_item_id UUID NULL REFERENCES public.funnel_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'note',
ADD COLUMN IF NOT EXISTS direction TEXT NULL,
ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'staff',
ADD COLUMN IF NOT EXISTS external_source TEXT NULL,
ADD COLUMN IF NOT EXISTS external_id TEXT NULL,
ADD COLUMN IF NOT EXISTS preview TEXT NULL;

-- Add check constraints
ALTER TABLE public.communication_log
ADD CONSTRAINT communication_log_activity_type_check 
CHECK (activity_type IN ('note', 'email', 'call', 'task', 'meeting', 'system'));

ALTER TABLE public.communication_log
ADD CONSTRAINT communication_log_direction_check 
CHECK (direction IS NULL OR direction IN ('inbound', 'outbound', 'internal'));

ALTER TABLE public.communication_log
ADD CONSTRAINT communication_log_visibility_check 
CHECK (visibility IN ('staff', 'shared'));

-- Dedupe index for external sources
CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_log_external_dedupe 
ON public.communication_log (external_source, external_id) 
WHERE external_id IS NOT NULL;

-- Index for timeline queries
CREATE INDEX IF NOT EXISTS idx_communication_log_timeline 
ON public.communication_log (workspace_id, occurred_at DESC) 
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_log_lead_timeline 
ON public.communication_log (funnel_item_id, occurred_at DESC) 
WHERE funnel_item_id IS NOT NULL;

-- 2) Relationship recaps table (cleaner than storing in communication_log)
CREATE TABLE IF NOT EXISTS public.relationship_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  funnel_item_id UUID NULL REFERENCES public.funnel_items(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'pt',
  summary TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]',
  open_loops JSONB NOT NULL DEFAULT '[]',
  risks JSONB NOT NULL DEFAULT '[]',
  next_best_actions JSONB NOT NULL DEFAULT '[]',
  items_analyzed INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT relationship_recaps_target_check CHECK (
    (workspace_id IS NOT NULL AND funnel_item_id IS NULL) OR 
    (workspace_id IS NULL AND funnel_item_id IS NOT NULL)
  )
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_relationship_recaps_workspace 
ON public.relationship_recaps (workspace_id, generated_at DESC) 
WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_relationship_recaps_funnel 
ON public.relationship_recaps (funnel_item_id, generated_at DESC) 
WHERE funnel_item_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.relationship_recaps ENABLE ROW LEVEL SECURITY;

-- 3) Add feature flags for CRM features
INSERT INTO public.feature_flags (key, description, enabled, scope)
VALUES 
  ('crm_graph_email_sync', 'Enable Microsoft Graph email synchronization for CRM timeline', false, 'global'),
  ('crm_ai_recap', 'Enable AI-powered relationship recaps in CRM', false, 'global')
ON CONFLICT (key) WHERE program_id IS NULL DO UPDATE SET description = EXCLUDED.description;

-- 4) RLS Policies for communication_log (update existing)
DROP POLICY IF EXISTS "Staff can view all communications" ON public.communication_log;
DROP POLICY IF EXISTS "Staff can insert communications" ON public.communication_log;
DROP POLICY IF EXISTS "Staff can update communications" ON public.communication_log;
DROP POLICY IF EXISTS "Founders can view shared workspace communications" ON public.communication_log;

-- Staff full access
CREATE POLICY "Staff can manage all communications"
ON public.communication_log
FOR ALL
USING (is_staff())
WITH CHECK (is_staff());

-- Founders can only see shared items for their workspaces
CREATE POLICY "Founders can view shared workspace communications"
ON public.communication_log
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND workspace_id IS NOT NULL
  AND visibility = 'shared'
  AND has_workspace_access(workspace_id)
  AND NOT is_staff()
);

-- 5) RLS Policies for relationship_recaps
CREATE POLICY "Staff can manage all recaps"
ON public.relationship_recaps
FOR ALL
USING (is_staff())
WITH CHECK (is_staff());

CREATE POLICY "Founders can view workspace recaps"
ON public.relationship_recaps
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND workspace_id IS NOT NULL
  AND has_workspace_access(workspace_id)
);

-- 6) Update trigger for relationship_recaps
CREATE TRIGGER update_relationship_recaps_updated_at
BEFORE UPDATE ON public.relationship_recaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Add last_activity_at to funnel_items for quick access
ALTER TABLE public.funnel_items
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS next_action_description TEXT NULL;

-- Function to update funnel_item last_activity_at
CREATE OR REPLACE FUNCTION public.update_funnel_item_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.funnel_item_id IS NOT NULL THEN
    UPDATE public.funnel_items
    SET last_activity_at = NEW.occurred_at, updated_at = now()
    WHERE id = NEW.funnel_item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_funnel_last_activity
AFTER INSERT ON public.communication_log
FOR EACH ROW
WHEN (NEW.funnel_item_id IS NOT NULL)
EXECUTE FUNCTION public.update_funnel_item_last_activity();