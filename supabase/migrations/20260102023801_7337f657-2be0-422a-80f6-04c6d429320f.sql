-- =====================================================
-- Program Setup Wizard: Database Schema
-- =====================================================

-- 1. Add stage_key column to stages table to link to workspace.stage enum
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS stage_key text;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create unique constraint for program + stage_key
CREATE UNIQUE INDEX IF NOT EXISTS stages_program_stage_key_unique 
ON public.stages(program_id, stage_key) WHERE stage_key IS NOT NULL;

-- 2. Create program_setup_drafts table
CREATE TABLE IF NOT EXISTS public.program_setup_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'discarded')),
  draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_program_setup_drafts_created_by ON public.program_setup_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_program_setup_drafts_status ON public.program_setup_drafts(status);
CREATE INDEX IF NOT EXISTS idx_program_setup_drafts_program_id ON public.program_setup_drafts(program_id);

-- Enable RLS
ALTER TABLE public.program_setup_drafts ENABLE ROW LEVEL SECURITY;

-- RLS: Only admin/consultor can manage drafts
CREATE POLICY "Admin and consultors can manage drafts"
ON public.program_setup_drafts FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_program_setup_drafts_updated_at
  BEFORE UPDATE ON public.program_setup_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Create program_core_kpis table
CREATE TABLE IF NOT EXISTS public.program_core_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  kpi_definition_id uuid NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id, kpi_definition_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_program_core_kpis_program_id ON public.program_core_kpis(program_id);

-- Enable RLS
ALTER TABLE public.program_core_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for program_core_kpis
CREATE POLICY "Admin and consultors can manage core KPIs"
ON public.program_core_kpis FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  )
);

CREATE POLICY "Users can view core KPIs for accessible programs"
ON public.program_core_kpis FOR SELECT
USING (has_program_access(program_id));

-- 4. Add program_id to stage_kpi_defaults and order_index, target_value
ALTER TABLE public.stage_kpi_defaults ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;
ALTER TABLE public.stage_kpi_defaults ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.stage_kpi_defaults ADD COLUMN IF NOT EXISTS target_value numeric;

-- Create index for program_id
CREATE INDEX IF NOT EXISTS idx_stage_kpi_defaults_program_id ON public.stage_kpi_defaults(program_id);

-- 5. Add status column to programs table for draft/published tracking
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived'));

-- Update existing programs to be active
UPDATE public.programs SET status = 'active' WHERE status IS NULL;