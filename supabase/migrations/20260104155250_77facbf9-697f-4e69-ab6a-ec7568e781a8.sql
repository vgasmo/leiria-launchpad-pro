-- Drop the existing constraint that requires workspace_id OR program_id
ALTER TABLE public.teams_integration_settings DROP CONSTRAINT teams_settings_scope;

-- Add a new constraint that allows global settings (both null) or scoped settings
ALTER TABLE public.teams_integration_settings ADD CONSTRAINT teams_settings_scope CHECK (
  -- Either global (both null)
  ((workspace_id IS NULL) AND (program_id IS NULL))
  -- Or workspace-scoped
  OR ((workspace_id IS NOT NULL) AND (program_id IS NULL))
  -- Or program-scoped
  OR ((workspace_id IS NULL) AND (program_id IS NOT NULL))
);