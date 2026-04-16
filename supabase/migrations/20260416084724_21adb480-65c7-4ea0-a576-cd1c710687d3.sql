-- Fix: Week 1 has no gate_id, so its deliverables never materialize
UPDATE public.program_weeks
SET gate_id = (
  SELECT id FROM public.program_gates
  WHERE program_id = '70b25196-5e9c-4890-a1d9-9968c94f9760'
  AND sort_order = 1
  LIMIT 1
)
WHERE program_id = '70b25196-5e9c-4890-a1d9-9968c94f9760'
  AND week_number = 1
  AND gate_id IS NULL;

-- Update Gate 1 to start at week 1 instead of week 2
UPDATE public.program_gates
SET target_start_week = 1
WHERE program_id = '70b25196-5e9c-4890-a1d9-9968c94f9760'
  AND sort_order = 1
  AND target_start_week = 2;