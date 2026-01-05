-- Create mentor_requests table for founder expertise requests
CREATE TABLE public.mentor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  expertise_tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  fulfilled_by UUID,
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  assigned_mentor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

-- Founders can view and create requests for their workspaces
CREATE POLICY "Founders can view own workspace requests"
ON public.mentor_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = mentor_requests.workspace_id
    AND wu.user_id = auth.uid()
    AND wu.role = 'founder'
    AND wu.active = true
  )
);

CREATE POLICY "Founders can create requests for own workspaces"
ON public.mentor_requests
FOR INSERT
WITH CHECK (
  requested_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.workspace_users wu
    WHERE wu.workspace_id = mentor_requests.workspace_id
    AND wu.user_id = auth.uid()
    AND wu.role = 'founder'
    AND wu.active = true
  )
);

CREATE POLICY "Founders can cancel own requests"
ON public.mentor_requests
FOR UPDATE
USING (
  requested_by = auth.uid() AND status = 'pending'
)
WITH CHECK (
  requested_by = auth.uid() AND status = 'cancelled'
);

-- Staff (admin/consultor) can view all requests
CREATE POLICY "Staff can view all requests"
ON public.mentor_requests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'consultor')
);

-- Staff can update requests (fulfill/assign)
CREATE POLICY "Staff can update requests"
ON public.mentor_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'consultor')
);

-- Add updated_at trigger
CREATE TRIGGER update_mentor_requests_updated_at
BEFORE UPDATE ON public.mentor_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_mentor_requests_status ON public.mentor_requests(status);
CREATE INDEX idx_mentor_requests_workspace ON public.mentor_requests(workspace_id);