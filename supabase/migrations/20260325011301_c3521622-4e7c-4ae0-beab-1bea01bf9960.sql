-- Add deal/commercial fields to funnel_items for HubSpot-replacement pipeline
ALTER TABLE public.funnel_items
  ADD COLUMN IF NOT EXISTS deal_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deal_currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS expected_close_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS win_probability integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loss_reason text DEFAULT NULL;

-- Add default win probabilities per stage via a comment (used in app logic)
COMMENT ON COLUMN public.funnel_items.win_probability IS 'Win probability 0-100. Defaults by stage: new=5, first_contact_booked=10, met=20, qualified=40, proposal_sent=60, negotiating=75, contracted=95';
COMMENT ON COLUMN public.funnel_items.deal_value IS 'Expected deal value in deal_currency';
COMMENT ON COLUMN public.funnel_items.expected_close_date IS 'Expected close date for forecasting';