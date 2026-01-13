-- Add AI feedback columns to template_instances table
ALTER TABLE public.template_instances 
ADD COLUMN IF NOT EXISTS ai_feedback_json JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_feedback_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_feedback_generated_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_feedback_visibility TEXT DEFAULT 'staff' CHECK (ai_feedback_visibility IN ('staff', 'shared_with_founder'));

-- Add index for efficient queries on feedback visibility
CREATE INDEX IF NOT EXISTS idx_template_instances_ai_feedback 
ON public.template_instances(ai_feedback_generated_at) 
WHERE ai_feedback_json IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.template_instances.ai_feedback_json IS 'Structured AI coaching feedback (summary, strengths, gaps, actions, etc.)';
COMMENT ON COLUMN public.template_instances.ai_feedback_visibility IS 'Who can see the AI feedback: staff only or shared with founder';