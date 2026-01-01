-- Add meeting-like fields to sessions table to unify the concepts
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS join_url text;

-- Migrate existing meetings data to sessions (if any)
INSERT INTO public.sessions (workspace_id, title, scheduled_at, duration, agenda, location, join_url, created_by, created_at, updated_at)
SELECT 
  workspace_id,
  title,
  starts_at as scheduled_at,
  EXTRACT(EPOCH FROM (ends_at - starts_at)) / 60 as duration,
  description as agenda,
  location,
  join_url,
  created_by,
  created_at,
  updated_at
FROM public.meetings
ON CONFLICT DO NOTHING;

-- Drop the meetings table (no longer needed)
DROP TABLE IF EXISTS public.meetings CASCADE;