
-- Fix: Allow users to always read their OWN workspace_users rows directly.
-- This avoids the complex has_workspace_access() chain which can fail
-- in local Supabase due to function/migration ordering issues.
-- The existing policy "Users can view workspace users in their workspaces"
-- uses has_workspace_access(workspace_id) which depends on is_account_active(),
-- workspace membership checks, NDA checks, etc. — all just to read your own row.

CREATE POLICY "Users can view own workspace memberships"
ON public.workspace_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
