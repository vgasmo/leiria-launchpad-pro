-- Fix overly permissive ai_rate_limits policy
-- The "Service can manage rate limits" policy uses USING (true) for ALL operations
-- This should be restricted to users managing their own rate limits

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage rate limits" ON public.ai_rate_limits;

-- Create proper policies for ai_rate_limits
-- 1. Users can insert/update their own rate limits (used by frontend when calling edge functions)
CREATE POLICY "Users can manage own rate limits"
ON public.ai_rate_limits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Staff/admins can view all rate limits for monitoring
CREATE POLICY "Staff can view all rate limits"
ON public.ai_rate_limits
FOR SELECT
USING (is_admin() OR EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'consultor'
));