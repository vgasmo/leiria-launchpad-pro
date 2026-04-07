-- Drop legacy FK to contracts table
ALTER TABLE public.funnel_items
  DROP CONSTRAINT IF EXISTS funnel_items_linked_contract_id_fkey;

-- Add new FK to startup_contracts (the canonical contract table)
ALTER TABLE public.funnel_items
  ADD CONSTRAINT funnel_items_linked_contract_id_fkey
  FOREIGN KEY (linked_contract_id) REFERENCES public.startup_contracts(id)
  ON DELETE SET NULL;