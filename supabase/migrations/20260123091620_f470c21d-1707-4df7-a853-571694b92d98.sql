-- ============================================
-- Account Status RLS Enhancement
-- Adds database-level enforcement for pending/suspended accounts
-- ============================================

-- Helper function to check if user account is active (approved)
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND account_status = 'approved'
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_account_active(uuid) IS 
'Returns true if user account status is approved. Used in RLS policies to block pending/suspended users.';

-- ============================================
-- Enhanced has_workspace_access to include account_status check
-- This ensures pending/suspended users cannot access workspace data
-- ============================================

CREATE OR REPLACE FUNCTION public.has_active_workspace_access(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.account_status = 'approved'
  )
  AND EXISTS (
    SELECT 1
    FROM public.workspace_users wu
    WHERE wu.user_id = _user_id
      AND wu.workspace_id = _workspace_id
  )
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_active_workspace_access(uuid, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.has_active_workspace_access(uuid, uuid) IS 
'Returns true if user has workspace access AND account is approved. Combines workspace membership with account status check.';