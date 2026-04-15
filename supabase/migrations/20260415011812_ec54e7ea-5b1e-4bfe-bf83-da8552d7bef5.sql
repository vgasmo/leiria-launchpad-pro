
-- Table to track automation runs and prevent duplicate notifications
CREATE TABLE public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'app', -- 'app', 'email', 'both'
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (automation_type, entity_id, user_id, run_date)
);

-- Index for fast lookups
CREATE INDEX idx_automation_runs_lookup ON public.automation_runs (automation_type, entity_id, run_date);
CREATE INDEX idx_automation_runs_date ON public.automation_runs (run_date);

-- Enable RLS
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Staff can view all automation runs
CREATE POLICY "Staff can view automation runs"
ON public.automation_runs FOR SELECT
TO authenticated
USING (public.is_staff());

-- Service role inserts (edge functions use service role key)
-- No INSERT policy needed for authenticated users - edge function uses service_role
