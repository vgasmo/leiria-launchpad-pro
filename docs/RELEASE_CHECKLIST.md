# Release Hardening Checklist

All gates must pass before any release is considered shippable.

## CI Gates (automated — GitHub Actions)

| # | Gate | Job | Fails on |
|---|------|-----|----------|
| 1 | **Lint + Typecheck + Build** | `lint-and-build` | Any ESLint error, TS error, or build failure |
| 2 | **Vitest Unit/Integration** | `test` | Any test failure |
| 3 | **i18n Key Parity** | `i18n-check` | Missing or empty keys between `en.json` / `pt.json` |
| 4 | **i18n Runtime Gate** | `test` (vitest) | EN↔PT key drift exceeds 5% threshold |
| 5 | **Secret Leak Scan** | `secret-scan` | Hardcoded secrets found in tracked files |
| 6 | **Playwright E2E (4 roles)** | `e2e` | Any E2E flow failure |
| 7 | **Navigation Gate** | `e2e` | 404, blank screen, or console error on any route |
| 8 | **Permission Gate** | `e2e` | Unauthorized user can access restricted routes |
| 9 | **Accessibility Smoke** | `e2e` | Critical WCAG 2 AA violations |
| 10 | **pgTAP DB Tests** | `db-tests` | RLS disabled, missing functions, secrets in DB |

## Running Locally

```bash
# 1. Lint + Typecheck + Build
npm run lint
npx tsc --noEmit -p tsconfig.typecheck.json
npm run build

# 2. Unit/Integration tests
npx vitest run --reporter=verbose

# 3. i18n parity check
node scripts/i18n-check.cjs

# 4. Secret leak scan
node scripts/secret-scan.cjs

# 5. Playwright E2E (requires credentials in .env or env vars)
export E2E_CONSULTANT_EMAIL=...
export E2E_CONSULTANT_PASSWORD=...
export E2E_FOUNDER_EMAIL=...
export E2E_FOUNDER_PASSWORD=...
export E2E_MENTOR_EMAIL=...
export E2E_MENTOR_PASSWORD=...
export E2E_ADMIN_EMAIL=...
export E2E_ADMIN_PASSWORD=...
npx playwright install --with-deps chromium
npx playwright test

# 6. pgTAP DB tests (requires Supabase CLI)
supabase test db
```

## E2E Credential Setup

Create test accounts for each role in your staging environment:
- **Consultant**: A user with `consultor` role
- **Founder**: A user with `founder` role and an active workspace
- **Mentor**: A user with `mentor` role
- **Admin**: A user with `admin` role

Set the credentials as repository secrets in GitHub:
- `E2E_CONSULTANT_EMAIL` / `E2E_CONSULTANT_PASSWORD`
- `E2E_FOUNDER_EMAIL` / `E2E_FOUNDER_PASSWORD`
- `E2E_MENTOR_EMAIL` / `E2E_MENTOR_PASSWORD`
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`

## Pre-release Verification

1. ✅ All CI gates green on `main`
2. ✅ Manual smoke test on staging with each role
3. ✅ Verify translations read naturally in both EN and PT
4. ✅ Check Playwright HTML report for visual regressions
5. ✅ Review audit log for unexpected entries
6. ✅ Confirm no new Supabase linter warnings

## Notes

- Playwright tests **skip gracefully** if E2E credentials are not configured
- pgTAP tests run against the connected database; use `supabase test db` locally
- The i18n parity script has **zero tolerance** — every key must exist in both locales
- The secret scan checks Git-tracked files only; `.env` is ignored (not tracked)
