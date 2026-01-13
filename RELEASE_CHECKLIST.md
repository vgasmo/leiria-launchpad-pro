# FoundersBook Release Checklist

## Pre-Release Verification

### Build & Type Safety
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` completes successfully
- [ ] No console errors in development mode

### Database & Migrations
- [ ] All migrations applied cleanly
- [ ] RLS policies verified on all tables
- [ ] `intake_routing` table exists and has correct policies
- [ ] `has_workspace_access` function works correctly

### Authentication & Authorization
- [ ] Login/signup flow works
- [ ] Password reset flow works
- [ ] Role-based access control verified:
  - [ ] Founders can only access their workspaces
  - [ ] Consultants can access assigned workspaces
  - [ ] Mentors see only connected startups
  - [ ] Admins have full access

### Security
- [ ] Pending workspace cannot access sensitive tables (sessions, KPIs, templates)
- [ ] Public booking invalid token returns safe error (no data leak)
- [ ] Global integration secrets not exposed to browser
- [ ] Rate limiting works on AI endpoints

### Microsoft Graph Integration
- [ ] Graph API credentials properly stored
- [ ] `check-consultant-availability` returns slots
- [ ] `validate-booking-slot` validates correctly
- [ ] `sync-outlook-calendar` syncs events
- [ ] Teams meeting creation works

### Core Features

#### Founder Flow
- [ ] Can book first meeting from homepage
- [ ] One Thing Today shows correct priority
- [ ] Can submit visual template for review
- [ ] Monthly check-in submission works
- [ ] Investor update generation works

#### Consultant Flow
- [ ] Portfolio dashboard shows assigned startups
- [ ] Session prep loads correctly
- [ ] Can approve/reject templates
- [ ] Can classify and convert leads
- [ ] Intake routing configuration works

#### Mentor Flow
- [ ] Can set availability
- [ ] NDA acceptance works
- [ ] Can join structured sessions

#### Investor Flow
- [ ] Read-only view works
- [ ] Investor updates visible when shared

### Localization
- [ ] Templates page is 95%+ Portuguese in PT mode
- [ ] Category headers translated
- [ ] Template names/descriptions translated
- [ ] AI Coach panel fully translated
- [ ] No mixed English/Portuguese strings

### Edge Functions
- [ ] `generate-template-coach` deployed and working
- [ ] `public-get-availability` uses intake routing
- [ ] `public-book-first-contact` uses intake routing
- [ ] All functions handle errors gracefully

---

## Go/No-Go Decision

| Area | Status | Notes |
|------|--------|-------|
| Build | ⬜ | |
| Security | ⬜ | |
| Graph Integration | ⬜ | |
| Core Features | ⬜ | |
| Localization | ⬜ | |
| Edge Functions | ⬜ | |

**Decision**: ⬜ GO / ⬜ NO-GO

**Signed off by**: _______________

**Date**: _______________
