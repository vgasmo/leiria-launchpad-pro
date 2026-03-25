
-- Add signature provider fields to startup_contracts
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS signature_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_document_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_last_sync_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_last_error text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_last_event text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_sent_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_completed_at timestamptz DEFAULT NULL;

-- Backfill existing DocuSign contracts
UPDATE public.startup_contracts
SET signature_provider = 'docusign',
    provider_document_id = docusign_envelope_id
WHERE docusign_envelope_id IS NOT NULL AND signature_provider IS NULL;

-- Add constraint for valid providers
ALTER TABLE public.startup_contracts
  ADD CONSTRAINT chk_signature_provider CHECK (signature_provider IS NULL OR signature_provider IN ('docusign', 'pandadoc', 'manual'));
