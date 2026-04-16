
-- Add calendar/session columns to program_weeks
ALTER TABLE public.program_weeks
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_url text;
