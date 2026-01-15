-- Create buildings table
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT DEFAULT 'Leiria',
  total_area_sqm NUMERIC,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add building_id to office_spaces and rooms
ALTER TABLE public.office_spaces ADD COLUMN building_id UUID REFERENCES public.buildings(id);
ALTER TABLE public.rooms ADD COLUMN building_id UUID REFERENCES public.buildings(id);

-- Add area and pricing fields to incubation_types
ALTER TABLE public.incubation_types ADD COLUMN contract_type TEXT DEFAULT 'standard';
ALTER TABLE public.incubation_types ADD COLUMN price_per_sqm NUMERIC;
ALTER TABLE public.incubation_types ADD COLUMN requires_space BOOLEAN DEFAULT false;
ALTER TABLE public.incubation_types ADD COLUMN is_virtual BOOLEAN DEFAULT false;

-- Add square meters to contracts for area-based pricing
ALTER TABLE public.startup_contracts ADD COLUMN square_meters NUMERIC;
ALTER TABLE public.startup_contracts ADD COLUMN building_id UUID REFERENCES public.buildings(id);
ALTER TABLE public.startup_contracts ADD COLUMN funnel_item_id UUID REFERENCES public.funnel_items(id);

-- Add building_id to space allocations
ALTER TABLE public.space_allocations ADD COLUMN building_id UUID REFERENCES public.buildings(id);

-- Enable RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

-- RLS policies for buildings using existing helper functions
CREATE POLICY "Staff can view buildings" ON public.buildings 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admin/Backoffice can manage buildings" ON public.buildings 
  FOR ALL 
  TO authenticated 
  USING (public.is_backoffice());

-- Insert predefined buildings
INSERT INTO public.buildings (name, code, city, is_active, sort_order) VALUES
  ('Leiria - Sede', 'LEIRIA', 'Leiria', true, 1),
  ('Parceiros', 'PARCEIROS', 'Leiria', true, 2),
  ('Mercado', 'MERCADO', 'Leiria', true, 3),
  ('Incubadora Social', 'SOCIAL', 'Leiria', true, 4),
  ('Alcanena', 'ALCANENA', 'Alcanena', true, 5);

-- Insert predefined incubation types (contract types)
INSERT INTO public.incubation_types (name, description, base_monthly_fee, contract_type, is_virtual, requires_space, is_active, sort_order) VALUES
  ('Domiciliação', 'Fiscal address and mail handling only', 50, 'domiciliation', true, false, true, 1),
  ('Incubação Virtual', 'Remote incubation with mentoring access', 100, 'virtual_incubation', true, false, true, 2),
  ('Desk', 'Dedicated desk in shared space', 150, 'desk', false, true, true, 3),
  ('Hot Desk', 'Flexible shared desk access', 80, 'hot_desk', false, false, true, 4),
  ('Escritório Standard', 'Private office with fixed monthly fee', 300, 'office_standard', false, true, true, 5),
  ('Escritório por m²', 'Private office priced per square meter', 0, 'office_sqm', false, true, true, 6),
  ('Incubadora Social', 'Subsidized space at social incubator', 50, 'social_incubator', false, true, true, 7)
ON CONFLICT DO NOTHING;

-- Update the office_sqm type with price per sqm
UPDATE public.incubation_types 
SET price_per_sqm = 15
WHERE contract_type = 'office_sqm';

-- Create updated_at trigger for buildings
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();