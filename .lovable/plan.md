
# Implementation Plan — Contract Truth Unification & Product Polish

## Stream 1 — Unify Contract Truth Model

**Problem**: `funnel_items.linked_contract_id` has a FK to legacy `public.contracts` (0 rows), but the app writes to `public.startup_contracts`. This creates a broken linkage — CRM can never properly link to operational contracts.

**Solution**:
1. **DB Migration**: Drop FK from `funnel_items.linked_contract_id → contracts`, add new FK to `startup_contracts`. Legacy `contracts` table stays but is marked non-canonical (no code references it).
2. **Code**: Already writes to `startup_contracts` — no code changes needed for contract creation. Update `ContractLifecycleHub` to check `startup_contracts` linkage correctly.
3. **Lifecycle guard**: The existing `trg_validate_intake_contract_link` trigger already enforces intake→contract linkage. No new guards needed.
4. **Orphan detection**: Enhance `ContractLifecycleHub` to surface funnel items with broken/missing contract links.

## Stream 2 — Translations / Localization Quality

**Scope**: Audit and fix critical flow translations for:
- Contract lifecycle states and labels
- CRM pipeline stages
- Founder onboarding messages
- Error/empty states
- Ensure consistent PT-PT terminology (no BR-PT drift)

## Stream 3 — Animation / Motion Polish

**Scope**: Add subtle transitions to:
- Drawer open/close (already framer-motion available)
- Page transitions for role dashboards
- Success/error toast feedback
- Loading skeleton improvements
- Keep durations ≤200ms, respect reduced-motion

## Stream 4 — Speed / Performance

**Scope**:
- Lazy-load heavy admin/backoffice components
- Optimize CRM pipeline render path
- Improve skeleton loading states
- Route-level code splitting for role-specific pages

## Stream 5 — Founder Value Optimization

**Scope**:
- Improve founder dashboard next-step visibility
- Clearer contract status messaging
- Better empty state copy
- Reduce jargon in founder-facing surfaces

## Release Wrapper

- `.gitignore` already has `.env` — verify and add `.env.*` patterns
- Report any residual issues

## NOT Touching
- Auth, guards, claim flow, RLS policies, useWorkspaces, edge functions, pricing engine core
