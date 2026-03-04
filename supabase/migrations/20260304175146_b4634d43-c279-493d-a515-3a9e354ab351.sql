
-- Create signup_allowlist table for prelaunch gating
CREATE TABLE public.signup_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  domain TEXT,
  added_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT allowlist_email_or_domain CHECK (email IS NOT NULL OR domain IS NOT NULL)
);

ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;

-- Staff-only management
CREATE POLICY "Staff can manage allowlist" ON public.signup_allowlist
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Seed default domain
INSERT INTO public.signup_allowlist (domain) VALUES ('startupleiria.com');

-- Seed founder emails from imported startups
INSERT INTO public.signup_allowlist (email)
  SELECT DISTINCT LOWER(main_contact_email)
  FROM public.startups
  WHERE main_contact_email IS NOT NULL;

-- Seed open_registration feature flag (OFF = prelaunch)
INSERT INTO public.feature_flags (key, scope, enabled, description)
VALUES ('open_registration', 'global', false, 'When OFF: only allowlisted emails/domains can sign up (prelaunch). When ON: open registration with claim flow.')
ON CONFLICT DO NOTHING;

-- Create check_signup_allowed RPC (callable by anon for signup gating)
CREATE OR REPLACE FUNCTION public.check_signup_allowed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open BOOLEAN;
  v_domain TEXT;
BEGIN
  -- Check if open registration is enabled
  SELECT enabled INTO v_open FROM feature_flags WHERE key = 'open_registration' AND scope = 'global' LIMIT 1;
  IF COALESCE(v_open, false) THEN
    RETURN true;
  END IF;

  -- Prelaunch: check allowlist
  v_domain := split_part(LOWER(p_email), '@', 2);
  RETURN EXISTS (
    SELECT 1 FROM signup_allowlist
    WHERE LOWER(email) = LOWER(p_email) OR LOWER(domain) = v_domain
  );
END;
$$;
