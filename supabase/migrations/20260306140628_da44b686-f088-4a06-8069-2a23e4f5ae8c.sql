
-- Ensure backoffice role is also allowed in funnel_items RLS policies
-- Drop existing staff policies that may only cover admin+consultor
DROP POLICY IF EXISTS "Staff can update funnel items" ON public.funnel_items;
DROP POLICY IF EXISTS "Staff can insert funnel items" ON public.funnel_items;
DROP POLICY IF EXISTS "Staff can delete funnel items" ON public.funnel_items;
DROP POLICY IF EXISTS "Staff can select funnel items" ON public.funnel_items;

-- SELECT: all staff (admin, consultor, backoffice) can view
CREATE POLICY "Staff can select funnel items"
ON public.funnel_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- UPDATE: all staff can update
CREATE POLICY "Staff can update funnel items"
ON public.funnel_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- INSERT: all staff can create
CREATE POLICY "Staff can insert funnel items"
ON public.funnel_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- DELETE: all staff can delete
CREATE POLICY "Staff can delete funnel items"
ON public.funnel_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- Also ensure funnel_events has INSERT for staff (needed for stage change logging)
DROP POLICY IF EXISTS "Staff can insert funnel events" ON public.funnel_events;
CREATE POLICY "Staff can insert funnel events"
ON public.funnel_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- Ensure staff can SELECT funnel_events (for timeline)
DROP POLICY IF EXISTS "Staff can select funnel events" ON public.funnel_events;
CREATE POLICY "Staff can select funnel events"
ON public.funnel_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'consultor', 'backoffice')
  )
);
