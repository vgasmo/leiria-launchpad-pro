-- Fix: Drop the existing update policy and recreate
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Profile owners can update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);