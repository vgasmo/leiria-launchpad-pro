
-- Add program_type to programs
DO $$ BEGIN
  CREATE TYPE public.program_type AS ENUM ('incubation', 'acceleration');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.programs 
ADD COLUMN IF NOT EXISTS program_type public.program_type NOT NULL DEFAULT 'incubation';

-- Program gates (phases/milestones within an acceleration program)
CREATE TABLE IF NOT EXISTS public.program_gates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_start_week INTEGER,
  target_end_week INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.program_gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage program gates"
ON public.program_gates FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "Program members can view gates"
ON public.program_gates FOR SELECT TO authenticated
USING (public.has_program_access(program_id));

CREATE TRIGGER update_program_gates_updated_at
BEFORE UPDATE ON public.program_gates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Program weeks (individual weeks with deliverables)
CREATE TABLE IF NOT EXISTS public.program_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  gate_id UUID REFERENCES public.program_gates(id) ON DELETE SET NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, week_number)
);

ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage program weeks"
ON public.program_weeks FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "Program members can view weeks"
ON public.program_weeks FOR SELECT TO authenticated
USING (public.has_program_access(program_id));

CREATE TRIGGER update_program_weeks_updated_at
BEFORE UPDATE ON public.program_weeks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track current week for workspaces in acceleration programs
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS current_week INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_program_gates_program_id ON public.program_gates(program_id);
CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON public.program_weeks(program_id);
CREATE INDEX IF NOT EXISTS idx_program_weeks_gate_id ON public.program_weeks(gate_id);
CREATE INDEX IF NOT EXISTS idx_programs_program_type ON public.programs(program_type);
