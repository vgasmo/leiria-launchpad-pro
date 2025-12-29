-- Create action_comments table for action item discussions
CREATE TABLE public.action_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_action_comments_action_id ON public.action_comments(action_id);
CREATE INDEX idx_action_comments_user_id ON public.action_comments(user_id);

-- Enable RLS
ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on action items they have access to
CREATE POLICY "Users can view comments on accessible actions"
ON public.action_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_comments.action_id
    AND has_workspace_access(ai.workspace_id)
  )
);

-- Users can create comments on actions in workspaces they can write to
CREATE POLICY "Users can create comments on writable workspaces"
ON public.action_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_comments.action_id
    AND can_write_workspace(ai.workspace_id)
  )
  AND auth.uid() = user_id
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.action_comments
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.action_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Admin can manage all comments
CREATE POLICY "Admin can manage all comments"
ON public.action_comments
FOR ALL
USING (is_admin());

-- Add trigger for updated_at
CREATE TRIGGER update_action_comments_updated_at
BEFORE UPDATE ON public.action_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();