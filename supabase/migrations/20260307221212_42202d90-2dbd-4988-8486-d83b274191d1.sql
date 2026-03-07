-- Reclassify imported bulk workspaces that have no active members
-- These were incorrectly set to 'active' during HubSpot import
-- Criteria: status='active' AND zero entries in workspace_users
-- This corrects 173 orphan records, preserving the 9 real active workspaces

UPDATE public.workspaces
SET status = 'imported_unclaimed', updated_at = now()
WHERE status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.workspace_users wu
  WHERE wu.workspace_id = workspaces.id
  AND wu.active = true
);