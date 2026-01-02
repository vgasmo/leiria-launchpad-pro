-- Drop existing problematic policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.conversation_participants;

-- Create a security definer function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid() OR 
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Users can add participants to conversations they're in"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR 
    public.is_conversation_participant(auth.uid(), conversation_id)
  );

CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Also fix the conversations policies if they have the same issue
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can delete conversations" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations FOR SELECT
  USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE
  USING (public.is_conversation_participant(auth.uid(), id));

CREATE POLICY "Participants can delete conversations"
  ON public.conversations FOR DELETE
  USING (public.is_conversation_participant(auth.uid(), id));

-- Fix messages policies too
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND 
    public.is_conversation_participant(auth.uid(), conversation_id)
  );