-- Create storage bucket for startup documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('startup-documents', 'startup-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for startup documents bucket
CREATE POLICY "Admins can manage startup documents"
ON storage.objects FOR ALL
USING (bucket_id = 'startup-documents' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Authenticated users can view startup documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'startup-documents' AND auth.role() = 'authenticated');