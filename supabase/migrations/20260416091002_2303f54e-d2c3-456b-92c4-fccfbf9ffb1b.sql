
-- Create action_deliverables table
CREATE TABLE public.action_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('file', 'link', 'platform_document')),
  title TEXT NOT NULL,
  file_path TEXT,
  external_url TEXT,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure at least one source is provided
  CONSTRAINT deliverable_has_source CHECK (
    file_path IS NOT NULL OR external_url IS NOT NULL OR document_id IS NOT NULL
  )
);

-- Index for fast lookup by action
CREATE INDEX idx_action_deliverables_action_id ON public.action_deliverables(action_id);

-- Enable RLS
ALTER TABLE public.action_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS: Select — workspace members can view
CREATE POLICY "Workspace members can view deliverables"
ON public.action_deliverables FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_deliverables.action_id
    AND public.has_workspace_access(ai.workspace_id)
  )
);

-- RLS: Insert — workspace writers can create
CREATE POLICY "Workspace writers can create deliverables"
ON public.action_deliverables FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_deliverables.action_id
    AND public.can_write_workspace(ai.workspace_id)
  )
);

-- RLS: Update — workspace writers can update
CREATE POLICY "Workspace writers can update deliverables"
ON public.action_deliverables FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_deliverables.action_id
    AND public.can_write_workspace(ai.workspace_id)
  )
);

-- RLS: Delete — workspace writers can delete
CREATE POLICY "Workspace writers can delete deliverables"
ON public.action_deliverables FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.action_items ai
    WHERE ai.id = action_deliverables.action_id
    AND public.can_write_workspace(ai.workspace_id)
  )
);

-- Updated_at trigger
CREATE TRIGGER update_action_deliverables_updated_at
  BEFORE UPDATE ON public.action_deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
