-- ============================================
-- IMPROVEMENT PACKAGE: Database Schema Updates (Part 2)
-- ============================================

-- 5) Add order_index to stages table if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stages' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.stages ADD COLUMN order_index integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add is_active column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stages' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.stages ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add color column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stages' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE public.stages ADD COLUMN color text NULL;
  END IF;
END $$;

-- Create index for stages lookup if not exists
CREATE INDEX IF NOT EXISTS idx_stages_program_active 
ON public.stages(program_id) WHERE is_active = true;

-- 6) Add stage_id to workspaces if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'workspaces' 
    AND column_name = 'stage_id'
  ) THEN
    ALTER TABLE public.workspaces ADD COLUMN stage_id uuid NULL REFERENCES public.stages(id);
  END IF;
END $$;

-- 7) Insert default stages for any programs that don't have them
INSERT INTO public.stages (program_id, stage_key, name, description, order_index)
SELECT 
  p.id,
  s.key,
  s.name,
  s.description,
  s.idx
FROM public.programs p
CROSS JOIN (
  VALUES 
    ('ideation', 'Ideation', 'Early stage idea validation', 0),
    ('validation', 'Validation', 'Testing market fit and assumptions', 1),
    ('mvp', 'MVP', 'Minimum viable product development', 2),
    ('growth', 'Growth', 'Scaling the business', 3),
    ('scale', 'Scale', 'Expanding operations', 4)
) AS s(key, name, description, idx)
WHERE NOT EXISTS (
  SELECT 1 FROM public.stages st 
  WHERE st.program_id = p.id AND st.stage_key = s.key
)
ON CONFLICT DO NOTHING;