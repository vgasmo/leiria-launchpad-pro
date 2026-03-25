
-- Add counter-signer (Startup Leiria representative) fields for bilateral signing
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS counter_signer_name text,
  ADD COLUMN IF NOT EXISTS counter_signer_email text,
  ADD COLUMN IF NOT EXISTS counter_signer_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS founder_signer_status text DEFAULT 'pending';

-- Add comment for clarity
COMMENT ON COLUMN public.startup_contracts.counter_signer_name IS 'Startup Leiria representative who counter-signs the contract';
COMMENT ON COLUMN public.startup_contracts.counter_signer_email IS 'Email of the Startup Leiria counter-signer';
COMMENT ON COLUMN public.startup_contracts.counter_signer_status IS 'Signature status of the counter-signer: pending, sent, signed, declined';
COMMENT ON COLUMN public.startup_contracts.founder_signer_status IS 'Signature status of the founder: pending, sent, signed, declined';
