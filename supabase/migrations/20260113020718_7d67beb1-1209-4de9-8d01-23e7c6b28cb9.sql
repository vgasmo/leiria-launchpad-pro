-- Intake Routing System
-- Admin can configure which consultant calendar is used for first-contact bookings

-- Create intake_routing table
CREATE TABLE IF NOT EXISTS public.intake_routing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'program')),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'single' CHECK (mode IN ('single', 'round_robin', 'per_program')),
  consultant_ids UUID[] NOT NULL DEFAULT '{}',
  round_robin_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure only one global routing config
  CONSTRAINT unique_global_routing UNIQUE (scope, program_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.intake_routing IS 'Admin configuration for first-contact booking consultant assignment';
COMMENT ON COLUMN public.intake_routing.mode IS 'single: one consultant for all; round_robin: rotate among list; per_program: use program-specific routing';
COMMENT ON COLUMN public.intake_routing.consultant_ids IS 'Array of consultant user IDs for assignment';
COMMENT ON COLUMN public.intake_routing.round_robin_index IS 'Current position in round robin rotation';

-- Enable RLS
ALTER TABLE public.intake_routing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage intake routing" 
ON public.intake_routing 
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can view intake routing" 
ON public.intake_routing 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'consultor'));

-- Update public_booking_links to reference intake_routing
ALTER TABLE public.public_booking_links 
ADD COLUMN IF NOT EXISTS intake_route_id UUID REFERENCES public.intake_routing(id) ON DELETE SET NULL;

-- Function to get next consultant from round robin
CREATE OR REPLACE FUNCTION public.get_next_intake_consultant(p_route_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_ids UUID[];
  v_current_index INTEGER;
  v_next_index INTEGER;
  v_consultant_id UUID;
BEGIN
  -- Get routing config
  SELECT consultant_ids, round_robin_index
  INTO v_consultant_ids, v_current_index
  FROM intake_routing
  WHERE id = p_route_id AND active = true;
  
  IF v_consultant_ids IS NULL OR array_length(v_consultant_ids, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Get consultant at current index
  v_next_index := v_current_index % array_length(v_consultant_ids, 1);
  v_consultant_id := v_consultant_ids[v_next_index + 1]; -- PostgreSQL arrays are 1-indexed
  
  -- Increment index for next time
  UPDATE intake_routing
  SET round_robin_index = v_next_index + 1,
      updated_at = now()
  WHERE id = p_route_id;
  
  RETURN v_consultant_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_intake_routing_updated_at
BEFORE UPDATE ON public.intake_routing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default global routing with first consultant
INSERT INTO public.intake_routing (scope, mode, consultant_ids)
SELECT 'global', 'single', ARRAY[user_id]
FROM user_roles
WHERE role = 'consultor'
LIMIT 1
ON CONFLICT DO NOTHING;