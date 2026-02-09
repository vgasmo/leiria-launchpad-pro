-- Drop existing INSERT policy and recreate with mentor role check
DROP POLICY IF EXISTS "Users can insert their own NDA acceptance" ON public.mentor_nda_acceptances;

CREATE POLICY "Mentors can insert their own NDA acceptance"
  ON public.mentor_nda_acceptances FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'mentor_externo')
  );

-- Add UPDATE policy for upsert support (ON CONFLICT)
CREATE POLICY "Mentors can update their own NDA acceptance"
  ON public.mentor_nda_acceptances FOR UPDATE
  USING (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'mentor_externo')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_role(auth.uid(), 'mentor_externo')
  );