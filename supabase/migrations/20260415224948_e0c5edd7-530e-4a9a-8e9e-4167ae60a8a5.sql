-- =============================================================
-- CANONICAL SOURCE CLEANUP: Final idempotent neutralization
-- =============================================================
--
-- HISTORICAL CONTEXT:
-- During development, several migrations contained hardcoded writes
-- against specific record UUIDs for testing purposes:
--
--   20260410130125 — mutated contract 7d754944-* for archive testing
--   20260410132536 — duplicate archive reset on same UUID
--   20260410141500 — duplicate archive reset on same UUID
--   20260411212621 — partial cleanup + fixed trigger (contract_active → activated)
--   20260413211847 — discarded draft c7da3588-* by hardcoded ID
--   20260413215554 — attempted cleanup (still referenced UUID)
--
-- These were unsafe because:
--   1. Record-specific UUIDs may not exist in all environments
--   2. Migration replay creates/mutates real data inappropriately
--   3. Migrations should be schema-only, not data manipulation
--
-- CURRENT STATE:
-- - validate_intake_contract_link trigger correctly uses 'activated' (not 'contract_active')
-- - Archive columns on the test contract were already neutralized
-- - This migration provides a final idempotent safety net
--
-- =============================================================

-- 1. Ensure the test contract (if it exists) has pristine archive state
-- This is a no-op if already clean or if the UUID doesn't exist
UPDATE public.startup_contracts
SET 
  archive_status = NULL,
  archive_attempt_count = 0,
  last_archive_error = NULL,
  archived_at = NULL,
  archive_location_url = NULL,
  archive_checksum = NULL,
  archive_filename = NULL
WHERE id = '7d754944-e1d3-4da9-81bc-c3a767ac0c3f'
  AND (
    archive_status IS NOT NULL 
    OR archive_attempt_count > 0 
    OR last_archive_error IS NOT NULL
    OR archived_at IS NOT NULL
  );

-- 2. No action needed for discarded draft c7da3588-* — discarded drafts are inert
-- Documented here for audit trail completeness only.

-- 3. validate_intake_contract_link already uses 'activated' (from migration 20260411212621)
-- No further schema change needed. This is verified and canonical.