-- Add unique constraint for investor_updates upsert
ALTER TABLE public.investor_updates
ADD CONSTRAINT investor_updates_workspace_month_unique UNIQUE (workspace_id, month);