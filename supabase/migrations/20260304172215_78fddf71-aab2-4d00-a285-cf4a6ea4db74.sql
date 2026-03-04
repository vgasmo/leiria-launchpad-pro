
-- Update has_active_workspace_access to also allow 'claimed' status for workspace members
CREATE OR REPLACE FUNCTION public.has_active_workspace_access(ws_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    -- Staff (admin/consultor) always have access regardless of status
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'consultor')
    ) 
    OR (
      -- For non-staff: require approved account + active workspace membership + active/claimed workspace
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND account_status = 'approved'
      )
      AND EXISTS (
        SELECT 1 FROM public.workspace_users wu
        JOIN public.workspaces w ON w.id = wu.workspace_id
        WHERE wu.workspace_id = ws_id
        AND wu.user_id = auth.uid()
        AND wu.active = true
        AND w.status IN ('active', 'claimed')
        AND w.blocked_at IS NULL
      )
      -- NDA gate: if user is mentor_externo, they must have accepted NDA
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'mentor_externo'
        )
        OR public.has_accepted_nda(auth.uid())
      )
    );
$$;
