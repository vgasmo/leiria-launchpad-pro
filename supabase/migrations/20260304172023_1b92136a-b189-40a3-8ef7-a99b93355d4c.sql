
-- 1) Expand workspace status to include 'imported_unclaimed' and 'claimed'
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_status_check;
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_status_check 
  CHECK (status IN ('imported_unclaimed', 'claimed', 'pending', 'active', 'rejected', 'archived'));

-- 2) Create startup_claim_requests table
CREATE TABLE public.startup_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  startup_id UUID REFERENCES public.startups(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_claimed')),
  match_method TEXT,
  user_email TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.startup_claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS: founders see own rows
CREATE POLICY "Users can view own claim requests"
  ON public.startup_claim_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: users can insert own requests
CREATE POLICY "Users can create own claim requests"
  ON public.startup_claim_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: staff can view all
CREATE POLICY "Staff can view all claim requests"
  ON public.startup_claim_requests FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- RLS: staff can update all
CREATE POLICY "Staff can update claim requests"
  ON public.startup_claim_requests FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 3) claim_startup function: auto-matches email or creates pending request
CREATE OR REPLACE FUNCTION public.claim_startup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_startup RECORD;
  v_workspace RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Check if already claimed
  IF EXISTS (
    SELECT 1 FROM workspace_users wu
    JOIN workspaces w ON w.id = wu.workspace_id
    WHERE wu.user_id = v_user_id AND wu.active = true
    AND w.status IN ('claimed', 'active')
  ) THEN
    RETURN jsonb_build_object('status', 'already_claimed', 'message', 'You already have an active workspace');
  END IF;

  -- Check if there's a pending request
  IF EXISTS (
    SELECT 1 FROM startup_claim_requests
    WHERE user_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('status', 'pending', 'message', 'Your claim request is pending staff review');
  END IF;

  -- Try to match by email
  SELECT s.id AS startup_id, s.name AS startup_name, w.id AS workspace_id
  INTO v_startup
  FROM startups s
  JOIN workspaces w ON w.startup_id = s.id
  WHERE LOWER(s.main_contact_email) = LOWER(v_user_email)
  AND w.status = 'imported_unclaimed'
  LIMIT 1;

  IF v_startup IS NOT NULL THEN
    -- Auto-claim: create workspace_users entry
    INSERT INTO workspace_users (workspace_id, user_id, role, active)
    VALUES (v_startup.workspace_id, v_user_id, 'founder', true)
    ON CONFLICT DO NOTHING;

    -- Update workspace status to 'claimed'
    UPDATE workspaces SET status = 'claimed', updated_at = now()
    WHERE id = v_startup.workspace_id;

    -- Log the claim
    INSERT INTO startup_claim_requests (user_id, startup_id, workspace_id, status, match_method, user_email)
    VALUES (v_user_id, v_startup.startup_id, v_startup.workspace_id, 'auto_claimed', 'email_match', v_user_email);

    -- Ensure founder role
    INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'founder') ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'auto_claimed',
      'startup_name', v_startup.startup_name,
      'workspace_id', v_startup.workspace_id
    );
  ELSE
    -- No match: create pending request
    INSERT INTO startup_claim_requests (user_id, status, match_method, user_email)
    VALUES (v_user_id, 'pending', 'manual_request', v_user_email);

    RETURN jsonb_build_object('status', 'pending', 'message', 'Your request has been submitted for staff review');
  END IF;
END;
$$;

-- 4) approve_startup_claim function (admin-only)
CREATE OR REPLACE FUNCTION public.approve_startup_claim(
  p_claim_id UUID,
  p_workspace_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claim RECORD;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Admin check
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can approve claims';
  END IF;

  -- Get the claim
  SELECT * INTO v_claim FROM startup_claim_requests WHERE id = p_claim_id AND status = 'pending';
  IF v_claim IS NULL THEN
    RAISE EXCEPTION 'Claim not found or already resolved';
  END IF;

  -- Create workspace_users entry
  INSERT INTO workspace_users (workspace_id, user_id, role, active)
  VALUES (p_workspace_id, v_claim.user_id, 'founder', true)
  ON CONFLICT DO NOTHING;

  -- Update workspace status
  UPDATE workspaces SET status = 'claimed', updated_at = now()
  WHERE id = p_workspace_id AND status = 'imported_unclaimed';

  -- Ensure founder role
  INSERT INTO user_roles (user_id, role) VALUES (v_claim.user_id, 'founder') ON CONFLICT DO NOTHING;

  -- Update claim
  UPDATE startup_claim_requests
  SET status = 'approved', workspace_id = p_workspace_id, resolved_at = now(), resolved_by = v_admin_id
  WHERE id = p_claim_id;
END;
$$;

-- 5) reject_startup_claim function
CREATE OR REPLACE FUNCTION public.reject_startup_claim(p_claim_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can reject claims';
  END IF;

  UPDATE startup_claim_requests
  SET status = 'rejected', resolved_at = now(), resolved_by = auth.uid(), notes = p_reason
  WHERE id = p_claim_id AND status = 'pending';
END;
$$;
