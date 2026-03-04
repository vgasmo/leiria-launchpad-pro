# GO-LIVE CHECKLIST — 2026-03-04

## Architecture Overview

The launch uses a **two-phase approach** via the `open_registration` feature flag:

| Phase | Flag State | Behaviour |
|-------|-----------|-----------|
| **Prelaunch** | `OFF` (default) | Only emails/domains in `signup_allowlist` can register |
| **Live** | `ON` | Open registration; claim flow + pending approval still enforced |

### Security Layers (always active)

1. Account status defaults to `pending` → staff approves via PendingUsersManager
2. Workspace access gated by `has_active_workspace_access` (only `active`/`claimed`)
3. `imported_unclaimed` workspaces invisible to non-staff
4. Claim flow at `/claim-startup` for founder↔startup association

---

## PRE-FLIGHT (before sending the link)

- [ ] **CI green on `main`** — all jobs: lint-and-build, db-tests, test, e2e
- [ ] **Production domain in Auth redirect URLs**
  - Lovable Cloud → Auth Settings → Redirect URLs
  - Must include: `https://leiria-launchpad-pro.lovable.app`
- [ ] **Feature flag `open_registration` = OFF** (prelaunch mode)
- [ ] **Allowlist seeded** with founder emails from HubSpot import + `@startupleiria.com` domain
- [ ] **Imported workspaces** status = `imported_unclaimed`
- [ ] **Publish latest build** to production

---

## SMOKE TESTS (5 min each)

- [ ] **Staff login** → sees all workspaces + claim queue in Staff Cockpit
- [ ] **Founder signup (allowlisted email)** → pending approval → approve → claim → workspace visible
- [ ] **Founder signup (non-allowlisted email)** → blocked with "invite-only" message
- [ ] **Founder login** → only sees own workspace, not others'
- [ ] **Mentor login** → NDA gate → only assigned workspaces visible

---

## GO LIVE

- [ ] Send link to founders: `https://leiria-launchpad-pro.lovable.app`
- [ ] Monitor claim queue in **Staff Cockpit → Associações** tab
- [ ] Watch for errors in Lovable Cloud → Edge Function logs

---

## POST-LAUNCH (when ready for open registration)

- [ ] Set `open_registration` flag to **ON** via Admin → Feature Flags
- [ ] All new signups go through: signup → pending → approve → claim
- [ ] Optionally add more emails/domains to `signup_allowlist` for targeted invites

---

## ROLLBACK PROCEDURES

| Scenario | Action |
|----------|--------|
| **Critical bug** | Set `open_registration` OFF. Remove entries from `signup_allowlist` if needed. |
| **Data leak suspected** | Verify RLS — `imported_unclaimed` workspaces hidden from non-staff. Check `has_active_workspace_access`. |
| **Claim flow broken** | Staff can manually link users via Staff Cockpit → Associações tab. |
| **Need to block all signups** | Set `open_registration` OFF and clear `signup_allowlist` table. |

---

## Key Database Objects

| Object | Purpose |
|--------|---------|
| `feature_flags` row `open_registration` | Master toggle for prelaunch vs live |
| `signup_allowlist` table | Email/domain allowlist for prelaunch |
| `check_signup_allowed(p_email)` RPC | Server-side allowlist check (SECURITY DEFINER) |
| `startup_claim_requests` table | Claim queue for founder↔startup association |
| `claim_startup()` RPC | Auto-claim by email match or queue for staff review |
