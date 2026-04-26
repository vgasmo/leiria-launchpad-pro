
-- 1) Profiles: remove the peer-read policy that exposes calendar_feed_token, phone, etc.
-- Peers should query the profiles_safe view (which masks PII) instead.
DROP POLICY IF EXISTS "Authenticated users can read non-sensitive profile data" ON public.profiles;

-- Replace with a staff-only read policy. Peers will use profiles_safe view for masked access.
CREATE POLICY "Staff can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_staff());

-- 2) Programs: restrict active program listing to authenticated users only
DROP POLICY IF EXISTS "Everyone can view active programs" ON public.programs;

CREATE POLICY "Authenticated users can view active programs"
ON public.programs
FOR SELECT
TO authenticated
USING (is_active = true OR is_admin());

-- 3) Storage: scope booking-uploads read to staff only (was readable by all authenticated)
DROP POLICY IF EXISTS "Staff can read booking uploads" ON storage.objects;

CREATE POLICY "Staff can read booking uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'booking-uploads' AND public.is_staff());
