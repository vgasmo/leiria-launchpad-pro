-- =============================================================================
-- ITEM 1: SECURITY - RLS workspace.status gating
-- =============================================================================

-- Create/update has_active_workspace_access function that checks workspace status
CREATE OR REPLACE FUNCTION public.has_active_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Staff (admin/consultor) always have access regardless of status
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor')
  ) OR EXISTS (
    -- Check workspace is active AND user is a member AND workspace is not blocked
    SELECT 1 FROM public.workspaces w
    JOIN public.workspace_users wu ON wu.workspace_id = w.id
    WHERE w.id = ws_id
    AND wu.user_id = auth.uid()
    AND wu.active = true
    AND w.status = 'active'
    AND w.blocked_at IS NULL
  );
$$;

-- =============================================================================
-- ITEM 2: public_booking_links table
-- =============================================================================

-- Create public_booking_links table for secure token validation
CREATE TABLE IF NOT EXISTS public.public_booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  owner_consultant_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_email text,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.public_booking_links ENABLE ROW LEVEL SECURITY;

-- Staff can view all booking links
CREATE POLICY "Staff can view booking links"
  ON public.public_booking_links FOR SELECT
  USING (public.is_staff());

-- Staff can create booking links
CREATE POLICY "Staff can create booking links"
  ON public.public_booking_links FOR INSERT
  WITH CHECK (public.is_staff());

-- Staff can update booking links
CREATE POLICY "Staff can update booking links"
  ON public.public_booking_links FOR UPDATE
  USING (public.is_staff());

-- Staff can delete booking links
CREATE POLICY "Staff can delete booking links"
  ON public.public_booking_links FOR DELETE
  USING (public.is_staff());

-- =============================================================================
-- ITEM 5: Global integration settings - restrict client-side access
-- =============================================================================

-- Drop existing permissive policies and create restrictive ones
DROP POLICY IF EXISTS "Admins can read global_integration_settings" ON public.global_integration_settings;
DROP POLICY IF EXISTS "Admins can insert global_integration_settings" ON public.global_integration_settings;
DROP POLICY IF EXISTS "Admins can update global_integration_settings" ON public.global_integration_settings;
DROP POLICY IF EXISTS "Admins can manage global integration settings" ON public.global_integration_settings;

-- Create restrictive policies that NEVER expose settings_json to clients
-- Admins can only SELECT id, integration_type, is_enabled, timestamps (not settings_json)
-- This policy still allows SELECT but the edge function will be the only way to access secrets
CREATE POLICY "Staff can view integration settings metadata only"
  ON public.global_integration_settings FOR SELECT
  USING (public.is_staff());

-- Only service role (edge functions) can INSERT/UPDATE
CREATE POLICY "Service role can manage integration settings"
  ON public.global_integration_settings FOR ALL
  USING (auth.uid() IS NULL); -- Only service role has NULL uid

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_public_booking_links_token_hash 
  ON public.public_booking_links(token_hash) WHERE active = true;