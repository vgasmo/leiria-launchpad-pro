-- 1. Workspace Blocking System
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_by UUID;

-- 2. Startup Portugal Status (rename column and add document)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'startups' AND column_name = 'is_legally_recognized') THEN
    ALTER TABLE public.startups RENAME COLUMN is_legally_recognized TO has_startup_portugal_status;
  END IF;
END $$;

ALTER TABLE public.startups
ADD COLUMN IF NOT EXISTS startup_portugal_document_path TEXT;

-- 3. Admin Announcements System
CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('mail', 'package', 'general', 'urgent')),
  title TEXT NOT NULL,
  message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- RLS for announcements
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage announcements" ON public.admin_announcements
FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Founders can view their own workspace announcements
CREATE POLICY "Founders view own announcements" ON public.admin_announcements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_users 
    WHERE workspace_id = admin_announcements.workspace_id 
    AND user_id = auth.uid() 
    AND role = 'founder'
    AND active = true
  )
);

-- Founders can mark as read
CREATE POLICY "Founders mark as read" ON public.admin_announcements
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspace_users 
    WHERE workspace_id = admin_announcements.workspace_id 
    AND user_id = auth.uid() 
    AND role = 'founder'
    AND active = true
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_announcements_workspace ON public.admin_announcements(workspace_id);
CREATE INDEX IF NOT EXISTS idx_announcements_unread ON public.admin_announcements(workspace_id, is_read) WHERE NOT is_read;

-- Block/Unblock functions
CREATE OR REPLACE FUNCTION public.block_workspace(_workspace_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can block workspaces';
  END IF;
  UPDATE workspaces SET blocked_at = now(), blocked_reason = _reason, blocked_by = _user_id, updated_at = now() WHERE id = _workspace_id;
  INSERT INTO activity_log (user_id, entity_type, entity_id, action, workspace_id, metadata)
  VALUES (_user_id, 'workspace', _workspace_id, 'blocked', _workspace_id, jsonb_build_object('reason', _reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_workspace(_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can unblock workspaces';
  END IF;
  UPDATE workspaces SET blocked_at = NULL, blocked_reason = NULL, blocked_by = NULL, updated_at = now() WHERE id = _workspace_id;
  INSERT INTO activity_log (user_id, entity_type, entity_id, action, workspace_id)
  VALUES (_user_id, 'workspace', _workspace_id, 'unblocked', _workspace_id);
END;
$$;