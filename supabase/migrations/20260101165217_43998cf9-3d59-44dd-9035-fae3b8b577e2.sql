-- Fix get_workspace_stats to use sessions table instead of non-existent meetings table
CREATE OR REPLACE FUNCTION public.get_workspace_stats(workspace_ids uuid[])
RETURNS TABLE(
  workspace_id uuid, 
  pending_actions_count integer, 
  overdue_actions_count integer, 
  has_current_month_kpi boolean, 
  last_kpi_month date, 
  next_meeting_date timestamp with time zone, 
  last_session_id uuid, 
  last_session_title text, 
  last_session_scheduled_at timestamp with time zone, 
  last_session_notes text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  next_sessions AS (
    SELECT DISTINCT ON (s.workspace_id)
      s.workspace_id,
      s.scheduled_at
    FROM sessions s
    WHERE s.workspace_id = ANY(workspace_ids)
      AND s.scheduled_at >= now()
    ORDER BY s.workspace_id, s.scheduled_at ASC
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
    ns.scheduled_at AS next_meeting_date,
    ls.id AS last_session_id,
    ls.title AS last_session_title,
    ls.scheduled_at AS last_session_scheduled_at,
    ls.notes AS last_session_notes
  FROM unnest(workspace_ids) AS w(id)
  LEFT JOIN action_counts ac ON ac.workspace_id = w.id
  LEFT JOIN kpi_data kd ON kd.workspace_id = w.id
  LEFT JOIN next_sessions ns ON ns.workspace_id = w.id
  LEFT JOIN last_sessions ls ON ls.workspace_id = w.id;
END;
$function$;