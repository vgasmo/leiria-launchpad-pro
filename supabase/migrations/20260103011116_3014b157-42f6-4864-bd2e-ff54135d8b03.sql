-- Create enum for workspace priority levels
CREATE TYPE public.workspace_priority AS ENUM ('star', 'high', 'standard', 'maintenance');

-- Add priority_level column to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN priority_level public.workspace_priority NOT NULL DEFAULT 'standard';

-- Add priority_notes for consultants to add context
ALTER TABLE public.workspaces 
ADD COLUMN priority_notes text DEFAULT NULL;

-- Add priority_set_at timestamp to track when priority was last changed
ALTER TABLE public.workspaces 
ADD COLUMN priority_set_at timestamp with time zone DEFAULT NULL;

-- Add priority_set_by to track who set the priority
ALTER TABLE public.workspaces 
ADD COLUMN priority_set_by uuid DEFAULT NULL;

-- Create index for filtering by priority
CREATE INDEX idx_workspaces_priority_level ON public.workspaces(priority_level);

-- Add comment for documentation
COMMENT ON COLUMN public.workspaces.priority_level IS 'Consultant-assigned priority: star (top performers), high (promising), standard (normal), maintenance (minimal attention)';