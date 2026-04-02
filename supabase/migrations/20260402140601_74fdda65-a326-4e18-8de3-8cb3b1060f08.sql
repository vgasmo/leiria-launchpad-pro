ALTER TABLE public.startup_contracts 
ADD COLUMN IF NOT EXISTS signature_proof_json jsonb;

COMMENT ON COLUMN public.startup_contracts.signature_proof_json IS 
'Legal proof of electronic signature: typed name, IP hash, timestamp, user agent, eIDAS acceptance';