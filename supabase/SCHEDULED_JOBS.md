# Scheduled Jobs (pg_cron)

This file documents the canonical scheduled jobs for this project.
These jobs are managed via `pg_cron` + `pg_net` in the database.

## run-intake-reminders

- **Schedule**: `0 9 * * *` (daily at 09:00 UTC)
- **Edge Function**: `run-intake-reminders`
- **Auth**: `x-cron-secret` header from `app.settings.cron_secret`
- **Purpose**: Sends automated reminders for:
  1. Intake reminders — intakes pending submission (D+2, D+5, D+10, then weekly)
  2. Signature reminders — intakes pending signature (D+3, D+7, then weekly)
- **Config**: `supabase/config.toml` → `[functions.run-intake-reminders]` with `verify_jwt = false`

### Setup SQL (already applied as cron jobid 7)

```sql
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
```

## run-checkin-reminders-weekly

- **Schedule**: `0 9 * * 1` (Mondays at 09:00 UTC)
- **Edge Function**: `run-checkin-reminders`
- **Auth**: Anon key (Bearer token)
- **Purpose**: Sends weekly check-in reminders to startups
