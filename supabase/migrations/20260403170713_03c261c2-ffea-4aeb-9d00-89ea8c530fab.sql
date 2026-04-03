
CREATE TABLE public.playbook_step_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  playbook_item_id UUID NOT NULL REFERENCES public.playbook_items(id) ON DELETE CASCADE,
  file_path TEXT,
  notes TEXT,
  submitted_by UUID NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_step_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace evidence"
ON public.playbook_step_evidence FOR SELECT TO authenticated
USING (public.can_write_workspace(workspace_id) OR public.is_staff() OR public.is_admin());

CREATE POLICY "Founders can submit evidence"
ON public.playbook_step_evidence FOR INSERT TO authenticated
WITH CHECK (submitted_by = auth.uid() AND public.can_write_workspace(workspace_id));

CREATE POLICY "Staff can review evidence"
ON public.playbook_step_evidence FOR UPDATE TO authenticated
USING (public.is_staff() OR public.is_admin());

CREATE POLICY "Founders can update own pending evidence"
ON public.playbook_step_evidence FOR UPDATE TO authenticated
USING (submitted_by = auth.uid() AND review_status = 'pending');

CREATE POLICY "Founders can delete own pending evidence"
ON public.playbook_step_evidence FOR DELETE TO authenticated
USING (submitted_by = auth.uid() AND review_status = 'pending');

CREATE TRIGGER update_playbook_step_evidence_updated_at
BEFORE UPDATE ON public.playbook_step_evidence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('playbook-evidence', 'playbook-evidence', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload evidence files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'playbook-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'playbook-evidence' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR public.is_staff() OR public.is_admin()
));

CREATE OR REPLACE VIEW public.program_benchmarks AS
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
