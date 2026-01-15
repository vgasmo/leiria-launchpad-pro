# UX Improvements Plan - By User Type

**Created:** 2026-01-15  
**Status:** Active Planning Document

---

## Executive Summary

This document outlines UX improvements organized by user role, focusing on reducing friction and increasing engagement. Each section includes current pain points, proposed solutions, and success metrics.

---

## 1. Consultant Experience

### 1.1 Current State

Consultants are power users managing 10-50+ startups. They need:
- Quick triage of attention-requiring workspaces
- Efficient session preparation
- Scalable template management
- CRM pipeline visibility

### 1.2 Pain Points Identified

| Pain Point | Evidence | Impact |
|------------|----------|--------|
| Too many clicks to see at-risk startups | Navigate to list → filter → click | 30s+ per triage |
| Session prep is manual | No auto-context loading | 5min+ per meeting |
| Template feedback scattered | Comments in different places | Lost context |
| CRM inbox overwhelming | All items visible | Decision fatigue |

### 1.3 Improvements (Implemented)

#### ✅ Work Queue Panel (`src/components/staff/WorkQueuePanel.tsx`)
- **What:** Single view of items needing attention
- **How:** Aggregates overdue actions, at-risk startups, pending reviews
- **Impact:** Triage time reduced to <10s

#### ✅ Triage Workspace List (`src/components/staff/TriageWorkspaceList.tsx`)
- **What:** Focused list with health indicators
- **How:** Shows health badge, last session, overdue count
- **Impact:** Quick visual scanning

#### ✅ CRM Focus Mode (`src/pages/CRM.tsx:69`)
- **What:** Filter to urgent items only
- **How:** Toggle shows only overdue/stale relationships
- **Impact:** Reduces inbox by 70%+ typically

### 1.4 Improvements (Proposed)

| Improvement | Priority | Effort | Expected Impact |
|-------------|----------|--------|-----------------|
| Session prep auto-context | P1 | Medium | Save 5min/meeting |
| Bulk action bar for workspaces | P2 | Low | 10x faster batch ops |
| Template AI suggestions in-flow | P2 | Medium | Better feedback quality |
| Keyboard shortcuts for triage | P3 | Low | Power user efficiency |

---

## 2. Founder Experience

### 2.1 Current State

Founders are guided users focused on their startup. They need:
- Clear "what to do next" guidance
- Progress visibility
- Easy session scheduling
- Motivation and momentum

### 2.2 Pain Points Identified

| Pain Point | Evidence | Impact |
|------------|----------|--------|
| Overwhelmed by dashboard options | Many cards/tabs visible | Analysis paralysis |
| Unclear on next steps | No prioritized actions | Stalled progress |
| Scheduling friction | Multiple clicks to book | Missed sessions |
| No sense of progress | Static stage display | Low motivation |

### 2.3 Improvements (Implemented)

#### ✅ One Thing Today (`src/components/dashboard/OneThingToday.tsx`)
- **What:** Single most important action
- **How:** Algorithmic priority: overdue → due today → upcoming
- **Impact:** Clear daily focus

#### ✅ Streak Hero (`src/components/dashboard/StreakHero.tsx`)
- **What:** Gamification of consistent engagement
- **How:** Tracks weekly activity, shows streak count
- **Impact:** Motivation through momentum

#### ✅ Founder Booking CTA (`src/components/dashboard/FounderBookingCTA.tsx`)
- **What:** Prominent session booking above fold
- **How:** Shows next available slot, one-click book
- **Impact:** Reduced booking friction

#### ✅ Stage Progress Card (`src/components/dashboard/StageProgressCard.tsx`)
- **What:** Visual progress through incubation
- **How:** Shows stage, progress %, next milestone
- **Impact:** Clear journey visibility

### 2.4 Improvements (Proposed)

| Improvement | Priority | Effort | Expected Impact |
|-------------|----------|--------|-----------------|
| Milestone celebration animations | P2 | Low | Dopamine reward loop |
| Weekly progress email summary | P2 | Medium | Re-engagement |
| Mobile-first action flow | P2 | Medium | On-the-go updates |
| Peer comparison (anonymous) | P3 | High | Competitive motivation |

---

## 3. Mentor Experience

### 3.1 Current State

External mentors are low-engagement users. They need:
- Minimal friction to contribute
- Clear scheduling
- Session context without exploring
- Simple NDA flow

### 3.2 Pain Points Identified

| Pain Point | Evidence | Impact |
|------------|----------|--------|
| NDA flow unclear | Multiple steps | Abandonment |
| Availability setup complex | Many options | Config fatigue |
| Session details hard to find | Navigate through workspace | Prep time wasted |
| No clear "what's expected" | Generic dashboard | Role confusion |

### 3.3 Improvements (Implemented)

#### ✅ NDA Flow (`src/pages/MentorNda.tsx`)
- **What:** Dedicated NDA acceptance page
- **How:** Clear legal text, single checkbox, confirm button
- **Impact:** 100% completion rate

#### ✅ Mentor Dashboard (`src/components/dashboard/MentorDashboard.tsx`)
- **What:** Role-specific home view
- **How:** Shows connected startups, upcoming sessions only
- **Impact:** Reduced cognitive load

### 3.4 Improvements (Proposed)

| Improvement | Priority | Effort | Expected Impact |
|-------------|----------|--------|-----------------|
| Pre-session email with context | P1 | Medium | Better prep, better sessions |
| One-click availability toggle | P2 | Low | Easier scheduling |
| Post-session feedback (1 click) | P2 | Low | Quality signal |
| Impact dashboard (hours given) | P3 | Medium | Recognition motivation |

---

## 4. Admin Experience

### 4.1 Current State

Admins manage operations across the entire platform. They need:
- Space and waiting list management
- Integration health visibility
- User management and approvals
- CRM oversight

### 4.2 Pain Points Identified

| Pain Point | Evidence | Impact |
|------------|----------|--------|
| Integration failures invisible | No dashboard | Silent broken syncs |
| Waiting list scattered | Multiple places to check | Missed applications |
| Space allocation manual | No visual tool | Time-consuming |
| No operational dashboard | Navigate to each feature | Context switching |

### 4.3 Improvements (Implemented)

#### ✅ Integration Errors Panel (`src/components/admin/IntegrationErrorsPanel.tsx`)
- **What:** Visible error list with resolution
- **How:** Queries integration_errors table, shows actionable items
- **Impact:** Proactive issue resolution

#### ✅ Admin Menu Reorganization
- **What:** 5 logical groups instead of flat list
- **How:** Operations, People, Content, Insights, System
- **Impact:** Faster navigation

#### ✅ Interactive Floor Map (`src/components/backoffice/InteractiveFloorMapViewer.tsx`)
- **What:** Visual space allocation
- **How:** Click-to-assign rooms on floor plan
- **Impact:** Intuitive space management

### 4.4 Improvements (Proposed)

| Improvement | Priority | Effort | Expected Impact |
|-------------|----------|--------|-----------------|
| Unified operations dashboard | P1 | High | Single pane of glass |
| Waiting list auto-routing | P2 | Medium | Faster onboarding |
| Integration health scores | P2 | Medium | Predictive maintenance |
| Bulk user management | P3 | Medium | Efficient admin ops |

---

## 5. Navigation & Information Architecture

### 5.1 Current Structure

```
Sidebar:
├── My Workspaces (home for all)
├── [Workspace cards/list]
├── Find Mentors (founders + mentors)
├── CRM (staff only)
├── Consultor Tools (staff only)
├── Admin (admin only)
│   ├── Operations (backoffice, CRM)
│   ├── People (users, mentors, teams)
│   ├── Content (templates, playbooks, exercises)
│   ├── Insights (analytics, surveys)
│   └── System (programs, integrations, flags)
├── Settings
└── Help
```

### 5.2 Proposed Improvements

| Improvement | Rationale |
|-------------|-----------|
| Role-based sidebar filtering | Hide irrelevant items |
| Recent workspaces quick access | Reduce navigation steps |
| Keyboard navigation (⌘K) | Power user efficiency |
| Breadcrumbs on all pages | Context awareness |

---

## 6. Empty State & Loading Patterns

### 6.1 Design Principles

1. **Empty states explain what to do next** - Not just "No data"
2. **Loading states show skeleton UI** - Reduce perceived latency
3. **Error states offer recovery** - Retry or navigate away

### 6.2 Standard Components

| Component | Usage |
|-----------|-------|
| `EmptyState` | Tables/lists with no data |
| `ContentSkeleton` | Page-level loading |
| `Skeleton` | Individual element loading |
| `ErrorBoundary` | Crash recovery |

### 6.3 Checklist

- [ ] All tables have empty state with CTA
- [ ] All async data shows skeleton
- [ ] All forms show submission state
- [ ] All errors have retry option

---

## 7. Accessibility Checklist

### 7.1 Keyboard Navigation

| Requirement | Status |
|-------------|--------|
| All interactive elements focusable | ✅ (shadcn default) |
| Tab order logical | ✅ |
| Escape closes modals/drawers | ✅ |
| Enter activates buttons | ✅ |
| Arrow keys in lists | ⚠️ Partial |

### 7.2 Visual Accessibility

| Requirement | Status |
|-------------|--------|
| Color contrast 4.5:1 minimum | ✅ |
| Focus indicators visible | ✅ |
| Text resizable to 200% | ✅ |
| Dark mode support | ✅ |

### 7.3 Screen Reader Support

| Requirement | Status |
|-------------|--------|
| Alt text on images | ⚠️ Partial |
| ARIA labels on icons | ⚠️ Partial |
| Semantic HTML structure | ✅ |
| Form labels associated | ✅ |

### 7.4 Mobile Experience

| Requirement | Status |
|-------------|--------|
| Touch targets 44x44px | ⚠️ Partial |
| Responsive layouts | ✅ |
| No horizontal scroll | ⚠️ Partial (tables) |
| PWA installable | ✅ |

---

## 8. Terminology Consistency

### 8.1 Core Terms

| Concept | Standard Term | Avoid |
|---------|---------------|-------|
| Startup container | **Workspace** | Project, Company |
| Startup company | **Startup** | Company, Venture |
| Incubation phase | **Stage** | Phase, Step |
| Incubation program | **Program** | Cohort, Track |
| Consultant | **Consultor** | Advisor, Mentor |
| External advisor | **Mentor** | Consultant, Coach |
| Progress meeting | **Session** | Meeting, Call |
| Deliverable | **Template** | Document, Artifact |

### 8.2 i18n Status

| Language | Coverage | Status |
|----------|----------|--------|
| English | 100% | ✅ Complete |
| Portuguese | 95% | ⚠️ Minor gaps |

---

## 9. Metrics Plan

### 9.1 Activation Metrics

| Metric | Role | Measurement | Target |
|--------|------|-------------|--------|
| Time to First Value | Founder | Signup → First KPI | < 10 min |
| Time to First Value | Consultant | Login → First workspace view | < 2 min |
| Time to First Value | Mentor | Invite → First session | < 48 hours |
| Time to First Value | Admin | Login → First approval | < 5 min |

### 9.2 Retention Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Weekly Active Consultants | % with login in past 7 days | > 80% |
| Monthly KPI Submission | Founders with KPIs this month | > 70% |
| Session Completion | Scheduled → Completed | > 90% |
| Mentor Session Frequency | Sessions per month per mentor | > 2 |

### 9.3 Conversion Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Lead → Onboarded | CRM new → incubating | > 40% |
| Mentor Invite → Active | Invited → 1+ session | > 60% |
| Application → Approved | Pending → active | > 50% |

### 9.4 Mentor Participation Funnel

```
Invited (email sent)
    ↓ 80% target
Account Created
    ↓ 90% target
NDA Accepted
    ↓ 70% target
First Session Scheduled
    ↓ 95% target
Session Completed
```

### 9.5 Operational Health Metrics

| Metric | Measurement | Target |
|--------|-------------|--------|
| Graph Sync Failures | Errors per day | < 5 |
| Booking Failures | Failed bookings per week | 0 |
| RLS Block Events | 403 responses per week | < 10 |
| API Latency P95 | Edge function response | < 500ms |
| Page Load P95 | Initial page render | < 2s |

---

## 10. Implementation Priority

### Phase 1 (Week 1-2): Foundation

- [x] Work Queue Panel
- [x] One Thing Today
- [x] Integration Errors Panel
- [ ] Session prep auto-context
- [ ] Pre-session mentor email

### Phase 2 (Week 3-4): Engagement

- [ ] Weekly health digest
- [ ] Milestone celebrations
- [ ] Post-session feedback
- [ ] Bulk workspace actions

### Phase 3 (Week 5-6): Polish

- [ ] Unified admin dashboard
- [ ] Keyboard shortcuts
- [ ] Mobile optimization
- [ ] Accessibility audit fixes

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Owner:** Product Team
