
CREATE OR REPLACE VIEW public.program_benchmarks 
WITH (security_invoker = true) AS
SELECT 
  w.program_id,
  w.stage,
  COUNT(DISTINCT w.id) AS startup_count,
  ROUND(AVG(w.health_score_numeric)::numeric, 1) AS avg_health_score,
  ROUND(AVG((SELECT COUNT(*) FROM public.milestones m WHERE m.workspace_id = w.id AND m.status = 'completed'))::numeric, 1) AS avg_milestones_completed,
  ROUND(AVG((SELECT COUNT(*) FROM public.action_items a WHERE a.workspace_id = w.id AND a.status = 'completed'))::numeric, 1) AS avg_actions_completed,
  ROUND(AVG((SELECT COUNT(*) FROM public.kpi_values kv WHERE kv.workspace_id = w.id))::numeric, 1) AS avg_kpi_entries
FROM public.workspaces w
WHERE w.program_id IS NOT NULL
GROUP BY w.program_id, w.stage;
