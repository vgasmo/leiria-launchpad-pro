-- Add milestone_id to action_items table
ALTER TABLE public.action_items 
ADD COLUMN milestone_id uuid REFERENCES public.milestones(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX idx_action_items_milestone_id ON public.action_items(milestone_id);

-- Add comment for documentation
COMMENT ON COLUMN public.action_items.milestone_id IS 'Reference to parent milestone - actions belong to milestones';