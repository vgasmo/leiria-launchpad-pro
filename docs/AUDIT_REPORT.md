# CTO Audit Report - Startup Leiria Platform

**Audit Date:** 2026-01-15  
**Auditor:** CTO + Head of Product  
**Status:** ✅ Active Development - Production-Grade Improvements

---

## 1. System Map

### 1.1 Major Areas & Data Flows

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                      │
├─────────────────────────────────────────────────────────────────────┤
│  AppLayout → ProtectedRoute → Role-Based Dashboards                 │
│    ├── ConsultorDashboard (work queue, triage, calendar)            │
│    ├── FounderDashboard (next action, progress, booking)            │
│    ├── MentorDashboard (sessions, NDA status)                       │
│    └── Admin (backoffice, CRM, programs, integrations)              │
├─────────────────────────────────────────────────────────────────────┤
│  Key Pages:                                                          │
│    /my-workspaces → workspace list with health scores               │
│    /workspace/:id → detailed startup management (tabs)              │
│    /crm → lead pipeline, inbox, tasks                               │
│    /admin → 5 groups (Operations, People, Content, Insights, System)│
│    /mentors → mentor discovery and booking                          │
│    /settings → user preferences, calendar integrations              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Supabase + Edge Functions)             │
├─────────────────────────────────────────────────────────────────────┤
│  Database (108 tables with RLS):                                     │
│    Core: workspaces, startups, profiles, user_roles                 │
│    Sessions: sessions, action_items, milestones                     │
│    KPIs: kpi_definitions, kpi_values, checkin_*                     │
│    CRM: funnel_items, communication_log, contracts                  │
│    Backoffice: buildings, rooms, startup_contracts                  │
│    Messaging: conversations, messages, notifications                │
├─────────────────────────────────────────────────────────────────────┤
│  Edge Functions (54 total):                                          │
│    Category A (User-facing): analyze-template, generate-*           │
│    Category B (Cron/System): recompute-*, run-*, send-*             │
│    Category C (Webhooks): webhook-meeting-ingest, inbound-email     │
│    Category D (Public): get-shared-workspace, calendar-feed         │
│    Category E (Graph): sync-outlook-calendar, check-availability    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INTEGRATIONS                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Microsoft Graph (Core):                                             │
│    • Calendar sync (sessions ↔ Outlook)                             │
│    • Email history sync (CRM communication log)                     │
│    • Teams transcript import                                         │
│    • Free/busy availability checks                                   │
│    • Teams meeting link generation                                   │
│  Resend: Transactional emails                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Tables/Entities (from migrations)

| Entity Group | Tables | Purpose |
|--------------|--------|---------|
| **Identity** | profiles, user_roles | User data + RBAC |
| **Workspaces** | workspaces, workspace_users, workspace_settings | Startup containers |
| **Startups** | startups, team_members, cap_table_entries | Company data |
| **Programs** | programs, stages, playbooks, playbook_items | Incubation structure |
| **Sessions** | sessions, session_notes, session_artifacts | Meeting management |
| **KPIs** | kpi_definitions, kpi_values, checkin_* | Progress tracking |
| **CRM** | funnel_items, communication_log, contracts | Lead management |
| **Backoffice** | buildings, rooms, office_spaces, startup_contracts | Physical spaces |
| **Messaging** | conversations, messages, notifications | Internal comms |
| **Documents** | documents, datarooms, dataroom_items | File management |

### 1.3 Edge Functions Map

| Function | Auth | Purpose | Calls |
|----------|------|---------|-------|
| **check-consultant-availability** | JWT | Get calendar slots | Graph API |
| **public-get-availability** | Token | Public booking slots | Graph API |
| **public-book-first-contact** | Token | Create booking | Graph API |
| **sync-outlook-calendar** | Cron/Staff | Sync sessions | Graph API |
| **sync-graph-email-history** | Staff | CRM email sync | Graph API |
| **import-teams-transcript** | JWT | Import transcripts | Graph API |
| **request-playbook** | JWT | Founder request | Service role |
| **accept-mentor-nda** | JWT | NDA acceptance | Direct DB |
| **get-global-integrations** | Staff | Config fetch | Direct DB |
| **set-global-integrations** | Admin | Config update | Direct DB |

---

## 2. Top Issues (P0–P3)

### P0 - Critical (Blocking Production)

None identified. Previous P0 issues have been resolved:
- ✅ SPA routing (fixed with navigateFallback)
- ✅ RLS on sensitive tables (15 tables hardened)
- ✅ Token hashing for share links

### P1 - High Priority

#### P1-01: Graph Integration Error Handling Inconsistency
- **Impact:** Silent failures cause missed calendar syncs
- **Roles Affected:** Consultors, Admins
- **Evidence:** 
  - `sync-outlook-calendar/index.ts:236-239` - generic error message
  - `check-consultant-availability/index.ts:356-371` - good pattern
- **Root Cause:** Inconsistent error handling across Graph functions
- **Fix Plan:** Standardize with retry logic and integration_errors logging

#### P1-02: ErrorBoundary TODO for Monitoring
- **Impact:** Runtime errors not captured for debugging
- **Roles Affected:** All users
- **Evidence:** `src/components/ui/ErrorBoundary.tsx:84-85` - TODO comment
- **Root Cause:** Placeholder code not implemented
- **Fix Plan:** Create logError utility with structured context

#### P1-03: Dual Package Manager Lockfiles
- **Impact:** CI inconsistency, dependency confusion
- **Roles Affected:** Developers
- **Evidence:** Both `bun.lockb` and `package-lock.json` exist
- **Root Cause:** Mixed tooling during development
- **Fix Plan:** Document npm as standard, add .gitignore for bun.lockb

### P2 - Medium Priority

#### P2-01: TanStack Query Key Inconsistency
- **Impact:** Stale UI after mutations in some cases
- **Roles Affected:** All users
- **Evidence:** Various hooks use different key patterns
- **Root Cause:** Organic codebase growth
- **Fix Plan:** Audit and standardize query keys

#### P2-02: Empty State Inconsistency
- **Impact:** Confusion when features have no data
- **Roles Affected:** New users
- **Evidence:** Mixed patterns across tabs/panels
- **Root Cause:** No design system for empty states
- **Fix Plan:** Create EmptyState component library

#### P2-03: Graph Integration Type Naming
- **Impact:** Potential config lookup failures
- **Roles Affected:** Admins
- **Evidence:** `public-get-availability/index.ts:39-45` checks both `graph_api` and `microsoft_graph`
- **Root Cause:** Historical naming inconsistency
- **Fix Plan:** Standardize on `graph_api`, add migration

### P3 - Low Priority

#### P3-01: Mobile Experience Polish
- **Impact:** Reduced usability on phones
- **Roles Affected:** Founders (primarily)
- **Evidence:** Some tables don't scroll horizontally
- **Root Cause:** Desktop-first development
- **Fix Plan:** Add responsive breakpoints, touch targets

#### P3-02: i18n Coverage Gaps
- **Impact:** Mixed language UI in edge cases
- **Roles Affected:** Portuguese users
- **Evidence:** Some hardcoded strings remain
- **Root Cause:** Incremental i18n adoption
- **Fix Plan:** Run i18n-lint, add missing keys

---

## 3. Improvements Shipped in This Changeset

### 3.1 Reliability + Correctness

| # | Improvement | Files Changed |
|---|-------------|---------------|
| 1 | **Standardized API Error Utility** | `src/lib/apiError.ts` (new) |
| 2 | **Graph retry with exponential backoff** | `supabase/functions/_shared/graphRetry.ts` (new) |
| 3 | **Edge function error logging to integration_errors** | `supabase/functions/_shared/errorLogging.ts` (new) |
| 4 | **Input validation for public booking** | `supabase/functions/public-book-first-contact/index.ts` |

### 3.2 Security + RBAC

| # | Improvement | Files Changed |
|---|-------------|---------------|
| 5 | **Staff-only route verification** | `src/pages/CRM.tsx`, `src/pages/ConsultorTools.tsx` |
| 6 | **Backend role enforcement documentation** | `docs/AUDIT_REPORT.md` |

### 3.3 UX Improvements

| # | Improvement | Files Changed |
|---|-------------|---------------|
| 7 | **Founder next-action focus** | Already implemented in FounderDashboard |
| 8 | **Consultant work queue prioritization** | Already implemented in ConsultorDashboard |

### 3.4 Codebase Health

| # | Improvement | Files Changed |
|---|-------------|---------------|
| 9 | **logError utility with structured context** | `src/lib/logError.ts` (new) |
| 10 | **ErrorBoundary integration** | `src/components/ui/ErrorBoundary.tsx` |
| 11 | **Package manager documentation** | `README.md`, `.npmrc` |
| 12 | **Env validation enhancement** | `src/lib/env.ts` already complete |

---

## 4. Roadmap (2-6 Weeks)

### Week 1-2: Activation & Onboarding

**Goal:** Time-to-first-value < 5 minutes for each role

| Task | Role | Outcome |
|------|------|---------|
| Founder onboarding wizard completion | Founder | 90% complete checklist |
| Consultant first-day guide | Consultor | Work queue populated |
| Mentor NDA + first booking | Mentor | Session scheduled |
| Admin integration health check | Admin | Graph status visible |

### Week 3-4: Retention & Engagement

**Goal:** Weekly active usage by consultants > 80%

| Task | Role | Outcome |
|------|------|---------|
| Weekly health digest emails | Consultor | Re-engagement loop |
| Founder progress notifications | Founder | Motivation boost |
| Session reminder automation | All | Reduced no-shows |
| CRM stale lead alerts | Consultor | Pipeline hygiene |

### Week 5-6: Operational Excellence

**Goal:** Zero-friction admin operations

| Task | Role | Outcome |
|------|------|---------|
| Waiting list automation | Admin | Auto-assignment |
| Space allocation dashboard | Admin | Visual occupancy |
| Integration failure self-heal | Admin | Reduced support |
| Cohort analytics v1 | Admin | Program insights |

---

## 5. Metrics Plan

### 5.1 Activation

| Metric | Definition | Target |
|--------|------------|--------|
| Founder TTFV | Time from signup to first KPI entry | < 10 min |
| Consultant TTFV | Time from login to first workspace view | < 2 min |
| Mentor TTFV | Time from invite to first session | < 48 hours |

### 5.2 Retention

| Metric | Definition | Target |
|--------|------------|--------|
| Weekly Active Consultants | Unique logins per week | > 80% |
| Monthly KPI Submissions | Founders submitting on time | > 70% |
| Session Completion Rate | Scheduled vs completed | > 90% |

### 5.3 Conversion

| Metric | Definition | Target |
|--------|------------|--------|
| Lead → Onboarded | CRM funnel conversion | > 40% |
| Invite → Active Mentor | Mentor activation | > 60% |

### 5.4 Operational Health

| Metric | Definition | Target |
|--------|------------|--------|
| Graph Sync Failures | Per-day error count | < 5 |
| Booking Failures | Per-week failed bookings | 0 |
| RLS Block Events | Per-week 403 responses | < 10 |
| API Latency P95 | Edge function response time | < 500ms |

---

## 6. Architecture Decisions

### 6.1 Current State (Verified)

- ✅ **Role Storage:** Separate `user_roles` table (not in profiles)
- ✅ **RLS Enforcement:** All 108 tables have RLS enabled
- ✅ **Token Security:** Share links use SHA-256 hashing
- ✅ **Secret Management:** MS_GRAPH_CLIENT_SECRET in env, not DB
- ✅ **PII Masking:** `_safe` views for public data exposure
- ✅ **Audit Trail:** Append-only `activity_log` table

### 6.2 Recommendations

| Area | Current | Recommended |
|------|---------|-------------|
| Graph Secrets | DB + env fallback | Env-only (Supabase Vault) |
| Error Monitoring | Console only | Sentry/LogRocket integration |
| Rate Limiting | AI functions only | All public endpoints |
| 2FA | Not implemented | Admin accounts priority |

---

## 7. Files Reference

### Key Configuration Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route definitions + ProtectedRoute |
| `src/contexts/AuthContext.tsx` | Auth state + role flags |
| `supabase/config.toml` | Edge function JWT settings |
| `supabase/functions/_shared/security.ts` | Auth helpers |
| `supabase/functions/_shared/validation.ts` | Input validation |

### Key Component Files

| File | Purpose |
|------|---------|
| `src/components/dashboard/ConsultorDashboard.tsx` | Consultant home |
| `src/components/dashboard/FounderDashboard.tsx` | Founder home |
| `src/pages/CRM.tsx` | Lead management |
| `src/pages/Admin.tsx` | Admin panel |

### Key Hook Files

| File | Purpose |
|------|---------|
| `src/hooks/useWorkspaces.ts` | Workspace data |
| `src/hooks/useAuth.ts` | Auth helpers |
| `src/hooks/useIntegrationErrors.ts` | Error tracking |

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Next Review:** 2026-01-29
