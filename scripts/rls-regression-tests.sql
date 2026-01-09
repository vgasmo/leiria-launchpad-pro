-- =============================================================================
-- RLS Regression Test Pack
-- =============================================================================
-- Purpose: Verify RLS policies prevent data leakage across security boundaries
-- Run with: psql -f scripts/rls-regression-tests.sql
-- Note: These tests should be run as service_role to set up, then as anon/user
-- =============================================================================

-- Test Configuration
-- These UUIDs should be replaced with actual test data IDs before running
-- DO NOT use production data - create test records in a staging environment

-- =============================================================================
-- TEST 1: Cross-Workspace Leakage Prevention
-- =============================================================================
-- Verify: User A cannot see User B's workspace data

-- Setup (run as service_role):
/*
-- Create test users (in auth.users, done via Supabase dashboard or auth API)
-- Create test workspaces
INSERT INTO workspaces (id, startup_id, program_id, stage, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'startup-a-id', 'program-id', 'validation', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'startup-b-id', 'program-id', 'validation', 'active');

-- Assign users to workspaces
INSERT INTO workspace_users (workspace_id, user_id, role, active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user-a-id', 'founder', true),
  ('22222222-2222-2222-2222-222222222222', 'user-b-id', 'founder', true);
*/

-- Test (run as User A):
-- Expected: Returns 0 rows (User A should NOT see Workspace B)
SELECT COUNT(*) AS should_be_zero
FROM workspaces 
WHERE id = '22222222-2222-2222-2222-222222222222';

-- Expected: Returns 0 rows (User A should NOT see Workspace B's action items)
SELECT COUNT(*) AS should_be_zero
FROM action_items 
WHERE workspace_id = '22222222-2222-2222-2222-222222222222';

-- =============================================================================
-- TEST 2: Private Consultant Notes Protection
-- =============================================================================
-- Verify: Founders cannot see private consultant notes

-- Setup (run as service_role):
/*
INSERT INTO consultant_notes (id, workspace_id, author_id, content, is_private, visibility)
VALUES 
  ('note-private', 'workspace-id', 'consultor-id', 'PRIVATE: Do not share', true, 'private_staff'),
  ('note-shared', 'workspace-id', 'consultor-id', 'Shared with founder', false, 'shared_with_founder');
*/

-- Test (run as Founder of the workspace):
-- Expected: Returns 1 (only the shared note)
SELECT COUNT(*) AS should_be_one
FROM consultant_notes 
WHERE workspace_id = 'workspace-id';

-- Expected: Returns 0 (private notes should not be visible)
SELECT COUNT(*) AS should_be_zero
FROM consultant_notes 
WHERE workspace_id = 'workspace-id' 
  AND is_private = true;

-- =============================================================================
-- TEST 3: Financial Data Isolation (Cap Table)
-- =============================================================================
-- Verify: Founders can only see their own startup's cap table

-- Setup (run as service_role):
/*
INSERT INTO cap_table_entries (id, startup_id, holder_name, shares, holder_type)
VALUES 
  ('cap-entry-a', 'startup-a-id', 'Founder A', 1000000, 'founder'),
  ('cap-entry-b', 'startup-b-id', 'Founder B', 1000000, 'founder');
*/

-- Test (run as Founder of Startup A):
-- Expected: Returns 0 (should NOT see Startup B's cap table)
SELECT COUNT(*) AS should_be_zero
FROM cap_table_entries 
WHERE startup_id = 'startup-b-id';

-- Expected: Returns 1 (should see own startup's cap table)
SELECT COUNT(*) AS should_be_one
FROM cap_table_entries 
WHERE startup_id = 'startup-a-id';

-- =============================================================================
-- TEST 4: Funding Rounds Isolation
-- =============================================================================
-- Verify: Funding data is startup-scoped

-- Test (run as Founder of Startup A):
-- Expected: Returns 0 (should NOT see Startup B's funding rounds)
SELECT COUNT(*) AS should_be_zero
FROM funding_rounds 
WHERE startup_id = 'startup-b-id';

-- =============================================================================
-- TEST 5: Shared Link Token Security
-- =============================================================================
-- Verify: Share links cannot be enumerated by non-workspace members

-- Setup (run as service_role):
/*
INSERT INTO datarooms (id, workspace_id) VALUES ('dataroom-b', 'workspace-b-id');
INSERT INTO dataroom_share_links (id, dataroom_id, token_hash, created_by)
VALUES ('link-b', 'dataroom-b', 'hashed-token', 'user-b-id');
*/

-- Test (run as User A who is NOT in Workspace B):
-- Expected: Returns 0 (should NOT see Workspace B's share links)
SELECT COUNT(*) AS should_be_zero
FROM dataroom_share_links dsl
JOIN datarooms d ON d.id = dsl.dataroom_id
WHERE d.workspace_id = '22222222-2222-2222-2222-222222222222';

-- =============================================================================
-- TEST 6: PII Masking in Safe Views
-- =============================================================================
-- Verify: PII is masked for non-authorized viewers

-- Test (run as random authenticated user, not admin, not founder):
-- Expected: email and phone should be NULL for other users
SELECT 
  email IS NULL AS email_masked,
  phone IS NULL AS phone_masked
FROM profiles_safe 
WHERE id != auth.uid()
LIMIT 1;

-- Test (run as User A, viewing Startup B):
-- Expected: PII fields should be NULL
SELECT 
  nif IS NULL AS nif_masked,
  main_contact_email IS NULL AS contact_masked
FROM startups_safe 
WHERE id = 'startup-b-id';

-- =============================================================================
-- TEST 7: Audit Log Immutability
-- =============================================================================
-- Verify: Non-admins cannot UPDATE or DELETE audit logs

-- Test (run as non-admin user):
-- Expected: ERROR - permission denied
UPDATE activity_log SET action = 'tampered' WHERE id = 'any-id';

-- Expected: ERROR - permission denied  
DELETE FROM activity_log WHERE id = 'any-id';

-- =============================================================================
-- TEST 8: Investor Updates Draft Protection
-- =============================================================================
-- Verify: Investor updates are workspace-scoped

-- Test (run as User A, NOT in Workspace B):
-- Expected: Returns 0
SELECT COUNT(*) AS should_be_zero
FROM investor_updates 
WHERE workspace_id = '22222222-2222-2222-2222-222222222222';

-- =============================================================================
-- TEST 9: Mentor External Access Boundaries
-- =============================================================================
-- Verify: External mentors can only access assigned workspaces

-- Setup (run as service_role):
/*
INSERT INTO workspace_users (workspace_id, user_id, role, active)
VALUES ('workspace-a-id', 'mentor-id', 'mentor_externo', true);
*/

-- Test (run as Mentor):
-- Expected: Returns 1 (can see assigned workspace)
SELECT COUNT(*) AS should_be_one
FROM workspaces 
WHERE id = 'workspace-a-id';

-- Expected: Returns 0 (cannot see unassigned workspace)
SELECT COUNT(*) AS should_be_zero
FROM workspaces 
WHERE id = 'workspace-b-id';

-- =============================================================================
-- TEST 10: NDA Acceptance Immutability
-- =============================================================================
-- Verify: NDA acceptances cannot be deleted

-- Test (run as any user including admin):
-- Expected: No DELETE policy exists, operation should fail or return 0 rows
DELETE FROM mentor_nda_acceptances WHERE id = 'any-id';

-- =============================================================================
-- MANUAL VERIFICATION CHECKLIST
-- =============================================================================
-- After running these tests, verify:
-- 
-- [ ] All cross-workspace queries return 0 rows
-- [ ] Private consultant notes are invisible to founders
-- [ ] Financial data is startup-scoped
-- [ ] PII is masked in safe views for non-authorized users
-- [ ] Audit logs reject UPDATE/DELETE
-- [ ] Mentor access is workspace-scoped
-- [ ] NDA acceptances are immutable
--
-- =============================================================================
