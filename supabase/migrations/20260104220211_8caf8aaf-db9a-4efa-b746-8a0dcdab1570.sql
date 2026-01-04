-- Add new columns to sessions table for proper calendar owner tracking
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS outlook_owner_email TEXT;

-- Add use_custom_calendar_email flag to outlook_calendar_settings
ALTER TABLE public.outlook_calendar_settings 
ADD COLUMN IF NOT EXISTS use_custom_calendar_email BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.sessions.outlook_owner_email IS 'The email address of the calendar owner where the Outlook event was created';
COMMENT ON COLUMN public.outlook_calendar_settings.use_custom_calendar_email IS 'If true, use calendar_user_email instead of the assigned consultant email';