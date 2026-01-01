-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone authenticated can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create stage history table to track stage transitions
CREATE TABLE public.stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

-- Users with workspace access can view stage history
CREATE POLICY "Users with workspace access can view stage history"
ON public.stage_history
FOR SELECT
USING (has_workspace_access(workspace_id));

-- Users who can write to workspace can insert stage history
CREATE POLICY "Users can insert stage history"
ON public.stage_history
FOR INSERT
WITH CHECK (can_write_workspace(workspace_id));

-- Create session notes templates table
CREATE TABLE public.session_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  agenda_template TEXT,
  notes_template TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view global templates or their own
CREATE POLICY "Everyone can view global session templates"
ON public.session_templates
FOR SELECT
USING (is_global = true OR created_by = auth.uid());

-- Staff can create templates (admins or anyone with consultor role)
CREATE POLICY "Staff can create session templates"
ON public.session_templates
FOR INSERT
WITH CHECK (
  is_admin() OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'consultor')
);

-- Creators can update their templates
CREATE POLICY "Creators can update their session templates"
ON public.session_templates
FOR UPDATE
USING (created_by = auth.uid() OR is_admin());

-- Insert default session templates
INSERT INTO public.session_templates (name, description, agenda_template, notes_template, is_global) VALUES
('Weekly Check-in', 'Standard weekly progress check-in', 
'1. Progress since last meeting
2. Current blockers/challenges
3. Key priorities for next week
4. Questions/support needed', 
'## Key Updates

## Decisions Made

## Action Items

## Notes', true),
('OKR Review', 'Quarterly OKR progress review', 
'1. Q[X] OKR Progress Review
2. Key Results status update
3. Learnings and pivots needed
4. Next quarter planning', 
'## OKR Status

### Objective 1:
- KR1: 
- KR2:

## Decisions

## Next Steps', true),
('Pitch Deck Review', 'Review and feedback on pitch deck', 
'1. Pitch presentation (15 min)
2. Feedback and questions
3. Key improvements needed
4. Next steps', 
'## Pitch Feedback

### Strengths:

### Areas to Improve:

## Action Items', true),
('Problem-Solution Fit', 'Validate problem and solution alignment', 
'1. Customer problem recap
2. Solution demo/overview
3. Customer feedback insights
4. Validation status', 
'## Problem Statement

## Solution Overview

## Customer Insights

## Validation Status

## Next Steps', true),
('Investor Readiness', 'Prepare for fundraising', 
'1. Fundraising goals review
2. Materials checklist
3. Investor pipeline
4. Practice pitch/Q&A', 
'## Fundraising Status

## Materials Review

## Investor Pipeline

## Pitch Practice Notes', true);

-- Create trigger to track stage changes
CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.stage_history (workspace_id, from_stage, to_stage, changed_by)
    VALUES (NEW.id, OLD.stage::text, NEW.stage::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_workspace_stage_change
AFTER UPDATE ON public.workspaces
FOR EACH ROW
WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
EXECUTE FUNCTION public.track_stage_change();