# SECURITY_NOTES.md — SECURITY DEFINER Allowlist & Mitigations

**Date**: 2026-02-20  
**Scope**: All `SECURITY DEFINER` functions and views in the database  
**Frontend service_role usage**: **ZERO** (confirmed via codebase search)

---

## 1. Views — All use SECURITY INVOKER ✅

All public views use `security_invoker = true` (and `security_barrier = true` where applicable), ensuring RLS is applied based on the querying user, not the view creator.

| View | security_invoker | security_barrier | Purpose |
|------|-----------------|-----------------|---------|
| `public_profiles` | ✅ | ✅ | Non-PII profile fields; requires `auth.uid() IS NOT NULL` |
| `profiles_safe` | ✅ | ✅ | Safe profile view masking PII |
| `startups_safe` | ✅ | — | Safe startup view without sensitive fields |
| `team_members_safe` | ✅ | ✅ | Team view; PII gated by `can_see_team_member_pii()` |

**Verdict**: No SECURITY DEFINER views exist. No bypass risk.

---

## 2. SECURITY DEFINER Functions — Allowlist

### 2.1 Role/Permission Check Functions (Read-Only, STABLE)

These are helper predicates used in RLS policies. They must be SECURITY DEFINER to read `user_roles` without circular RLS dependencies. All have `SET search_path TO 'public'`.

| Function | Purpose | Risk | Mitigation |
|----------|---------|------|------------|
| `is_admin()` / `is_admin(uuid)` | Check admin role | Low | Read-only, returns boolean |
| `is_staff()` | Check admin or consultor | Low | Read-only |
| `is_backoffice()` | Check backoffice role | Low | Read-only |
| `is_founder_user()` | Check founder role | Low | Read-only |
| `is_external_mentor(uuid)` | Check mentor_externo role | Low | Read-only |
| `has_role(uuid, app_role)` | Generic role check | Low | Read-only |
| `has_any_role(uuid)` | Check user has any role | Low | Read-only |
| `is_account_active()` / `is_account_active(uuid)` | Check profile approved status | Low | Read-only |
| `has_accepted_nda(uuid)` | Check NDA acceptance | Low | Read-only |
| `can_access_backoffice()` | Admin or backoffice check | Low | Read-only |

### 2.2 Access Control Functions (Read-Only, STABLE)

| Function | Purpose | Risk | Mitigation |
|----------|---------|------|------------|
| `has_workspace_access(uuid)` / `has_workspace_access(uuid, uuid)` | Workspace membership + NDA gate | Low | Read-only, includes mentor NDA check |
| `has_active_workspace_access(uuid)` | Active workspace + active status | Low | Read-only |
| `can_write_workspace(uuid)` | Write permission check | Low | Read-only |
| `can_edit_workspace(uuid, uuid)` | Edit permission check | Low | Read-only |
| `is_founder(uuid)` | Workspace founder check | Low | Read-only |
| `is_startup_founder(uuid)` | Startup-level founder check | Low | Read-only |
| `is_team_member_of_startup(uuid)` | Team membership check | Low | Read-only |
| `can_manage_startup(uuid)` | Startup management permission | Low | Read-only |
| `can_see_startup_pii(uuid)` | PII access gate | Low | Read-only |
| `can_see_team_member_pii(uuid)` | Team PII gate | Low | Read-only |
| `has_program_access(uuid)` | Program access check | Low | Read-only |
| `is_conversation_participant(uuid, uuid)` | Chat participant check | Low | Read-only |
| `is_connected_mentor(uuid, uuid)` | Mentor connection check | Low | Read-only |
| `shares_workspace_with(uuid)` | Cross-user workspace check | Low | Read-only |
| `can_view_quality_result(text, uuid)` | Quality result access check | Low | Read-only |
| `get_workspace_role(uuid, uuid)` | Get user's role in workspace | Low | Read-only |
| `get_session_workspace_id(uuid)` | Lookup session workspace | Low | Read-only |
| `get_dataroom_workspace_id(uuid)` | Lookup dataroom workspace | Low | Read-only |

### 2.3 Data Mutation Functions (Write, DEFINER required)

| Function | Purpose | Risk | Mitigation |
|----------|---------|------|------------|
| `handle_new_user()` | Trigger: create profile on signup | Medium | Only runs as auth trigger; inserts into profiles with `new.id` |
| `handle_new_user_role()` | Trigger: auto-assign role on signup | Medium | Only inserts caller's own user_id; bounded to `founder`/`mentor_externo`/`consultor` |
| `ensure_founder_role()` | Insert founder role for `auth.uid()` | Low | Only ever inserts caller's own ID + 'founder'; ON CONFLICT DO NOTHING |
| `create_startup_application(...)` | Create startup + workspace + membership | Medium | Validates `auth.uid()`; calls `ensure_founder_role()`; only creates for caller |
| `create_conversation(uuid[], ...)` | Create conversation with participants | Low | Validates `auth.uid()`; always adds creator as participant |
| `submit_checkin(uuid, jsonb)` | Submit check-in responses + update KPIs | Medium | Validates workspace access via `is_founder()` or `is_admin()` |
| `ensure_dataroom_exists(uuid)` | Create dataroom if not exists | Low | Idempotent upsert |
| `approve_user_account(uuid)` | Admin-only: approve user | Low | Explicit admin role check before mutation |
| `block_workspace(uuid, text)` | Admin-only: block workspace | Low | Explicit admin role check |
| `unblock_workspace(uuid)` | Admin-only: unblock workspace | Low | Explicit admin role check |
| `get_next_intake_consultant(uuid)` | Round-robin consultant assignment | Low | Only updates `round_robin_index` counter |

### 2.4 Utility/Trigger Functions

| Function | Purpose | Risk | Mitigation |
|----------|---------|------|------------|
| `update_updated_at_column()` | Trigger: auto-update timestamps | None | Pure timestamp mutation |
| `track_stage_change()` | Trigger: log stage transitions | Low | Audit logging only |
| `update_funnel_item_last_activity()` | Trigger: update funnel timestamps | Low | Timestamp update only |
| `update_funnel_last_activity_trigger()` | Trigger: GREATEST-based timestamp | Low | Timestamp update only |
| `enforce_consultant_notes_visibility()` | Trigger: enforce visibility rules | Low | Data integrity enforcement |
| `update_milestone_status_from_actions()` | Trigger: auto-update milestone status | Low | Status derivation from action counts |
| `update_old_milestone_status()` | Trigger: recalc old milestone on move | Low | Status derivation |
| `log_cap_table_changes()` | Trigger: audit cap table changes | Low | Audit logging via activity_log |
| `hash_share_link_token()` | Trigger: SHA-256 hash share tokens | Low | Security enhancement (hashing) |
| `update_crm_stage_email_rules_timestamp()` | Trigger: timestamp update | None | Pure timestamp |
| `generate_weekly_checkins()` | Cron: create weekly check-in instances | Low | Called by scheduled job only |
| `cleanup_old_rate_limits()` | Cron: prune old rate limit records | Low | Maintenance cleanup |
| `check_ai_rate_limit(uuid, uuid, text, int)` | Rate limiting enforcement | Low | Counter increment with window check |
| `validate_portuguese_nif(text)` | NIF validation (IMMUTABLE) | None | Pure computation |
| `sha256_token(text)` | Token hashing (IMMUTABLE) | None | Pure computation |
| `get_workspace_stats(uuid[])` | Aggregate workspace stats | Low | Filters by `has_workspace_access()`; read-only |
| `get_kpi_percentiles(uuid, text, uuid)` | KPI benchmark stats | Low | Read-only aggregate |

---

## 3. Frontend Security

| Check | Status |
|-------|--------|
| `service_role` in frontend code | ✅ ZERO matches |
| Hardcoded API keys in source | ✅ Scanned by `scripts/secret-scan.cjs` |
| CORS on edge functions | ✅ Origin-validated via `_shared/cors.ts` |
| Edge function auth guards | ✅ `verify_jwt=true` + runtime guards |
| Cron functions protected | ✅ `x-cron-secret` required |

---

## 4. Conclusion

- **All views**: SECURITY INVOKER — no bypass risk
- **All DEFINER functions**: Have `SET search_path TO 'public'` — no search_path injection
- **Write functions**: Validate `auth.uid()` and/or check admin/staff roles before mutations
- **No SECURITY DEFINER can be converted to INVOKER**: Role-check functions MUST be DEFINER to avoid circular RLS dependencies
- **Zero service_role exposure in frontend**
