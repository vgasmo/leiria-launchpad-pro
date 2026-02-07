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

### One-Command Release Check

```bash
# Make executable (first time only — already committed with +x)
chmod +x scripts/release-check.sh

# Run all local checks (lint, typecheck, build, vitest, i18n, secrets)
bash scripts/release-check.sh
```

> **Note on executable bit**: The script is committed with `+x` permission.
> If `./scripts/release-check.sh` fails with "Permission denied" on a fresh clone,
> run `chmod +x scripts/release-check.sh` or simply use `bash scripts/release-check.sh`.

### Individual Steps

```bash
# 1. Lint (errors only — warnings are acceptable)
npm run lint

# 2. Typecheck
npx tsc --noEmit -p tsconfig.typecheck.json

# 3. Build
npm run build

# 4. Unit/Integration tests
npx vitest run

# 5. i18n parity check (0 missing keys, 0 empty values)
node scripts/i18n-check.cjs
# To fix issues: node scripts/i18n-sync.cjs

# 6. Secret leak scan
node scripts/secret-scan.cjs

# 7. Playwright E2E (requires credentials)
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

# 8. pgTAP DB tests (requires Supabase CLI + linked project)
supabase test db
```

### Strict Lint (future hardening)

```bash
# Strict mode treats `any` as an error — use for progressive cleanup
npm run lint:strict
```

## E2E Credential Setup

Create test accounts for each role in your staging environment:
- **Consultant**: A user with `consultor` role
- **Founder**: A user with `founder` role and an active workspace
- **Mentor**: A user with `mentor_externo` role
- **Admin**: A user with `admin` role

**Seed Data Requirement:**
The E2E tests require at least one "Lead" in the CRM for the consultant flow.

Set the credentials as GitHub repository secrets:
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
6. ✅ Confirm no new backend linter warnings

## ESLint Progressive Strictness

The project uses a "progressive strictness" approach:
- `npm run lint` — production gate; `@typescript-eslint/no-explicit-any` is `"warn"`
- `npm run lint:strict` — future target; `any` is `"error"` (not yet enforced in CI)
- E2E tests (`e2e/`) and edge functions (`supabase/functions/`) have relaxed rules

## Notes

- Playwright tests **skip gracefully** if E2E credentials are not configured locally, but **FAIL** in CI on main
- pgTAP tests run against the connected database; use `supabase test db` locally
- The i18n parity script has **zero tolerance** — every key must exist in both locales
- The secret scan checks Git-tracked files only; `.env` is ignored (not tracked)
