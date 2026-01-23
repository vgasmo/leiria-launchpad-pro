-- ============================================
-- CONSOLIDATED WORKSPACE ACCESS FUNCTION
-- Replaces conflicting has_active_workspace_access functions
-- ============================================

-- Drop the 2-argument version first (it's less used and less complete)
DROP FUNCTION IF EXISTS public.has_active_workspace_access(uuid, uuid);

-- Now recreate the single-argument version with complete logic
-- This is the canonical function for RLS policies
CREATE OR REPLACE FUNCTION public.has_active_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Staff (admin/consultor) always have access regardless of status
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'consultor')
    ) 
    OR (
      -- For non-staff: require approved account + active workspace membership + active workspace
      -- 1. Account must be approved
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND account_status = 'approved'
      )
      -- 2. User must be active member of this workspace
      AND EXISTS (
        SELECT 1 FROM public.workspace_users wu
        JOIN public.workspaces w ON w.id = wu.workspace_id
        WHERE wu.workspace_id = ws_id
        AND wu.user_id = auth.uid()
        AND wu.active = true
        -- 3. Workspace must be active and not blocked
        AND w.status = 'active'
        AND w.blocked_at IS NULL
      )
    );
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.has_active_workspace_access(uuid) IS 
'Canonical workspace access check. Enforces:
1. Staff (admin/consultor) always have access
2. Non-staff require: approved account + active membership + active workspace + not blocked
Use this in RLS policies for sensitive workspace data.';

-- ============================================
-- UPDATE is_account_active TO HANDLE auth.uid()
-- ============================================

-- Create a no-argument version for RLS convenience
CREATE OR REPLACE FUNCTION public.is_account_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_status = 'approved'
  )
  -- Staff bypass for internal operations
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor')
  );
$$;

COMMENT ON FUNCTION public.is_account_active() IS 
'Check if current user account is approved. Staff always returns true.';

-- Keep the explicit user_id version for edge functions
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
    AND account_status = 'approved'
  );
$$;

-- ============================================
-- UPDATE has_workspace_access TO INTEGRATE ACCOUNT CHECK
-- ============================================

-- Update the main has_workspace_access to also check account status for founders
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins always have access
    public.is_admin() 
    -- Consultors have access to all workspaces  
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    ) 
    -- Regular users: need approved account + workspace membership
    OR (
      -- Must have approved account (or be staff, handled above)
      public.is_account_active()
      AND EXISTS (
        SELECT 1 FROM public.workspace_users wu
        JOIN public.workspaces w ON w.id = wu.workspace_id
        WHERE wu.user_id = auth.uid() 
          AND wu.workspace_id = _workspace_id
          AND wu.active = true
          -- Founders cannot access blocked workspaces
          AND (w.status != 'blocked' OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'consultor')
          ))
      )
    );
$$;

COMMENT ON FUNCTION public.has_workspace_access(uuid) IS 
'General workspace access check. Now includes account_status enforcement for non-staff users.';