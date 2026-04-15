
-- Create storage bucket for public booking uploads (pitch decks)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('booking-uploads', 'booking-uploads', false, 10485760, ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads (public booking form)
CREATE POLICY "Anyone can upload booking files"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'booking-uploads');

-- Only authenticated staff can read
CREATE POLICY "Staff can read booking uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'booking-uploads');
