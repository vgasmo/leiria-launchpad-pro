-- Funnel Items table for lead/contract/startup pipeline
CREATE TABLE public.funnel_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new', 'first_contact_booked', 'met', 'qualified', 
    'proposal_sent', 'negotiating', 'contracted', 
    'incubating', 'accelerating', 'rejected', 'archived'
  )),
  type TEXT NOT NULL DEFAULT 'lead' CHECK (type IN ('lead', 'contract', 'startup_candidate', 'startup_active')),
  owner_consultant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  organization_name TEXT,
  
  -- Metadata
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Links to other entities
  linked_startup_id UUID REFERENCES public.startups(id) ON DELETE SET NULL,
  linked_workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  linked_contract_id UUID,
  
  -- Program context
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  
  -- Timestamps
  first_contact_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funnel Events table for audit trail
CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_item_id UUID NOT NULL REFERENCES public.funnel_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_item_id UUID REFERENCES public.funnel_items(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'declined', 'expired')),
  contract_type TEXT,
  value_amount NUMERIC,
  value_currency TEXT DEFAULT 'EUR',
  
  start_date DATE,
  end_date DATE,
  
  file_url TEXT,
  signed_at TIMESTAMPTZ,
  signed_by TEXT,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update linked_contract_id FK now that contracts table exists
ALTER TABLE public.funnel_items 
  ADD CONSTRAINT funnel_items_linked_contract_id_fkey 
  FOREIGN KEY (linked_contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.funnel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for funnel_items

-- Admin can see all
CREATE POLICY "Admins can manage all funnel items"
ON public.funnel_items
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Consultants can see assigned items
CREATE POLICY "Consultants can view assigned funnel items"
ON public.funnel_items
FOR SELECT
USING (
  owner_consultant_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

-- Consultants can update assigned items
CREATE POLICY "Consultants can update assigned funnel items"
ON public.funnel_items
FOR UPDATE
USING (
  owner_consultant_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for funnel_events
CREATE POLICY "Staff can view funnel events"
ON public.funnel_events
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

CREATE POLICY "Staff can insert funnel events"
ON public.funnel_events
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

-- RLS Policies for contracts
CREATE POLICY "Admins can manage all contracts"
ON public.contracts
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Staff can view contracts"
ON public.contracts
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'consultor'))
);

CREATE POLICY "Consultants can update own contracts"
ON public.contracts
FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX idx_funnel_items_stage ON public.funnel_items(stage);
CREATE INDEX idx_funnel_items_owner ON public.funnel_items(owner_consultant_id);
CREATE INDEX idx_funnel_items_program ON public.funnel_items(program_id);
CREATE INDEX idx_funnel_events_item ON public.funnel_events(funnel_item_id);
CREATE INDEX idx_contracts_funnel ON public.contracts(funnel_item_id);
CREATE INDEX idx_contracts_workspace ON public.contracts(workspace_id);

-- Trigger for updated_at
CREATE TRIGGER update_funnel_items_updated_at
BEFORE UPDATE ON public.funnel_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();