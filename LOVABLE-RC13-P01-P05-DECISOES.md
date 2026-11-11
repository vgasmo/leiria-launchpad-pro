# PROMPT LOVABLE — RC13 · P01 a P05 — As cinco decisões: staff pendente, notas internas do staff, página de impacto, tabela de backup e CI

**Contexto.** O P00 está aplicado e verificado no snapshot de 11 nov 2026 (drizzle 0000 a 0038). Estes cinco módulos são as decisões já tomadas pelo responsável. Foram aplicados em conjunto numa cópia desse snapshot: `tsc` 0 erros, `eslint` 0 problemas, `vitest` 51 ficheiros e 332 testes, `i18n:lint` e `i18n:check` com 9390 chaves, e 40 suites pgTAP com 419 asserções numa base reconstruída com `supabase/migrations` mais `drizzle/migrations` e as três migrações novas.

## Regras (valem para os cinco módulos)
1. Aplique os módulos **pela ordem em que aparecem**: P01, P03, P04, P05, P02. Os diffs de cada módulo contam com os anteriores já aplicados. Aplique TUDO o que está em cada módulo e NADA mais.
2. Os diffs são `-U2` sobre o snapshot de 11 nov 2026. Se um diff não aplicar, **pare nesse módulo e diga qual**; não improvise.
3. SQL: há três migrações (P01, P03 e P05). Aplique cada uma pela ferramenta de migrações do projeto, a seguir à `0038`, numa migração própria e por esta ordem. São idempotentes. A do P01 tem blocos `DO $guard$` que abortam de propósito se a função real divergir: se isso acontecer, **pare e devolva o md5 e o `pg_get_functiondef` dessa função**.
4. Nunca edite migrações que já existem. `src/integrations/supabase/types.ts` não é editado à mão: regenere-o depois da migração do P03, **antes** de aplicar os diffs de cliente desse módulo, porque passam a usar a tabela nova `workspace_staff_notes`.
5. Nenhuma Edge Function muda. No fim publique o frontend.
6. No fim, responda com: (a) os módulos aplicados, (b) o que não aplicou e porquê, (c) qualquer erro de compilação ou de migração, com o texto exato.

---

## P01 · Papel de staff só vale com a conta aprovada
**Impacto na Estrela-Guia:** indireto; protege as contas de quem faz as sessões. **Esforço:** baixo. **Risco:** baixo: a 11 nov não existe nenhuma conta de staff pendente na base real, por isso ninguém fica bloqueado.

**Ficheiros e linhas:** funções `account_not_suspended(uuid)`, `has_role(uuid, app_role)` e `is_account_active()`; `src/components/auth/ProtectedRoute.tsx:56`; `src/components/admin/AdminUsersManager.tsx:124-128`; três suites pgTAP cujas fixtures contavam com o bypass.

**O que acontece hoje.** Uma conta com `account_status = 'pending'` e papel admin, consultor ou backoffice tem os poderes todos do papel. Provado na réplica: um admin pendente lê tudo, altera perfis de outros, aprova-se a si próprio e atribui o papel admin a terceiros. Não é acidente: `is_account_active()` tem um "staff bypass" explícito, `account_not_suspended` só exclui suspensos e o guarda de rotas do cliente deixa passar `isAccountPending && isStaff`. Chega-se lá com um gesto banal: o admin dá um papel de staff a uma conta que ainda não aprovou. As Edge Functions já recusam estas contas, por isso as três camadas não concordam entre si.

**O que passa a acontecer.** `account_not_suspended` devolve falso também para conta pendente com papel de staff. É o ponto único por onde passam `is_staff()`, `is_admin()`, `is_backoffice()`, `can_access_backoffice()`, `has_global_workspace_access()`, `has_workspace_access()` e a política restritiva das 204 tabelas e do Storage, por isso nenhuma outra função nem política muda. `has_role` deixa de dar papéis de staff a contas pendentes e `is_account_active()` perde o bypass. Um founder pendente fica exatamente como estava. No cliente, a conta pendente vai sempre para a página de aprovação, e o admin que atribui um papel de staff a uma conta pendente é avisado de que falta aprová-la.

**Migração (conteúdo exato):**

```sql
-- RC13 P01 · papel de staff só vale com a conta aprovada (fecha o "staff bypass" das contas pendentes).
-- Idempotente. Redefine 3 funções; cada uma tem guarda md5 e a migração aborta se a definição real divergir.
-- Os md5 de partida foram lidos na base real a 11 nov 2026 e são iguais aos da réplica.

-- ═══ 1. account_not_suspended: passa a devolver false também para conta PENDENTE com papel de staff ═══
-- É o ponto único por onde passam is_staff(), is_admin(), is_backoffice(), can_access_backoffice(),
-- has_global_workspace_access(), has_workspace_access() e a política restritiva rc12_suspended_block
-- das 204 tabelas e do Storage. Um founder pendente (sem papel de staff) fica exatamente como estava.
DO $guard$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_md5 FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'account_not_suspended'
     AND pg_get_function_identity_arguments(p.oid) = '_user_id uuid';
  IF v_md5 NOT IN ('323d060dd1ca1c4c0c7ccf01d637e46d', '6c3662bf5951e114ab227c55c184b98a') THEN
    RAISE EXCEPTION 'rc13: definição de public.account_not_suspended divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', v_md5;
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.account_not_suspended(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ SELECT CASE WHEN auth.role() = 'anon' OR (auth.uid() IS NULL AND auth.role() IS DISTINCT FROM 'service_role') THEN false ELSE _user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND (p.account_status = 'suspended' OR (p.account_status = 'pending' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('admin'::public.app_role, 'consultor'::public.app_role, 'backoffice'::public.app_role))))) END; $function$;

-- ═══ 2. has_role: os papéis de staff deixam de valer numa conta suspensa OU pendente ═══
DO $guard$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_md5 FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'has_role'
     AND pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _role app_role';
  IF v_md5 NOT IN ('ef25422c4c8524dba6f9cfeb797b5b51', '6931c65a2398d7b0f955065b117f182e') THEN
    RAISE EXCEPTION 'rc13: definição de public.has_role divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', v_md5;
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN coalesce(current_setting('request.jwt.claim.role', true),
                  NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'anon' THEN false
    -- RC12 + RC13: os papéis de staff só valem numa conta que não esteja suspensa nem pendente
    WHEN _role IN ('admin'::public.app_role, 'consultor'::public.app_role, 'backoffice'::public.app_role)
         AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.account_status IN ('suspended', 'pending')) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END
$function$;

-- ═══ 3. is_account_active(): sai o "staff bypass"; ativa é só a conta aprovada ═══
DO $guard$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_md5 FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'is_account_active'
     AND pg_get_function_identity_arguments(p.oid) = '';
  IF v_md5 NOT IN ('ce406d5946bdd3a6e7c5a6875575cd6b', '41943a545b2e4b269b54a49dacc10113') THEN
    RAISE EXCEPTION 'rc13: definição de public.is_account_active() divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', v_md5;
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.is_account_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND account_status = 'approved'
  );
$function$;
```

**Alterar `src/components/admin/AdminUsersManager.tsx`:**

```diff
--- a/src/components/admin/AdminUsersManager.tsx
+++ b/src/components/admin/AdminUsersManager.tsx
@@ -125,4 +125,8 @@ export function AdminUsersManager() {
     if (!addRoleDialog) return;
     await addUserRole.mutateAsync({ user_id: addRoleDialog.userId, role: selectedRole });
+    const target = profiles?.find(p => p.id === addRoleDialog.userId);
+    if (['admin', 'consultor', 'backoffice'].includes(selectedRole) && target?.account_status === 'pending') {
+      notify.warn(t('admin.userManagement.rolePendingHint'));
+    }
     setAddRoleDialog(null);
   };
```

**Alterar `src/components/auth/ProtectedRoute.test.tsx`:**

```diff
--- a/src/components/auth/ProtectedRoute.test.tsx
+++ b/src/components/auth/ProtectedRoute.test.tsx
@@ -21,4 +21,5 @@ describe('real protected route with simulated auth context', () => {
   it('denies suspended staff even with the admin role', () => { Object.assign(state.auth, { isAccountSuspended: true, isAdmin: true, isStaff: true }); open(); expect(screen.getByTestId('destination').textContent).toBe('/suspended'); });
   it('redirects pending non-staff to approval', () => { state.auth.isAccountPending = true; open(); expect(screen.getByTestId('destination').textContent).toBe('/pending-approval'); });
+  it('redirects pending staff to approval too', () => { Object.assign(state.auth, { isAccountPending: true, isAdmin: true, isStaff: true }); open(); expect(screen.getByTestId('destination').textContent).toBe('/pending-approval'); });
   it.each(['auth', 'nda'])('blocks private content on %s verification errors', kind => { if (kind === 'auth') state.auth.authError = true; else state.nda.verificationError = true; open(); expect(screen.queryByTestId('protected')).toBeNull(); expect(screen.queryByTestId('destination')).toBeNull(); });
   it('requires mentor NDA acceptance', () => { state.nda.needsNda = true; open(); expect(screen.getByTestId('destination').textContent).toBe('/mentor-nda'); });
```

**Alterar `src/components/auth/ProtectedRoute.tsx`:**

```diff
--- a/src/components/auth/ProtectedRoute.tsx
+++ b/src/components/auth/ProtectedRoute.tsx
@@ -54,5 +54,5 @@ export function ProtectedRoute({ children, adminOnly = false, staffOnly = false
   }
 
-  if (isAccountPending && !isStaff) {
+  if (isAccountPending) {
     return <Navigate to="/pending-approval" replace />;
   }
```

**Alterar `src/i18n/locales/en.json`:**

```diff
--- a/src/i18n/locales/en.json
+++ b/src/i18n/locales/en.json
@@ -1566,4 +1566,5 @@
       "withoutActiveWorkspace": "No active workspace assignment",
       "workspaceFilterError": "Workspace assignments could not be verified. Please try again.",
+      "rolePendingHint": "The account is still pending. The role only takes effect once the account is approved.",
       "resultCount": "{{count}} users found",
       "resultCount_one": "{{count}} user found",
```

**Alterar `src/i18n/locales/pt.json`:**

```diff
--- a/src/i18n/locales/pt.json
+++ b/src/i18n/locales/pt.json
@@ -1566,4 +1566,5 @@
       "withoutActiveWorkspace": "Sem associação ativa a workspace",
       "workspaceFilterError": "Não foi possível verificar as associações a workspaces. Tente novamente.",
+      "rolePendingHint": "A conta continua pendente. A função só tem efeito depois de a conta ser aprovada.",
       "resultCount": "{{count}} utilizadores encontrados",
       "resultCount_one": "{{count}} utilizador encontrado",
```

**Alterar `supabase/tests/finalize_crm_import_batch.test.sql`:**

```diff
--- a/supabase/tests/finalize_crm_import_batch.test.sql
+++ b/supabase/tests/finalize_crm_import_batch.test.sql
@@ -43,4 +43,6 @@ VALUES ('44444444-0000-0000-0000-000000000001', 1, 'h1', 'Valid Co', true, NULL,
 INSERT INTO public.user_roles (user_id, role)
 VALUES ('44444444-0000-0000-0000-00000000000a', 'admin');
+-- RC13: o papel de staff só vale com a conta aprovada.
+UPDATE public.profiles SET account_status = 'approved' WHERE id = '44444444-0000-0000-0000-00000000000a';
 SET LOCAL role authenticated;
 SET LOCAL request.jwt.claims = '{"sub":"44444444-0000-0000-0000-00000000000a","role":"authenticated"}';
```

**Alterar `supabase/tests/log_completed_session_atomic.test.sql`:**

```diff
--- a/supabase/tests/log_completed_session_atomic.test.sql
+++ b/supabase/tests/log_completed_session_atomic.test.sql
@@ -42,4 +42,7 @@ INSERT INTO public.user_roles(user_id, role) VALUES
   ('00000000-0000-0000-0000-0000000ba010','admin'),
   ('00000000-0000-0000-0000-0000000ba011','backoffice');
+-- RC13: o papel de staff só vale com a conta aprovada.
+UPDATE public.profiles SET account_status = 'approved'
+ WHERE id IN ('00000000-0000-0000-0000-0000000ba010','00000000-0000-0000-0000-0000000ba011');
 
 INSERT INTO public.startups(id,name) VALUES ('00000000-0000-0000-0000-0000000ba001','TAP Startup');
```

**Alterar `supabase/tests/profiles_peer_boundary.test.sql`:**

```diff
--- a/supabase/tests/profiles_peer_boundary.test.sql
+++ b/supabase/tests/profiles_peer_boundary.test.sql
@@ -37,4 +37,6 @@ BEGIN
 
   INSERT INTO public.user_roles (user_id, role) VALUES (v_staff, 'admin');
+  -- RC13: o papel de staff só vale com a conta aprovada.
+  UPDATE public.profiles SET account_status = 'approved' WHERE id = v_staff;
 
   INSERT INTO public.startups (id, name) VALUES (v_wsp, 'RC5 Batch E Startup');
```

**Criar `supabase/tests/rc13_staff_pending.test.sql`** (conteúdo exato):

```sql
-- RC13 P01 · papel de staff só vale com a conta aprovada. Corre só no harness descartável; todas as fixtures são desfeitas.
BEGIN;
SELECT plan(20);

INSERT INTO auth.users(id,email) VALUES
 ('c1300000-0000-4000-8000-000000000001','rc13-admin-ok@example.invalid'),
 ('c1300000-0000-4000-8000-000000000002','rc13-admin-pend@example.invalid'),
 ('c1300000-0000-4000-8000-000000000003','rc13-cons-pend@example.invalid'),
 ('c1300000-0000-4000-8000-000000000004','rc13-bo-pend@example.invalid'),
 ('c1300000-0000-4000-8000-000000000005','rc13-founder-pend@example.invalid'),
 ('c1300000-0000-4000-8000-000000000006','rc13-founder-ok@example.invalid');
INSERT INTO public.profiles(id,email,account_status) VALUES
 ('c1300000-0000-4000-8000-000000000001','rc13-admin-ok@example.invalid','approved'),
 ('c1300000-0000-4000-8000-000000000002','rc13-admin-pend@example.invalid','pending'),
 ('c1300000-0000-4000-8000-000000000003','rc13-cons-pend@example.invalid','pending'),
 ('c1300000-0000-4000-8000-000000000004','rc13-bo-pend@example.invalid','pending'),
 ('c1300000-0000-4000-8000-000000000005','rc13-founder-pend@example.invalid','pending'),
 ('c1300000-0000-4000-8000-000000000006','rc13-founder-ok@example.invalid','approved')
 ON CONFLICT(id) DO UPDATE SET account_status=EXCLUDED.account_status;
DELETE FROM public.user_roles WHERE user_id::text LIKE 'c1300000-0000-4000-8000-00000000000%';
INSERT INTO public.user_roles(user_id,role) VALUES
 ('c1300000-0000-4000-8000-000000000001','admin'),
 ('c1300000-0000-4000-8000-000000000002','admin'),
 ('c1300000-0000-4000-8000-000000000003','consultor'),
 ('c1300000-0000-4000-8000-000000000004','backoffice'),
 ('c1300000-0000-4000-8000-000000000005','founder'),
 ('c1300000-0000-4000-8000-000000000006','founder');
INSERT INTO public.programs(id,name) VALUES ('c1300000-0000-4000-8000-000000000010','RC13 staff pendente');
INSERT INTO public.startups(id,name,nif) VALUES ('c1300000-0000-4000-8000-000000000020','RC13 staff pendente','509130101');
INSERT INTO public.workspaces(id,startup_id,program_id,status,stage) VALUES
 ('c1300000-0000-4000-8000-000000000030','c1300000-0000-4000-8000-000000000020','c1300000-0000-4000-8000-000000000010','active','validation');
INSERT INTO public.startup_contracts(id,start_date,company_nif,organization_name) VALUES
 ('c1300000-0000-4000-8000-000000000040','2026-11-11','509130101','RC13 staff pendente');

-- has_role não depende do pedido: lê o estado da conta diretamente.
SELECT is(public.has_role('c1300000-0000-4000-8000-000000000001'::uuid, 'admin'::public.app_role), true,  'admin aprovado tem o papel');
SELECT is(public.has_role('c1300000-0000-4000-8000-000000000002'::uuid, 'admin'::public.app_role), false, 'admin pendente não tem o papel');
SELECT is(public.has_role('c1300000-0000-4000-8000-000000000003'::uuid, 'consultor'::public.app_role), false, 'consultor pendente não tem o papel');
SELECT is(public.has_role('c1300000-0000-4000-8000-000000000004'::uuid, 'backoffice'::public.app_role), false, 'backoffice pendente não tem o papel');
SELECT is(public.has_role('c1300000-0000-4000-8000-000000000005'::uuid, 'founder'::public.app_role), true, 'o papel founder não depende da aprovação');

-- admin pendente
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000002","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is(public.is_admin(), false, 'admin pendente: is_admin() é falso');
SELECT is(public.is_staff(), false, 'admin pendente: is_staff() é falso');
SELECT is(public.is_account_active(), false, 'admin pendente: is_account_active() é falso (sem staff bypass)');
SELECT is((SELECT count(*)::integer FROM public.startups WHERE id='c1300000-0000-4000-8000-000000000020'), 0, 'admin pendente não lê startups');
SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id='c1300000-0000-4000-8000-000000000006'), 0, 'admin pendente não lê perfis de outros');
SELECT throws_ok($q$UPDATE public.profiles SET account_status='approved' WHERE id='c1300000-0000-4000-8000-000000000002'$q$, '42501', NULL, 'admin pendente não se aprova a si próprio');
SELECT throws_ok($q$INSERT INTO public.user_roles(user_id,role) VALUES ('c1300000-0000-4000-8000-000000000006','admin')$q$, '42501', NULL, 'admin pendente não atribui papéis');
RESET ROLE;

-- consultor pendente
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000003","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is(public.is_staff(), false, 'consultor pendente: is_staff() é falso');
UPDATE public.workspaces SET stage='growth' WHERE id='c1300000-0000-4000-8000-000000000030';  -- a RLS devolve 0 linhas, sem erro
RESET ROLE;
SELECT is((SELECT stage::text FROM public.workspaces WHERE id='c1300000-0000-4000-8000-000000000030'), 'validation', 'consultor pendente não altera workspaces');

-- backoffice pendente
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000004","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is(public.can_access_backoffice(), false, 'backoffice pendente: can_access_backoffice() é falso');
UPDATE public.startup_contracts SET organization_name='x' WHERE id='c1300000-0000-4000-8000-000000000040';  -- a RLS devolve 0 linhas, sem erro
RESET ROLE;
SELECT is((SELECT organization_name FROM public.startup_contracts WHERE id='c1300000-0000-4000-8000-000000000040'), 'RC13 staff pendente', 'backoffice pendente não altera contratos');

-- founder pendente: fica exatamente como estava (não é tratado como suspenso)
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000005',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000005","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is(public.account_not_suspended('c1300000-0000-4000-8000-000000000005'::uuid), true, 'founder pendente não é tratado como suspenso');
SELECT is((SELECT count(*)::integer FROM public.profiles WHERE id='c1300000-0000-4000-8000-000000000005'), 1, 'founder pendente continua a ler o próprio perfil');
RESET ROLE;

-- admin aprovado: sem alterações
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is(public.is_admin(), true, 'admin aprovado: is_admin() é verdadeiro');
SELECT is((SELECT count(*)::integer FROM public.startups WHERE id='c1300000-0000-4000-8000-000000000020'), 1, 'admin aprovado lê startups');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
```

Prova: a suite nova `rc13_staff_pending.test.sql` falha 14 das 20 asserções sem a migração e passa as 20 com ela.

---

## P03 · Notas internas do staff fora do alcance do founder (FEF-04)
**Impacto na Estrela-Guia:** indireto mas sério: é o que deixa o consultor escrever com franqueza sobre uma startup. **Esforço:** médio. **Risco:** baixo: a base fica segura logo com a migração, mesmo antes de o frontend ser publicado.

**Ficheiros e linhas:** colunas `workspaces.health_notes` e `workspaces.priority_notes`; `src/components/workspace/PrioritySelector.tsx:64-90`; `src/components/workspace/WorkspaceOverview.tsx:107,273,289`; `src/hooks/useHealthScore.ts:193-203`; hook novo `src/hooks/useWorkspaceStaffNotes.ts`.

**O que acontece hoje.** As notas de saúde e de prioridade que o staff escreve sobre uma startup vivem em `workspaces`, que o founder lê. A RC12 escondeu-as no ecrã, mas continuam a sair por API: provei na réplica que um founder lê as duas notas do seu próprio workspace. Há uma segunda fuga: ao mudar a prioridade, o texto da nota é copiado para `activity_log.metadata.notes`, e o registo de atividade é legível por quem tem acesso ao workspace.

**O que passa a acontecer.** As notas passam para `workspace_staff_notes`, que só admin, consultor e backoffice leem e só admin e consultor escrevem. Um trigger em `workspaces` desvia para lá qualquer escrita das duas colunas e deixa-as sempre a `NULL`: cobre o cliente antigo enquanto não for publicado, as RPCs de conversão de leads e a função `bulk-create-workspaces`, sem redefinir nenhuma delas. As notas existentes são movidas e o texto é retirado do registo de atividade. O cliente lê e grava na tabela nova, e a gravação da prioridade passa a confirmar que a escrita aconteceu em vez de mostrar sucesso com 0 linhas.

**Fica de fora, para decisão:** o nível de prioridade em si (`workspaces.priority_level`) continua legível pelo founder por API. Movê-lo mexe em listas, filtros e na fila de trabalho.

**Migração (conteúdo exato). Regenere os tipos a seguir:**

```sql
-- RC13 P03 · FEF-04 · as notas internas do staff (saúde e prioridade) saem de workspaces, que o founder lê,
-- para uma tabela que só o staff lê. Idempotente. Não redefine nenhuma função existente (sem guardas md5).

-- ═══ 1. Tabela só de staff ═══
CREATE TABLE IF NOT EXISTS public.workspace_staff_notes (
  workspace_id   uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  health_notes   text,
  priority_notes text,
  updated_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.workspace_staff_notes FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.workspace_staff_notes TO authenticated;
GRANT ALL ON public.workspace_staff_notes TO service_role;
ALTER TABLE public.workspace_staff_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read workspace staff notes" ON public.workspace_staff_notes;
CREATE POLICY "Staff read workspace staff notes" ON public.workspace_staff_notes
  FOR SELECT TO authenticated
  USING (public.is_staff() OR public.is_backoffice());

DROP POLICY IF EXISTS "Staff insert workspace staff notes" ON public.workspace_staff_notes;
CREATE POLICY "Staff insert workspace staff notes" ON public.workspace_staff_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff update workspace staff notes" ON public.workspace_staff_notes;
CREATE POLICY "Staff update workspace staff notes" ON public.workspace_staff_notes
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- mesma política restritiva de suspensão que as outras tabelas com RLS (RC12)
DROP POLICY IF EXISTS rc12_suspended_block ON public.workspace_staff_notes;
CREATE POLICY rc12_suspended_block ON public.workspace_staff_notes
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.account_not_suspended((SELECT auth.uid()))))
  WITH CHECK ((SELECT public.account_not_suspended((SELECT auth.uid()))));

-- ═══ 2. Qualquer escrita das notas em workspaces é desviada para a tabela nova ═══
-- Cobre o cliente antigo enquanto não for publicado, as RPCs de conversão de leads e a função bulk-create-workspaces,
-- sem redefinir nenhuma delas. O trigger corre DEPOIS da escrita (a linha do workspace já existe), copia as notas
-- e limpa as colunas na mesma transação: quando a transação fecha, as colunas de workspaces estão sempre a NULL.
CREATE OR REPLACE FUNCTION public.redirect_workspace_staff_notes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.health_notes IS NOT NULL OR NEW.priority_notes IS NOT NULL THEN
    INSERT INTO public.workspace_staff_notes AS n (workspace_id, health_notes, priority_notes, updated_by, updated_at)
    VALUES (NEW.id, NEW.health_notes, NEW.priority_notes, auth.uid(), now())
    ON CONFLICT (workspace_id) DO UPDATE SET
      health_notes   = COALESCE(EXCLUDED.health_notes, n.health_notes),
      priority_notes = COALESCE(EXCLUDED.priority_notes, n.priority_notes),
      updated_by     = EXCLUDED.updated_by,
      updated_at     = now();
    -- esta segunda escrita volta a disparar o trigger, mas já com as duas colunas a NULL, e por isso para aqui
    UPDATE public.workspaces SET health_notes = NULL, priority_notes = NULL WHERE id = NEW.id;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.redirect_workspace_staff_notes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_redirect_workspace_staff_notes ON public.workspaces;
CREATE TRIGGER trg_redirect_workspace_staff_notes
  AFTER INSERT OR UPDATE OF health_notes, priority_notes ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.redirect_workspace_staff_notes();

-- ═══ 3. Notas já existentes: o próprio trigger as move e deixa as colunas a NULL ═══
UPDATE public.workspaces
   SET health_notes = health_notes, priority_notes = priority_notes
 WHERE health_notes IS NOT NULL OR priority_notes IS NOT NULL;

-- ═══ 4. O registo de atividade, que o founder lê, guardava o texto da nota de prioridade ═══
UPDATE public.activity_log
   SET metadata = metadata - 'notes'
 WHERE action = 'priority_changed' AND metadata ? 'notes';
```

**Alterar `src/components/workspace/PrioritySelector.tsx`:**

```diff
--- a/src/components/workspace/PrioritySelector.tsx
+++ b/src/components/workspace/PrioritySelector.tsx
@@ -1,3 +1,3 @@
-import { useState } from 'react';
+import { useEffect, useState } from 'react';
 import { useTranslation } from 'react-i18next';
 import { useQueryClient } from '@tanstack/react-query';
@@ -16,4 +16,5 @@ import { notify } from "@/lib/notify";
 import { cn } from '@/lib/utils';
 import { logger } from '@/lib/logger';
+import { saveWorkspaceStaffNotes, workspaceStaffNotesKey } from '@/hooks/useWorkspaceStaffNotes';
 
 interface PrioritySelectorProps {
@@ -62,4 +63,9 @@ export function PrioritySelector({
   const [isSaving, setIsSaving] = useState(false);
 
+  // As notas chegam de uma consulta à parte (só staff): repõe o texto sempre que o painel abre.
+  useEffect(() => {
+    if (isOpen) setNotes(currentNotes || '');
+  }, [isOpen, currentNotes]);
+
   const handleSave = async () => {
     setIsSaving(true);
@@ -68,15 +74,20 @@ export function PrioritySelector({
       if (!user) throw new Error('Not authenticated');
 
-      const { error } = await supabase
+      const { data: updated, error } = await supabase
         .from('workspaces')
         .update({
           priority_level: selectedPriority,
-          priority_notes: notes || null,
           priority_set_at: new Date().toISOString(),
           priority_set_by: user.id,
         })
-        .eq('id', workspaceId);
+        .eq('id', workspaceId)
+        .select('id');
 
       if (error) throw error;
+      // A RLS bloqueia sem erro: 0 linhas quer dizer que nada foi gravado.
+      if (!updated?.length) throw new Error('priority: 0 rows updated');
+
+      // A nota é interna do staff e vive numa tabela que o founder não lê.
+      await saveWorkspaceStaffNotes(workspaceId, { priority_notes: notes || null }, user.id);
 
       // Log activity
@@ -90,5 +101,5 @@ export function PrioritySelector({
           from: currentPriority || 'standard',
           to: selectedPriority,
-          notes: notes || null,
+          has_notes: Boolean(notes),
         },
       });
@@ -96,4 +107,5 @@ export function PrioritySelector({
       queryClient.invalidateQueries({ queryKey: ['workspaces'] });
       queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
+      queryClient.invalidateQueries({ queryKey: workspaceStaffNotesKey(workspaceId) });
       
       notify.success(t('priority.updated'));
```

**Alterar `src/components/workspace/WorkspaceOverview.tsx`:**

```diff
--- a/src/components/workspace/WorkspaceOverview.tsx
+++ b/src/components/workspace/WorkspaceOverview.tsx
@@ -76,4 +76,5 @@ import { PrivateDocumentsPanel } from '@/components/workspace/PrivateDocumentsPa
 import { PlanAssistantsCard } from '@/components/workspace/PlanAssistantsCard';
 import { getIntlLocale } from '@/lib/dateUtils';
+import { useWorkspaceStaffNotes } from '@/hooks/useWorkspaceStaffNotes';
 
 interface WorkspaceOverviewProps {
@@ -106,4 +107,6 @@ export function WorkspaceOverview({ workspace, canWrite }: WorkspaceOverviewProp
   const isFounder = roles.includes('founder');
   const canSetPriority = isConsultor || isAdmin;
+  // Notas internas do staff: vêm de uma tabela que o founder não lê.
+  const { data: staffNotes } = useWorkspaceStaffNotes(workspace.id, isStaff);
   const { data: actions, isLoading: actionsLoading } = useWorkspaceActions(workspace.id);
   const { data: kpiData, isLoading: kpisLoading } = useWorkspaceKpis(workspace.id);
@@ -271,5 +274,5 @@ export function WorkspaceOverview({ workspace, canWrite }: WorkspaceOverviewProp
                   workspaceId={workspace.id}
                   currentPriority={workspace.priority_level || 'standard'}
-                  currentNotes={workspace.priority_notes}
+                  currentNotes={staffNotes?.priority_notes ?? null}
                 />
               )}
@@ -287,5 +290,5 @@ export function WorkspaceOverview({ workspace, canWrite }: WorkspaceOverviewProp
           health_score: workspace.health_score,
           health_score_override: workspace.health_score_override,
-          health_notes: workspace.health_notes,
+          health_notes: staffNotes?.health_notes ?? null,
         }}
         nextSession={nextSession}
```

**Alterar `src/hooks/useHealthScore.ts`:**

```diff
--- a/src/hooks/useHealthScore.ts
+++ b/src/hooks/useHealthScore.ts
@@ -7,4 +7,5 @@ import type { Database } from '@/integrations/supabase/types';
 import i18n from '@/i18n';
 import { invokeWithAuth } from "@/lib/invokeWithAuth";
+import { saveWorkspaceStaffNotes, workspaceStaffNotesKey } from '@/hooks/useWorkspaceStaffNotes';
 const t = i18n.t.bind(i18n);
 
@@ -195,9 +196,8 @@ export function useUpdateHealthNotes(workspaceId: string) {
   return useMutation({
     mutationFn: async (healthNotes: string | null) => {
-      const { data, error } = await supabase.from('workspaces').update({ health_notes: healthNotes }).eq('id', workspaceId).select().single();
-      if (error) throw error;
-      return data;
+      const { data: { user } } = await supabase.auth.getUser();
+      await saveWorkspaceStaffNotes(workspaceId, { health_notes: healthNotes }, user?.id ?? null);
     },
-    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] }); },
+    onSuccess: () => { queryClient.invalidateQueries({ queryKey: workspaceStaffNotesKey(workspaceId) }); },
   });
 }
```

**Criar `src/hooks/useWorkspaceStaffNotes.ts`** (conteúdo exato):

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface WorkspaceStaffNotes {
  health_notes: string | null;
  priority_notes: string | null;
}

export const workspaceStaffNotesKey = (workspaceId: string | undefined) => ['workspace-staff-notes', workspaceId] as const;

/**
 * Notas internas do staff sobre um workspace (saúde e prioridade).
 * Vivem em workspace_staff_notes, que só o staff lê: o founder nunca as recebe, nem por API.
 */
export function useWorkspaceStaffNotes(workspaceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: workspaceStaffNotesKey(workspaceId),
    enabled: !!workspaceId && enabled,
    queryFn: async (): Promise<WorkspaceStaffNotes | null> => {
      const { data, error } = await supabase
        .from('workspace_staff_notes')
        .select('health_notes, priority_notes')
        .eq('workspace_id', workspaceId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Grava só os campos indicados. Lança erro se a RLS não deixar gravar (0 linhas devolvidas). */
export async function saveWorkspaceStaffNotes(
  workspaceId: string,
  patch: Partial<WorkspaceStaffNotes>,
  userId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('workspace_staff_notes')
    .upsert(
      { workspace_id: workspaceId, ...patch, updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: 'workspace_id' },
    )
    .select('workspace_id');
  if (error) throw error;
  if (!data?.length) throw new Error('workspace_staff_notes: 0 rows written');
}
```

**Criar `supabase/tests/rc13_staff_notes.test.sql`** (conteúdo exato):

```sql
-- RC13 P03 · notas internas do staff fora do alcance do founder. Corre só no harness descartável; tudo é desfeito.
BEGIN;
SELECT plan(8);
INSERT INTO auth.users(id,email) VALUES
 ('c1300000-0000-4000-8000-000000000101','rc13-notes-cons@example.invalid'),
 ('c1300000-0000-4000-8000-000000000102','rc13-notes-founder@example.invalid');
INSERT INTO public.profiles(id,email,account_status) VALUES
 ('c1300000-0000-4000-8000-000000000101','rc13-notes-cons@example.invalid','approved'),
 ('c1300000-0000-4000-8000-000000000102','rc13-notes-founder@example.invalid','approved')
 ON CONFLICT(id) DO UPDATE SET account_status='approved';
DELETE FROM public.user_roles WHERE user_id IN ('c1300000-0000-4000-8000-000000000101','c1300000-0000-4000-8000-000000000102');
INSERT INTO public.user_roles(user_id,role) VALUES
 ('c1300000-0000-4000-8000-000000000101','consultor'),
 ('c1300000-0000-4000-8000-000000000102','founder');
INSERT INTO public.programs(id,name) VALUES ('c1300000-0000-4000-8000-000000000110','RC13 notas');
INSERT INTO public.startups(id,name,nif) VALUES ('c1300000-0000-4000-8000-000000000120','RC13 notas','509130301');
-- workspace criado já com nota, como fazem as RPCs de conversão de leads
INSERT INTO public.workspaces(id,startup_id,program_id,status,stage,health_notes) VALUES
 ('c1300000-0000-4000-8000-000000000130','c1300000-0000-4000-8000-000000000120','c1300000-0000-4000-8000-000000000110','active','validation','nota de conversão');
INSERT INTO public.workspace_users(workspace_id,user_id,role,active) VALUES
 ('c1300000-0000-4000-8000-000000000130','c1300000-0000-4000-8000-000000000102','founder',true);

SELECT is((SELECT health_notes FROM public.workspaces WHERE id='c1300000-0000-4000-8000-000000000130'), NULL, 'a nota não fica em workspaces');
SELECT is((SELECT health_notes FROM public.workspace_staff_notes WHERE workspace_id='c1300000-0000-4000-8000-000000000130'), 'nota de conversão', 'a nota é desviada para a tabela do staff');

-- consultor: escrita à antiga em workspaces é desviada; lê na tabela nova
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000101',true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000101","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
UPDATE public.workspaces SET priority_notes='nota de prioridade' WHERE id='c1300000-0000-4000-8000-000000000130';
SELECT is((SELECT priority_notes FROM public.workspace_staff_notes WHERE workspace_id='c1300000-0000-4000-8000-000000000130'), 'nota de prioridade', 'o consultor lê a nota de prioridade na tabela do staff');
SELECT is((SELECT health_notes FROM public.workspace_staff_notes WHERE workspace_id='c1300000-0000-4000-8000-000000000130'), 'nota de conversão', 'gravar uma nota não apaga a outra');
SELECT lives_ok($q$INSERT INTO public.workspace_staff_notes(workspace_id, health_notes) VALUES ('c1300000-0000-4000-8000-000000000130','nota nova') ON CONFLICT (workspace_id) DO UPDATE SET health_notes = EXCLUDED.health_notes$q$, 'o consultor grava diretamente na tabela do staff');
RESET ROLE;

-- founder: não lê nem escreve
SELECT set_config('request.jwt.claim.sub','c1300000-0000-4000-8000-000000000102',true);
SELECT set_config('request.jwt.claims','{"sub":"c1300000-0000-4000-8000-000000000102","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT is((SELECT priority_notes FROM public.workspaces WHERE id='c1300000-0000-4000-8000-000000000130'), NULL, 'o founder não lê a nota em workspaces');
SELECT is((SELECT count(*)::integer FROM public.workspace_staff_notes), 0, 'o founder não lê a tabela do staff');
SELECT throws_ok($q$INSERT INTO public.workspace_staff_notes(workspace_id, health_notes) VALUES ('c1300000-0000-4000-8000-000000000130','x') ON CONFLICT (workspace_id) DO UPDATE SET health_notes = EXCLUDED.health_notes$q$, '42501', NULL, 'o founder não escreve na tabela do staff');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
```

Prova: com dados antigos simulados, o founder passa a ler `NULL` nas duas colunas e 0 linhas na tabela nova; o consultor lê as duas notas; uma escrita à antiga é desviada; a suite `rc13_staff_notes.test.sql` passa as 8 asserções.

---

## P04 · Ligar a página da métrica Norte na barra lateral
**Impacto na Estrela-Guia:** alto e direto: é a única página que mostra sessões concluídas, agendadas, canceladas e faltas por período, horas, startups apoiadas e startups sem contacto há 30 dias. **Esforço:** mínimo. **Risco:** nenhum.

**Ficheiros e linhas:** `src/components/layout/AppSidebar.tsx:153,188`; chaves `nav.consultor.impact` e `nav.admin.impact` em pt e en.

**O que acontece hoje.** A rota `/staff/impact` existe em `src/App.tsx:137` e não tem nenhuma ligação na aplicação. Só lá chega quem escreve o endereço.

**O que passa a acontecer.** Admin e consultor têm a entrada "Sessões e Impacto" na barra lateral, logo a seguir a Relatórios.

**Alterar `src/components/layout/AppSidebar.tsx`:**

```diff
--- a/src/components/layout/AppSidebar.tsx
+++ b/src/components/layout/AppSidebar.tsx
@@ -18,4 +18,5 @@ import {
   Headphones,
   BarChart3,
+  TrendingUp,
   Briefcase,
   ClipboardList,
@@ -152,4 +153,5 @@ export function AppSidebar() {
     { name: t('nav.consultor.programs', { defaultValue: 'Programas' }), href: '/admin?tab=programs-setup', icon: GraduationCap },
     { name: t('nav.consultor.reports', { defaultValue: 'Relatórios' }), href: '/admin?tab=analytics', icon: BarChart3 },
+    { name: t('nav.consultor.impact', { defaultValue: 'Sessões e Impacto' }), href: '/staff/impact', icon: TrendingUp },
     { name: t('nav.consultor.quickGuide', { defaultValue: 'Guia Rápido' }), href: '/guide', icon: BookOpenCheck },
     { name: t('nav.founder.glossaryFaq', { defaultValue: 'Glossário & FAQ' }), href: '/help', icon: HelpCircle },
@@ -187,4 +189,5 @@ export function AppSidebar() {
     { name: t('nav.admin.programsCohorts', { defaultValue: 'Programas e Coortes' }), href: '/admin?tab=programs-setup', icon: GraduationCap },
     { name: t('nav.admin.reports', { defaultValue: 'Relatórios' }), href: '/admin?tab=analytics', icon: BarChart3 },
+    { name: t('nav.admin.impact', { defaultValue: 'Sessões e Impacto' }), href: '/staff/impact', icon: TrendingUp },
     { name: t('nav.admin.usersPermissions', { defaultValue: 'Utilizadores & Permissões' }), href: '/admin?tab=users', icon: Shield },
     { name: t('consultorTools.title', { defaultValue: 'Ferramentas de Consultor' }), href: '/consultor-tools', icon: Briefcase },
```

**Alterar `src/i18n/locales/en.json`:**

```diff
--- a/src/i18n/locales/en.json
+++ b/src/i18n/locales/en.json
@@ -6649,4 +6649,5 @@
       "quickGuide": "Quick Guide",
       "reports": "Reports",
+      "impact": "Sessions & Impact",
       "systemConfig": "System Configuration",
       "usersPermissions": "Users & Permissions"
@@ -6671,4 +6672,5 @@
       "quickGuide": "Quick Guide",
       "reports": "Reports",
+      "impact": "Sessions & Impact",
       "sessions": "Sessions",
       "sessionsActions": "Sessions & actions",
```

**Alterar `src/i18n/locales/pt.json`:**

```diff
--- a/src/i18n/locales/pt.json
+++ b/src/i18n/locales/pt.json
@@ -6649,4 +6649,5 @@
       "quickGuide": "Guia Rápido",
       "reports": "Relatórios",
+      "impact": "Sessões e Impacto",
       "systemConfig": "Configuração do Sistema",
       "usersPermissions": "Utilizadores & Permissões"
@@ -6671,4 +6672,5 @@
       "quickGuide": "Guia Rápido",
       "reports": "Relatórios",
+      "impact": "Sessões e Impacto",
       "sessions": "Sessões",
       "sessionsActions": "Sessões & ações",
```

---

## P05 · Apagar a tabela de backup com conteúdo de founders (DBP-09)
**Impacto na Estrela-Guia:** nenhum; higiene de dados. **Esforço:** mínimo. **Risco:** baixo e irreversível: confirme que não precisa do conteúdo antes de aplicar.

**O que acontece hoje.** `template_instances_dedup_backup_20260516` continua na base desde maio, com conteúdo de founders. Nenhum código, função, vista ou chave estrangeira a refere; só aparece nos tipos gerados.

**O que passa a acontecer.** A tabela deixa de existir. Regenere os tipos a seguir.

**Migração (conteúdo exato):**

```sql
-- RC13 P05 · DBP-09 · tabela de backup de 16 mai 2026, com conteúdo de founders, que já cumpriu a função.
-- Nenhum código, função, vista ou chave estrangeira a refere. Idempotente.
DROP TABLE IF EXISTS public.template_instances_dedup_backup_20260516;
```

---

## P02 · Os jobs do CI passam a conhecer as migrações todas (OPS-06, DRF-01)
**Impacto na Estrela-Guia:** nenhum direto; devolve um CI em que se pode confiar. **Esforço:** baixo. **Risco:** médio: **este diff não foi corrido num runner do GitHub**, só validado como YAML. Precisa de uma corrida real para confirmar.

**Ficheiros e linhas:** `.github/workflows/ci.yml:292-293` (job `e2e`) e `:382-383` (job `db-tests`).

**O que acontece hoje.** Os dois jobs fazem `supabase start`, que só aplica `supabase/migrations`. As migrações de `drizzle/migrations`, que são onde vive a segurança da base, não entram. O `db-tests` corre no main e tem suites que dependem de objetos que só existem no drizzle, por isso fica vermelho; o `e2e` testa uma base sem as proteções reais.

**O que passa a acontecer.** Logo a seguir ao `supabase start`, os dois jobs aplicam a fixture `scripts/rc5/audit-local-fixtures.sql` e todos os ficheiros de `drizzle/migrations`, pela mesma ordem do job `db-pgtap-local`. Se a primeira corrida falhar em algum ficheiro, envie o erro: a alternativa de recurso é retirar o `supabase test db` desses jobs, porque o `db-pgtap-local` já cobre as 40 suites sobre a cadeia completa.

**Alterar `.github/workflows/ci.yml`:**

```diff
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -293,4 +293,14 @@ jobs:
         run: supabase start
 
+      - name: Apply the additive chain (drizzle/migrations) on top of supabase/migrations
+        run: |
+          set -euo pipefail
+          DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
+          psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f scripts/rc5/audit-local-fixtures.sql
+          for f in drizzle/migrations/*.sql; do
+            echo "applying $f"
+            psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
+          done
+
       - name: Get Supabase status
         id: supabase
@@ -383,4 +393,14 @@ jobs:
         run: supabase start
 
+      - name: Apply the additive chain (drizzle/migrations) on top of supabase/migrations
+        run: |
+          set -euo pipefail
+          DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
+          psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f scripts/rc5/audit-local-fixtures.sql
+          for f in drizzle/migrations/*.sql; do
+            echo "applying $f"
+            psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
+          done
+
       - name: Verify migrations applied
         run: supabase migration list --local
```
