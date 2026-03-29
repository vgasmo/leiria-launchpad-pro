-- Remove unsafe anon RLS policies on startup_contracts
-- These allowed any anonymous user to SELECT/UPDATE contracts if they had a valid token
-- All public access must go through the edge function which uses service-role

DROP POLICY IF EXISTS "Public can read contract by onboarding token" ON public.startup_contracts;
DROP POLICY IF EXISTS "Public can update contract onboarding data" ON public.startup_contracts;