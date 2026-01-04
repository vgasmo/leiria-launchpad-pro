-- Create function to check if user can see startup PII
CREATE OR REPLACE FUNCTION public.can_see_startup_pii(_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 
    FROM workspace_users wu
    JOIN workspaces w ON w.id = wu.workspace_id
    WHERE w.startup_id = _startup_id
      AND wu.user_id = auth.uid()
      AND wu.active = true
      AND wu.role IN ('founder', 'consultor')
  )
$$;

-- Create startups_safe view with correct columns
DROP VIEW IF EXISTS public.startups_safe;
CREATE VIEW public.startups_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  description,
  website,
  logo_url,
  founded_date,
  created_at,
  updated_at,
  -- Only show phone/address if user is founder or consultor for this startup
  CASE 
    WHEN can_see_startup_pii(id) 
    THEN phone 
    ELSE NULL 
  END AS phone,
  CASE 
    WHEN can_see_startup_pii(id) 
    THEN address 
    ELSE NULL 
  END AS address
FROM public.startups;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.startups_safe TO authenticated;