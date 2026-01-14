-- CRM v1.1+ Enhancements Migration (Part 2)

-- 1. Add entity_type and entity_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Index for entity lookup
CREATE INDEX IF NOT EXISTS idx_notifications_entity 
ON public.notifications (entity_type, entity_id) 
WHERE entity_id IS NOT NULL;

-- Index for notification deduplication checks
CREATE INDEX IF NOT EXISTS idx_notifications_dedup 
ON public.notifications (user_id, entity_type, entity_id, type, created_at DESC) 
WHERE entity_id IS NOT NULL;

-- 2. Add last_activity_at to funnel_items if not exists
ALTER TABLE public.funnel_items 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Index for CRM queries
CREATE INDEX IF NOT EXISTS idx_funnel_items_last_activity 
ON public.funnel_items (owner_consultant_id, last_activity_at DESC NULLS LAST);

-- 3. Additional indexes for CRM performance
CREATE INDEX IF NOT EXISTS idx_communication_log_funnel_occurred 
ON public.communication_log (funnel_item_id, occurred_at DESC) 
WHERE funnel_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communication_log_workspace_occurred 
ON public.communication_log (workspace_id, occurred_at DESC);

-- 4. Create or replace trigger function
CREATE OR REPLACE FUNCTION public.update_funnel_last_activity_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.funnel_item_id IS NOT NULL THEN
    UPDATE public.funnel_items
    SET last_activity_at = GREATEST(COALESCE(last_activity_at, '1970-01-01'::timestamptz), NEW.occurred_at),
        updated_at = now()
    WHERE id = NEW.funnel_item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_update_funnel_last_activity ON public.communication_log;

CREATE TRIGGER trg_update_funnel_last_activity
AFTER INSERT ON public.communication_log
FOR EACH ROW
EXECUTE FUNCTION public.update_funnel_last_activity_trigger();