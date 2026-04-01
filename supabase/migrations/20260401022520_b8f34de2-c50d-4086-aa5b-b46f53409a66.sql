-- Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.contract_intakes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.communication_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contract_notices;
ALTER PUBLICATION supabase_realtime DROP TABLE public.contract_lifecycle_events;