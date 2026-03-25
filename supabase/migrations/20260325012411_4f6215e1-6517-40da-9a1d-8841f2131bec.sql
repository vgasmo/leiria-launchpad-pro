
-- Add billing/legal fields to startup_contracts for contract onboarding wizard
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS legal_representative_name text,
  ADD COLUMN IF NOT EXISTS legal_representative_email text,
  ADD COLUMN IF NOT EXISTS company_nif text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_city text,
  ADD COLUMN IF NOT EXISTS company_postal_code text,
  ADD COLUMN IF NOT EXISTS company_country text DEFAULT 'Portugal',
  ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
  ADD COLUMN IF NOT EXISTS signature_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS signature_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS regulation_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS regulation_version text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Add index for anniversary checking cron
CREATE INDEX IF NOT EXISTS idx_startup_contracts_start_date_status
  ON public.startup_contracts (start_date, status)
  WHERE status = 'active';

-- Add index for DocuSign envelope lookups
CREATE INDEX IF NOT EXISTS idx_startup_contracts_docusign_envelope
  ON public.startup_contracts (docusign_envelope_id)
  WHERE docusign_envelope_id IS NOT NULL;
