-- Drop the overly permissive staff SELECT policy
DROP POLICY IF EXISTS "Staff can view integration settings metadata only" ON public.global_integration_settings;

-- The existing "Admins can manage integration settings" ALL policy already covers admin SELECT access