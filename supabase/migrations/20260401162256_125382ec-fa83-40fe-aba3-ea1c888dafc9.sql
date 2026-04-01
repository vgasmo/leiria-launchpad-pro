-- Allow 'completed' status for workspace_playbook_instances
ALTER TABLE public.workspace_playbook_instances DROP CONSTRAINT workspace_playbook_instances_status_check;
ALTER TABLE public.workspace_playbook_instances ADD CONSTRAINT workspace_playbook_instances_status_check 
  CHECK (status = ANY (ARRAY['suggested', 'instantiated', 'dismissed', 'completed']));

-- Add completed_at column
ALTER TABLE public.workspace_playbook_instances ADD COLUMN IF NOT EXISTS completed_at timestamptz;
