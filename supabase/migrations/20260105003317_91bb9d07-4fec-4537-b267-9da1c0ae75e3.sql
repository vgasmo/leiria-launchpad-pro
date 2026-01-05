-- Add new fields to startups table
ALTER TABLE public.startups 
ADD COLUMN IF NOT EXISTS nif TEXT,
ADD COLUMN IF NOT EXISTS main_contact_name TEXT,
ADD COLUMN IF NOT EXISTS main_contact_email TEXT,
ADD COLUMN IF NOT EXISTS main_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS is_legally_recognized BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.startups.nif IS 'Número de Identificação Fiscal (Portuguese tax ID)';
COMMENT ON COLUMN public.startups.main_contact_name IS 'Primary contact person name';
COMMENT ON COLUMN public.startups.main_contact_email IS 'Primary contact email';
COMMENT ON COLUMN public.startups.main_contact_phone IS 'Primary contact phone';
COMMENT ON COLUMN public.startups.is_legally_recognized IS 'Startup recognized by law (Estatuto PME/Startup)';