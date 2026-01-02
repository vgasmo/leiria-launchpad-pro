-- Add integration fields to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS slack_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_reminders_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS milestone_reminder_days INTEGER DEFAULT 3;

-- Create table for tracking sent reminders (to avoid duplicates)
CREATE TABLE IF NOT EXISTS public.milestone_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'email', 'slack', 'in_app'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  days_before INTEGER NOT NULL
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_milestone_reminders_milestone ON public.milestone_reminders(milestone_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_milestone_reminders_workspace ON public.milestone_reminders(workspace_id);

-- Enable RLS
ALTER TABLE public.milestone_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for milestone_reminders
CREATE POLICY "Users can view reminders for accessible workspaces"
ON public.milestone_reminders FOR SELECT
USING (public.has_workspace_access(workspace_id));

CREATE POLICY "System can insert reminders"
ON public.milestone_reminders FOR INSERT
WITH CHECK (true);

-- Comment for documentation
COMMENT ON TABLE public.milestone_reminders IS 'Tracks sent milestone reminders to avoid duplicates';