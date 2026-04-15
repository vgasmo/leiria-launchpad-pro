-- Add unique partial indexes for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_recaps_workspace_lang 
  ON public.relationship_recaps (workspace_id, language) 
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recaps_funnel_lang 
  ON public.relationship_recaps (funnel_item_id, language) 
  WHERE funnel_item_id IS NOT NULL;