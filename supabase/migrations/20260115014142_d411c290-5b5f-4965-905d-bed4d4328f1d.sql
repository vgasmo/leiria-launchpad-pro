-- ============================================
-- INCUBATION TYPES / SERVICE PACKAGES
-- ============================================
CREATE TABLE public.incubation_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_monthly_fee NUMERIC(10,2) DEFAULT 0,
  base_currency TEXT DEFAULT 'EUR',
  duration_months INTEGER,
  includes_office_space BOOLEAN DEFAULT false,
  includes_mentoring_hours INTEGER DEFAULT 0,
  includes_meeting_room_hours INTEGER DEFAULT 0,
  equity_percentage NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incubation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view incubation types" ON public.incubation_types
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin can manage incubation types" ON public.incubation_types
  FOR ALL USING (public.is_admin());

-- ============================================
-- CONTRACTS (linked to workspaces)
-- ============================================
CREATE TABLE public.startup_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  incubation_type_id UUID REFERENCES public.incubation_types(id) ON DELETE SET NULL,
  contract_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE,
  signed_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  monthly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  discount_reason TEXT,
  discount_applied_by UUID REFERENCES auth.users(id),
  equity_percentage NUMERIC(5,2),
  billing_day INTEGER DEFAULT 1 CHECK (billing_day >= 1 AND billing_day <= 28),
  payment_terms_days INTEGER DEFAULT 30,
  notes TEXT,
  document_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.startup_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View contracts" ON public.startup_contracts
  FOR SELECT USING (public.is_staff() OR public.has_workspace_access(workspace_id));

CREATE POLICY "Manage contracts" ON public.startup_contracts
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.startup_contracts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 23,
  tax_amount NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  line_items JSONB DEFAULT '[]'::jsonb,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View invoices" ON public.invoices
  FOR SELECT USING (public.is_staff() OR public.has_workspace_access(workspace_id));

CREATE POLICY "Manage invoices" ON public.invoices
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

CREATE INDEX idx_invoices_workspace ON public.invoices(workspace_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View payments" ON public.payments
  FOR SELECT USING (public.is_staff() OR public.has_workspace_access(workspace_id));

CREATE POLICY "Manage payments" ON public.payments
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

-- ============================================
-- OFFICE SPACES
-- ============================================
CREATE TABLE public.office_spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('desk', 'private_office', 'meeting_room', 'hot_desk')),
  floor TEXT,
  capacity INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  monthly_cost NUMERIC(10,2) DEFAULT 0,
  amenities JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.office_spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view office spaces" ON public.office_spaces
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin/backoffice can manage office spaces" ON public.office_spaces
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

-- ============================================
-- SPACE ALLOCATIONS
-- ============================================
CREATE TABLE public.space_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_space_id UUID NOT NULL REFERENCES public.office_spaces(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_cost_override NUMERIC(10,2),
  notes TEXT,
  allocated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.space_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View space allocations" ON public.space_allocations
  FOR SELECT USING (public.is_staff() OR public.has_workspace_access(workspace_id));

CREATE POLICY "Manage space allocations" ON public.space_allocations
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

-- ============================================
-- CONTRACT REMINDERS
-- ============================================
CREATE TABLE public.contract_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.startup_contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('anniversary', 'renewal', 'expiry')),
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reminders" ON public.contract_reminders
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Admin/backoffice can manage reminders" ON public.contract_reminders
  FOR ALL USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'backoffice'
    )
  );

CREATE INDEX idx_contract_reminders_pending ON public.contract_reminders(scheduled_date) WHERE sent_at IS NULL;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_backoffice()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'backoffice'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_backoffice()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'backoffice')
  )
$$;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_incubation_types_updated_at
  BEFORE UPDATE ON public.incubation_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_startup_contracts_updated_at
  BEFORE UPDATE ON public.startup_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_office_spaces_updated_at
  BEFORE UPDATE ON public.office_spaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_space_allocations_updated_at
  BEFORE UPDATE ON public.space_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();