-- Make conversation creation depend on authenticated role (more robust than auth.uid() in some client contexts)
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
