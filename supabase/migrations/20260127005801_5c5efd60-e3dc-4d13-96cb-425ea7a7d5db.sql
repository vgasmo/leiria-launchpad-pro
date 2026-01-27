-- Add calendar_token_expires_at column to profiles for token expiration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS calendar_token_expires_at timestamptz;

-- Create index for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_calendar_token_expires 
ON public.profiles(calendar_token_expires_at) 
WHERE calendar_token_expires_at IS NOT NULL;

-- Add comment explaining the security model
COMMENT ON COLUMN public.profiles.calendar_feed_token IS 'SHA-256 hash of the calendar feed token. Original token is never stored.';
COMMENT ON COLUMN public.profiles.calendar_token_expires_at IS 'Expiration timestamp for the calendar feed token. Tokens expire after 90 days.';