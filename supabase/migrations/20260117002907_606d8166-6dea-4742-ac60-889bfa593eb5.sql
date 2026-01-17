-- =====================================================
-- FEATURE 2: Tag Categories System
-- =====================================================

-- Create tag_categories table
CREATE TABLE IF NOT EXISTS public.tag_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to tags table
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.tag_categories(id) ON DELETE SET NULL;

-- Enable RLS on tag_categories
ALTER TABLE public.tag_categories ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read tag categories
CREATE POLICY "tag_categories_select_all" ON public.tag_categories
FOR SELECT USING (true);

-- RLS: Only staff (admin/consultor) can manage tag categories
CREATE POLICY "tag_categories_insert_staff" ON public.tag_categories
FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "tag_categories_update_staff" ON public.tag_categories
FOR UPDATE USING (public.is_staff());

CREATE POLICY "tag_categories_delete_staff" ON public.tag_categories
FOR DELETE USING (public.is_admin());

-- Seed default categories
INSERT INTO public.tag_categories (name, slug, description, sort_order) VALUES
  ('Industry', 'industry', 'Business sector or industry vertical', 1),
  ('Technology', 'tech', 'Technology stack or technical expertise', 2),
  ('Needs', 'needs', 'Current needs or challenges', 3),
  ('Program Track', 'program-track', 'Program-specific tracks or cohorts', 4),
  ('Mentor Expertise', 'mentor-expertise', 'Areas of mentor expertise', 5)
ON CONFLICT (slug) DO NOTHING;

-- Add index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_tags_category_id ON public.tags(category_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tag_categories_updated_at ON public.tag_categories;
CREATE TRIGGER update_tag_categories_updated_at
BEFORE UPDATE ON public.tag_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();