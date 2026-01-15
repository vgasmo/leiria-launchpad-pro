# CRM v1.2 + v1.3 Regression Checklist

## Audit Report Summary

### ✅ Code Quality
- TypeScript builds without errors
- No duplicate components detected
- CRM routes properly configured: `/crm`, `/admin/crm-diagnostics`
- RLS policies maintain staff vs founder visibility correctly

### ✅ CRM v1.2 Hardening (Completed)
- [x] CRM Diagnostics page at `/admin/crm-diagnostics`
- [x] Schema check (communication_log, funnel_items, notifications)
- [x] Permissions check (staff query validation)
- [x] Notifications dry run and live modes
- [x] Graph email sync with dry_run support
- [x] Record drawer timeline load test
- [x] CRM metrics calculation
- [x] i18n keys for EN and PT (diagnostics namespace)

### ✅ CRM v1.3 Founder Engagement (Completed)
- [x] OneThingToday card with soft urgency tones
- [x] YourWeekCard limited to 2 priorities with soft amber styling
- [x] FounderDashboard with progressive disclosure
- [x] InteractionsCard for shared visibility items
- [x] Focus Mode for consultants in CRM dashboard
- [x] EnhancedNextSteps with neutral/soft urgency colors
- [x] AlertsPanel with reduced red intensity
- [x] NextBestAction with soft amber borders (not red)
- [x] HealthAlertsCard with softer critical styling
- [x] CRM inbox overdue items use amber instead of red

### ⚠️ Risk Areas (Monitor)
- Graph API requires consultant email to match Azure AD tenant
- Feature flags gate new functionality (safe)
- Notification deduplication uses 24h window

---

## Manual Test Steps

### Founder Flow

1. **My Workspaces Page**
   - [ ] Navigate to `/my-workspaces`
   - [ ] Verify startup card displays with health badge
   - [ ] Verify "One Thing Today" card shows motivating action (not overwhelming)
   - [ ] Verify streak hero shows if applicable

2. **Workspace Overview**
   - [ ] Open a workspace
   - [ ] Verify "One Thing Today" shows priority action
   - [ ] Verify overdue items use softer amber (not all red)
   - [ ] Verify shared interactions appear in InteractionsCard

3. **Next Steps / Actions**
   - [ ] Navigate to Actions tab
   - [ ] Verify overdue actions show clearly but not alarmingly
   - [ ] Add a new action item
   - [ ] Mark an action complete
   - [ ] Verify completion toast appears

4. **Schedule Session**
   - [ ] Navigate to Sessions tab
   - [ ] Verify upcoming sessions display
   - [ ] Book/request a session (if enabled)

5. **Update KPIs**
   - [ ] Navigate to KPIs tab
   - [ ] Add or update a KPI value
   - [ ] Verify health score reflects update

---

### Consultant Flow

1. **CRM Dashboard**
   - [ ] Navigate to `/crm`
   - [ ] Verify inbox groups display (Overdue, Today, Upcoming, Stale)
   - [ ] Toggle "Focus Mode" - verify urgent items filter
   - [ ] Toggle "My Items Only" - verify filter works

2. **Record Drawer**
   - [ ] Click on a lead to open drawer
   - [ ] Verify AI Recap section (if enabled)
   - [ ] Verify timeline loads with activities
   - [ ] Test task tabs: Open / Done / Canceled

3. **Task Lifecycle**
   - [ ] Add a new task
   - [ ] Edit task subject and due date
   - [ ] Mark task complete
   - [ ] Verify "Clear next action also?" confirmation if applicable
   - [ ] Cancel a task
   - [ ] Reopen a task

4. **Next Action Management**
   - [ ] Set next action from drawer
   - [ ] Update next action
   - [ ] Clear next action

---

### Notifications

1. **Notification Bell**
   - [ ] Click bell icon in top bar
   - [ ] Verify notifications list opens without layout shift
   - [ ] Verify CRM notification types show correct icons:
     - task_due: Clock icon
     - task_overdue: AlertTriangle icon
     - next_action_due: Clock icon
     - next_action_overdue: AlertTriangle icon
   - [ ] Mark single notification as read
   - [ ] Mark all notifications as read
   - [ ] Delete a notification

2. **Deep Link**
   - [ ] Navigate to `/crm?open=<valid-funnel-item-id>`
   - [ ] Verify drawer opens automatically
   - [ ] Navigate to `/crm?open=<invalid-id>`
   - [ ] Verify friendly error toast and param cleared

---

### CRM Diagnostics (Admin/Consultor Only)

1. **Access Control**
   - [ ] Navigate to `/admin/crm-diagnostics`
   - [ ] Verify only admin/consultor can access
   - [ ] Founders see AccessDenied component

2. **Infrastructure Tests**
   - [ ] Run Schema Check - verify pass
   - [ ] Run Permissions Check - verify pass

3. **Notification Tests**
   - [ ] Run Notifications (Dry Run) - verify count returned
   - [ ] Optionally run Notifications (Live) - verify notifications created

4. **Data Tests (with funnel_item_id)**
   - [ ] Enter a valid funnel_item_id
   - [ ] Run Graph Email Sync (Dry Run) - verify no data inserted
   - [ ] Run Record Drawer Load - verify timeline count

5. **Metrics**
   - [ ] Run CRM Metrics - verify counts for overdue, today, stale

6. **Logs**
   - [ ] Expand logs panel
   - [ ] Verify log entries appear
   - [ ] Clear logs

---

## Edge Function Safety Checks

### sync-graph-email-history
- [x] Supports `dry_run: true` parameter
- [x] Does NOT update `last_activity_at` in dry_run mode
- [x] Returns `would_insert` count in dry_run mode
- [x] Sanitizes preview text (max 500 chars)
- [x] Uses upsert with conflict handling for duplicates

### generate-crm-notifications
- [x] Deduplicates using 24h window (existingKeys check)
- [x] Includes entity_type and entity_id in notifications
- [x] Supports dry_run for counting without inserting
- [x] Only notifies assigned staff users

---

## Visibility Rules Verification

### Founders Should NOT See:
- [ ] Staff-only notes (visibility = 'staff')
- [ ] Internal CRM tasks unless marked shared
- [ ] Raw Graph email sync data (staff only)

### Founders CAN See:
- [ ] Shared visibility items in InteractionsCard
- [ ] Consultant requests marked as shared
- [ ] Their own action items and milestones

---

## UI/Aesthetics Checklist

- [ ] No heavy red backgrounds dominating the UI
- [ ] Neutral surfaces with colored badges for urgency
- [ ] Consistent button sizing (h-8 to h-10)
- [ ] Proper spacing rhythm (gap-2 to gap-4)
- [ ] Skeleton loading states where lists load
- [ ] Mobile responsive: primary CTAs visible
- [ ] Sidebar legible and not alarm-like for founders
