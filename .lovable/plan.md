

## Plan: Unclaimed-to-Claimed Onboarding Flow

### Current State
- **Workspaces** have a `status` column with CHECK constraint: `('pending', 'active', 'rejected', 'archived')`
- **Startups** table has `main_contact_email` (staff-only field from HubSpot imports)
- `useWorkspaces` already filters `.eq('status', 'active')` -- founders never see pending/archived
- `has_active_workspace_access()` restricts data access to `status = 'active'` workspaces
- `ProtectedRoute` gates pending accounts to `/pending-approval`
- No claim mechanism exists today

### Design

#### 1. Database Migration

**a) Expand workspace status constraint:**
```sql
ALTER TABLE public.workspaces DROP CONSTRAINT workspaces_status_check;
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_status_check 
  CHECK (status IN ('imported_unclaimed', 'claimed', 'pending', 'active', 'rejected', 'archived'));
```
Update existing HubSpot-imported workspaces with status `'pending'` that have no `workspace_users` entry to `'imported_unclaimed'`.

**b) Create `startup_claim_requests` table:**
```sql
CREATE TABLE public.startup_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES public.startups(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_claimed')),
  match_method TEXT, -- 'email_match', 'manual_request'
  requested_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.startup_claim_requests ENABLE ROW LEVEL SECURITY;
```

**c) Create `claim_startup` SECURITY DEFINER function:**
- Checks if `auth.uid()` email matches any `startups.main_contact_email`
- If match: auto-creates `workspace_users` entry, sets workspace status to `'claimed'`, logs in `startup_claim_requests` with `status='auto_claimed'`
- If no match: inserts a `startup_claim_requests` row with `status='pending'` for staff review

**d) Create `approve_startup_claim` SECURITY DEFINER function (admin-only):**
- Links user to workspace, sets workspace to `'claimed'`, marks claim as `'approved'`

**e) RLS Policies:**
- `startup_claim_requests`: founders can SELECT own rows; staff can SELECT/UPDATE all
- `workspaces`: existing RLS already blocks non-active. Add: founders can SELECT `'claimed'` workspaces they are members of. `imported_unclaimed` visible to NO ONE except staff.
- `startups`: unclaimed startups invisible to founders (only via the claim function)

#### 2. Frontend: Claim Your Startup Page

**New page: `src/pages/ClaimStartup.tsx`** (route: `/claim-startup`)
- After login, if founder has no active/claimed workspaces: redirect here
- Calls `claim_startup` RPC
- **Auto-match found**: Shows "We found your startup: [name]! Claiming..." -> redirects to `/my-workspaces`
- **No match**: Shows "Request Access" form with startup name input -> creates claim request -> shows "Awaiting staff review" message

**Modify `ProtectedRoute`:**
- After pending-approval check, add: if founder + no workspaces + not on `/claim-startup` -> redirect to `/claim-startup`

#### 3. Staff: Unmatched Claims Queue

**New component: `src/components/admin/ClaimRequestsQueue.tsx`**
- Shows pending `startup_claim_requests` with user email, requested startup
- "Approve" button calls `approve_startup_claim` RPC
- "Reject" button updates status
- Integrated into `StaffCockpit` triage tab

#### 4. Visibility Rules (Summary)

| Status | Founders | Staff | Mentors | Ecosystem Directory |
|--------|----------|-------|---------|-------------------|
| `imported_unclaimed` | Hidden | Visible | Hidden | Hidden |
| `claimed` | Own only | Visible | Hidden | Hidden |
| `active` | Own only | Visible | Assigned only | Visible |

#### 5. Auth Redirect / Production Domain
- Verify `window.location.origin` is used in all auth redirects (already the case)
- No changes needed -- PKCE flow handles this

### Files to Create/Edit

| Action | File | Purpose |
|--------|------|---------|
| **Migration** | `supabase/migrations/[new].sql` | Schema changes above |
| **Create** | `src/pages/ClaimStartup.tsx` | Claim page |
| **Create** | `src/components/admin/ClaimRequestsQueue.tsx` | Staff queue |
| **Edit** | `src/App.tsx` | Add `/claim-startup` route + redirect logic |
| **Edit** | `src/hooks/useWorkspaces.ts` | Include `'claimed'` in founder queries |
| **Edit** | `src/pages/StaffCockpit.tsx` | Add claims queue tab |
| **Edit** | `src/i18n/locales/en.json` + `pt.json` | i18n keys |

### Safety
- No service_role client-side
- All claim logic in SECURITY DEFINER functions
- Existing RLS functions (`has_active_workspace_access`, `has_workspace_access`) already block `imported_unclaimed` since they check for `status = 'active'`
- HubSpot-imported data is untouched (only status field changes from `pending` -> `imported_unclaimed`)

