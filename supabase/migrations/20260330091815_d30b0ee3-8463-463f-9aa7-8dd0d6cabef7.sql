
-- ============================================================
-- Contract Intakes: two-phase onboarding with human review gate
-- ============================================================

-- Intake status enum
CREATE TYPE public.intake_status AS ENUM (
  'intake_requested',
  'intake_in_progress',
  'intake_submitted',
  'review_pending',
  'changes_requested',
  'approved_for_signature',
  'rejected'
);

-- Main intakes table
CREATE TABLE public.contract_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_item_id UUID REFERENCES public.funnel_items(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.startup_contracts(id) ON DELETE SET NULL,
  
  -- Status lifecycle
  status public.intake_status NOT NULL DEFAULT 'intake_requested',
  
  -- Company data (submitted by customer)
  organization_name TEXT,
  company_nif TEXT,
  company_address TEXT,
  company_city TEXT,
  company_postal_code TEXT,
  company_country TEXT DEFAULT 'PT',
  iban TEXT,
  
  -- Representative data
  legal_representative_name TEXT,
  legal_representative_email TEXT,
  legal_representative_phone TEXT,
  
  -- Additional info
  billing_email TEXT,
  startup_description TEXT,
  website TEXT,
  
  -- Documents tracking (optional uploads)
  documents_json JSONB DEFAULT '{}',
  missing_documents TEXT[] DEFAULT '{}',
  
  -- Access token for public form
  intake_token TEXT,
  intake_token_expires_at TIMESTAMPTZ,
  
  -- Review gate
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  changes_requested_notes TEXT,
  
  -- Data snapshot (frozen at approval)
  approved_data_snapshot JSONB,
  
  -- Reminders
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INT DEFAULT 0,
  
  -- Ownership
  created_by UUID,
  assigned_to UUID,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail for intake events
CREATE TABLE public.intake_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.contract_intakes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  performed_by UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_contract_intakes_funnel ON public.contract_intakes(funnel_item_id);
CREATE INDEX idx_contract_intakes_contract ON public.contract_intakes(contract_id);
CREATE INDEX idx_contract_intakes_status ON public.contract_intakes(status);
CREATE INDEX idx_contract_intakes_token ON public.contract_intakes(intake_token);
CREATE INDEX idx_intake_events_intake ON public.intake_events(intake_id);

-- Updated_at trigger
CREATE TRIGGER trg_contract_intakes_updated
  BEFORE UPDATE ON public.contract_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.contract_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_events ENABLE ROW LEVEL SECURITY;

-- Staff can do everything on intakes
CREATE POLICY "Staff can manage intakes"
  ON public.contract_intakes FOR ALL TO authenticated
  USING (public.is_staff() OR public.can_access_backoffice())
  WITH CHECK (public.is_staff() OR public.can_access_backoffice());

-- Staff can manage intake events
CREATE POLICY "Staff can manage intake events"
  ON public.intake_events FOR ALL TO authenticated
  USING (public.is_staff() OR public.can_access_backoffice())
  WITH CHECK (public.is_staff() OR public.can_access_backoffice());

-- Enable realtime for intakes
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_intakes;
