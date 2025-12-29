-- Create table for stage-based default KPIs
CREATE TABLE public.stage_kpi_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage public.startup_stage NOT NULL,
  kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(stage, kpi_definition_id)
);

-- Enable RLS
ALTER TABLE public.stage_kpi_defaults ENABLE ROW LEVEL SECURITY;

-- Everyone can view stage defaults
CREATE POLICY "Everyone can view stage KPI defaults"
ON public.stage_kpi_defaults
FOR SELECT
USING (true);

-- Only admins can manage stage defaults
CREATE POLICY "Admins can manage stage KPI defaults"
ON public.stage_kpi_defaults
FOR ALL
USING (public.is_admin());

-- Insert default KPIs for each stage
-- Ideation stage: focus on leads and conversion
INSERT INTO public.stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
('ideation', 'db2f90ef-6611-40ab-ba82-94d3a654706e', true),  -- Leads (required)
('ideation', '36acf9e0-4ee7-4b9c-8fa5-d92b38bf5d4b', false), -- Conversion Rate
('ideation', '086a2463-39ae-42dd-a20e-12c837c7dd12', false); -- Runway

-- Validation stage: add customers
INSERT INTO public.stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
('validation', 'db2f90ef-6611-40ab-ba82-94d3a654706e', true),  -- Leads
('validation', '36acf9e0-4ee7-4b9c-8fa5-d92b38bf5d4b', true),  -- Conversion Rate (required)
('validation', 'd614ad74-6ef9-4ce8-845d-4c09022c97b5', true),  -- Customers (required)
('validation', '086a2463-39ae-42dd-a20e-12c837c7dd12', false); -- Runway

-- MVP stage: add MRR
INSERT INTO public.stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
('mvp', 'db2f90ef-6611-40ab-ba82-94d3a654706e', false), -- Leads
('mvp', '36acf9e0-4ee7-4b9c-8fa5-d92b38bf5d4b', true),  -- Conversion Rate
('mvp', 'd614ad74-6ef9-4ce8-845d-4c09022c97b5', true),  -- Customers (required)
('mvp', 'ee14573e-ea51-4d78-9e62-c44b8915e9e0', true),  -- MRR (required)
('mvp', '086a2463-39ae-42dd-a20e-12c837c7dd12', true);  -- Runway (required)

-- Growth stage: all financial metrics
INSERT INTO public.stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
('growth', 'd614ad74-6ef9-4ce8-845d-4c09022c97b5', true),  -- Customers
('growth', 'ee14573e-ea51-4d78-9e62-c44b8915e9e0', true),  -- MRR (required)
('growth', '7f86e885-6665-4043-8290-9e8d9b12a3ec', true),  -- Burn (required)
('growth', '086a2463-39ae-42dd-a20e-12c837c7dd12', true),  -- Runway (required)
('growth', '36acf9e0-4ee7-4b9c-8fa5-d92b38bf5d4b', false); -- Conversion Rate

-- Scale stage: focus on financials
INSERT INTO public.stage_kpi_defaults (stage, kpi_definition_id, required) VALUES
('scale', 'd614ad74-6ef9-4ce8-845d-4c09022c97b5', true),  -- Customers
('scale', 'ee14573e-ea51-4d78-9e62-c44b8915e9e0', true),  -- MRR (required)
('scale', '7f86e885-6665-4043-8290-9e8d9b12a3ec', true),  -- Burn (required)
('scale', '086a2463-39ae-42dd-a20e-12c837c7dd12', true);  -- Runway (required)