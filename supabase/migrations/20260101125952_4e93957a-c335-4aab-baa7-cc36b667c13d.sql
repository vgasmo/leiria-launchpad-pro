-- Create a security definer function to check if user is a founder
CREATE OR REPLACE FUNCTION public.is_founder_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'founder'
  )
$$;

-- Drop and recreate the policy using the security definer function
DROP POLICY IF EXISTS "Founders can create their own startup" ON public.startups;

CREATE POLICY "Founders can create their own startup" 
ON public.startups 
FOR INSERT 
WITH CHECK (public.is_founder_user());