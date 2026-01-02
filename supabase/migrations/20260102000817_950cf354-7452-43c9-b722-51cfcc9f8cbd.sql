-- Drop and recreate the problematic RLS policies on conversation_participants
-- The current policy creates infinite recursion by self-referencing

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON public.conversation_participants;

-- Create fixed SELECT policy - check if user is participant directly 
CREATE POLICY "Users can view participants in their conversations" 
ON public.conversation_participants 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);

-- Create fixed INSERT policy - allow if user is creating their own participation or is already in the conversation
CREATE POLICY "Users can add participants to conversations they're in" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() 
  OR conversation_id IN (
    SELECT cp.conversation_id 
    FROM public.conversation_participants cp 
    WHERE cp.user_id = auth.uid()
  )
);