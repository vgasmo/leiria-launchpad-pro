-- ==============================================
-- SECURITY FIX 1: global_integration_settings
-- Remove policy that allows service role (auth.uid() IS NULL) to bypass security
-- This was allowing unauthenticated requests to read secrets
-- ==============================================

DROP POLICY IF EXISTS "Service role can manage integration settings" ON public.global_integration_settings;

-- Only staff can SELECT (metadata only, NOT the actual secrets - handled by edge functions)
-- The existing "Staff can view integration settings metadata only" is correct

-- Admins can manage settings through authenticated requests
CREATE POLICY "Admins can manage integration settings" 
ON public.global_integration_settings 
FOR ALL 
USING (is_admin_only())
WITH CHECK (is_admin_only());


-- ==============================================
-- SECURITY FIX 2: profiles_safe view
-- The view exposes data without requiring auth - need to recreate with security barrier
-- ==============================================

DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    id,
    full_name,
    avatar_url,
    bio,
    expertise,
    -- Only show sensitive data to the user themselves or admins
    CASE 
        WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN email 
        ELSE NULL 
    END AS email,
    CASE 
        WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN phone 
        ELSE NULL 
    END AS phone,
    CASE 
        WHEN auth.uid() IS NOT NULL AND (auth.uid() = id OR is_staff()) THEN linkedin_url 
        ELSE NULL 
    END AS linkedin_url,
    created_at,
    updated_at
FROM public.profiles
WHERE auth.uid() IS NOT NULL;  -- Require authentication to see any profile data

COMMENT ON VIEW public.profiles_safe IS 'Secure view that requires authentication and masks PII for non-owners';


-- ==============================================
-- SECURITY FIX 3: exercise_library
-- Change policy to require authentication for viewing exercises
-- ==============================================

DROP POLICY IF EXISTS "Anyone can view approved exercises" ON public.exercise_library;

CREATE POLICY "Authenticated users can view approved exercises" 
ON public.exercise_library 
FOR SELECT 
USING (
    auth.uid() IS NOT NULL AND (
        status = 'approved' 
        OR owner_user_id = auth.uid() 
        OR is_staff()
    )
);