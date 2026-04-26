-- ═══ FIX 1: booking-uploads — restrict INSERT to authenticated only ═══
DROP POLICY IF EXISTS "Booking uploads with path restriction" ON storage.objects;

CREATE POLICY "Authenticated users can upload booking files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-uploads'
  AND storage.filename(name) IS NOT NULL
  AND length(name) > 10
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ═══ FIX 2: workflow_rules — restrict SELECT to staff only ═══
DROP POLICY IF EXISTS "Authenticated can view enabled workflow rules" ON public.workflow_rules;

-- ═══ FIX 3: public-assets bucket — prevent listing by restricting SELECT ═══
-- Keep bucket public for direct URL access to known assets, but block listing
-- by making SELECT policy require knowing the exact object path is not enforceable
-- via RLS alone. Best fix: make bucket non-public OR scope SELECT to specific prefix.
-- Since this is for public assets served via direct URL, mark bucket non-listable
-- by removing the broad SELECT policy. Direct CDN URLs will still work because
-- the bucket remains public=true (Supabase serves public buckets via CDN regardless of RLS).
DROP POLICY IF EXISTS "Public read access for public-assets" ON storage.objects;
-- No replacement SELECT policy needed: public buckets serve files via direct URL
-- through the storage CDN without requiring an RLS SELECT policy.