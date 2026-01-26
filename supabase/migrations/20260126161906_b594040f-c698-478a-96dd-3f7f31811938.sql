-- ============================================
-- P1: Add shape columns to rooms table for polygon/rect areas
-- Backwards compatible: pins continue to work (shape_type defaults to 'pin')
-- ============================================

-- Add shape columns to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS shape_type TEXT DEFAULT 'pin' CHECK (shape_type IN ('pin', 'rect', 'polygon'));
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS shape_json JSONB;

COMMENT ON COLUMN public.rooms.shape_type IS 'Type of shape for floor map display: pin (default), rect, or polygon';
COMMENT ON COLUMN public.rooms.shape_json IS 'JSON defining the shape. For rect: {x, y, w, h} (percentages). For polygon: {points: [{x,y},...]} (percentages)';

-- ============================================
-- CRM Stage Email Automation: Rules table
-- ============================================

CREATE TABLE IF NOT EXISTS public.crm_stage_email_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  from_email TEXT DEFAULT 'Startup Leiria <noreply@startupleiria.com>',
  reply_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.crm_stage_email_rules ENABLE ROW LEVEL SECURITY;

-- Staff can view email rules (admins and consultors)
CREATE POLICY "Staff can view email rules"
  ON public.crm_stage_email_rules FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'consultor')
  );

-- Admin can manage email rules
CREATE POLICY "Admin can manage email rules"
  ON public.crm_stage_email_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CRM Stage Email Log: Track sent emails for idempotency
-- ============================================

CREATE TABLE IF NOT EXISTS public.crm_stage_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_item_id UUID NOT NULL REFERENCES public.funnel_items(id) ON DELETE CASCADE,
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  rule_id UUID REFERENCES public.crm_stage_email_rules(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Idempotency constraint: prevent duplicate emails for same transition + rule
  UNIQUE(funnel_item_id, from_stage, to_stage, rule_id)
);

-- Enable RLS
ALTER TABLE public.crm_stage_email_log ENABLE ROW LEVEL SECURITY;

-- Staff can view logs
CREATE POLICY "Staff can view email logs"
  ON public.crm_stage_email_log FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'consultor')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_stage_email_rules_stages ON public.crm_stage_email_rules(from_stage, to_stage) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_crm_stage_email_log_funnel ON public.crm_stage_email_log(funnel_item_id);
CREATE INDEX IF NOT EXISTS idx_crm_stage_email_log_status ON public.crm_stage_email_log(status) WHERE status = 'queued';

-- Update timestamp trigger for rules
CREATE OR REPLACE FUNCTION update_crm_stage_email_rules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_stage_email_rules_updated ON public.crm_stage_email_rules;
CREATE TRIGGER trg_crm_stage_email_rules_updated
  BEFORE UPDATE ON public.crm_stage_email_rules
  FOR EACH ROW EXECUTE FUNCTION update_crm_stage_email_rules_timestamp();