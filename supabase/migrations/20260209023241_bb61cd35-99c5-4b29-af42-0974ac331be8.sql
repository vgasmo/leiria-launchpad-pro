
-- Enforce NDA gating for mentor_externo in workspace access functions
-- Mentors with role 'mentor_externo' who are NOT also staff must have accepted NDA

-- Override: has_workspace_access(uuid) — single-arg version using auth.uid()
CREATE OR REPLACE FUNCTION public.has_workspace_access(_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    -- Admins always have access
    public.is_admin() 
    -- Consultors have access to all workspaces  
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'consultor'
    ) 
    -- Regular users: need approved account + workspace membership + NDA check for mentors
    OR (
      public.is_account_active()
      AND EXISTS (
        SELECT 1 FROM public.workspace_users wu
        JOIN public.workspaces w ON w.id = wu.workspace_id
        WHERE wu.user_id = auth.uid() 
          AND wu.workspace_id = _workspace_id
          AND wu.active = true
          AND (w.status != 'blocked' OR EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'consultor')
          ))
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

-- Override: has_workspace_access(uuid, uuid) — two-arg version
CREATE OR REPLACE FUNCTION public.has_workspace_access(_user_id uuid, _workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND active = true
  ) OR public.is_admin(_user_id) OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'consultor'
  )
  -- NDA gate for mentor_externo (non-staff only)
  AND (
    NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'mentor_externo'
    )
    OR public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'consultor'
    )
    OR public.has_accepted_nda(_user_id)
  );
$$;

-- Override: has_active_workspace_access(uuid) — enforces NDA for mentor_externo
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
      -- For non-staff: require approved account + active workspace membership + active workspace
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
        AND w.status = 'active'
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
