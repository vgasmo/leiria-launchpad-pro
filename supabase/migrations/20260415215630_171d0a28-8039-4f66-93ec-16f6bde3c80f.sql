
-- 1. Link program_weeks to their gates based on week ranges
UPDATE public.program_weeks pw
SET gate_id = pg.id
FROM public.program_gates pg
WHERE pw.program_id = pg.program_id
  AND pw.week_number >= pg.target_start_week
  AND pw.week_number <= pg.target_end_week
  AND pw.gate_id IS NULL;

-- 2. Add source tracking column to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS source_gate_id uuid REFERENCES public.program_gates(id) ON DELETE SET NULL;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS source_week_id uuid REFERENCES public.program_weeks(id) ON DELETE SET NULL;

-- 3. Add source tracking to action_items
ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS source_deliverable_key text;

-- 4. Create materialization function
CREATE OR REPLACE FUNCTION public.materialize_acceleration_deliverables(
  p_workspace_id uuid,
  p_program_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- Verify access
  IF NOT has_workspace_access(p_workspace_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  -- Get program start date (fallback to today)
  SELECT COALESCE(start_date::date, CURRENT_DATE) INTO v_program_start
  FROM programs WHERE id = p_program_id;
  
  -- Iterate gates → create milestones
  FOR v_gate IN
    SELECT id, name, description, sort_order, target_start_week, target_end_week
    FROM program_gates
    WHERE program_id = p_program_id
    ORDER BY sort_order
  LOOP
    -- Skip if milestone already exists for this gate+workspace
    IF EXISTS (
      SELECT 1 FROM milestones 
      WHERE workspace_id = p_workspace_id AND source_gate_id = v_gate.id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Calculate target date from gate end week
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
    
    -- Get weeks for this gate and create actions from deliverables
    FOR v_week IN
      SELECT id, week_number, title, deliverables_json
      FROM program_weeks
      WHERE program_id = p_program_id
        AND gate_id = v_gate.id
      ORDER BY week_number
    LOOP
      -- Each deliverable becomes an action item
      IF v_week.deliverables_json IS NOT NULL AND jsonb_typeof(v_week.deliverables_json::jsonb) = 'array' THEN
        FOR v_deliverable IN SELECT * FROM jsonb_array_elements(v_week.deliverables_json::jsonb)
        LOOP
          v_deliverable_key := p_program_id || ':' || v_week.id || ':' || (v_deliverable->>'title');
          
          -- Skip if action already exists
          IF EXISTS (
            SELECT 1 FROM action_items 
            WHERE workspace_id = p_workspace_id AND source_deliverable_key = v_deliverable_key
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
            (v_program_start + (v_week.week_number * 7))::text,
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
$$;
