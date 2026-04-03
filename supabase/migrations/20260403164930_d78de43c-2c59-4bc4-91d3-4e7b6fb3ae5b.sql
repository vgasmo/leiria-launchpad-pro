
-- Fix: Remove notifications from Realtime publication
-- (DROP TABLE IF EXISTS not supported, use DROP TABLE)
DO $$
BEGIN
  -- Check if the table is in the publication before trying to drop
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END $$;
