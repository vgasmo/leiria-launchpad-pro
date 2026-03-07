# Release Hardening Notes — V1 Launch

**Date:** 2026-03-07  
**Scope:** Launch hardening pass for Startup Leiria Ecosystem OS V1

---

## What Changed

### P0.1 — Claim-First Founder Onboarding
- **FounderDashboard** empty state now directs founders to `/claim-startup` as primary CTA ("Verificar a Minha Startup")
- "Create Startup" is demoted to a small secondary link below the fold
- **MyWorkspaces** header button for founders with no workspace now navigates to `/claim-startup` instead of opening CreateStartupDialog
- **WorkspaceEmptyState** (list view fallback) now shows "Verificar a Minha Startup" instead of "Criar a Tua Startup"
- All copy communicates invite-only platform and claim-first expectations

### P0.2 — Cache/Session Hygiene
- `signOut()` now explicitly clears `sl-query-cache` and `sl-cache-uid` from localStorage
- Also clears founder-specific localStorage keys (`quickkpi-dismissed-*`, `founder_*`)
- Auth state listener detects user-switch (different UID) and clears persisted cache
- `gcTime` reduced from 24h to 4h to limit stale data window
- `CACHE_MAX_AGE` reduced from 24h to 4h
- Persisted cache explicitly excludes `user-roles`, `user_roles`, `mentor-nda` query keys

### P0.3 — Query Performance Tightening
- `useWorkspaces`: replaced `select('*')` with explicit column list on `workspaces` table
- `useWorkspace`: replaced `select('*, startup:startups(*), program:programs(*)')` with explicit columns
- Both hooks now request only fields used by the UI, reducing payload size

### P1.1 — Observability
- Auth context logs user-switch events for debugging
- Structured cache key naming (`sl-query-cache`, `sl-cache-uid`) for easier support diagnosis

### P1.2 — Database Indexes
- `idx_startups_main_contact_email_lower` — accelerates claim matching by email
- `idx_signup_allowlist_email_lower` — accelerates signup allowlist check
- `idx_signup_allowlist_domain_lower` — accelerates domain-based allowlist check
- `idx_startup_claim_requests_user_status` — accelerates pending claim lookup
- `idx_workspaces_status` — accelerates workspace status filtering

### P1.3 — Edge Function Stability
- All 7 edge functions using `resend` switched from `esm.sh` to `npm:` specifier to fix `domhandler` parse error

---

## Risks Mitigated
- **Duplicate startup creation**: founders are no longer encouraged to create new startups as their first action
- **Cross-session data leakage**: logout and user-switch now clear persisted cache
- **Over-fetching**: heaviest workspace queries no longer use `SELECT *`
- **Edge function deploy failures**: `domhandler` parse error resolved

## Risks Intentionally Deferred to V2
- Full server-side pagination for workspace list (currently client-side with PAGE_SIZE=15)
- Search-as-you-type debounced server-side filtering
- Sentry/structured logging integration
- CRM list view pagination (already paginated but uses broad queries)
- Full audit of all `select('*')` across all hooks (only highest-impact fixed)
- Auto-redirect from `/my-workspaces` to `/claim-startup` for founders (currently handled by FounderDashboard UX, not a hard redirect)

## Manual Validation Checklist
- [ ] Sign up as new founder (allowlisted) → should see "Verificar a Minha Startup" as primary CTA
- [ ] Click verify → claim flow runs, shows correct status (auto_claimed / pending / error)
- [ ] "Create new startup" link visible but secondary (below fold)
- [ ] Log out → check localStorage: `sl-query-cache` should be cleared
- [ ] Log in as different user → verify no stale data from previous user
- [ ] Workspace list loads correctly with explicit column select
- [ ] Workspace detail page loads all tabs correctly
- [ ] CI remains green
- [ ] Edge functions deploy successfully (no domhandler error)

## What to Monitor First Week
- Claim success rate vs pending rate (check `startup_claim_requests` table)
- Any founder complaints about "can't find my startup"
- Edge function invocation errors in logs
- React Query cache size in production (should be smaller with 4h TTL)
