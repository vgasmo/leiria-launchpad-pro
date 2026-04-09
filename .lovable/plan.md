
# Contract Truth Hardening Plan — GO-LIVE

## Previous Streams (April 2026) — ✅ Completed
- Stream 1: Invoice remnants removed, CRM back-link synced on approval
- Stream 2-5: Translations, motion, performance, founder value — all done

---

## Current Phase: GO-LIVE HARDENING

### Canonical Truth Decision
- `startup_contracts` = sole operational truth ✅
- `public.contracts` = legacy inert (0 code references) ✅
- No migration needed

### 5 Bypass Paths to Close

#### Blocker 1: ContractDetailDrawer "send" buttons bypass intake sync
- L948-952 (assinatura_digital) and L1008-1013 (pandadoc) write `signature_status='sent_for_signature'` to `startup_contracts` without transitioning `contract_intakes.status` or syncing CRM

#### Blocker 2: ContractDetailDrawer "Mark as Signed" bypasses lifecycle
- L1030-1045: Sets contract signed + workspace active + contract active directly — no intake sync, no CRM sync

#### Blocker 3: DocuSign webhook doesn't sync intake or CRM
- `docusign-webhook/index.ts` L147-164: On `completed`, updates only `startup_contracts` — never transitions `contract_intakes` or `funnel_items`

#### Blocker 4: useFunnel activates workspace immediately
- `useFunnel.ts` L288-291: Sets workspace `active` before contract is signed

#### Blocker 5: No backoffice visibility for invalid/orphan states

### Implementation — ✅ COMPLETED

**B1: `src/lib/contractLifecycleSync.ts`** ✅ — shared helper with `syncIntakeOnContractEvent`, `canonicalMarkAsSent`, `canonicalMarkAsSigned`
**B2: Fix ContractDetailDrawer** ✅ — all 3 manual buttons now use canonical helpers
**B3: Fix docusign-webhook** ✅ — on `completed`: syncs intake to signed→activated + CRM to contracted; on `sent_for_signature`: syncs intake
**B4: Fix useFunnel** ✅ — workspace created as `pending`, not `active`
**D1: ContractLifecycleHub diagnostics** ✅ — detects orphan intakes, intake/contract drift, premature workspace activation

### Build: ✅ Clean (0 errors)
### Frozen areas: NOT touched (auth, guards, claim flow, RLS, useWorkspaces)

