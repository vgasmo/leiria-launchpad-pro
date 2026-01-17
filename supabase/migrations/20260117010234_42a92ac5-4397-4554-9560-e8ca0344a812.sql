-- Create workspace_invitations table for founder invite flow
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'founder',
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate invitations
  CONSTRAINT unique_workspace_email UNIQUE (workspace_id, email)
);

-- Add index for token lookups
CREATE INDEX idx_workspace_invitations_token_hash ON public.workspace_invitations(token_hash);
CREATE INDEX idx_workspace_invitations_email ON public.workspace_invitations(email);
CREATE INDEX idx_workspace_invitations_workspace_id ON public.workspace_invitations(workspace_id);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and consultors can view all invitations
CREATE POLICY "Staff can view invitations"
  ON public.workspace_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'consultor')
    )
  );

-- Policy: Admins and consultors can create invitations
CREATE POLICY "Staff can create invitations"
  ON public.workspace_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'consultor')
    )
  );

-- Policy: Admins and consultors can update invitations
CREATE POLICY "Staff can update invitations"
  ON public.workspace_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'consultor')
    )
  );

-- Policy: Users can view their own invitations (by email)
CREATE POLICY "Users can view own invitations"
  ON public.workspace_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Policy: Users can update their own invitation to mark it accepted
CREATE POLICY "Users can accept own invitations"
  ON public.workspace_invitations
  FOR UPDATE
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND accepted_at IS NULL
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create index on startups.nif for faster lookups (nif column already exists)
CREATE INDEX IF NOT EXISTS idx_startups_nif ON public.startups(nif) WHERE nif IS NOT NULL;

-- Create function to validate Portuguese NIF
CREATE OR REPLACE FUNCTION public.validate_portuguese_nif(nif TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  clean_nif TEXT;
  check_digit INT;
  calculated_digit INT;
  i INT;
  sum INT := 0;
BEGIN
  -- Remove spaces and dashes
  clean_nif := regexp_replace(nif, '[^0-9]', '', 'g');
  
  -- Must be exactly 9 digits
  IF length(clean_nif) != 9 THEN
    RETURN FALSE;
  END IF;
  
  -- First digit must be 1, 2, 3, 5, 6, 7, 8, or 9
  IF substring(clean_nif, 1, 1) NOT IN ('1', '2', '3', '5', '6', '7', '8', '9') THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate checksum
  FOR i IN 1..8 LOOP
    sum := sum + (substring(clean_nif, i, 1)::INT * (10 - i));
  END LOOP;
  
  calculated_digit := 11 - (sum % 11);
  IF calculated_digit >= 10 THEN
    calculated_digit := 0;
  END IF;
  
  check_digit := substring(clean_nif, 9, 1)::INT;
  
  RETURN check_digit = calculated_digit;
END;
$$;