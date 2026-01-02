-- =====================================================
-- 1) Create public_profiles VIEW (safe fields only)
-- =====================================================

-- Create a view with only non-PII fields for "people directory" usage
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.expertise,
  -- Derive role display from user_roles
  COALESCE(
    (SELECT string_agg(ur.role::text, ', ') FROM public.user_roles ur WHERE ur.user_id = p.id),
    'member'
  ) AS role_display
FROM public.profiles p;

-- Grant select to authenticated users on the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- =====================================================
-- 2) Update RLS on profiles to restrict PII access
-- =====================================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new restrictive policies for profiles:
-- a) Users can always read their own full profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- b) Staff (admin/consultor) can read all profiles
CREATE POLICY "Staff can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.is_admin() OR 
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'consultor')
    )
  );

-- c) Workspace members can see basic profile info of other members
--    (This is handled via public_profiles view for safety)

-- =====================================================
-- 3) Create AI rate limiting table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT date_trunc('hour', now()),
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint for rate limit window
  CONSTRAINT ai_rate_limits_unique_window UNIQUE (user_id, workspace_id, function_name, window_start)
);

-- Enable RLS
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit records
CREATE POLICY "Users can view own rate limits"
  ON public.ai_rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update (via service role)
CREATE POLICY "Service can manage rate limits"
  ON public.ai_rate_limits
  FOR ALL
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_lookup 
  ON public.ai_rate_limits (user_id, function_name, window_start);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _user_id uuid,
  _workspace_id uuid,
  _function_name text,
  _max_requests integer DEFAULT 20  -- 20 requests per hour default
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamp with time zone;
  v_current_count integer;
BEGIN
  -- Current hour window
  v_window_start := date_trunc('hour', now());
  
  -- Try to insert or update
  INSERT INTO public.ai_rate_limits (user_id, workspace_id, function_name, window_start, request_count)
  VALUES (_user_id, _workspace_id, _function_name, v_window_start, 1)
  ON CONFLICT (user_id, workspace_id, function_name, window_start)
  DO UPDATE SET 
    request_count = ai_rate_limits.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO v_current_count;
  
  -- Return true if under limit
  RETURN v_current_count <= _max_requests;
END;
$$;

-- Clean up old rate limit records (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.ai_rate_limits
  WHERE window_start < now() - interval '24 hours';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;