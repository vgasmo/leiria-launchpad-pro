
-- Fix migration drift: Create investor_update_templates and investor_readiness_items
-- These tables are referenced in RLS policies (migration 20260115005921) but were never created.

CREATE TABLE IF NOT EXISTS public.investor_update_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    audience text NOT NULL DEFAULT 'investors',
    sections_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investor_readiness_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text NOT NULL,
    stage text NOT NULL,
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.investor_update_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_readiness_items ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for investor_update_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_investor_update_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_investor_update_templates_updated_at
        BEFORE UPDATE ON public.investor_update_templates
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
