-- Add account_status column to profiles table for account approval workflow
-- This column tracks whether accounts are pending, approved, or suspended

-- Create enum type for account status
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add account_status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status public.account_status DEFAULT 'approved';

-- Set existing users to 'approved' (they were approved before this feature)
UPDATE public.profiles 
SET account_status = 'approved' 
WHERE account_status IS NULL;

-- Create index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status 
ON public.profiles(account_status);

-- RLS policy: Users can only see their own profile's account_status
-- (already covered by existing profile policies)

-- Admin RPC function to approve a user account
CREATE OR REPLACE FUNCTION public.approve_user_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can approve accounts
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve user accounts';
  END IF;
  
  UPDATE public.profiles 
  SET account_status = 'approved', updated_at = now()
  WHERE id = p_user_id;
  
  -- Log the activity
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'profile', p_user_id, 'account_approved', jsonb_build_object('approved_user_id', p_user_id));
END;
$$;

-- Grant execute to authenticated users (function does its own auth check)
GRANT EXECUTE ON FUNCTION public.approve_user_account(uuid) TO authenticated;