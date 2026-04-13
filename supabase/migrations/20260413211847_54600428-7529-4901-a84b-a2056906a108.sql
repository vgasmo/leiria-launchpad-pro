
-- Discard the broken draft that has wrong program_type
UPDATE public.program_setup_drafts 
SET status = 'discarded', updated_at = now()
WHERE id = 'c7da3588-d2c9-4f40-ba65-ff2fc1826913';
