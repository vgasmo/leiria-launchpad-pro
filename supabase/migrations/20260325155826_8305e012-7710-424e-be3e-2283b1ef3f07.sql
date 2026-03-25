
-- Add pricing snapshot column to startup_contracts for historical truth preservation
ALTER TABLE public.startup_contracts
ADD COLUMN IF NOT EXISTS pricing_snapshot_json jsonb DEFAULT NULL;

-- Add webhook event tracking columns for idempotency
ALTER TABLE public.startup_contracts
ADD COLUMN IF NOT EXISTS provider_webhook_event_id text DEFAULT NULL;

COMMENT ON COLUMN public.startup_contracts.pricing_snapshot_json IS 'Frozen pricing state at contract generation/signing. Never mutated after signing.';
COMMENT ON COLUMN public.startup_contracts.provider_webhook_event_id IS 'Last processed webhook event ID for idempotency protection.';
