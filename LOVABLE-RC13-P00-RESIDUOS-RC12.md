# PROMPT LOVABLE — RC13 · P00 — Resíduos da RC12: link que aceita `javascript:`, staff suspenso em 5 funções e no Storage, avisos que abrem o separador errado, reparações de dados sem migração, gate i18n vermelho [resíduos de 2 HIGH, 4 MED, 2 LOW e 3 regressões]

**Contexto.** A RC12 foi aplicada (Partes 1 a 15 e opcionais 1 a 3, drizzle 0019 a 0036). Verifiquei os 236 achados contra o snapshot de 10 nov 2026 e contra uma réplica PostgreSQL 16 construída com `supabase/migrations` mais `drizzle/migrations`. Ficaram 215 fechados. Esta parte fecha o que sobrou e tem correção de código ou de SQL. Todos os diffs abaixo foram aplicados numa cópia do snapshot e passaram `tsc`, `eslint`, `vitest` (51 ficheiros, 331 testes), `i18n:lint`, `i18n:check` e `deno check`; o SQL das secções 3 e 7 foi provado na réplica dentro de transações desfeitas, aplicado duas vezes seguidas.

## Regras (valem para esta parte)
1. Aplique TUDO o que está nesta parte e NADA mais. Não refatore, não renomeie, não melhore o que não é descrito.
2. Cada secção traz o diff exato (`diff -U2`, números de linha do ficheiro ATUAL, que é o snapshot de 10 nov 2026). Se um diff não aplicar porque o ficheiro já mudou, **pare nessa secção e diga qual**; não improvise outra solução.
3. SQL: há dois blocos, um na secção 3 e outro na secção 7. Aplique-os pela ferramenta de migrações do projeto, a seguir à `0036_rc12_intake_reminders_reset`, **em duas migrações separadas e por esta ordem**, como fez com as partes RC12. São idempotentes, não redefinem nenhuma função e por isso não têm guardas md5. Se a ferramenta recusar o bloco da secção 7 por tocar em `storage.objects`, **pare nessa secção e diga-o**; não o contorne e não desfaça o resto.
4. Nunca edite migrações que já existem, nem `src/integrations/supabase/types.ts`.
5. Edge functions: depois de aplicar, publique as seis alteradas (`get-global-integrations`, `generate-relationship-recap`, `publish-program-setup`, `sync-outlook-emails`, `teams-notify`, `automation-engine`). Nenhum ficheiro `_shared` muda.
6. No fim, responda com: (a) a lista de secções aplicadas, (b) o que não aplicou e porquê, (c) qualquer erro de compilação ou de migração, com o texto exato.

*(Para o responsável, não para o Lovable: a secção 2 passa a recusar staff que não esteja aprovado. O bloco 4 de `LOVABLE-RC13-VERIFICACAO-BASE-VIVA.sql`, corrido na base real a 11 nov 2026, veio vazio: não há nenhuma conta de staff pendente nem suspensa, por isso ninguém fica bloqueado e não há nada a aprovar antes.)*

---

## 1. O link "Ver documento" do estatuto Startup Portugal aceita URLs executáveis (id: FEB-01, mesma família)
**Gravidade:** HIGH pela família (script executado na sessão de um admin ou consultor). **Impacto na Estrela-Guia:** indireto; protege as contas de quem faz as sessões. **Esforço:** baixo, 1 ficheiro e 1 constraint. **Risco:** baixo.

**Ficheiros e linhas:** `src/components/workspace/StartupSettingsTab.tsx:436-443`; coluna `startups.startup_portugal_document_path`.

**O que acontece hoje.** O separador de definições da startup desenha `<a href={formData.startup_portugal_document_path} target="_blank">` com o valor cru da coluna. A coluna é texto livre e o founder pode escrevê-la pela API: provei na réplica que um founder com acesso ao workspace grava `javascript:alert(document.domain)` (UPDATE devolve 1 linha; a política "Founders can update their startup" permite e o trigger `guard_startup_protected_fields` não protege esta coluna). O separador é mostrado ao staff em `src/pages/WorkspaceDetail.tsx:672-680`, por isso quem clica em "Ver documento" é o admin ou o consultor. As sete constraints `*_safe_scheme_chk` da RC12 (drizzle 0020) não cobrem esta coluna. Foi o único `href` alimentado por texto de utilizadores que encontrei sem sanitização em todo o `src`.

**O que passa a acontecer.** O link só é desenhado quando `safeExternalHref` devolve um URL http(s) válido (o helper já está importado na linha 1 e já é usado para `startup.website` na linha 310). Na base, a coluna ganha a mesma regra das outras sete: `NULL`, `http(s)://` ou valor sem `:`. Com a constraint, a mesma tentativa do founder falha com `23514`.

**Alterar `src/components/workspace/StartupSettingsTab.tsx`:**

```diff
--- a/src/components/workspace/StartupSettingsTab.tsx
+++ b/src/components/workspace/StartupSettingsTab.tsx
@@ -434,12 +434,14 @@
                     {t('admin.startupsManager.documentAttached')}
                   </Badge>
-                  <a 
-                    href={formData.startup_portugal_document_path} 
-                    target="_blank" 
-                    rel="noopener noreferrer"
-                    className="text-sm text-primary hover:underline"
-                  >
-                    {t('admin.startupsManager.viewDocument')}
-                  </a>
+                  {safeExternalHref(formData.startup_portugal_document_path) && (
+                    <a
+                      href={safeExternalHref(formData.startup_portugal_document_path)}
+                      target="_blank"
+                      rel="noopener noreferrer"
+                      className="text-sm text-primary hover:underline"
+                    >
+                      {t('admin.startupsManager.viewDocument')}
+                    </a>
+                  )}
                   <Button 
                     type="button" 
```

O SQL desta secção está no bloco único da secção 3 (ponto 4 do ficheiro).

---

## 2. Staff suspenso com sessão ainda válida continua a passar em 5 Edge Functions (ids: HRD-02 e ONB-02, resíduo)
**Gravidade:** MED, e resíduo do HIGH ONB-02. **Impacto na Estrela-Guia:** indireto; fecha a janela em que alguém suspenso ainda publica nos canais da equipa ou lê o CRM. **Esforço:** baixo, 5 ficheiros, 1 a 3 linhas cada. **Risco:** baixo; usa os helpers `denyIfAccountInactive` e `isAccountActive` que a Parte 2 da RC12 já pôs em `_shared/security.ts`.

**Ficheiros e linhas:** `supabase/functions/get-global-integrations/index.ts:8,45-49`; `generate-relationship-recap/index.ts:2,55-59`; `publish-program-setup/index.ts:1,149-155`; `sync-outlook-emails/index.ts:23,627-632,797-806`; `teams-notify/index.ts:14,273-280`.

**O que acontece hoje.** Suspender uma conta só muda `profiles.account_status`; o JWT e o refresh token continuam válidos. Estas cinco funções criam um cliente com service role, leem `user_roles` para ver se quem chama é staff e não olham ao estado da conta. Um admin, consultor ou backoffice suspenso consegue por isso: ler as definições globais de integrações (`get-global-integrations`), gerar o resumo IA do histórico de comunicações de uma lead (`generate-relationship-recap`, ramo `funnel_item_id`), iniciar a publicação de um programa (`publish-program-setup`: grava em `programs` com service role nas linhas 346-365 antes de a RPC da linha 446 recusar e de o `catch` repor o estado anterior), disparar a sincronização de emails do Outlook (`sync-outlook-emails`, nos dois caminhos por JWT) e **publicar mensagens com título e link arbitrários nos canais do Teams da equipa** (`teams-notify`, ramo sem `workspace_id`). A Parte 2 da RC12 corrigiu quatro funções e nomeava `get-global-integrations` na Correção, mas não trazia o diff dessa; as outras quatro apareceram agora numa pesquisa pelo mesmo padrão em todas as funções.

**O que passa a acontecer.** Depois do teste do papel, cada função confirma `is_account_active` (falha fechada) e responde 403 a contas suspensas ou pendentes. Os caminhos de cron e de service role não mudam.

**Alterar `supabase/functions/get-global-integrations/index.ts`:**

```diff
--- a/supabase/functions/get-global-integrations/index.ts
+++ b/supabase/functions/get-global-integrations/index.ts
@@ -6,5 +6,5 @@
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
-import { requireUser, createLogger, generateRequestId } from '../_shared/security.ts';
+import { requireUser, createLogger, generateRequestId, denyIfAccountInactive } from '../_shared/security.ts';
 
 const FUNCTION_NAME = 'get-global-integrations';
@@ -48,4 +48,6 @@
       return corsJsonResponse({ error: 'Access denied' }, req, 403);
     }
+    const inactive = await denyIfAccountInactive(req, supabase, user.id);
+    if (inactive) return inactive;
 
     // Parse request body
```

**Alterar `supabase/functions/generate-relationship-recap/index.ts`:**

```diff
--- a/supabase/functions/generate-relationship-recap/index.ts
+++ b/supabase/functions/generate-relationship-recap/index.ts
@@ -1,4 +1,5 @@
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
+import { denyIfAccountInactive } from '../_shared/security.ts';
 
 interface RecapRequest {
@@ -58,4 +59,7 @@
       .eq('user_id', user.id);
     const callerIsStaff = callerRoles?.some((r) => r.role === 'admin' || r.role === 'consultor') ?? false;
+    // Conta suspensa ou pendente não gera resumos, mesmo com sessão ainda válida.
+    const inactive = await denyIfAccountInactive(req, supabase, user.id);
+    if (inactive) return inactive;
 
     // Check feature flag
```

**Alterar `supabase/functions/publish-program-setup/index.ts`:**

```diff
--- a/supabase/functions/publish-program-setup/index.ts
+++ b/supabase/functions/publish-program-setup/index.ts
@@ -1,3 +1,4 @@
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
+import { isAccountActive } from '../_shared/security.ts';
 
 const corsHeaders = {
@@ -153,5 +154,6 @@
 
     const isAdminOrConsultor = roles?.some(r => r.role === 'admin' || r.role === 'consultor');
-    if (!isAdminOrConsultor) {
+    // Conta suspensa ou pendente não publica programas, mesmo com sessão ainda válida.
+    if (!isAdminOrConsultor || !(await isAccountActive(supabase, user.id))) {
       return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
         status: 403,
```

**Alterar `supabase/functions/sync-outlook-emails/index.ts`:**

```diff
--- a/supabase/functions/sync-outlook-emails/index.ts
+++ b/supabase/functions/sync-outlook-emails/index.ts
@@ -21,5 +21,5 @@
 import { verifyCronToken } from '../_shared/security.ts';
 import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
-import { createLogger, generateRequestId, safeErrorMessage } from '../_shared/security.ts';
+import { createLogger, generateRequestId, safeErrorMessage, isAccountActive } from '../_shared/security.ts';
 import { withCronRunLogging } from '../_shared/cronRun.ts';
 
@@ -631,5 +631,5 @@
               .eq('role', 'admin')
               .maybeSingle();
-            if (adminRole) authorized = true;
+            if (adminRole && await isAccountActive(supabaseAdmin, user.id)) authorized = true;
           }
         }
@@ -803,5 +803,5 @@
       .maybeSingle();
 
-    if (!roleCheck) {
+    if (!roleCheck || !(await isAccountActive(supabaseAdmin, user.id))) {
       return corsJsonResponse({ error: 'Only staff can sync emails' }, req, 403);
     }
```

**Alterar `supabase/functions/teams-notify/index.ts`:**

```diff
--- a/supabase/functions/teams-notify/index.ts
+++ b/supabase/functions/teams-notify/index.ts
@@ -12,5 +12,5 @@
 import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
 import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/cors.ts';
-import { createLogger, generateRequestId, ErrorCode, timingSafeEqual, isServiceRoleBearer } from '../_shared/security.ts';
+import { createLogger, generateRequestId, ErrorCode, timingSafeEqual, isServiceRoleBearer, isAccountActive } from '../_shared/security.ts';
 
 const FUNCTION_NAME = 'teams-notify';
@@ -278,5 +278,5 @@
           .limit(1)
           .maybeSingle();
-        if (staffErr || !staffRow) {
+        if (staffErr || !staffRow || !(await isAccountActive(supabase, callerUserId))) {
           log.warn('Forbidden: staff role required for non-workspace channel', { callerUserId });
           return corsJsonResponse({ error: 'Forbidden', code: ErrorCode.FORBIDDEN }, req, 403);
```

---

## 3. Reparações de dados e monitor da purga nunca chegaram a uma migração (ids: E2E-04, FEX-05, DBP-07, OPS-12; inclui o SQL da secção 1)
**Gravidade:** MED. **Impacto na Estrela-Guia:** direto no E2E-04: startups já contratadas saem dos baldes comerciais da Inbox do CRM e deixam de roubar atenção ao acompanhamento. **Esforço:** baixo, 1 migração. **Risco:** baixo; tudo idempotente.

**Ficheiros e linhas:** `drizzle/migrations/0028_rc12_funnel_promote_operational.sql` (acaba na linha 11, sem a UPDATE de reparação); `drizzle/migrations/0030_rc12_log_retention.sql` (acaba na linha 27, sem a INSERT no monitor); nenhuma migração contém os UPDATE a `notifications.link`.

**O que acontece hoje.** A Parte 6 da RC12 trazia três instruções de dados dentro das migrações. No snapshot as migrações ficaram sem elas e o registo `docs/RC12-APPLIED.md` diz que correram "pela ferramenta de dados". As consultas na base real, a 11 nov 2026, mostram que duas correram mesmo e uma ficou a meio: leads contratadas por reparar, 0; expectativa de saúde da purga, presente; notificações com link `/dashboard`, 0; **notificações com link `/admin?tab=contracts`, 24**. Essas 24 continuam a nascer porque um gerador ficou por corrigir (secção 8). Além disso, um ambiente reconstruído do repositório nasce sem nenhuma destas correções, e uma das 108 asserções das suites pgTAP do Anexo T falha na réplica precisamente por isso ("DBP-07: monitor de saude conhece a purga").

**O que passa a acontecer.** Uma migração nova repete as três instruções, que não fazem nada onde já correram, repara as 24 notificações e as de lead parada, e acrescenta a constraint da secção 1. Os avisos de intake parado passam a abrir a lead no CRM quando o intake a tem; os restantes abrem os contratos do backoffice. Com ela aplicada, as 24 asserções da suite de retenção passam.

**Aplicar pela ferramenta de migrações (conteúdo exato):**

```sql
-- RC13 P00 · resíduos da RC12 que só existiam como alterações de dados feitas à mão (idempotente).
-- 1) DBP-07 / OPS-12: o monitor de saúde passa a conhecer a purga diária de logs.
INSERT INTO public.automation_health_expectations (job_name, expected_cadence_seconds, grace_seconds, severity, owner)
VALUES ('purge_operational_logs', 86400, 3600, 'low', 'ops')
ON CONFLICT (job_name) DO NOTHING;

-- 2) E2E-04: leads já contratadas que ficaram com type = 'lead' (o trigger da RC12 só trata as novas).
UPDATE public.funnel_items
   SET type = 'startup_active', converted_at = COALESCE(converted_at, updated_at, now())
 WHERE type = 'lead' AND linked_workspace_id IS NOT NULL AND stage IN ('contracted', 'incubating', 'accelerating');

-- 3) FEX-05: notificações já criadas com links para rotas ou separadores que não existem.
UPDATE public.notifications
   SET link = '/my-workspaces' || substr(link, length('/dashboard') + 1)
 WHERE link = '/dashboard' OR link LIKE '/dashboard?%';
--    avisos de intake parado: vão para a lead no CRM quando o intake a tem...
UPDATE public.notifications n
   SET link = '/crm?open=' || ci.funnel_item_id
  FROM public.contract_intakes ci
 WHERE n.link = '/admin?tab=contracts' AND n.entity_type = 'contract_intake'
   AND n.entity_id = ci.id AND ci.funnel_item_id IS NOT NULL;
--    ...e os restantes para os contratos do backoffice
UPDATE public.notifications
   SET link = '/admin?tab=backoffice&subtab=contracts'
 WHERE link = '/admin?tab=contracts';
--    avisos de lead parada: vão para a própria lead
UPDATE public.notifications
   SET link = '/crm?open=' || entity_id
 WHERE link = '/admin?tab=crm' AND entity_type = 'funnel_item' AND entity_id IS NOT NULL;

-- 4) FEB-01 (família): startups.startup_portugal_document_path é escrito pelo founder e aberto pelo staff com um clique.
--    Mesma regra das 7 colunas da RC12 (drizzle 0020): NULL, http(s):// ou valor sem ':'. Idempotente.
UPDATE public.startups
   SET startup_portugal_document_path = NULL
 WHERE startup_portugal_document_path IS NOT NULL
   AND NOT (startup_portugal_document_path ~* '^\s*https?://' OR startup_portugal_document_path !~ ':');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'startups_startup_portugal_document_path_safe_scheme_chk'
                    AND conrelid = 'public.startups'::regclass) THEN
    ALTER TABLE public.startups
      ADD CONSTRAINT startups_startup_portugal_document_path_safe_scheme_chk
      CHECK (startup_portugal_document_path IS NULL
             OR startup_portugal_document_path ~* '^\s*https?://'
             OR startup_portugal_document_path !~ ':') NOT VALID;
  END IF;
END $$;
```

Efeito do ponto 4 nos dados: valores de `startup_portugal_document_path` com esquema que não seja http(s) são postos a `NULL`. O bloco 13 de `LOVABLE-RC13-VERIFICACAO-BASE-VIVA.sql` mostra antes o que seria anulado; o esperado é não haver nenhuma linha.

---

## 4. O gate `i18n:lint` está vermelho: falta a chave base de um plural (introduzida na aplicação, não vem dos prompts da RC12)
**Gravidade:** LOW para o utilizador, mas parte o job `i18n-lint` do CI. **Impacto na Estrela-Guia:** nenhum direto; desbloqueia o CI. **Esforço:** mínimo, 2 linhas. **Risco:** nenhum.

**Ficheiros e linhas:** `src/i18n/locales/pt.json:1568`, `src/i18n/locales/en.json:1568`; uso em `src/components/admin/AdminUsersManager.tsx:272`.

**O que acontece hoje.** `node scripts/i18n-lint.mjs` falha com 2 problemas: `Missing key: "admin.userManagement.resultCount"` em pt e en. O ecrã usa `t('admin.userManagement.resultCount', { count })` e os ficheiros só têm `resultCount_one` e `resultCount_other`. O utilizador vê o texto certo porque o i18next resolve o plural, mas o lint exige a chave base, como têm as outras 28 chaves plurais do projeto.

**O que passa a acontecer.** Lint com 0 problemas em 710 ficheiros e paridade com 9387 chaves.

```diff
--- a/src/i18n/locales/pt.json
+++ b/src/i18n/locales/pt.json
@@ -1566,4 +1566,5 @@
       "withoutActiveWorkspace": "Sem associação ativa a workspace",
       "workspaceFilterError": "Não foi possível verificar as associações a workspaces. Tente novamente.",
+      "resultCount": "{{count}} utilizadores encontrados",
       "resultCount_one": "{{count}} utilizador encontrado",
       "resultCount_other": "{{count}} utilizadores encontrados",
```

```diff
--- a/src/i18n/locales/en.json
+++ b/src/i18n/locales/en.json
@@ -1566,4 +1566,5 @@
       "withoutActiveWorkspace": "No active workspace assignment",
       "workspaceFilterError": "Workspace assignments could not be verified. Please try again.",
+      "resultCount": "{{count}} users found",
       "resultCount_one": "{{count}} user found",
       "resultCount_other": "{{count}} users found",
```

---

## 5. Assinatura do contrato e inquérito público mostram chaves cruas ao mudar de idioma (id: FEX-16, resíduo)
**Gravidade:** LOW. **Impacto na Estrela-Guia:** pequeno mas no caminho crítico: a página de assinatura é onde o founder fecha o contrato antes da 1.ª sessão. **Esforço:** mínimo, 2 ficheiros. **Risco:** nenhum.

**Ficheiros e linhas:** `src/pages/PublicContractSigning.tsx:184`; `src/pages/PublicSurvey.tsx:224`.

**O que acontece hoje.** A Parte 1 da RC12 criou `changeLanguage` em `src/i18n/index.ts:46-49`, que carrega o bundle do idioma antes de trocar. Duas das quatro páginas públicas nomeadas na Correção foram convertidas (`PublicBooking`, `PublicContractIntake`); estas duas continuam a chamar `i18n.changeLanguage` diretamente. Quem carrega no botão EN/PT vê as chaves cruas (por exemplo `publicContractSigning.documentUploaded`) até o ficheiro de tradução descarregar.

**O que passa a acontecer.** As duas páginas usam o mesmo helper das outras: o texto só troca quando a tradução já está em memória.

```diff
--- a/src/pages/PublicContractSigning.tsx
+++ b/src/pages/PublicContractSigning.tsx
@@ -24,4 +24,5 @@
 } from 'lucide-react';
 import { useContractDraftAutosave } from '@/hooks/useContractDraftAutosave';
+import { changeLanguage } from '@/i18n';
 
 type WizardStep = 'company_data' | 'review_contract' | 'signing';
@@ -182,5 +183,5 @@
     const next = lang === 'pt' ? 'en' : 'pt';
     setLang(next);
-    i18n.changeLanguage(next);
+    void changeLanguage(next);
     if (typeof document !== 'undefined') document.documentElement.lang = next;
   };
```

```diff
--- a/src/pages/PublicSurvey.tsx
+++ b/src/pages/PublicSurvey.tsx
@@ -11,4 +11,5 @@
 import { QuestionField, STAGE_LABELS } from "@/components/surveys/SurveyForm";
 import type { SurveyQuestion } from "@/hooks/useSurveys";
+import { changeLanguage } from "@/i18n";
 
 const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-survey`;
@@ -222,5 +223,5 @@
             variant="ghost"
             size="sm"
-            onClick={() => i18n.changeLanguage(i18n.language === "pt" ? "en" : "pt")}
+            onClick={() => void changeLanguage(i18n.language === "pt" ? "en" : "pt")}
           >
             {i18n.language === "pt" ? "EN" : "PT"}
```

---

## 6. Duas regressões pequenas trazidas pelos próprios diffs da RC12 (ids: FEB-14, FES-11)
**Gravidade:** LOW. **Impacto na Estrela-Guia:** nenhum direto. **Esforço:** mínimo, 2 ficheiros, 1 a 2 linhas. **Risco:** nenhum. A origem é o diff que eu próprio prescrevi na RC12, não uma adaptação do Lovable.

**Ficheiros e linhas:** `src/components/admin/AdminUsersManager.tsx:104-106`; `src/components/staff/AdminQuickAccessCard.tsx:76`.

**O que acontece hoje.** (FEB-14) Na gestão de utilizadores a página só volta à primeira quando mudam a pesquisa ou os filtros. Se o admin estiver na última página e uma ação a esvaziar (por exemplo filtro Pendente com 26 contas, página 2, aprovar a única conta), a lista fica vazia com o indicador "26–25 de 25" até mudar de página à mão. (FES-11) Os cartões "Consola de Operações" e "Infraestrutura" passaram a ter o mesmo `href` e a lista usa `key={link.href}`: duas chaves React iguais e um aviso na consola.

**O que passa a acontecer.** A página recua sozinha para a última que existe; as chaves passam a ser únicas.

```diff
--- a/src/components/admin/AdminUsersManager.tsx
+++ b/src/components/admin/AdminUsersManager.tsx
@@ -105,4 +105,6 @@
   // Reset to first page whenever the filtered set changes (e.g. new search term).
   useEffect(() => { setPage(1); }, [searchTerm, roleFilter, statusFilter, workspaceFilter]);
+  // Se a lista encolher (aprovar, suspender ou apagar na última página), recua para a última página que existe.
+  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
   const pagedProfiles = useMemo(
     () => filteredProfiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
```

```diff
--- a/src/components/staff/AdminQuickAccessCard.tsx
+++ b/src/components/staff/AdminQuickAccessCard.tsx
@@ -74,5 +74,5 @@
             return (
               <button
-                key={link.href}
+                key={`${link.href}:${link.label}`}
                 onClick={() => navigate(link.href)}
                 className={cn(
```

---

## 7. Staff suspenso ainda lê e apaga ficheiros no Storage (id: ONB-02, resíduo)
**Gravidade:** HIGH pela família (contratos assinados acessíveis a uma conta suspensa). **Impacto na Estrela-Guia:** indireto; protege os contratos e documentos das startups. **Esforço:** mínimo, 1 política. **Risco:** baixo para utilizadores ativos, porque a condição é verdadeira para qualquer conta não suspensa; depende de a ferramenta de migrações aceitar DDL em `storage.objects`.

**Ficheiros e linhas:** sete políticas de `storage.objects` leem `user_roles` diretamente. Bucket `contract-documents` (ver, carregar, alterar e apagar): `supabase/migrations/20260222161024_5951b87e-cf8f-4056-be9d-787da8879391.sql:13,24,35` e `20260603223839_41cb564c-1b26-47a1-9970-ce78b68bfcd5.sql:22,30`. Bucket `startup-documents`: `20260105120606_634501f5-902f-4418-b32e-312f3e4dcf14.sql:10`. Bucket `bug-report-screenshots`: `20260715125639_d308006e-fbf8-4649-87b3-ae49cc4c9b5f.sql:85`. Bucket `public-assets`: `20260102111208_feb5d5e6-b9e0-4321-8341-a8adaab5b37a.sql:17`.

**O que acontece hoje.** A RC12 pôs a política restritiva `rc12_suspended_block` nas 204 tabelas do esquema `public` e avisou que `storage.objects` ficava de fora. Sete políticas de Storage decidem quem é staff lendo `user_roles` diretamente, e `user_roles` não é sensível à suspensão. Provei na réplica, com a RLS de `storage.objects` ligada como na base real: um backoffice suspenso lê e apaga um ficheiro do bucket `contract-documents`.

**O que passa a acontecer.** A mesma política restritiva, com a mesma expressão, em `storage.objects`. Na réplica, depois dela, o backoffice suspenso lê 0 ficheiros e apaga 0; o backoffice aprovado e um founder ficam exatamente como estavam. Não toca em `storage.buckets` nem nas políticas existentes. Links assinados já emitidos continuam válidos até expirarem.

**Aplicar pela ferramenta de migrações, numa migração própria (conteúdo exato):**

```sql
-- RC13 P00 · ONB-02 (resíduo): conta suspensa deixa de ler e escrever ficheiros no Storage.
-- Mesma política restritiva que a RC12 pôs nas 204 tabelas public. Não mexe em storage.buckets. Idempotente.
DROP POLICY IF EXISTS rc12_suspended_block ON storage.objects;
CREATE POLICY rc12_suspended_block ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.account_not_suspended((SELECT auth.uid()))))
  WITH CHECK ((SELECT public.account_not_suspended((SELECT auth.uid()))));
```

---

## 8. Avisos de intake parado e de lead parada abrem o separador errado (id: FEX-05, resíduo)
**Gravidade:** MED. **Impacto na Estrela-Guia:** direto no caminho até à 1.ª sessão: são os dois avisos que empurram uma lead ou um intake parados, e hoje levam a um ecrã que não tem nada a ver. **Esforço:** baixo, 1 ficheiro. **Risco:** baixo.

**Ficheiros e linhas:** `supabase/functions/automation-engine/index.ts:513` (lead parada), `:603` (consulta dos intakes), `:615` (link da notificação) e `:624` (link do email).

**O que acontece hoje.** O motor de automações corre de hora a hora. Quando uma lead está parada há 14 dias avisa o consultor com o link `/admin?tab=crm`; quando um intake está parado há 7 dias avisa o responsável, uma vez por dia, com o link `/admin?tab=contracts`, na notificação e no email. Nenhum dos dois separadores existe em `src/pages/Admin.tsx:49-54`, por isso quem clica cai no separador Aprovações (`Admin.tsx:81`). Na base real havia 24 notificações com o segundo link a 11 nov 2026. A origem é o meu próprio pacote: a Parte 10 da RC12 tocou nestas linhas para escapar o HTML e deixou o link como estava. Os outros geradores já usam os destinos certos: `/crm?open=<lead>` em `generate-crm-notifications/index.ts:181` e `public-contract-onboarding/index.ts:795-797`.

**O que passa a acontecer.** O aviso de lead parada abre a própria lead no CRM. O aviso de intake parado abre a lead do intake no CRM ou, se o intake não tiver lead, os contratos do backoffice; o email leva o mesmo link. As notificações já criadas são reparadas pelo ponto 3 da migração da secção 3.

**Alterar `supabase/functions/automation-engine/index.ts`:**

```diff
--- a/supabase/functions/automation-engine/index.ts
+++ b/supabase/functions/automation-engine/index.ts
@@ -511,5 +511,5 @@
             `Lead parada há 14+ dias — ${lead.organization_name || lead.contact_name || 'Lead'}`,
             `Sem atividade na lead desde ${new Date(lastActivity).toLocaleDateString('pt-PT')}.`,
-            `/admin?tab=crm`,
+            `/crm?open=${lead.id}`,
             'funnel_item', lead.id)
           await recordRun(supabase, 'crm_lead_stale', lead.id, 'funnel_item', lead.owner_consultant_id, todayStr, 'app')
@@ -601,5 +601,5 @@
         const { data: intakes, error: intakesErr } = await supabase
           .from('contract_intakes')
-          .select('id, organization_name, status, created_at, assigned_to, legal_representative_email')
+          .select('id, organization_name, status, created_at, assigned_to, legal_representative_email, funnel_item_id')
           .in('status', ['draft_internal', 'intake_requested', 'intake_in_progress', 'changes_requested'])
           .lt('created_at', sevenDaysAgo)
@@ -610,8 +610,12 @@
           if (intake.assigned_to) {
             if (!(await wasAlreadyRun(supabase, 'intake_stale', intake.id, intake.assigned_to, todayStr))) {
+              // Mesmo destino dos outros avisos de intake: a lead no CRM, ou os contratos do backoffice se não houver lead.
+              const intakeLink = intake.funnel_item_id
+                ? `/crm?open=${intake.funnel_item_id}`
+                : '/admin?tab=backoffice&subtab=contracts'
               await notify(supabase, intake.assigned_to, 'intake_stale',
                 `Intake incompleto há 7+ dias — ${intake.organization_name || 'Sem nome'}`,
                 `O processo de intake está pendente há mais de 7 dias.`,
-                `/admin?tab=contracts`,
+                intakeLink,
                 'contract_intake', intake.id)
               const claimed = await recordRun(supabase, 'intake_stale', intake.id, 'contract_intake', intake.assigned_to, todayStr, 'both')
@@ -622,5 +626,5 @@
                 if (await sendEmail(email,
                   `[Startup Leiria] Intake incompleto — ${intake.organization_name || 'Processo'}`,
-                  `<p>O intake de <strong>${escapeHtml(intake.organization_name || 'um processo')}</strong> está pendente há mais de 7 dias.</p><p><a href="${SITE_URL}/admin?tab=contracts">Ver intakes</a></p>`)) {
+                  `<p>O intake de <strong>${escapeHtml(intake.organization_name || 'um processo')}</strong> está pendente há mais de 7 dias.</p><p><a href="${SITE_URL}${intakeLink}">Ver intakes</a></p>`)) {
                   result.emails++
                 }
```

---

## Fora do âmbito desta parte (nota para o responsável; o Lovable não deve aplicar nada disto)
- **FEF-04** (notas de saúde e de prioridade do staff legíveis pelo founder por API): exige decidir o modelo de dados. Vai para a RC13 como módulo próprio.
- **OPS-06, DRF-01, DRF-03** (jobs `db-tests` e `e2e` do CI só aplicam `supabase/migrations`): exige escolher entre aplicar o drizzle depois do `supabase start` ou retirar esses jobs a favor do `db-pgtap-local`. Não consigo validar um workflow do GitHub aqui, por isso não entrego diff sem a sua decisão.
- **SCH-16** (os sete buckets não são criados por migração): a ferramenta de migrações do Lovable recusa SQL sobre `storage.buckets`. Fica documentado como passo manual de restauro.
- **FEX-08, FEB-09** (cerca de 150 valores em português dentro do `en.json`): vai num anexo i18n próprio da RC13, para não misturar 150 traduções com correções de segurança.
- **FES-12, OPS-14, DBP-09, DRF-02, DRF-04, DRF-06**: decisões suas ou documentação, descritas em `LOVABLE-RC13-FECHO-RC12.md`.
- **Contas de staff pendentes com poderes**: decisão sua, depois de ver o bloco 4 das consultas da base viva.
- **Revogação imediata da sessão de contas suspensas**: é o que fecha a raiz das secções 2 e 7. Fica para a RC13, como já estava previsto.
