
-- Table for period-based discounts on contracts
CREATE TABLE public.contract_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.startup_contracts(id) ON DELETE CASCADE,
  discount_percentage numeric NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  start_date date NOT NULL,
  end_date date,
  reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_contract_discounts_contract ON public.contract_discounts(contract_id);
CREATE INDEX idx_contract_discounts_active ON public.contract_discounts(contract_id, start_date, end_date);

-- RLS
ALTER TABLE public.contract_discounts ENABLE ROW LEVEL SECURITY;

-- Staff can manage discounts
CREATE POLICY "Staff can manage contract discounts"
  ON public.contract_discounts
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Founders can view their own contract discounts
CREATE POLICY "Founders can view own contract discounts"
  ON public.contract_discounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.startup_contracts sc
      JOIN public.workspace_users wu ON wu.workspace_id = sc.workspace_id
      WHERE sc.id = contract_discounts.contract_id
        AND wu.user_id = auth.uid()
        AND wu.active = true
    )
  );

-- Backoffice can view
CREATE POLICY "Backoffice can view contract discounts"
  ON public.contract_discounts
  FOR SELECT
  TO authenticated
  USING (public.can_access_backoffice());

-- Updated_at trigger
CREATE TRIGGER update_contract_discounts_updated_at
  BEFORE UPDATE ON public.contract_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
