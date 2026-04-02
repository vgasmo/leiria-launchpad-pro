-- Fix: Remove the self-assign founder role policy that allows privilege escalation
-- The founder role is already properly assigned via SECURITY DEFINER functions:
-- 1. create_startup_application() calls ensure_founder_role()
-- 2. claim_startup() inserts founder role
-- 3. approve_startup_claim() inserts founder role
-- 4. staff_create_workspace_for_claim() inserts founder role
-- 5. handle_new_user_role() assigns founder on signup if selected_role='founder'
-- All these paths are server-controlled and don't need this open INSERT policy.

DROP POLICY IF EXISTS "Users can self assign founder role" ON public.user_roles;