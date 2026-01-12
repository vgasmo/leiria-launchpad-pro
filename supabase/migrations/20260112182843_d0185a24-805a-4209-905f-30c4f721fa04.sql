-- Fix the has_active_workspace_access function with correct column name
CREATE OR REPLACE FUNCTION public.has_active_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Staff (admin/consultor) always have access
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor')
  ) OR EXISTS (
    -- Check workspace is active AND user is a member
    SELECT 1 FROM public.workspaces w
    JOIN public.workspace_users wu ON wu.workspace_id = w.id
    WHERE w.id = ws_id
    AND wu.user_id = auth.uid()
    AND wu.active = true
    AND w.status = 'active'
  );
$$;