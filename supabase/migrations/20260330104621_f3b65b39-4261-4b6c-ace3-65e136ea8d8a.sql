-- Drop old constraint and replace with updated one that includes all stages the app uses
ALTER TABLE public.funnel_items DROP CONSTRAINT IF EXISTS funnel_items_stage_check;

ALTER TABLE public.funnel_items ADD CONSTRAINT funnel_items_stage_check CHECK (
  stage = ANY (ARRAY[
    'new'::text,
    'first_contact_booked'::text,
    'met'::text,
    'qualified'::text,
    'proposal_sent'::text,
    'negotiating'::text,
    'intake_requested'::text,
    'intake_filling'::text,
    'intake_submitted'::text,
    'intake_review'::text,
    'intake_changes_requested'::text,
    'approved_for_signature'::text,
    'sent_for_signature'::text,
    'contracted'::text,
    'incubating'::text,
    'accelerating'::text,
    'rejected'::text,
    'archived'::text
  ])
);