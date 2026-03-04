

## Plan: Harden db-tests CI Job

### Current State

The `db-tests` job in `.github/workflows/ci.yml` already uses local Supabase (`supabase start` + `supabase test db`). No secrets are required. The structure is correct.

### What Needs Fixing

1. **Missing timeout** — no `timeout-minutes` on the job, so a stuck Docker pull can hang indefinitely
2. **No migration health check** — if `supabase start` applies migrations and fails silently, `supabase test db` runs against a broken schema
3. **pgTAP tests don't cover `startup_claim_requests`** — the new security-critical table with RLS should be verified
4. **No clear failure output** — if migrations fail, the logs don't say which one broke

### Changes

**File: `.github/workflows/ci.yml`** (db-tests job)
- Add `timeout-minutes: 15`
- After `supabase start`, add a step: `supabase db lint` to catch migration issues early
- Add a step to verify migrations applied: `supabase migration list` for clear logs

**File: `supabase/tests/rls_policies.test.sql`**
- Add 2 tests for `startup_claim_requests`: table exists + RLS enabled
- Update plan count from 20 to 22
- Add test for `claim_startup` function existence (plan count to 23)

### Summary of Edits

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Add timeout, migration verification step |
| `supabase/tests/rls_policies.test.sql` | Add `startup_claim_requests` RLS checks, bump plan to 23 |

No secrets are needed. No gates are relaxed. All changes are additive and safe.

