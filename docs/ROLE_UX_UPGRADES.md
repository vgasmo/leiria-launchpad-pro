# Role-Based UX Upgrades Plan

**Created:** 2026-01-15  
**Purpose:** Actionable UX improvements organized by user role  
**Philosophy:** Make the first 5 minutes amazing for each role

---

## 1. Consultant Experience

### Current State ✅
- Cockpit dashboard with portfolio health distribution
- Work queue panel with triage list
- CRM with Focus Mode and pipeline view
- Session prep cards with role-specific context

### Improvements Roadmap

#### 1.1 Work Queue Enhancements (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Bulk actions bar** | Handle multiple items at once | Add checkbox selection + floating action bar |
| **Keyboard shortcuts** | Speed for power users | `j/k` navigation, `e` to edit, `c` to complete |
| **One-click reschedule** | Reduce clicks for overdue sessions | Inline date picker on hover |
| **Smart sorting** | Surface most urgent items | Score by: overdue days + health + last activity |

#### 1.2 Session Flow Speed (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Pre-populated notes** | Less prep time | Auto-fill with last session summary + KPI changes |
| **Quick action buttons** | Faster post-session | "Create follow-up", "Assign action", "Schedule next" inline |
| **AI session summary** | Capture outcomes | One-click to generate summary from notes |

#### 1.3 Template & Exercise Discovery (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Full-text search** | Find exercises fast | Search across title, purpose, tags |
| **Stage-aware suggestions** | Context-relevant | Filter by startup stage automatically |
| **Usage analytics** | See what works | Track which exercises lead to better outcomes |

### Consultant Metrics

| Metric | Instrumentation Event | Target |
|--------|----------------------|--------|
| Time to first action | `consultant_first_action` | < 30 seconds |
| Work queue completion rate | `work_queue_item_completed` | > 80% daily |
| Session prep time | `session_prep_started` → `session_started` | < 5 minutes |
| Template usage | `template_assigned` | +20% MoM |

---

## 2. Founder Experience

### Current State ✅
- One Thing Today on dashboard
- Stage progress indicators
- Visual canvas templates with AI coach
- Monthly check-ins with KPI tracking

### Improvements Roadmap

#### 2.1 Onboarding Excellence (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Welcome wizard** | Clear first steps | 3-step: Profile → First template → Schedule session |
| **Progress bar** | Show advancement | Persistent header showing stage completion |
| **Quick wins** | Early motivation | Celebrate first template submission with confetti |

#### 2.2 Next Action Clarity (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Action priority badges** | Visual urgency | Color-coded: overdue (red), today (amber), upcoming (blue) |
| **Inline completion** | Less friction | Swipe/click to mark done without navigation |
| **Context tooltips** | Explain "why"** | Hover to see how action connects to goals |

#### 2.3 Feedback Loops (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Weekly summary email** | Stay engaged | Digest of progress + upcoming actions |
| **Milestone celebrations** | Motivation | Animated badge + share to dataroom |
| **Consultant response time** | Set expectations | Show "typically responds in X hours" |

#### 2.4 Mobile Optimization (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Touch-friendly canvas** | Edit on mobile | Larger touch targets, pinch-to-zoom |
| **Quick check-in widget** | Submit anywhere | Floating action button for KPI entry |
| **Offline indicators** | Trust in saving | Clear sync status, queue updates when offline |

### Founder Metrics

| Metric | Instrumentation Event | Target |
|--------|----------------------|--------|
| Time to first template | `template_created` (first) | < 24 hours |
| Check-in completion rate | `checkin_submitted` / due | > 75% |
| Session attendance | `session_attended` / scheduled | > 90% |
| Template iteration | `template_updated` count | 2+ per template |

---

## 3. Mentor Experience

### Current State ✅
- NDA acceptance flow with digital signature
- Availability settings for weekly time slots
- Session templates for structured conversations
- Access restricted to assigned workspaces

### Improvements Roadmap

#### 3.1 Frictionless Onboarding (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **One-page NDA** | Fast acceptance | Inline signing, no separate page |
| **Skip availability setup** | Optional for occasional mentors | Allow ad-hoc scheduling |
| **Welcome email with context** | Know what to expect | Startup summary + session goals |

#### 3.2 Session Access Simplification (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Mentor portal landing** | Dedicated entry point | `/mentor` route with assigned startups |
| **Direct session links** | Skip navigation | Email links go straight to session prep |
| **Minimal chrome** | Reduce overwhelm | Hide admin/staff-only nav items |

#### 3.3 Contribution Recognition (P3)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Impact dashboard** | Show value created | Hours contributed, startups helped, ratings |
| **Thank-you emails** | Founder appreciation | Auto-send after session with summary |
| **Public recognition** | Build reputation | Optional mentor profiles in dataroom |

### Mentor Metrics

| Metric | Instrumentation Event | Target |
|--------|----------------------|--------|
| NDA completion time | `mentor_nda_started` → `mentor_nda_accepted` | < 2 minutes |
| Invite → first session | `mentor_invited` → `mentor_session_completed` | < 14 days |
| Session completion rate | `mentor_session_completed` / scheduled | > 85% |
| Mentor retention | Active mentors month-over-month | > 70% |

---

## 4. Admin Experience

### Current State ✅
- Unified admin panel with tab navigation
- Program setup wizard with multi-step flow
- Feature flags per program
- Intake routing for consultant assignment
- Integration settings management

### Improvements Roadmap

#### 4.1 Operational Dashboard (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Health overview widget** | Spot issues fast | Aggregate: sync failures, booking errors, pending approvals |
| **Recent activity feed** | Audit trail | Last 50 actions across all admins |
| **Quick stats** | Operational KPIs | Active workspaces, pending leads, overdue check-ins |

#### 4.2 Integration Confidence (P1)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Sync status indicators** | Trust integrations | Last sync time, success/failure badge |
| **Test connection button** | Validate config | One-click to verify Graph API works |
| **Error categorization** | Actionable fixes | Group by: auth, permission, rate limit, network |

#### 4.3 Waiting List & Space Management (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Queue visualization** | See demand | Timeline view of waiting list by building |
| **Auto-notify on vacancy** | Reduce manual work | Trigger email when space freed |
| **Contract timeline** | Track expirations | Calendar view of upcoming renewals |

#### 4.4 CRUD Consistency (P2)

| Improvement | Benefit | Implementation |
|-------------|---------|----------------|
| **Confirmation dialogs** | Prevent accidents | "Are you sure?" for destructive actions |
| **Inline editing** | Faster updates | Click-to-edit for simple fields |
| **Bulk import/export** | Data management | CSV upload for startups, contacts |

### Admin Metrics

| Metric | Instrumentation Event | Target |
|--------|----------------------|--------|
| Integration uptime | `graph_sync_success` / attempts | > 99% |
| Lead response time | `lead_created` → `first_contact` | < 48 hours |
| Approval turnaround | `workspace_pending` → `workspace_approved` | < 24 hours |
| Space utilization | Occupied / total spaces | > 85% |

---

## 5. Navigation & Information Architecture

### Current Structure

```
┌─────────────────────────────────────────────────────────┐
│ SIDEBAR NAVIGATION                                       │
├─────────────────────────────────────────────────────────┤
│ 📊 My Workspaces    (all authenticated)                 │
│ 👥 Mentors          (all authenticated)                 │
│ 🔧 Consultor Tools  (staff)                             │
│ 📈 CRM              (staff)                             │
│ ⚙️ Admin            (admin only)                        │
│ 🔗 Integrations     (authenticated)                     │
│ ❓ Help             (all authenticated)                 │
│ ⚙️ Settings         (all authenticated)                 │
└─────────────────────────────────────────────────────────┘
```

### Proposed Improvements

| Change | Rationale | Risk |
|--------|-----------|------|
| **Add `/mentor` landing** | Dedicated mentor entry point | Low — additive |
| **Collapse Admin tabs** | Too many options visible | Low — reorganize |
| **Role-aware sidebar** | Hide irrelevant items | Low — already partially done |
| **Breadcrumbs consistency** | Always show context | Low — UI polish |

---

## 6. Empty States & Loading Patterns

### Empty State Standards

Every empty state MUST include:

1. **Illustration** — Visual cue (use existing `EmptyStateIllustration`)
2. **Headline** — What's missing in plain language
3. **Description** — Why this matters
4. **CTA Button** — Primary action to fix it

Example:
```tsx
<EmptyState
  icon={<FileSearch className="h-12 w-12" />}
  title={t('templates.noTemplates')}
  description={t('templates.noTemplatesDescription')}
  action={{
    label: t('templates.createFirst'),
    onClick: () => navigate('/templates/new'),
  }}
/>
```

### Loading Patterns

| Context | Pattern | Component |
|---------|---------|-----------|
| **Initial page load** | Full skeleton | `<ContentSkeleton rows={5} />` |
| **Data refresh** | Subtle spinner | `<Spinner size="sm" />` in header |
| **Inline update** | Shimmer effect | `opacity-50 animate-pulse` on item |
| **Button action** | Loading state | `<Button disabled loading>` |

### Success Feedback

| Action | Feedback | Implementation |
|--------|----------|----------------|
| Create | Toast + navigate | `toast.success()` then redirect |
| Update | Inline confirmation | Brief green checkmark animation |
| Delete | Toast | `toast.success('Removed')` |
| Bulk action | Count + toast | `toast.success('Updated 5 items')` |

---

## 7. Accessibility Checklist

### Keyboard Navigation ✅

- [ ] All interactive elements focusable via Tab
- [ ] Focus visible (`:focus-visible` ring)
- [ ] Escape closes modals/drawers
- [ ] Arrow keys navigate lists
- [ ] Enter activates buttons/links

### Contrast & Color ✅

- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Large text ≥ 3:1
- [ ] Not relying on color alone (icons + text)
- [ ] Tested in both light and dark modes

### Screen Reader ✅

- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have accessible names
- [ ] Headings follow hierarchy (h1 → h2 → h3)
- [ ] ARIA labels on icon-only buttons

### Mobile ✅

- [ ] Touch targets ≥ 44x44px
- [ ] No horizontal scroll
- [ ] Pinch-to-zoom enabled
- [ ] Responsive typography

---

## 8. Terminology Standardization

### Canonical Terms

| Use This | Not This | Context |
|----------|----------|---------|
| **Workspace** | Project, Company (internal) | The scoped container |
| **Startup** | Company, Business | The entity being incubated |
| **Program** | Cohort, Batch | The acceleration/incubation track |
| **Stage** | Phase, Level | Position in the journey |
| **Session** | Meeting, Call | Scheduled interaction |
| **Action** | Task, To-do | Assigned work item |
| **Template** | Canvas, Framework | Visual exercise |
| **Check-in** | Update, Report | Weekly/monthly data submission |

### Labels in UI

- Always use translated strings via `t()`
- Keep labels short (1-3 words)
- Use sentence case, not Title Case
- Avoid jargon (no "KPI" to founders — use "Metrics")

---

## 9. Metrics Implementation Plan

### Event Naming Convention

```
{role}_{entity}_{action}

Examples:
- consultant_session_created
- founder_template_submitted
- mentor_nda_accepted
- admin_workspace_approved
```

### Critical Events by Role

#### Consultant
```typescript
track('consultant_work_queue_opened');
track('consultant_session_started', { workspaceId, prepTimeMs });
track('consultant_action_completed', { workspaceId, actionId });
track('consultant_template_assigned', { workspaceId, templateType });
```

#### Founder
```typescript
track('founder_dashboard_loaded', { workspaceId, stage });
track('founder_template_created', { workspaceId, templateType });
track('founder_checkin_submitted', { workspaceId, kpiCount });
track('founder_action_completed', { workspaceId, actionId });
```

#### Mentor
```typescript
track('mentor_nda_started');
track('mentor_nda_accepted', { durationMs });
track('mentor_session_joined', { workspaceId, sessionId });
track('mentor_session_completed', { workspaceId, durationMins });
```

#### Admin
```typescript
track('admin_workspace_approved', { workspaceId, waitTimeMs });
track('admin_integration_tested', { integrationType, success });
track('admin_lead_assigned', { funnelItemId, consultantId });
track('admin_program_created', { programId });
```

### Dashboards to Build

| Dashboard | Key Metrics | Owner |
|-----------|-------------|-------|
| **Activation** | Time to first template, session booking rate | Product |
| **Engagement** | Weekly active users by role, check-in rate | Product |
| **Operations** | Integration uptime, error rates, response times | Engineering |
| **Growth** | Lead → startup conversion, mentor retention | Business |

---

## 10. Implementation Priority

### Phase 1: Quick Wins (Week 1)
- [ ] Empty state standardization (founder templates, actions)
- [ ] Loading skeleton consistency
- [ ] Error toast improvements

### Phase 2: Consultant Efficiency (Week 2-3)
- [ ] Work queue keyboard shortcuts
- [ ] Bulk action bar
- [ ] Session prep auto-population

### Phase 3: Founder Activation (Week 3-4)
- [ ] Welcome wizard
- [ ] Progress celebrations
- [ ] Mobile touch improvements

### Phase 4: Mentor Simplification (Week 4-5)
- [ ] Mentor portal landing page
- [ ] Inline NDA flow
- [ ] Minimal navigation mode

### Phase 5: Admin Confidence (Week 5-6)
- [ ] Integration health dashboard
- [ ] Waiting list visualization
- [ ] Audit log UI
