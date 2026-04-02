
-- Fix: Allow consultors to fully manage contracts and startup_contracts

-- 1. contracts table: Replace admin-only ALL policy with staff-wide policy
DROP POLICY IF EXISTS "Admins can manage all contracts" ON public.contracts;
CREATE POLICY "Staff can manage all contracts"
ON public.contracts FOR ALL TO authenticated
USING (is_staff())
WITH CHECK (is_staff());

-- Drop the now-redundant consultant update policy (covered by the ALL above)
DROP POLICY IF EXISTS "Consultants can update own contracts" ON public.contracts;

-- 2. startup_contracts: Allow consultors to manage (not just admin+backoffice)
DROP POLICY IF EXISTS "Manage contracts" ON public.startup_contracts;
CREATE POLICY "Staff and backoffice can manage contracts"
ON public.startup_contracts FOR ALL TO authenticated
USING (is_staff() OR is_backoffice())
WITH CHECK (is_staff() OR is_backoffice());
