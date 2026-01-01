-- Allow users to update conversations they participate in (for updating updated_at)
CREATE POLICY "Participants can update conversations"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Allow participants to delete conversations (optional, for cleanup)
CREATE POLICY "Participants can delete conversations"
ON public.conversations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);