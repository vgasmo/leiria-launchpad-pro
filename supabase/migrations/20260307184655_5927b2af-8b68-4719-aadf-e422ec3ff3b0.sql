-- P1.2: Add indexes for claim/allowlist lookup performance
-- These support the invite-only onboarding and claim flow

-- Index for startup claim matching by email (normalized)
CREATE INDEX IF NOT EXISTS idx_startups_main_contact_email_lower
  ON public.startups (lower(main_contact_email))
  WHERE main_contact_email IS NOT NULL;

-- Index for signup allowlist email lookup (normalized)
CREATE INDEX IF NOT EXISTS idx_signup_allowlist_email_lower
  ON public.signup_allowlist (lower(email))
  WHERE email IS NOT NULL;

-- Index for signup allowlist domain lookup (normalized)
CREATE INDEX IF NOT EXISTS idx_signup_allowlist_domain_lower
  ON public.signup_allowlist (lower(domain))
  WHERE domain IS NOT NULL;

-- Index for startup claim requests by user + status (pending lookups)
CREATE INDEX IF NOT EXISTS idx_startup_claim_requests_user_status
  ON public.startup_claim_requests (user_id, status)
  WHERE status = 'pending';

-- Index for workspace status filtering (claim flow and listing)
CREATE INDEX IF NOT EXISTS idx_workspaces_status
  ON public.workspaces (status)
  WHERE status IN ('imported_unclaimed', 'pending', 'active', 'claimed');