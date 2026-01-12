-- Allow workspace members to view basic profile info of other members in the same workspace
-- This fixes founders not seeing assigned consultant/mentor in UI.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop if an older policy with same name exists (idempotent)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Workspace members can view member profiles'
  ) THEN
    EXECUTE 'DROP POLICY "Workspace members can view member profiles" ON public.profiles';
  END IF;
END$$;

CREATE POLICY "Workspace members can view member profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.workspace_users wu_me
    JOIN public.workspace_users wu_other
      ON wu_other.workspace_id = wu_me.workspace_id
    WHERE wu_me.user_id = auth.uid()
      AND wu_me.active = true
      AND wu_other.user_id = public.profiles.id
      AND wu_other.active = true
  )
);
