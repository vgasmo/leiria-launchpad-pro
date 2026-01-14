-- Add task-related columns to communication_log (safe, nullable defaults)
ALTER TABLE public.communication_log 
ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open',
ADD COLUMN IF NOT EXISTS assigned_to UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS priority TEXT NULL;

-- Add check constraints for status and priority
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_log_status_check'
  ) THEN
    ALTER TABLE public.communication_log 
    ADD CONSTRAINT communication_log_status_check 
    CHECK (status IN ('open', 'done', 'canceled'));
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'communication_log_priority_check'
  ) THEN
    ALTER TABLE public.communication_log 
    ADD CONSTRAINT communication_log_priority_check 
    CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

-- Indexes for task queries
CREATE INDEX IF NOT EXISTS idx_communication_log_funnel_item_tasks 
ON public.communication_log (funnel_item_id, due_at) 
WHERE activity_type = 'task';

CREATE INDEX IF NOT EXISTS idx_communication_log_workspace_tasks 
ON public.communication_log (workspace_id, due_at) 
WHERE activity_type = 'task';

CREATE INDEX IF NOT EXISTS idx_communication_log_assigned_tasks 
ON public.communication_log (assigned_to, due_at) 
WHERE assigned_to IS NOT NULL;

-- Add next_action fields to funnel_items if they don't exist
ALTER TABLE public.funnel_items 
ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS next_action_description TEXT NULL;

-- Index for next_action queries
CREATE INDEX IF NOT EXISTS idx_funnel_items_next_action 
ON public.funnel_items (owner_consultant_id, next_action_at) 
WHERE next_action_at IS NOT NULL;