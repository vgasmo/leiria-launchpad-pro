-- Fix 1: Remove mentor_externo from can_edit_workspace to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.can_edit_workspace(_user_id uuid, _workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.workspace_users
    WHERE user_id = _user_id 
    AND workspace_id = _workspace_id
    AND role IN ('admin', 'consultor')
    AND active = true
  )
$function$;

-- Fix 2: Restrict support_materials to only show approved content to non-staff
DROP POLICY IF EXISTS "Authenticated users can read support_materials" ON public.support_materials;

CREATE POLICY "Staff can read all support_materials"
ON public.support_materials
FOR SELECT
TO authenticated
USING (
  public.is_staff() OR status = 'approved'
);