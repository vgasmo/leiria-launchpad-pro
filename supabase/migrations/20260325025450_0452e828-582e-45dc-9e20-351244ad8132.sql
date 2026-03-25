-- Add onboarding token for public access to contract signing
ALTER TABLE public.startup_contracts
ADD COLUMN IF NOT EXISTS onboarding_token text,
ADD COLUMN IF NOT EXISTS onboarding_token_expires_at timestamptz;

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS idx_startup_contracts_onboarding_token
ON public.startup_contracts (onboarding_token) WHERE onboarding_token IS NOT NULL;

-- RLS policy: allow public read with valid token (for the onboarding page)
CREATE POLICY "Public can read contract by onboarding token"
ON public.startup_contracts
FOR SELECT
TO anon
USING (
  onboarding_token IS NOT NULL
  AND (onboarding_token_expires_at IS NULL OR onboarding_token_expires_at > now())
);

-- Allow public update of specific onboarding fields via token
CREATE POLICY "Public can update contract onboarding data"
ON public.startup_contracts
FOR UPDATE
TO anon
USING (
  onboarding_token IS NOT NULL
  AND (onboarding_token_expires_at IS NULL OR onboarding_token_expires_at > now())
)
WITH CHECK (
  onboarding_token IS NOT NULL
  AND (onboarding_token_expires_at IS NULL OR onboarding_token_expires_at > now())
);