-- Add settings_json column to programs table for optional module configuration
ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.programs.settings_json IS 'Program-level settings including optional module flags (enable_kpis, enable_health, enable_milestones, enable_alerts, enable_playbooks, enable_financial_model)';

-- Update existing programs with default settings (all modules enabled)
UPDATE public.programs 
SET settings_json = jsonb_build_object(
  'enable_kpis', true,
  'enable_health', true,
  'enable_milestones', true,
  'enable_alerts', true,
  'enable_playbooks', true,
  'enable_financial_model', true,
  'program_mode', 'standard'
)
WHERE settings_json = '{}'::jsonb OR settings_json IS NULL;