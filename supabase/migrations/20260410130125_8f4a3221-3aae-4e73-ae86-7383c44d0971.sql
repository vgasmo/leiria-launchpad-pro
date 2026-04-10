
-- Set the existing contract as signed 10 days ago for archival testing
UPDATE public.startup_contracts 
SET signed_at = now() - interval '10 days',
    status = 'active',
    archive_status = 'pending',
    updated_at = now()
WHERE id = '7d754944-e1d3-4da9-81bc-c3a767ac0c3f';
