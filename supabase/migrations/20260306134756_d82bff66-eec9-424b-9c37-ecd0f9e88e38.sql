
-- Fix: Allow all consultors (staff) to UPDATE funnel_items, not just the assigned owner
DROP POLICY IF EXISTS "Consultants can update assigned funnel items" ON public.funnel_items;

CREATE POLICY "Staff can update funnel items"
ON public.funnel_items
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

-- Fix: Allow consultors to INSERT funnel_items (currently only admins can via the ALL policy)
CREATE POLICY "Staff can insert funnel items"
ON public.funnel_items
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

-- Fix: Allow consultors to DELETE funnel_items
CREATE POLICY "Staff can delete funnel items"
ON public.funnel_items
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);
