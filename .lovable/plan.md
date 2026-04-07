
# Execution Plan — Product Polish & Contract Truth Unification

## Stream 1 — Contract Truth Unification
**Risk: Medium | Impact: High | Order: 1st**

### Current State
- ✅ `funnel_items.linked_contract_id` FK already points to `startup_contracts` (migration done)
- ✅ No code references `public.contracts` table (0 queries found)
- ✅ `trg_validate_intake_contract_link` enforces contract_id on approval
- ⚠️ `ContractDetailDrawer` still queries `invoices` table (lines 80-92) — remnant not fully removed
- ⚠️ CRM auto-linking: `useFunnel.ts` sets `linked_contract_id` on conversion but the reverse path (intake approval → CRM back-link) may not update the funnel item

### Tasks
1. **Remove invoice query remnant** from `ContractDetailDrawer.tsx` (lines 80-92)
2. **Ensure intake approval auto-links CRM**: When `useContractIntakes` creates a contract on approval, verify it also updates `funnel_items.linked_contract_id` if a `funnel_item_id` exists on the intake
3. **Add orphan detection** to `ContractLifecycleHub`: Flag contracts with mismatched CRM links
4. **Document legacy**: Add comment block to codebase clarifying `public.contracts` is legacy/deprecated — no migration needed since no code references it

### NOT Touching
- No schema changes needed (FK already correct)
- No RLS changes
- No trigger modifications

---

## Stream 2 — Translations / Localization
**Risk: Low | Impact: Medium | Order: 2nd (parallel with 3)**

### Tasks
1. Audit `pt.json` and `en.json` for missing keys in contract lifecycle, CRM, founder flows
2. Fix any English defaults appearing in PT-PT UI
3. Standardize terminology (lead, founder, startup, workspace, pedido de contratação, etc.)
4. Improve error/empty state copy to be human and actionable

---

## Stream 3 — Motion / Animation Polish
**Risk: Low | Impact: Medium | Order: 2nd (parallel with 2)**

### Tasks
1. Add drawer open/close animations (Sheet components already support)
2. Improve CRM pipeline card transitions
3. Add success/error feedback animations to toasts
4. Ensure `motion-reduce:transition-none` on all new animations

---

## Stream 4 — Speed / Performance
**Risk: Low | Impact: High | Order: 3rd**

### Tasks
1. Lazy-load heavy admin components (`BackofficeContractsTab`, `ContractDetailDrawer`, `IntakeOperationalView`)
2. Add route-level code splitting for role-specific pages
3. Improve skeleton loading states for CRM pipeline and contract list
4. Remove unnecessary re-renders in pipeline drag

---

## Stream 5 — Founder Value
**Risk: Low | Impact: High | Order: 4th**

### Tasks
1. Enhance founder dashboard next-step visibility
2. Clearer contract status messaging (what happened → what's next)
3. Better empty state copy for founders with no contracts/milestones
4. Reduce internal jargon in founder-facing surfaces

---

## Release Wrapper
- Verify `.gitignore` has `.env.*` patterns
- Remove any invoice UI remnants from rendered tabs
- Document residual risks

---

## Verification Checklist

### Stream 1
- [ ] No invoice queries in ContractDetailDrawer
- [ ] Intake approval back-links CRM funnel item
- [ ] ContractLifecycleHub flags orphaned states
- [ ] No code references `public.contracts`

### Stream 2
- [ ] PT-PT consistent in critical flows
- [ ] No English defaults in PT locale
- [ ] Error states are human and actionable

### Stream 3
- [ ] Drawer animations smooth
- [ ] reduced-motion respected
- [ ] No blocking animations

### Stream 4
- [ ] Heavy components lazy-loaded
- [ ] Skeleton states clear and honest
- [ ] No frozen areas touched

### Stream 5
- [ ] Founder next-steps visible
- [ ] Contract status messaging clear
- [ ] Jargon reduced
