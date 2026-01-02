-- P0: Fix overly permissive INSERT policy on conversations
-- Current: Anyone can create conversations (with_check = true)
-- Fix: Only authenticated users can create conversations

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);