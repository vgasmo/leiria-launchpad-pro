-- Create activity_log table for audit trail
CREATE TABLE public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin can view all activity logs"
ON public.activity_log FOR SELECT
USING (public.is_admin());

CREATE POLICY "Users can view activity in their workspaces"
ON public.activity_log FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Authenticated users can create activity logs"
ON public.activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_activity_log_workspace ON public.activity_log(workspace_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON public.activity_log(user_id, created_at DESC);

-- Create saved_filters table for search history
CREATE TABLE public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own saved filters"
ON public.saved_filters FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id);

-- Enable realtime for activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- Create server-side aggregation function for workspace stats
CREATE OR REPLACE FUNCTION public.get_workspace_stats(workspace_ids UUID[])
RETURNS TABLE (
  workspace_id UUID,
  pending_actions_count INTEGER,
  overdue_actions_count INTEGER,
  has_current_month_kpi BOOLEAN,
  last_kpi_month DATE,
  next_meeting_date TIMESTAMPTZ,
  last_session_id UUID,
  last_session_title TEXT,
  last_session_scheduled_at TIMESTAMPTZ,
  last_session_notes TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := date_trunc('month', now())::date;
  today DATE := CURRENT_DATE;
BEGIN
  RETURN QUERY
  WITH action_counts AS (
    SELECT 
      ai.workspace_id,
      COUNT(*) FILTER (WHERE ai.status IN ('pending', 'in_progress')) AS pending_count,
      COUNT(*) FILTER (WHERE ai.status IN ('pending', 'in_progress') AND ai.due_date < today) AS overdue_count
    FROM action_items ai
    WHERE ai.workspace_id = ANY(workspace_ids)
    GROUP BY ai.workspace_id
  ),
  kpi_data AS (
    SELECT DISTINCT ON (kv.workspace_id)
      kv.workspace_id,
      EXISTS (
        SELECT 1 FROM kpi_values kv2 
        WHERE kv2.workspace_id = kv.workspace_id 
        AND kv2.period_month = current_month
      ) AS has_current,
      kv.period_month AS last_month
    FROM kpi_values kv
    WHERE kv.workspace_id = ANY(workspace_ids)
    ORDER BY kv.workspace_id, kv.period_month DESC
  ),
  next_meetings AS (
    SELECT DISTINCT ON (m.workspace_id)
      m.workspace_id,
      m.starts_at
    FROM meetings m
    WHERE m.workspace_id = ANY(workspace_ids)
      AND m.starts_at >= now()
    ORDER BY m.workspace_id, m.starts_at ASC
  ),
  last_sessions AS (
    SELECT DISTINCT ON (s.workspace_id)
      s.workspace_id,
      s.id,
      s.title,
      s.scheduled_at,
      s.notes
    FROM sessions s
    WHERE s.workspace_id = ANY(workspace_ids)
      AND s.scheduled_at < now()
    ORDER BY s.workspace_id, s.scheduled_at DESC
  )
  SELECT 
    w.id AS workspace_id,
    COALESCE(ac.pending_count, 0)::INTEGER AS pending_actions_count,
    COALESCE(ac.overdue_count, 0)::INTEGER AS overdue_actions_count,
    COALESCE(kd.has_current, false) AS has_current_month_kpi,
    kd.last_month AS last_kpi_month,
    nm.starts_at AS next_meeting_date,
    ls.id AS last_session_id,
    ls.title AS last_session_title,
    ls.scheduled_at AS last_session_scheduled_at,
    ls.notes AS last_session_notes
  FROM unnest(workspace_ids) AS w(id)
  LEFT JOIN action_counts ac ON ac.workspace_id = w.id
  LEFT JOIN kpi_data kd ON kd.workspace_id = w.id
  LEFT JOIN next_meetings nm ON nm.workspace_id = w.id
  LEFT JOIN last_sessions ls ON ls.workspace_id = w.id;
END;
$$;