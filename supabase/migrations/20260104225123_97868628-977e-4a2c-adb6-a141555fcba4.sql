-- Fix security definer view issue by explicitly setting SECURITY INVOKER
-- This ensures RLS is applied based on the querying user, not the view creator

-- Recreate profiles_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  bio,
  expertise,
  linkedin_url,
  created_at,
  updated_at,
  CASE 
    WHEN auth.uid() = id OR is_admin_only() THEN email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN auth.uid() = id OR is_admin_only() THEN phone 
    ELSE NULL 
  END as phone,
  calendar_feed_token
FROM public.profiles;

-- Recreate startups_safe with SECURITY INVOKER
DROP VIEW IF EXISTS public.startups_safe;
CREATE VIEW public.startups_safe
WITH (security_invoker = true) AS
SELECT 
  s.id,
  s.name,
  s.description,
  s.logo_url,
  s.website,
  s.founded_date,
  s.created_at,
  s.updated_at,
  CASE 
    WHEN is_admin() OR EXISTS (
      SELECT 1 FROM workspaces w
      JOIN workspace_users wu ON w.id = wu.workspace_id
      WHERE w.startup_id = s.id 
        AND wu.user_id = auth.uid() 
        AND wu.active = true
        AND wu.role IN ('founder', 'consultor')
    ) THEN s.phone 
    ELSE NULL 
  END as phone,
  CASE 
    WHEN is_admin() OR EXISTS (
      SELECT 1 FROM workspaces w
      JOIN workspace_users wu ON w.id = wu.workspace_id
      WHERE w.startup_id = s.id 
        AND wu.user_id = auth.uid() 
        AND wu.active = true
        AND wu.role IN ('founder', 'consultor')
    ) THEN s.address 
    ELSE NULL 
  END as address
FROM public.startups s;