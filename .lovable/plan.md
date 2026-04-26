# v3.0 Plan — Mobile + Intelligence

Sequencing (approved): **A) plan first → C) Mentor Impact dashboard → B) Quick wins**.
Mobile direction (approved): **Full PWA with offline** (preview-safe).

---

## A. Mobile + Intelligence Plan (this document)

### A.1 Full PWA with offline — preview-safe rollout

Constraint: Lovable preview runs the app inside an iframe. A naive
`vite-plugin-pwa` setup will cache stale builds, break preview navigation,
and intercept `/~oauth`. We follow the platform's documented PWA guard.

**Steps**
1. `bun add -D vite-plugin-pwa workbox-window`
2. `vite.config.ts` — add `VitePWA` with:
   - `registerType: "autoUpdate"`
   - `devOptions: { enabled: false }` (never run SW in Lovable editor)
   - `workbox.navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/auth\//]`
   - Precache **icons + manifest only** (per
     `mem://infrastructure/app-version-cache-and-lifecycle-policy-v2`).
     JS/CSS use `NetworkFirst`, never `CacheFirst`.
3. `manifest.json`: name, short_name, theme/background from design tokens
   (HSL → hex once), maskable icons 192/512, `display: "standalone"`,
   `start_url: "/"`, `scope: "/"`, `lang: "pt-PT"`.
4. Icons in `public/pwa/`: 192, 512, 512-maskable. Generate via imagegen
   from existing brand mark.
5. `src/main.tsx` — add the iframe + preview-host guard. If detected:
   unregister any existing SW and skip registration. Only call
   `registerSW()` outside iframe and on production hosts
   (`fb.startupleiria.com`, `*.lovable.app` published — NOT
   `id-preview--*.lovable.app`).
6. Founder Home install prompt (`beforeinstallprompt` capture +
   dismissable banner once per 30 days, stored in `localStorage`).
7. Offline fallback page `/offline` shown by Workbox `navigateFallback`
   when a navigation request fails. Read-only "you're offline" copy with
   "Retry" — no fake data.
8. Verify: published build registers SW; preview build does not. Check
   `Application → Service Workers` in DevTools on both URLs.

**Out of scope this phase**: background sync of check-ins, push
notifications, native share targets — defer to v3.1.

### A.2 Intelligence layer (deferred to its own loop)

Tracked here for visibility, not built now:
- KPI auto-ingestion (Stripe/Xero/QuickBooks).
- Predictive churn signals on Silent Disengagement Detector.
- AI-suggested next action on Work Queue items.

---

## C. Mentor Impact Dashboard (next loop — implementation)

### C.1 Audit of what already exists
- `src/components/mentors/MentorImpactDashboard.tsx` — shell exists.
- `src/components/mentor/MentorImpactPanel.tsx` — fragment.
- `src/components/mentor/MentorOpenLoops.tsx` — open follow-ups.
- DB ready: `sessions`, `session_feedback`, `mentor_connections`,
  `consultant_notes` (Quick Notes by mentors).

Action: consolidate into a **single canonical**
`/mentors/impact` route under `src/pages/mentor/Impact.tsx`, reusing
existing components, deleting `MentorImpactPanel.tsx` if redundant.

### C.2 Sections (all four approved)

1. **Sessions delivered + hours contributed**
   - Hook: `useMentorSessionStats(mentorUserId)`
   - Query: `sessions` where `mentor_id = me` AND `status = 'completed'`,
     aggregate `count` + `sum(duration_minutes)`.
   - KPIs: all-time, last 30 days, last 90 days. Sparkline by week.

2. **Startups helped + current assignments**
   - Hook: `useMentorAssignments(mentorUserId)`
   - Query: `mentor_connections` where `mentor_user_id = me` AND
     `status = 'accepted'`, join `workspaces` → `startups` for stage,
     health score, last interaction.
   - Card grid; click → workspace overview (respect NDA gate).

3. **Open loops / follow-ups**
   - Reuse `MentorOpenLoops.tsx`.
   - Sources: Quick Notes (`consultant_notes` where author = me AND
     `resolved_at IS NULL`), action items mentor created, pending
     session recap notes.

4. **Founder feedback / ratings**
   - Hook: `useMentorFeedback(mentorUserId)`
   - Query: `session_feedback` joined to `sessions` where
     `mentor_id = me`. Show `avg(rating)`, count, latest 5 anonymized
     comments (no founder names if `is_anonymous = true`).
   - Empty state honest: "No feedback yet" — no fake stars.

### C.3 Privacy + RLS
- All queries scoped via existing RLS (`is_connected_mentor`,
  `has_workspace_access`).
- No PII leakage: feedback comments through `profiles_safe` view if
  reviewer info is shown; otherwise anonymous.
- i18n: every string in `src/i18n/locales/{pt,en}.json` under
  `mentor.impact.*`. PT-PT first, EN parity. Zero hardcoded strings
  (per `mem://infrastructure/unified-i18n-and-content-trust-standards-v4`).

### C.4 Navigation
- Add "Impact" tab to mentor area sidebar/top nav, after "Sessions".
- Add `BackToHomeLink` (per
  `mem://architecture/navigation-resilience-standards`).

### C.5 Verification checklist
- Mentor with 0 sessions → all four sections show empty states (no NaN, no crash).
- Mentor with sessions in multiple workspaces → counts match raw SQL.
- Founder cannot reach `/mentors/impact` (route guard).
- PT and EN parity (key count diff = 0).

---

## B. Quick wins (loop after C)

All four approved.

### B.1 Work Queue keyboard shortcuts (`j`/`k`/`e`/`c`)
- `src/components/work-queue/WorkQueueList.tsx`: add `useHotkeys`
  (already in deps) — `j`/`k` move focus, `e` open detail, `c` mark
  complete via existing mutation. Skip when focus is in input/textarea.
- Discoverability: `?` opens existing shortcut help dialog (extend list).

### B.2 Bulk actions bar (Work Queue + CRM)
- New `src/components/shared/BulkActionsBar.tsx` (sticky bottom).
- Selection state via `useSelection` hook (Set of ids).
- Work Queue actions: Complete, Snooze, Reassign.
- CRM actions: Move stage, Assign consultant, Archive.
- Each action calls existing single-item mutation in a `Promise.all`
  with batched `toast.promise()` — surfaces partial failures honestly
  (per `mem://features/contracts/manual-action-honesty.md` principle).
- No new RPCs; respects existing RLS.

### B.3 Founder welcome wizard (3 steps)
- `src/components/founder/WelcomeWizard.tsx` — Sheet/Dialog.
- Steps: (1) confirm profile (logo, contact phone, NIF if missing),
  (2) pick first template from `templates` (Lean Canvas or Pitch Deck),
  (3) schedule first session with assigned consultant (reuses
  `MentorBookingPanel` infra).
- Trigger: `profiles.has_seen_welcome_wizard` boolean
  (migration). Show on `TransitionalFounderDashboard` after
  `needs_onboarding` flips false, **only if** booleans missing.
- Persist across devices in DB, not localStorage.
- Dismissable; "Skip for now" sets the flag.

### B.4 Milestone celebrations (confetti + toast)
- `bun add canvas-confetti @types/canvas-confetti`
- Hook `useCelebration()` triggers on:
  - first template submitted (per workspace),
  - milestone completed (any),
  - first weekly check-in submitted.
- Idempotency via `workspace_celebrations` table:
  `{workspace_id, event_key, fired_at}` unique. Edge function or
  trigger inserts the row; frontend listens via Realtime channel and
  fires confetti + sonner toast.
- Reduced motion: respect `prefers-reduced-motion` — toast only.

---

## Files expected to change (plan only)

### A.1 PWA
- `vite.config.ts` (modify)
- `public/manifest.webmanifest` (new)
- `public/pwa/icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (new)
- `src/main.tsx` (guarded SW registration)
- `src/pages/Offline.tsx` (new)
- `src/components/pwa/InstallPrompt.tsx` (new)
- `index.html` (manifest link, theme-color meta)

### C Mentor Impact
- `src/pages/mentor/Impact.tsx` (new)
- `src/hooks/useMentorSessionStats.ts` (new)
- `src/hooks/useMentorAssignments.ts` (new)
- `src/hooks/useMentorFeedback.ts` (new)
- `src/components/mentors/MentorImpactDashboard.tsx` (rewire)
- `src/components/mentor/MentorImpactPanel.tsx` (delete if redundant)
- `src/App.tsx` (route)
- `src/i18n/locales/{pt,en}.json` (`mentor.impact.*`)

### B Quick wins
- `src/components/work-queue/WorkQueueList.tsx` (hotkeys)
- `src/components/shared/BulkActionsBar.tsx` (new)
- `src/hooks/useSelection.ts` (new)
- `src/components/founder/WelcomeWizard.tsx` (new)
- `src/components/founder/TransitionalFounderDashboard.tsx` (mount wizard)
- `src/components/celebrations/useCelebration.ts` (new)
- migrations:
  - add `profiles.has_seen_welcome_wizard boolean default false`
  - create `workspace_celebrations` table + RLS + realtime publication

## Migrations (plan only)

1. `alter table profiles add column has_seen_welcome_wizard boolean default false`
2. `create table workspace_celebrations (...)` + RLS (`has_workspace_access`)
   + `alter publication supabase_realtime add table workspace_celebrations`

## Verification commands (to run after each loop)

- `bun run build` — must pass with PWA plugin.
- DevTools: Service Worker registered ONLY on `fb.startupleiria.com`
  and published `*.lovable.app`, NOT on `id-preview--*`.
- `psql -c "select count(*) from sessions where mentor_id = '<id>'"`
  vs UI counter parity.
- i18n parity: `node scripts/check-i18n-parity.mjs` (key diff = 0).
- Lighthouse PWA score ≥ 90 on published URL.

## Risks / intentionally not touched

- **Frozen flows**: contract lifecycle, intake state machine, mentor NDA
  acceptance flow — untouched. Quick wins only add UI affordances on top.
- **Offline writes**: not implemented this phase. Offline = read-only +
  graceful fallback. Background sync deferred to v3.1.
- **Push notifications**: not in scope. Requires VAPID keys + user
  permission flows; treat as v3.2.
- **Native app**: explicitly deferred. Capacitor not added.
- **Mentor Impact "ratings"**: only shown if `session_feedback` rows
  exist — never fabricated.
- **Bulk actions**: no new server RPCs; bounded by existing per-item
  RLS to avoid privilege escalation.
