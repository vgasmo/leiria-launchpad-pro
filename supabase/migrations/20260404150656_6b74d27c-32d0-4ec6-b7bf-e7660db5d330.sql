
-- RLS is already enabled from previous partial migration
-- Add policies using correct table names

CREATE POLICY "Users can only access their authorized channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Conversation channels
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND cp.conversation_id::text = realtime.messages.topic
  )
  OR
  -- Direct workspace topic
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.user_id = auth.uid()
    AND wu.active = true
    AND wu.workspace_id::text = realtime.messages.topic
  )
  OR
  -- Admin/consultor access to all
  public.is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'consultor'
  )
);

CREATE POLICY "Users can publish to authorized channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND cp.conversation_id::text = realtime.messages.topic
  )
  OR
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.user_id = auth.uid()
    AND wu.active = true
    AND wu.workspace_id::text = realtime.messages.topic
  )
  OR
  public.is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'consultor'
  )
);
