
CREATE OR REPLACE FUNCTION public.staff_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete from workspace_users
  DELETE FROM public.workspace_users WHERE user_id = target_user_id;

  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Delete profile
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
