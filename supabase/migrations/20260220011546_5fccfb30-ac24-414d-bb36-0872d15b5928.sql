
-- Document reviews table for pitch deck (and other document) evaluations
CREATE TABLE public.document_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  
  -- Scoring dimensions (1-5 scale, nullable = not scored)
  score_problem_solution SMALLINT CHECK (score_problem_solution BETWEEN 1 AND 5),
  score_market SMALLINT CHECK (score_market BETWEEN 1 AND 5),
  score_business_model SMALLINT CHECK (score_business_model BETWEEN 1 AND 5),
  score_team SMALLINT CHECK (score_team BETWEEN 1 AND 5),
  score_traction SMALLINT CHECK (score_traction BETWEEN 1 AND 5),
  score_design_clarity SMALLINT CHECK (score_design_clarity BETWEEN 1 AND 5),
  
  -- Free-form comments
  comments TEXT,
  
  -- AI-generated analysis
  ai_analysis_json JSONB,
  ai_analyzed_at TIMESTAMPTZ,
  
  -- Approval status
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'needs_revision', 'approved', 'rejected')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;

-- Workspace members can view reviews
CREATE POLICY "Workspace members can view reviews"
ON public.document_reviews
FOR SELECT
USING (public.has_workspace_access(workspace_id));

-- Staff (admin/consultor) and mentors can create reviews
CREATE POLICY "Staff and mentors can create reviews"
ON public.document_reviews
FOR INSERT
WITH CHECK (
  public.has_workspace_access(workspace_id) AND (
    public.is_staff() OR
    EXISTS (
      SELECT 1 FROM public.workspace_users
      WHERE workspace_id = document_reviews.workspace_id
        AND user_id = auth.uid()
        AND role = 'mentor_externo'
        AND active = true
    )
  )
);

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own reviews"
ON public.document_reviews
FOR UPDATE
USING (reviewer_id = auth.uid() OR public.is_admin());

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews"
ON public.document_reviews
FOR DELETE
USING (reviewer_id = auth.uid() OR public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_document_reviews_updated_at
BEFORE UPDATE ON public.document_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient lookups
CREATE INDEX idx_document_reviews_document ON public.document_reviews(document_id);
CREATE INDEX idx_document_reviews_workspace ON public.document_reviews(workspace_id);
