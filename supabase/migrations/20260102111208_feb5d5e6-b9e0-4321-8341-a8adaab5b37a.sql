-- A) Create public-assets bucket for template downloads
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for public read access
CREATE POLICY "Public read access for public-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Admin/staff can upload to public-assets
CREATE POLICY "Staff can upload to public-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets' 
  AND (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ))
);

-- B) Add KPI source tracking columns
ALTER TABLE public.kpi_values
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_ref_id uuid NULL,
  ADD COLUMN IF NOT EXISTS locked_by_source boolean NOT NULL DEFAULT false;

-- Add check constraint for source_type
ALTER TABLE public.kpi_values
  ADD CONSTRAINT kpi_values_source_type_check 
  CHECK (source_type IN ('manual', 'financial_model', 'import', 'ai'));

-- Add foreign key to financial_model_versions (optional reference)
ALTER TABLE public.kpi_values
  ADD CONSTRAINT kpi_values_source_ref_fkey
  FOREIGN KEY (source_ref_id) REFERENCES public.financial_model_versions(id) ON DELETE SET NULL;

-- Index for efficient source lookups
CREATE INDEX IF NOT EXISTS idx_kpi_values_source 
  ON public.kpi_values(workspace_id, source_type, source_ref_id);

-- Comment for documentation
COMMENT ON COLUMN public.kpi_values.source_type IS 'Origin of this KPI value: manual, financial_model, import, or ai';
COMMENT ON COLUMN public.kpi_values.source_ref_id IS 'Reference to source entity (e.g., financial_model_versions.id)';
COMMENT ON COLUMN public.kpi_values.locked_by_source IS 'If true, value cannot be manually edited until unlocked';