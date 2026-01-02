-- Add health_score_components to workspaces to store individual component scores
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS health_score_components jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.workspaces.health_score_components IS 'Stores individual component scores: {actions: number, sessions: number, kpis: number, checkins: number}';