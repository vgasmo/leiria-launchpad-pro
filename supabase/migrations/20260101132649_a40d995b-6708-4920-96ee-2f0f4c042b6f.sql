
-- Update can_write_workspace to also grant access to consultors (who manage all workspaces)
CREATE OR REPLACE FUNCTION public.can_write_workspace(_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin() OR 
    -- Consultors have access to all workspaces
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    ) OR 
    EXISTS (
      SELECT 1 FROM public.workspace_users
      WHERE user_id = auth.uid() 
      AND workspace_id = _workspace_id
      AND active = true
      AND role IN ('admin', 'consultor', 'mentor_externo', 'founder')
    )
$function$;

-- Also update has_workspace_access to include consultors globally
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin() OR 
    -- Consultors have access to all workspaces  
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    ) OR
    EXISTS (
      SELECT 1 FROM public.workspace_users
      WHERE user_id = auth.uid() 
      AND workspace_id = _workspace_id
      AND active = true
    )
$function$;

-- Also update the overload with user_id parameter
CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id uuid, _workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND active = true
  ) OR public.is_admin(_user_id) OR
  -- Consultors have access to all workspaces
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'consultor'
  )
$function$;

-- Seed KPI definitions if they don't exist
INSERT INTO kpi_definitions (id, name, description, unit, direction, category, is_global) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Monthly Revenue', 'Total monthly revenue', '€', 'up', 'Financial', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'Monthly Burn Rate', 'Monthly operating expenses', '€', 'down', 'Financial', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d481', 'Runway', 'Months of runway remaining', 'months', 'up', 'Financial', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d482', 'Active Users', 'Monthly active users', 'users', 'up', 'Product', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d483', 'Customer Acquisition Cost', 'Cost to acquire one customer', '€', 'down', 'Growth', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d484', 'Customer Lifetime Value', 'Average revenue per customer lifetime', '€', 'up', 'Growth', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d485', 'Net Promoter Score', 'Customer satisfaction score', 'score', 'up', 'Customer', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d486', 'Churn Rate', 'Monthly customer churn percentage', '%', 'down', 'Customer', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d487', 'Employee Count', 'Full-time employees', 'people', 'up', 'Team', true),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d488', 'Conversion Rate', 'Website/funnel conversion rate', '%', 'up', 'Growth', true)
ON CONFLICT (id) DO NOTHING;

-- Seed stage KPI defaults for ideation stage
INSERT INTO stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
  ('ideation', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', true),  -- Active Users
  ('ideation', 'f47ac10b-58cc-4372-a567-0e02b2c3d485', false), -- NPS
  ('validation', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', true),  -- Monthly Revenue
  ('validation', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', true),  -- Active Users
  ('validation', 'f47ac10b-58cc-4372-a567-0e02b2c3d485', true),  -- NPS
  ('mvp', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', true),  -- Monthly Revenue
  ('mvp', 'f47ac10b-58cc-4372-a567-0e02b2c3d480', true),  -- Burn Rate
  ('mvp', 'f47ac10b-58cc-4372-a567-0e02b2c3d481', true),  -- Runway
  ('mvp', 'f47ac10b-58cc-4372-a567-0e02b2c3d482', true),  -- Active Users
  ('growth', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', true),  -- Monthly Revenue
  ('growth', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', true),  -- CAC
  ('growth', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', true),  -- LTV
  ('growth', 'f47ac10b-58cc-4372-a567-0e02b2c3d486', true),  -- Churn Rate
  ('scale', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', true),  -- Monthly Revenue
  ('scale', 'f47ac10b-58cc-4372-a567-0e02b2c3d483', true),  -- CAC
  ('scale', 'f47ac10b-58cc-4372-a567-0e02b2c3d484', true),  -- LTV
  ('scale', 'f47ac10b-58cc-4372-a567-0e02b2c3d486', true),  -- Churn Rate
  ('scale', 'f47ac10b-58cc-4372-a567-0e02b2c3d487', true)   -- Employee Count
ON CONFLICT DO NOTHING;