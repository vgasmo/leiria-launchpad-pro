# Release Hardening Notes — V1 Launch

**Date:** 2026-03-07  
**Scope:** Launch hardening passes for Startup Leiria Ecosystem OS V1

---

## Engineering Hardening Pass 2

### Cache & Session Safety (P0)
- **Deferred cache hydration**: Cache is no longer restored at boot before auth is confirmed. `hydrateCache()` is called only after `getSession()` or `onAuthStateChange` confirms user identity.
- **Allowlist-based persistence**: Replaced blacklist (exclude a few sensitive keys) with strict allowlist. Only `programs`, `feature-flags`, and `tags` are persisted. All operational data (workspaces, CRM, admin, roles, founder state) is now ephemeral.
- **Centralized session reset**: `src/lib/sessionReset.ts` is the single reset function for logout, user-switch, and cache mismatch. Clears persisted cache, in-memory query cache, user-specific localStorage, and sessionStorage.
- **User-switch detection**: Different user login on same browser fully clears previous cache before hydrating.

### Canonical Founder Flow (P0)
- **FounderDashboard simplified**: Removed duplicated pending-claim and empty-workspace rendering. Route-level gate in `ProtectedRoute` handles all pre-workspace states. `FounderDashboard` only renders when founder has an active workspace.
- **Single onboarding contract**: `/claim-startup` is the canonical hub. Dashboard no longer competes as alternative onboarding surface.

### Query Performance (P1)
- `useActionItems`: explicit 15-column select (was `select('*')`)
- `useSessions`: explicit 22-column select
- `useNotifications`: explicit 11-column select
- `useFunnel`: explicit 22-column select
- `AuthContext.fetchUserData`: explicit column select for profiles

### Structured Logging (P1)
- `src/lib/logger.ts`: structured event logging with levels (debug/info/warn/error)
- Integrated into AuthContext, ClaimStartup, sessionReset
- Ready for Sentry integration via `emit()` function

---

## Engineering Hardening Pass 1

### Claim-First Founder Onboarding (P0.1)
- `useFounderOnboardingState` hook — single read-only source of truth
- `ProtectedRoute` enforces claim-first at route level
- `ClaimStartup` redesigned with explicit state machine (no auto-RPC on mount)
- "Create Startup" removed from primary surfaces
- Copy unified: "Reclamar" → "Verificar" across PT/EN

### Cache/Session Hygiene (P0.2)
- `signOut()` clears `sl-query-cache` and `sl-cache-uid`
- Auth listener detects user-switch and clears cache
- `gcTime` and `CACHE_MAX_AGE` reduced from 24h to 4h
- Sensitive query keys excluded from persistence

### Query Performance (P0.3)
- `useWorkspaces`: explicit column list (was `select('*')`)

### Database Indexes (P1.2)
- `idx_startups_main_contact_email_lower`
- `idx_signup_allowlist_email_lower` / `idx_signup_allowlist_domain_lower`
- `idx_startup_claim_requests_user_status`
- `idx_workspaces_status`

### Edge Function Stability (P1.3)
- All 7 `resend` edge functions switched from `esm.sh` to `npm:` specifier

---

## Risks Mitigated
- Cross-user cache leakage on shared browsers
- Blind cache hydration before auth verification
- Stale operational data persisted by default
- Duplicate startup creation as default founder path
- Over-fetching in high-traffic hooks
- Silent auth/claim failures
- Edge function deploy errors (domhandler)

## Risks Deferred to V2
- ~50 hooks still use `select('*')` (lower-traffic paths)
- Server-side pagination for most list views
- Full Sentry/APM integration
- Server-side search/filter for CRM/admin
- Rate limiting on client-side claim retries
- Staff claim review UX improvements

## Manual Validation Checklist
- [ ] Login as founder without workspace → redirected to /claim-startup
- [ ] Complete claim → redirected to workspace
- [ ] Pending claim → /claim-startup shows pending state
- [ ] Logout → localStorage has no `sl-query-cache` or `sl-cache-uid`
- [ ] Login as different user → no stale data from previous user
- [ ] Staff/admin login → normal dashboard, no claim redirect
- [ ] Mentor login → normal dashboard, NDA gate works
- [ ] Console shows structured `[SL]` log events on auth failures
- [ ] Edge functions deploy successfully
- [ ] CI remains green

## What to Monitor First Week
- Claim success rate vs pending rate (`startup_claim_requests`)
- `claim_rpc_failed` / `sign_in_failed` log events
- Founder complaints about redirect loops
- React Query cache size (should be much smaller with allowlist)
- Edge function invocation errors
