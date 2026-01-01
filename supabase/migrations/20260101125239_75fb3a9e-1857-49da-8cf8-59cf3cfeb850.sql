-- Add status to workspaces for approval workflow
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add constraint for valid status values
ALTER TABLE public.workspaces 
ADD CONSTRAINT workspaces_status_check 
CHECK (status IN ('pending', 'active', 'rejected', 'archived'));

-- Update existing workspaces to be active
UPDATE public.workspaces SET status = 'active' WHERE status IS NULL OR status = '';

-- Allow founders to create startups
CREATE POLICY "Founders can create their own startup"
ON public.startups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'founder'
  )
);

-- Allow founders to update their own startup (via workspace link)
CREATE POLICY "Founders can update their startup"
ON public.startups
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workspaces w
    JOIN public.workspace_users wu ON w.id = wu.workspace_id
    WHERE w.startup_id = startups.id 
    AND wu.user_id = auth.uid() 
    AND wu.role = 'founder'
    AND wu.active = true
  )
);

-- Allow founders to create pending workspaces for their startup
CREATE POLICY "Founders can create pending workspaces"
ON public.workspaces
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'founder'
  )
);

-- Allow founders to insert themselves into workspace_users for pending workspaces
CREATE POLICY "Founders can add themselves to pending workspaces"
ON public.workspace_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  role = 'founder' AND
  EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.status = 'pending'
  )
);

-- Allow users to view pending workspaces they created
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view their workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
  has_workspace_access(id) OR 
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = id AND wu.user_id = auth.uid()
  )
);