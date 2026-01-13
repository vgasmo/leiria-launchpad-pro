# FoundersBook UX Notes

## What Makes This Product Uniquely Valuable

### 1. Founder-Centric Design
Unlike generic project management tools, FoundersBook is purpose-built for startup journeys:
- **One Thing Today**: Reduces cognitive load by surfacing the single most impactful action
- **Stage-Based Playbooks**: Contextual guidance that evolves with the startup
- **Investor Readiness Track**: Built-in preparation for fundraising, not bolted-on

### 2. High-Leverage Consultant Tools
Consultants manage portfolios, not individual tasks:
- **Cockpit View**: See all assigned startups at a glance
- **Session Prep Automation**: AI-powered context gathering before each meeting
- **One-Click Actions**: Request check-ins, assign playbooks, approve templates

### 3. Low-Friction Mentoring
Mentors contribute expertise without administrative burden:
- **Structured Sessions**: Templates guide productive conversations
- **Availability Windows**: Simple weekly scheduling
- **NDA Handled**: Digital acceptance with audit trail

### 4. Signal Over Noise for Investors
Investors get curated insights, not raw data:
- **Progress Snapshots**: Stage, milestones, and KPIs at a glance
- **Investor Updates**: Founder-generated monthly summaries
- **Dataroom Access**: Secure, time-limited document sharing

---

## Key Friction Points Solved

### Before: Mixed Language UI
- **Problem**: Portuguese database content mixed with English UI strings
- **Solution**: Comprehensive i18n layer with `t()` function for all user-facing strings
- **Result**: Consistent language experience regardless of language selection

### Before: Manual Consultant Assignment
- **Problem**: Admin had to manually assign each lead to a consultant
- **Solution**: Intake Routing system with single/round-robin modes
- **Result**: Leads automatically routed to correct consultant calendar

### Before: Template Review Chaos
- **Problem**: Founders submitted templates with no structure; consultants reviewed in silos
- **Solution**: AI Coach provides instant analysis; structured review workflow
- **Result**: Faster feedback loops, consistent quality

### Before: Calendar Booking Friction
- **Problem**: External leads couldn't easily schedule first meetings
- **Solution**: Public booking links with real-time calendar availability
- **Result**: Leads book directly into consultant calendars

### Before: Security Gaps in Pending Workspaces
- **Problem**: Pending (unapproved) workspaces had partial access to sensitive data
- **Solution**: `has_active_workspace_access` RLS function enforces approval gating
- **Result**: No data leakage for pending applications

---

## Design Principles Applied

### 1. Progressive Disclosure
- Homepage shows only what matters today
- Details available on-demand, not upfront
- Complex features (AI Coach, intake routing) hidden until needed

### 2. Role-Based Views
- Same data, different presentations by role
- Founders see progress; consultants see portfolio health
- Prevents information overload

### 3. Consistent Visual Language
- Semantic color tokens (no hardcoded colors)
- Status badges with clear meaning
- Canvas templates with sticky-note metaphor

### 4. Fail-Safe Defaults
- Public booking disabled by default (feature flag)
- Empty states guide next actions
- Error messages don't expose internal details

---

## What's Next (Future Iterations)

### P2 Items for Future
- Per-program intake routing (not just global)
- Investor portal with self-serve access requests
- Mobile-optimized founder experience
- Cohort analytics dashboard for program managers
- Integration with additional calendar providers (Google, Apple)
