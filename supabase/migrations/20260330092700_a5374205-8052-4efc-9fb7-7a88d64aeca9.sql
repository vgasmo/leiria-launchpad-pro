
-- Add new intake_status enum values for complete lifecycle
ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'draft_internal';
ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'signature_sent';
ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'signed';
ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'activated';
ALTER TYPE public.intake_status ADD VALUE IF NOT EXISTS 'cancelled';
