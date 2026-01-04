-- Fix security issue 3: Restrict startup contact info access
-- Create a view that masks phone/address for non-founders and non-assigned staff
CREATE OR REPLACE VIEW public.startups_safe AS
SELECT 
  s.id,
  s.name,
  s.description,
  s.logo_url,
  s.website,
  s.founded_date,
  s.created_at,
  s.updated_at,
  -- Only show contact info to founders, assigned staff, or admins
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