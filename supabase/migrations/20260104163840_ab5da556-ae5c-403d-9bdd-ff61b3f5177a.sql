-- Create global settings table for integrations
CREATE TABLE IF NOT EXISTS public.global_integration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_type TEXT NOT NULL UNIQUE,
  settings_json JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.global_integration_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write global settings
CREATE POLICY "Admins can manage global integration settings" 
ON public.global_integration_settings 
FOR ALL 
USING (public.is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_global_integration_settings_updated_at
BEFORE UPDATE ON public.global_integration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to outlook_calendar_settings for user-specific calendar email
ALTER TABLE public.outlook_calendar_settings
ADD COLUMN IF NOT EXISTS calendar_user_email TEXT;

-- Add comment for clarity
COMMENT ON TABLE public.global_integration_settings IS 'Global/default integration settings configured by admins';
COMMENT ON COLUMN public.outlook_calendar_settings.calendar_user_email IS 'Email of the user whose calendar to sync to (uses global Azure AD credentials)';