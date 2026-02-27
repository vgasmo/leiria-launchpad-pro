-- Add session_type column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN session_type text DEFAULT 'general';

-- Add comment for clarity
COMMENT ON COLUMN public.sessions.session_type IS 'Type of session: general, discovery, problem_solving, mentoring, check_in, pitch_practice, workshop, follow_up';