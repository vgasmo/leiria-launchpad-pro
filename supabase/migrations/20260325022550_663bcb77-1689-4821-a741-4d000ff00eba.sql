
-- Versioned pricing table (regulation source-of-truth)
CREATE TABLE IF NOT EXISTS public.pricing_table_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code text NOT NULL UNIQUE,
  effective_date date NOT NULL,
  approved_by text DEFAULT NULL,
  regulation_reference text DEFAULT NULL,
  notes text DEFAULT NULL,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_table_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage pricing versions" ON public.pricing_table_versions
  FOR ALL TO authenticated USING (public.is_staff() OR public.is_backoffice());

-- Pricing line items for each version
CREATE TABLE IF NOT EXISTS public.pricing_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_version_id uuid REFERENCES public.pricing_table_versions(id) ON DELETE CASCADE NOT NULL,
  designation text NOT NULL,
  services_description text DEFAULT NULL,
  location_type text DEFAULT NULL,
  area_sqm integer DEFAULT NULL,
  startup_monthly_fee numeric(10,2) NOT NULL DEFAULT 0,
  non_startup_monthly_fee numeric(10,2) DEFAULT NULL,
  startup_annual_increase_pct numeric(5,2) DEFAULT NULL,
  non_startup_annual_increase_pct numeric(5,2) DEFAULT NULL,
  is_per_sqm boolean DEFAULT false,
  max_duration_months integer DEFAULT NULL,
  is_post_incubation boolean DEFAULT false,
  billing_frequency text DEFAULT 'monthly',
  incubation_type_id uuid REFERENCES public.incubation_types(id) DEFAULT NULL,
  sort_order integer DEFAULT 0,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pricing_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage pricing lines" ON public.pricing_lines
  FOR ALL TO authenticated USING (public.is_staff() OR public.is_backoffice());

-- Complementary services table
CREATE TABLE IF NOT EXISTS public.complementary_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_version_id uuid REFERENCES public.pricing_table_versions(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  description text DEFAULT NULL,
  unit text DEFAULT NULL,
  unit_price numeric(10,4) DEFAULT NULL,
  is_included boolean DEFAULT false,
  notes text DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.complementary_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage complementary services" ON public.complementary_services
  FOR ALL TO authenticated USING (public.is_staff() OR public.is_backoffice());

-- Contract lifecycle events
CREATE TABLE IF NOT EXISTS public.contract_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.startup_contracts(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  details jsonb DEFAULT '{}',
  performed_by uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage lifecycle events" ON public.contract_lifecycle_events
  FOR ALL TO authenticated USING (public.is_staff() OR public.is_backoffice());

-- Contract notices (price reviews, communications)
CREATE TABLE IF NOT EXISTS public.contract_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.startup_contracts(id) ON DELETE CASCADE NOT NULL,
  notice_type text NOT NULL,
  sent_date date DEFAULT NULL,
  response_deadline date DEFAULT NULL,
  response_received_date date DEFAULT NULL,
  response_status text DEFAULT 'pending',
  details jsonb DEFAULT '{}',
  created_by uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contract_notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage notices" ON public.contract_notices
  FOR ALL TO authenticated USING (public.is_staff() OR public.is_backoffice());

-- Add missing columns to startup_contracts
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS pricing_version_id uuid REFERENCES public.pricing_table_versions(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pricing_line_id uuid REFERENCES public.pricing_lines(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS incubation_year integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_post_incubation boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS termination_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS termination_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS termination_notice_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'direct_debit',
  ADD COLUMN IF NOT EXISTS iban text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_price_review_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_price_review_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS startup_category text DEFAULT 'startup',
  ADD COLUMN IF NOT EXISTS is_associate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_startup_portugal_status boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_template_version text DEFAULT NULL;

-- Enable realtime for lifecycle events
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_lifecycle_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_notices;
