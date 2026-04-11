
-- Defensive: remove any existing jobs to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('archive-contracts-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('run-ecosystem-snapshot-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Schedule canonical archive job: daily at 02:00 UTC
SELECT cron.schedule(
  'archive-contracts-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/archive-contracts-to-sharepoint',
    headers := ('{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.settings.cron_secret', true) || '"}')::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule canonical ecosystem snapshot job: daily at 03:00 UTC
SELECT cron.schedule(
  'run-ecosystem-snapshot-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/run-ecosystem-snapshot',
    headers := ('{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.settings.cron_secret', true) || '"}')::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
