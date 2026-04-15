-- Allow all authenticated users to read profiles (profiles_safe view handles field masking)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);