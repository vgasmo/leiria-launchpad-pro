
# Implementation Plan — Contract Truth Unification & Product Polish

## Status: ✅ Executed (April 2026)

## Stream 1 — Contract Truth Unification ✅

**Changes made:**
1. Removed invoice query remnant from `ContractDetailDrawer.tsx` (was querying non-existent `invoices` table)
2. Removed invoice button from drawer UI
3. Added CRM back-link sync in `useContractIntakes.ts` — when auto-creating contract on approval, `funnel_items.linked_contract_id` is now updated automatically
4. `public.contracts` is legacy/deprecated — no code references it; `startup_contracts` is the sole canonical truth

**Canonical model:**
- `startup_contracts` = operational truth
- `funnel_items.linked_contract_id` → FK to `startup_contracts` (migrated previously)
- `contract_intakes.contract_id` → FK to `startup_contracts`
- `public.contracts` = legacy, 0 rows, no code references

## Stream 2 — Translations / Localization ✅

**Changes made:**
1. Fixed 7 English-in-PT strings (admin tags, suspend confirm, data import, NPS, triage)
2. Added 11 new founder-facing keys (founderDashboard section) in both PT and EN
3. Full key parity confirmed between pt.json and en.json (0 missing keys)

## Stream 3 — Motion / Animation ✅

**Status:** Already implemented — AppLayout uses 200-300ms translateY/opacity animations with `motion-reduce:transition-none`. No additional changes needed.

## Stream 4 — Speed / Performance ✅

**Status:** Already implemented — all heavy pages use `lazy()` with `lazyWithRetry()` in App.tsx. Route-level code splitting is complete.

## Stream 5 — Founder Value ✅

**Changes made:**
1. Added founder-facing translation keys for contract status, progress, and next steps
2. Improved empty state messaging (no jargon, actionable copy)

## NOT Touched
- Auth, guards, claim flow, RLS policies, useWorkspaces, edge functions, pricing engine core
- CRM pipeline stages, signature providers, existing triggers
- `public.contracts` table (remains as legacy, no code references)
