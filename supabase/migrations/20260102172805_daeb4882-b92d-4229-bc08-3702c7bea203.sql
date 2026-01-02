-- SECURITY FIX: Restrict profiles table to authenticated users only
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new policy: authenticated users can view all profiles
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- SECURITY FIX: Restrict mentor_availability to authenticated users
DROP POLICY IF EXISTS "Anyone can view mentor availability" ON public.mentor_availability;

CREATE POLICY "Authenticated users can view mentor availability"
ON public.mentor_availability
FOR SELECT
TO authenticated
USING (true);