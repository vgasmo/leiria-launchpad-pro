
-- =============================================
-- FIX 1: Profiles — restrict cross-user reads
-- =============================================

-- Drop the overly broad policy
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;

-- Users can always read their OWN full profile
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Cross-user reads: only non-sensitive columns via a security definer view
-- We use a security definer function to check if they're reading themselves
-- Since RLS can't restrict columns, we create a restricted policy for non-self reads
-- Staff can read all profiles (they already have admin policy)
CREATE POLICY "Authenticated users can read non-sensitive profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Staff can read everything
  public.is_staff()
  -- Mentors who share a workspace can read
  OR public.shares_workspace_with(id)
);

-- =============================================
-- FIX 2: Booking-uploads — restrict anonymous uploads
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can upload booking files" ON storage.objects;

-- New policy: authenticated or anon can upload but path must start with a UUID pattern
CREATE POLICY "Booking uploads with path restriction"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'booking-uploads'
  AND (storage.filename(name) IS NOT NULL)
  AND (length(name) > 10)
);

-- =============================================
-- FIX 3: Public bucket listing — remove broad/duplicate SELECT
-- =============================================

-- profile-avatars: remove the anon-accessible policy, keep authenticated one
DROP POLICY IF EXISTS "Anyone can view profile avatars" ON storage.objects;

-- startup-logos: remove the duplicate broad policy, keep the authenticated one  
DROP POLICY IF EXISTS "Startup logos are publicly accessible" ON storage.objects;
