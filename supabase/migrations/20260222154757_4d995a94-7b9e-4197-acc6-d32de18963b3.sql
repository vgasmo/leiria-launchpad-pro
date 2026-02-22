
-- Fix profiles_safe: add security_invoker to prevent SECURITY DEFINER warning
ALTER VIEW public.profiles_safe SET (security_invoker = true);

-- Fix team_members_safe: add security_invoker to prevent SECURITY DEFINER warning
ALTER VIEW public.team_members_safe SET (security_invoker = true);
