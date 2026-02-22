
-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Staff can upload contract documents
CREATE POLICY "Staff can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- RLS: Staff can view contract documents
CREATE POLICY "Staff can view contract documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'consultor', 'backoffice')
  )
);

-- RLS: Staff can delete contract documents
CREATE POLICY "Staff can delete contract documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'consultor', 'backoffice')
  )
);
