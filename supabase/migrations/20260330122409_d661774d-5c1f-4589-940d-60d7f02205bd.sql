
-- Defensive: remove any existing job with this name to avoid duplicates
DO $$
BEGIN
  PERFORM cron.unschedule('run-intake-reminders');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist yet, that's fine
  NULL;
END;
$$;

-- Schedule canonical intake reminders job: daily at 09:00 UTC
SELECT cron.schedule(
  'run-intake-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/run-intake-reminders',
    headers := ('{"Content-Type": "application/json", "x-cron-secret": "' || current_setting('app.settings.cron_secret', true) || '"}')::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
