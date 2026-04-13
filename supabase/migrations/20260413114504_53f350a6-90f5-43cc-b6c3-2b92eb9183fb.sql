
DROP POLICY IF EXISTS "Assigned staff can update startup" ON public.startups;

CREATE POLICY "Staff can update startups"
ON public.startups
FOR UPDATE
TO authenticated
USING (
  public.is_staff()
)
WITH CHECK (
  public.is_staff()
);
