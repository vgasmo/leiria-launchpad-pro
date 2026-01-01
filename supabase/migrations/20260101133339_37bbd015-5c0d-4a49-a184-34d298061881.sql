-- 1) Ensure consultors can write in a workspace (used by meetings + workspace_kpis + storage policies)
create or replace function public.can_write_workspace(_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'consultor'::public.app_role
    )
    or exists (
      select 1
      from public.workspace_users wu
      where wu.workspace_id = _workspace_id
        and wu.user_id = auth.uid()
        and wu.active = true
        and wu.role in ('founder'::public.app_role, 'mentor_externo'::public.app_role, 'consultor'::public.app_role)
    );
$$;

-- 2) Documents upload should work for everybody with workspace access
-- Update storage policies for workspace documents so INSERT/UPDATE/DELETE are allowed
-- for any authenticated user who has access to that workspace.

-- Drop old, more restrictive policies (if present)
drop policy if exists "Users can upload documents to their workspaces" on storage.objects;
drop policy if exists "Users can update documents in their workspaces" on storage.objects;
drop policy if exists "Users can delete documents in their workspaces" on storage.objects;

-- Recreate policies aligned with documents table RLS (workspace access)
create policy "Users can upload documents to their workspaces"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-documents'
  and public.has_workspace_access(((storage.foldername(name))[1])::uuid)
);

create policy "Users can update documents in their workspaces"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'workspace-documents'
  and public.has_workspace_access(((storage.foldername(name))[1])::uuid)
);

create policy "Users can delete documents in their workspaces"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-documents'
  and public.has_workspace_access(((storage.foldername(name))[1])::uuid)
);
