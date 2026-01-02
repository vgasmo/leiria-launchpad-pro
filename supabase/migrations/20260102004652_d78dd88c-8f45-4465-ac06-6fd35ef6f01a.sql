-- Add AI outputs columns to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS raw_transcript text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_decisions jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_risks jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_action_suggestions jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_kpi_prompts jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_generated_at timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ai_generated_by uuid;

-- Add check constraint for source
ALTER TABLE public.sessions ADD CONSTRAINT sessions_source_check 
  CHECK (source IN ('manual', 'teams_import', 'webhook'));

-- Create email log table for tracking follow-up emails
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email_type text NOT NULL DEFAULT 'session_followup',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on email_log
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_log
CREATE POLICY "Users can view email logs for their workspaces"
  ON public.email_log FOR SELECT
  USING (has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can create email logs"
  ON public.email_log FOR INSERT
  WITH CHECK (can_write_workspace(workspace_id));

CREATE POLICY "Admin can manage all email logs"
  ON public.email_log FOR ALL
  USING (is_admin());

-- Create reminder_jobs table for scheduled reminders
CREATE TABLE IF NOT EXISTS public.reminder_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('overdue_actions', 'missing_kpis', 'session_followup')),
  schedule text NOT NULL DEFAULT 'daily',
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on reminder_jobs
ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder_jobs
CREATE POLICY "Users can view reminder jobs for their workspaces"
  ON public.reminder_jobs FOR SELECT
  USING (has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can manage reminder jobs"
  ON public.reminder_jobs FOR ALL
  USING (can_write_workspace(workspace_id));

CREATE POLICY "Admin can manage all reminder jobs"
  ON public.reminder_jobs FOR ALL
  USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_ai_generated_at ON public.sessions(ai_generated_at);
CREATE INDEX IF NOT EXISTS idx_email_log_workspace_id ON public.email_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_email_log_session_id ON public.email_log(session_id);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_workspace_id ON public.reminder_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_next_run ON public.reminder_jobs(next_run_at) WHERE is_active = true;

-- Add trigger for updated_at on reminder_jobs
CREATE TRIGGER update_reminder_jobs_updated_at
  BEFORE UPDATE ON public.reminder_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();