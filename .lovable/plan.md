

## Plan: Go-Live Runbook with Launch Mode Toggle

### Analysis

The project already has a `feature_flags` table and `useFeatureFlag` hook. Rather than creating a separate env var `LAUNCH_MODE`, I will use the existing feature flag system to add an `open_registration` flag. This keeps the toggle in the database (changeable by staff without redeployment) and follows existing patterns.

**Current security layers already in place:**
- Account status defaults to `pending` → staff must approve via `PendingUsersManager`
- Workspace access gated by `has_active_workspace_access` (only `active`/`claimed`)
- `imported_unclaimed` workspaces invisible to non-staff
- Claim flow exists at `/claim-startup`

### What's Missing

1. **No signup restriction** — anyone can register right now. For prelaunch, we need to restrict signups to known emails or allowed domains.
2. **No `open_registration` feature flag** — need to seed it as OFF.
3. **No deployment checklist** in the codebase.

### Implementation

#### 1. Database: Seed `open_registration` Feature Flag

Insert a new global flag `open_registration` (disabled by default = prelaunch mode):

```sql
INSERT INTO feature_flags (key, scope, enabled, description)
VALUES ('open_registration', 'global', false, 'When OFF: only allowlisted emails/domains can sign up (prelaunch). When ON: open registration with claim flow.');
```

Also create an `signup_allowlist` table for prelaunch control:

```sql
CREATE TABLE public.signup_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT, -- exact email match
  domain TEXT, -- domain match (e.g. @startupleiria.com)
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT allowlist_email_or_domain CHECK (email IS NOT NULL OR domain IS NOT NULL)
);
ALTER TABLE public.signup_allowlist ENABLE ROW LEVEL SECURITY;
-- Staff-only access
CREATE POLICY "Staff can manage allowlist" ON public.signup_allowlist
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
```

Seed with `@startupleiria.com` domain and any known founder emails from `startups.main_contact_email`:

```sql
INSERT INTO signup_allowlist (domain) VALUES ('startupleiria.com');
INSERT INTO signup_allowlist (email)
  SELECT DISTINCT LOWER(main_contact_email)
  FROM startups WHERE main_contact_email IS NOT NULL
  ON CONFLICT DO NOTHING;
```

#### 2. Frontend: Gate Signup in Login.tsx

Update `Login.tsx` signup handler:
- Add `useFeatureFlag('open_registration')` check
- When OFF (prelaunch): before calling `signUp`, check email against `signup_allowlist` table via a lightweight RPC or direct query
- If not allowed: show error "Registration is currently invite-only. Contact staff if you believe this is an error."
- When ON (live): allow all signups (existing claim flow + pending approval handles the rest)

Update `FeatureFlagKey` type to include `'open_registration'`.

#### 3. Frontend: Allowlist Check

Add a small helper function:
```typescript
async function isEmailAllowlisted(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  const { count } = await supabase
    .from('signup_allowlist')
    .select('id', { count: 'exact', head: true })
    .or(`email.eq.${email.toLowerCase()},domain.eq.${domain}`);
  return (count ?? 0) > 0;
}
```

#### 4. Deployment Checklist Document

Create `docs/GO_LIVE_CHECKLIST.md` with the step-by-step runbook.

### Files to Create/Edit

| Action | File | Purpose |
|--------|------|---------|
| Migration | SQL | `signup_allowlist` table + seed `open_registration` flag |
| Edit | `src/hooks/useFeatureFlags.ts` | Add `open_registration` to type |
| Edit | `src/pages/Login.tsx` | Gate signup with allowlist check in prelaunch |
| Create | `docs/GO_LIVE_CHECKLIST.md` | Deployment runbook |

### Go-Live Checklist (will be in the doc)

```text
GO-LIVE CHECKLIST — 2026-03-04
================================

PRE-FLIGHT (before sending the link)
1. [ ] CI green on main (all jobs: lint-and-build, db-tests, test, e2e)
2. [ ] Production domain in Auth redirect URLs
     → Lovable Cloud > Auth Settings > Redirect URLs
     → Must include: https://leiria-launchpad-pro.lovable.app
3. [ ] Feature flag 'open_registration' = OFF (prelaunch)
4. [ ] Allowlist seeded with founder emails from HubSpot import
5. [ ] Imported workspaces status = 'imported_unclaimed'
6. [ ] Publish latest build to production

SMOKE TESTS (5 min each)
7. [ ] Staff login → sees all workspaces + claim queue
8. [ ] New founder signup (allowlisted email) → pending approval → approve → claim → workspace
9. [ ] New founder signup (non-allowlisted) → blocked with clear message
10. [ ] Founder login → only sees own workspace, not others
11. [ ] Mentor login → NDA gate → only assigned workspaces

GO LIVE
12. [ ] Send link to founders
13. [ ] Monitor claim queue in Staff Cockpit > Associações tab

POST-LAUNCH (when ready for open registration)
14. [ ] Set 'open_registration' flag to ON via Admin > Feature Flags
15. [ ] All new signups go through: signup → pending → approve → claim

ROLLBACK
- If critical bug: Disable signups by setting 'open_registration' OFF + clear allowlist
- If data leak: Check RLS — imported_unclaimed workspaces are hidden from all non-staff
- If claim flow broken: Staff can manually link users via Staff Cockpit > Associações
```

### Safety

- No service_role client-side
- Allowlist check uses anon key (RLS allows SELECT for the check via a public function)
- Actually, the allowlist table is staff-only for management, but we need signup users (unauthenticated) to check against it. Solution: create a `check_signup_allowed` SECURITY DEFINER function that takes an email and returns boolean, callable by anon.

#### Revised: `check_signup_allowed` RPC

```sql
CREATE OR REPLACE FUNCTION public.check_signup_allowed(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open BOOLEAN;
  v_domain TEXT;
BEGIN
  -- Check if open registration is enabled
  SELECT enabled INTO v_open FROM feature_flags WHERE key = 'open_registration' AND scope = 'global' LIMIT 1;
  IF COALESCE(v_open, false) THEN
    RETURN true;
  END IF;

  -- Prelaunch: check allowlist
  v_domain := split_part(LOWER(p_email), '@', 2);
  RETURN EXISTS (
    SELECT 1 FROM signup_allowlist
    WHERE LOWER(email) = LOWER(p_email) OR LOWER(domain) = v_domain
  );
END;
$$;
```

This keeps the logic server-side and prevents enumeration (returns boolean only).

