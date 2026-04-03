
# Product Audit Plan — Startup Leiria Ecosystem OS

## Phase 1: Infrastructure & Release Wrapper (5 min)
- Check .gitignore, package.json, lockfiles, env hygiene
- Verify build/test reproducibility

## Phase 2: Auth & Role Guards (10 min)
- Browser test login flow
- Verify role-based redirects (founder, consultant, admin, backoffice, mentor)
- Test protected route guards
- Check session restore behavior

## Phase 3: Founder Experience (10 min)
- Dashboard, empty states, onboarding clarity
- Workspace visibility and navigation
- Contract intake public flow (token-based)
- Signature flow

## Phase 4: Staff/Consultant Experience (10 min)
- CRM pipeline navigation and lead management
- Lead detail drawer functionality
- Contract sending flow
- Consultant tools and coaching tabs

## Phase 5: Admin Experience (5 min)
- Admin tabs completeness
- Settings, governance views
- User/role management

## Phase 6: Backoffice Experience (5 min)
- Contract lifecycle views
- Space operations
- Pricing tables

## Phase 7: CRM → Contract E2E Flow (10 min)
- Lead creation → qualification → contracting → intake → signature → activation
- State sync between CRM stages and contract states

## Phase 8: Public/Token Flows (5 min)
- Public contract intake page
- Token validation/expiry handling

## Phase 9: Cross-cutting (5 min)
- i18n completeness
- Responsive critical pages
- Console errors, network failures

## Phase 10: Report Generation
- Classify all findings by severity, role, domain
- Benchmark comparison
- Recommended fix batches
