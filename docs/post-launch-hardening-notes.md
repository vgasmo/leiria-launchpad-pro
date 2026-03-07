# Post-Launch Hardening Notes — V1 Wide Release

**Date**: 2026-03-07  
**Status**: V1 Wide Release Certified

---

## What was fixed in this pass

### P0 — Critical fixes

1. **i18n translation leaks**: Fallback stage names in `useStages` no longer hardcode English labels (`Ideation`, `Validation`, etc.) — they now use stage keys that resolve through the i18n system. Deprecated `STAGE_OPTIONS` / `PIPELINE_STAGE_OPTIONS` constants annotated with `@deprecated` and migration guidance.

2. **Active-portfolio pollution guard**: Database trigger `trg_validate_workspace_activation` now prevents any workspace from transitioning to `status = 'active'` unless it has at least one active member in `workspace_users`. This is the same class of error that caused 173 orphan records to pollute consultant dashboards.

3. **`.env` repo hygiene**: `.gitignore` updated to exclude `.env` and `.env.*` files. Only publishable anon keys were present, but this prevents future accidents.

### P1 — Improvements

4. **Release discipline scripts**: `package.json` now includes `typecheck`, `test`, `test:watch`, `test:e2e`, and `release-check` scripts. The existing `scripts/release-check.sh` is now wired into `npm run release-check`.

5. **Monitoring foundations**: `logger.ts` enhanced with an in-memory error buffer (last 50 warn/error entries) accessible via `logger.getRecentErrors()`. Ready for Sentry/external integration without code changes.

---

## What remains deferred

### Performance
- `select('*')` still present in `useBackoffice.ts` (incubation_types, buildings, payments, office_spaces), `useSessions.ts`, `useWorkspaceData.ts`, `useDocumentReviews.ts`. Low risk at current record counts but should be addressed when these tables grow.
- No server-side pagination on admin backoffice views (contracts, invoices, payments). Safe at current scale (~200 records) but will need pagination at ~1000+.

### i18n
- `STAGE_OPTIONS` and `PIPELINE_STAGE_OPTIONS` in `funnelStages.ts` are deprecated but still imported in some files. Consumers should migrate to `getFunnelStageOptions(t, stages)`.
- Resources page uses a separate bilingual `STAGE_LABELS` object from `resourcesCatalog.ts` — works correctly but is a parallel translation mechanism.

### Architecture
- Some oversized components (AdminBackoffice, BackofficeDashboard) could benefit from extraction but are stable.
- `select('*')` cleanup should be done incrementally, not in a bulk pass.

### Security
- `.env` file contains only publishable keys. The Lovable Cloud delivery model auto-generates this file — the `.gitignore` entry prevents it from being committed to GitHub but Lovable will continue to manage it locally.

---

## What to monitor in production

1. **Workspace activation errors**: The new trigger will raise exceptions if any code path tries to set `status = 'active'` without members. Monitor for `RAISE EXCEPTION` errors in database logs.
2. **Console error buffer**: `logger.getRecentErrors()` can be called from browser devtools to inspect recent errors without needing to reproduce them.
3. **i18n missing keys**: The CI i18n-sync pipeline catches new keys automatically, but runtime `missing key` warnings should be watched in the first week.
4. **Consultant dashboard counts**: Verify that `active = 9` remains stable in the Live environment after the first batch of founder claims.

---

## Next sprint priorities

1. Explicit column selection for top-5 heaviest queries
2. Server-side pagination for admin lists
3. Sentry integration (connect to `logger.emit()`)
4. Component extraction for AdminBackoffice (>600 lines)
5. Full deprecation removal of `STAGE_LABELS` / `STAGE_OPTIONS` constants
