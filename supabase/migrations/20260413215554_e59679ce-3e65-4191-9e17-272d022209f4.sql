-- =============================================================
-- CANONICAL SOURCE CLEANUP: Neutralize hardcoded test-data writes
-- =============================================================
-- 
-- CONTEXT:
-- Several earlier migrations contained hardcoded writes against
-- specific record UUIDs for testing purposes. This is unsafe in
-- canonical migration source because:
--   1. The UUID may not exist in all environments
--   2. Replaying migrations creates/mutates test data inappropriately
--   3. It violates the principle that migrations are schema-only
--
-- AFFECTED MIGRATIONS (historical reference):
--   20260410130125 — SET status='active', archive_status='pending' on contract 7d754944-*
--   20260410132536 — SET archive_status='pending' on contract 7d754944-*
--   20260410141500 — duplicate of above
--   20260411212621 — partial cleanup of above + trigger fix (good schema, bad data write)
--   20260413211847 — discard specific draft c7da3588-* by hardcoded ID
--
-- LIFECYCLE NAMING:
--   20260403160713 created validate_intake_contract_link with 'contract_active'
--   20260411212621 superseded it with 'activated' — current trigger is correct
--   No further schema change needed.
--
-- This migration idempotently ensures clean state:
-- =============================================================

-- 1. Ensure the test contract (if it exists) has clean archive state
-- This is idempotent — safe to run even if the UUID doesn't exist
UPDATE public.startup_contracts
SET archive_status = NULL,
    archive_attempt_count = 0,
    last_archive_error = NULL,
    archived_at = NULL,
    archive_location_url = NULL,
    archive_checksum = NULL,
    archive_filename = NULL
WHERE id = '7d754944-e1d3-4da9-81bc-c3a767ac0c3f'
  AND (archive_status IS NOT NULL OR archive_attempt_count > 0);

-- 2. No action needed for draft c7da3588-* — discarded drafts are inert
-- Documented here for audit trail only.

-- 3. Confirm validate_intake_contract_link uses 'activated' (not 'contract_active')
-- The current function (from 20260411212621) is already correct.
-- This is a no-op verification comment only.