-- Function to auto-update milestone status based on action items
CREATE OR REPLACE FUNCTION public.update_milestone_status_from_actions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone_id uuid;
  v_total_actions int;
  v_completed_actions int;
  v_in_progress_actions int;
  v_current_status milestone_status;
BEGIN
  -- Get the milestone_id (handle both INSERT/UPDATE and DELETE)
  IF TG_OP = 'DELETE' THEN
    v_milestone_id := OLD.milestone_id;
  ELSE
    v_milestone_id := NEW.milestone_id;
  END IF;
  
  -- If no milestone_id, nothing to do
  IF v_milestone_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Count actions for this milestone
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO v_total_actions, v_completed_actions, v_in_progress_actions
  FROM public.action_items
  WHERE milestone_id = v_milestone_id;
  
  -- Get current milestone status
  SELECT status INTO v_current_status
  FROM public.milestones
  WHERE id = v_milestone_id;
  
  -- Determine new status based on action states
  -- Don't change if milestone is marked as 'delayed' (manual override)
  IF v_current_status != 'delayed' THEN
    IF v_total_actions > 0 AND v_completed_actions = v_total_actions THEN
      -- All actions completed → milestone completed
      UPDATE public.milestones
      SET status = 'completed', completed_at = now()
      WHERE id = v_milestone_id AND status != 'completed';
    ELSIF v_in_progress_actions > 0 OR (v_completed_actions > 0 AND v_completed_actions < v_total_actions) THEN
      -- Some actions in progress or partially completed → milestone in progress
      UPDATE public.milestones
      SET status = 'in_progress', completed_at = NULL
      WHERE id = v_milestone_id AND status NOT IN ('in_progress', 'delayed');
    ELSIF v_total_actions = 0 OR (v_completed_actions = 0 AND v_in_progress_actions = 0) THEN
      -- No actions or all pending → keep as not_started (don't revert from in_progress)
      -- Only set to not_started if currently completed and no actions completed
      IF v_current_status = 'completed' AND v_completed_actions = 0 THEN
        UPDATE public.milestones
        SET status = 'not_started', completed_at = NULL
        WHERE id = v_milestone_id;
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger on action_items for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_update_milestone_status ON public.action_items;
CREATE TRIGGER trigger_update_milestone_status
  AFTER INSERT OR UPDATE OF status, milestone_id OR DELETE
  ON public.action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_milestone_status_from_actions();

-- Also handle when milestone_id changes (action moved to different milestone)
-- We need to update the OLD milestone too
CREATE OR REPLACE FUNCTION public.update_old_milestone_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_actions int;
  v_completed_actions int;
  v_in_progress_actions int;
  v_current_status milestone_status;
BEGIN
  -- Only run if milestone_id changed and old milestone exists
  IF OLD.milestone_id IS NOT NULL AND OLD.milestone_id != NEW.milestone_id THEN
    -- Count actions for the OLD milestone
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed'),
      COUNT(*) FILTER (WHERE status = 'in_progress')
    INTO v_total_actions, v_completed_actions, v_in_progress_actions
    FROM public.action_items
    WHERE milestone_id = OLD.milestone_id;
    
    -- Get current milestone status
    SELECT status INTO v_current_status
    FROM public.milestones
    WHERE id = OLD.milestone_id;
    
    -- Update old milestone status
    IF v_current_status != 'delayed' THEN
      IF v_total_actions > 0 AND v_completed_actions = v_total_actions THEN
        UPDATE public.milestones
        SET status = 'completed', completed_at = now()
        WHERE id = OLD.milestone_id AND status != 'completed';
      ELSIF v_in_progress_actions > 0 OR (v_completed_actions > 0 AND v_completed_actions < v_total_actions) THEN
        UPDATE public.milestones
        SET status = 'in_progress', completed_at = NULL
        WHERE id = OLD.milestone_id AND status NOT IN ('in_progress', 'delayed');
      ELSIF v_total_actions = 0 THEN
        -- No actions left, revert to not_started
        UPDATE public.milestones
        SET status = 'not_started', completed_at = NULL
        WHERE id = OLD.milestone_id AND status = 'completed';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_old_milestone_status ON public.action_items;
CREATE TRIGGER trigger_update_old_milestone_status
  AFTER UPDATE OF milestone_id
  ON public.action_items
  FOR EACH ROW
  WHEN (OLD.milestone_id IS DISTINCT FROM NEW.milestone_id)
  EXECUTE FUNCTION public.update_old_milestone_status();