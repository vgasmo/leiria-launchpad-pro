-- Add consultant ownership and SLA tracking columns to workspaces
ALTER TABLE public.workspaces
ADD COLUMN assigned_consultor_id UUID REFERENCES auth.users(id),
ADD COLUMN last_contact_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN next_followup_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster consultant lookups
CREATE INDEX idx_workspaces_assigned_consultor ON public.workspaces(assigned_consultor_id);

-- Comment for clarity
COMMENT ON COLUMN public.workspaces.assigned_consultor_id IS 'Primary consultant responsible for this workspace';
COMMENT ON COLUMN public.workspaces.last_contact_at IS 'When was the last contact/interaction logged';
COMMENT ON COLUMN public.workspaces.next_followup_at IS 'Scheduled date for next follow-up';