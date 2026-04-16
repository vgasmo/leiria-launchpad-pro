
CREATE OR REPLACE FUNCTION public.materialize_acceleration_deliverables(p_workspace_id uuid, p_program_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_program_start date;
  v_gate record;
  v_week record;
  v_deliverable jsonb;
  v_milestone_id uuid;
  v_milestones_created int := 0;
  v_actions_created int := 0;
  v_deliverable_key text;
BEGIN
  v_user_id := auth.uid();

  IF NOT has_workspace_access(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(start_date::date, CURRENT_DATE)
  INTO v_program_start
  FROM programs
  WHERE id = p_program_id;

  FOR v_gate IN
    SELECT id, name, description, sort_order, target_start_week, target_end_week
    FROM program_gates
    WHERE program_id = p_program_id
    ORDER BY sort_order
  LOOP
    SELECT id
    INTO v_milestone_id
    FROM milestones
    WHERE workspace_id = p_workspace_id
      AND source_gate_id = v_gate.id
    LIMIT 1;

    IF v_milestone_id IS NULL THEN
      INSERT INTO milestones (
        workspace_id, title, description, status, target_date,
        created_by, source_gate_id, position
      ) VALUES (
        p_workspace_id,
        v_gate.name,
        v_gate.description,
        'not_started',
        v_program_start + (v_gate.target_end_week * 7),
        v_user_id,
        v_gate.id,
        v_gate.sort_order
      )
      RETURNING id INTO v_milestone_id;

      v_milestones_created := v_milestones_created + 1;
    END IF;

    FOR v_week IN
      SELECT id, week_number, title, deliverables_json
      FROM program_weeks
      WHERE program_id = p_program_id
        AND gate_id = v_gate.id
      ORDER BY week_number
    LOOP
      IF v_week.deliverables_json IS NOT NULL AND jsonb_typeof(v_week.deliverables_json::jsonb) = 'array' THEN
        FOR v_deliverable IN SELECT * FROM jsonb_array_elements(v_week.deliverables_json::jsonb)
        LOOP
          v_deliverable_key := p_program_id || ':' || v_week.id || ':' || (v_deliverable->>'title');

          IF EXISTS (
            SELECT 1
            FROM action_items
            WHERE workspace_id = p_workspace_id
              AND source_deliverable_key = v_deliverable_key
          ) THEN
            CONTINUE;
          END IF;

          INSERT INTO action_items (
            workspace_id, title, description, status,
            due_date, milestone_id, created_by, source_deliverable_key
          ) VALUES (
            p_workspace_id,
            v_deliverable->>'title',
            'S' || v_week.week_number || ' — ' || v_week.title || E'\n' || COALESCE(v_deliverable->>'description', ''),
            'pending',
            (v_program_start + (v_week.week_number * 7))::date,
            v_milestone_id,
            v_user_id,
            v_deliverable_key
          );

          v_actions_created := v_actions_created + 1;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'milestones_created', v_milestones_created,
    'actions_created', v_actions_created
  );
END;
$function$;
