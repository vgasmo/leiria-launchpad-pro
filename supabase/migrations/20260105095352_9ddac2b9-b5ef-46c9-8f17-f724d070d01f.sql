-- =====================================================
-- Security Hardening: Protect PII in profiles, team_members, startups, and cap_table_entries
-- =====================================================

-- 1. PROFILES TABLE: Remove overly permissive SELECT policies
-- Drop the policies that expose PII to too many users
DROP POLICY IF EXISTS "Authenticated users can read external mentor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read non-PII profiles" ON public.profiles;

-- Create a more restrictive policy: Users can only see full profile if:
-- - It's their own profile
-- - They are admin
-- - They share a workspace AND they are staff (consultor/admin)
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR
  is_admin() OR
  (is_staff() AND shares_workspace_with(id))
);

-- 2. TEAM_MEMBERS TABLE: Create a safe view that masks contact info
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Founders and staff can view team members" ON public.team_members;

-- Create more restrictive policy for viewing team members
CREATE POLICY "Founders and staff can view full team member details"
ON public.team_members
FOR SELECT
USING (
  is_admin() OR
  is_staff() OR
  is_startup_founder(startup_id)
);

-- Create a security definer function to check if user can see team member PII
CREATE OR REPLACE FUNCTION public.can_see_team_member_pii(_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin() OR is_staff() OR is_startup_founder(_startup_id)
$$;

-- Create a safe view for team members that masks PII for non-privileged users
CREATE OR REPLACE VIEW public.team_members_safe AS
SELECT
  id,
  startup_id,
  user_id,
  full_name,
  role,
  title,
  is_founder,
  joined_at,
  left_at,
  created_at,
  -- Mask PII fields for non-privileged users
  CASE WHEN can_see_team_member_pii(startup_id) THEN email ELSE NULL END AS email,
  CASE WHEN can_see_team_member_pii(startup_id) THEN phone ELSE NULL END AS phone,
  CASE WHEN can_see_team_member_pii(startup_id) THEN linkedin_url ELSE NULL END AS linkedin_url
FROM public.team_members;

-- Grant select on the safe view
GRANT SELECT ON public.team_members_safe TO authenticated;

-- 3. STARTUPS TABLE: Update startups_safe view to mask NIF and sensitive contact info
DROP VIEW IF EXISTS public.startups_safe;

CREATE VIEW public.startups_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  logo_url,
  website,
  description,
  founded_date,
  is_legally_recognized,
  created_at,
  updated_at,
  -- Mask PII fields for non-privileged users
  CASE WHEN can_see_startup_pii(id) THEN nif ELSE NULL END AS nif,
  CASE WHEN can_see_startup_pii(id) THEN phone ELSE NULL END AS phone,
  CASE WHEN can_see_startup_pii(id) THEN address ELSE NULL END AS address,
  CASE WHEN can_see_startup_pii(id) THEN main_contact_email ELSE NULL END AS main_contact_email,
  CASE WHEN can_see_startup_pii(id) THEN main_contact_name ELSE NULL END AS main_contact_name,
  CASE WHEN can_see_startup_pii(id) THEN main_contact_phone ELSE NULL END AS main_contact_phone
FROM public.startups;

-- Grant select on the safe view
GRANT SELECT ON public.startups_safe TO authenticated;

-- 4. CAP_TABLE_ENTRIES: Add activity logging for sensitive data modifications
-- The existing RLS is already restrictive (founders and admins only)
-- Add a function and trigger to log cap table modifications for audit purposes
CREATE OR REPLACE FUNCTION public.log_cap_table_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log modifications to sensitive cap table data
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      'cap_table_entry',
      NEW.id,
      'created',
      jsonb_build_object('startup_id', NEW.startup_id, 'holder_name', NEW.holder_name, 'shares', NEW.shares)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_log (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      'cap_table_entry',
      NEW.id,
      'updated',
      jsonb_build_object('startup_id', NEW.startup_id, 'holder_name', NEW.holder_name, 'old_shares', OLD.shares, 'new_shares', NEW.shares)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (
      user_id,
      entity_type,
      entity_id,
      action,
      metadata
    ) VALUES (
      auth.uid(),
      'cap_table_entry',
      OLD.id,
      'deleted',
      jsonb_build_object('startup_id', OLD.startup_id, 'holder_name', OLD.holder_name, 'shares', OLD.shares)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for cap table modifications
DROP TRIGGER IF EXISTS log_cap_table_changes ON public.cap_table_entries;

CREATE TRIGGER log_cap_table_changes
AFTER INSERT OR UPDATE OR DELETE ON public.cap_table_entries
FOR EACH ROW
EXECUTE FUNCTION public.log_cap_table_changes();