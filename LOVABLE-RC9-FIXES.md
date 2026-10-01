# PROMPT LOVABLE — RC9 · PARTE 1 de 5 — Segurança e integridade de dados

Olá. Esta é a ronda final. Primeiro, o reconhecimento: **foram aplicados 35 dos 37 itens do prompt RC8**, o replay das 476 migrações está limpo e as 23 suites pgTAP passam. É a melhor ronda até agora.

Desta vez auditámos os fluxos completos de cada papel, e não só o delta. Encontrámos defeitos antigos em fluxos que nenhuma ronda anterior tinha percorrido de ponta a ponta (contratos, backoffice, membros de equipa, inquéritos). Cada achado foi provado na base replayada ou no código, e os de gravidade alta foram todos confirmados uma segunda vez, quase sempre por um verificador independente. Todas as correções SQL deste prompt foram aplicadas por ordem sobre as 476 migrações do projeto, no harness do próprio projeto: 0 falhas e todas as suites verdes.

O prompt está dividido em **5 partes**, por prioridade: 1. segurança; 2. fluxos centrais partidos; 3. contratos, ocupação, CRM e automações; 4. founder, sessões, mentores e inquéritos; 5. i18n, CI, testes e processo. A Parte 5 usa o anexo `LOVABLE-RC9-I18N-PATCH.json`. **Aplique uma parte de cada vez**, corra `bash scripts/rc5/local-pg-harness.sh` e `bun run rc5:verify` no fim de cada uma, e diga-me o que ficou por aplicar e porquê antes de avançar.

## Regras (valem para as 5 partes)

1. Não altere nada fora do que está listado. Sem refactors.
2. Cada correção SQL vai numa **migração nova**. Nunca edite migrações aplicadas.
3. Antes de escrever SQL, confirme as colunas em `src/integrations/supabase/types.ts`. **Doze itens desta ronda escrevem ou leem colunas que não existem.**
4. `supabase-js` e o SDK do Resend não lançam: devolvem `{ data, error }`. Um `UPDATE` bloqueado pela RLS devolve **0 linhas e nenhum erro**. Sempre que um update/delete tem de acontecer, use `.select('id')` e trate `data.length === 0` como falha.
5. Para cada RPC, trigger ou policy nova, escreva primeiro o pgTAP em `supabase/tests/` e corra o harness.
6. **Não use `as any` / `as never` em payloads do `supabase.from(...).update/insert`.** Vários bugs desta ronda (colunas inexistentes) passaram no typecheck só por causa disso. Um payload tipado como `Record<string, unknown>` tem o mesmo efeito: use `TablesUpdate<'tabela'>` / `TablesInsert<'tabela'>` (`import type { TablesUpdate, TablesInsert } from '@/integrations/supabase/types'`).
7. Todos os `ficheiro:linha` citados são do RC9 original, antes de qualquer item desta ronda. Vários ficheiros são editados por mais de um item: se um item anterior já mexeu no ficheiro, localize o trecho pelo código citado e não pelo número da linha.

---

## P1.1 — Qualquer utilizador aprova ou reativa a própria conta

A policy `"Profile owners can update"` (`supabase/migrations/20260105100637_*.sql:4-9`) deixa o dono atualizar **qualquer coluna** do seu perfil, incluindo `account_status`. É a única policy de UPDATE em `profiles` para quem não é admin, e nenhum trigger a guarda. Provado na base: um founder com `account_status='suspended'` corre `update profiles set account_status='approved' where id = auth.uid()`, e `is_account_active()` passa a verdadeiro. Recupera leitura e escrita em todos os workspaces de que é membro. Como a suspensão só existe em `profiles` (não há ban no GoTrue nem auth hook), basta voltar a fazer login. Um utilizador pendente aprova-se a si próprio da mesma forma. A aprovação e a suspensão de contas deixam de ser controlos de segurança.

```sql
-- migração nova (validada: suspenso a reativar-se → 42501; o próprio a mudar full_name → ok;
-- admin suspende e reativa → ok; approve_user_account, approve_startup_claim, claim_startup,
-- accept_workspace_invitation e service_role → ok; signup e auto-aprovação @startupleiria.com → ok)
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- SECURITY INVOKER de propósito: dentro de RPCs e triggers SECURITY DEFINER current_user é o
  -- dono da função e passa; via PostgREST current_user é 'authenticated'. service_role também passa.
  IF current_user NOT IN ('authenticated', 'anon') OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- a policy "Users can insert own profile" permite o INSERT; o estado nunca vem do cliente
    NEW.account_status := 'pending';
    RETURN NEW;
  END IF;
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only administrators can change account_status or email' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();
```
Um `REVOKE UPDATE` por coluna não serve aqui: o `GRANT` de tabela prevalece, e revogar a tabela partiria a suspensão feita pelo admin. `Settings.tsx` só envia nome, avatar, telefone, LinkedIn, bio e especialidades, por isso não parte nenhum ecrã. pgTAP: founder a mudar o próprio `account_status` → `throws_ok(..., '42501')`; o mesmo via `INSERT … ON CONFLICT DO UPDATE` → `42501`; admin → passa; founder a mudar o próprio `full_name` → passa.

## P1.2 — Mentores externos leem o token público do inquérito e escrevem dados da startup (MED)

`survey_instances.public_token` (`20260914103518`) é legível por quem passa a policy `"Users can view their workspace survey instances"` (`20260105015008:96-98`, `has_workspace_access(workspace_id)`), o que inclui o mentor externo com NDA. Com o token, o mentor abre `/survey/<token>` sem sessão, escolhe os valores e submete. O write-back (`apply-survey-responses`, service role) grava então em `kpi_values`, `startups`, `workspaces.stage` e `milestones`, tabelas onde a RLS lhe nega escrita (provado), sem autoria e mesmo depois de perder o acesso. Depois o founder recebe 409 e já não consegue responder.

Há mais duas portas com o mesmo efeito, que o fix tem de fechar em conjunto:
- a RPC `submit_survey_responses` (`20260713181230`, SECURITY DEFINER, `EXECUTE` para `authenticated`) deixa qualquer membro, mentor incluído, marcar a instância como `submitted` só com o id. Não tem chamadores em `src`, nas edge functions nem nos testes;
- `apply-survey-responses` aceita o JWT de qualquer membro com `has_workspace_access` (`index.ts:404-408`) e volta a aplicar respostas antigas.

```sql
-- migração nova (validada: mentor com NDA → 0 instâncias, 0 respostas, 0 campanhas; founder, team_member e consultor → 1)
DROP POLICY IF EXISTS "Users can view their workspace survey instances" ON public.survey_instances;
CREATE POLICY "Users can view their workspace survey instances"
  ON public.survey_instances FOR SELECT
  USING (
    public.is_staff()
    OR (
      public.has_workspace_access(workspace_id)
      AND EXISTS (
        SELECT 1 FROM public.workspace_users wu
         WHERE wu.workspace_id = survey_instances.workspace_id
           AND wu.user_id = auth.uid()
           AND wu.active = true
           AND wu.role IN ('founder'::public.app_role, 'team_member'::public.app_role)
      )
    )
  );
REVOKE EXECUTE ON FUNCTION public.submit_survey_responses(uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
```
Em `supabase/functions/apply-survey-responses/index.ts`, dentro do ramo `if (!isInternal)`, logo a seguir a `if (!hasAccess) return json({ error: 'Access denied' }, 403);` (`:408`):
```ts
// Só o founder do workspace ou staff (admin/consultor) disparam o write-back com JWT.
const [{ data: staffRoles }, { data: founderRows }] = await Promise.all([
  supabase.from('user_roles').select('role')
    .eq('user_id', user.id).in('role', ['admin', 'consultor']),
  supabase.from('workspace_users').select('id')
    .eq('workspace_id', instance.workspace_id).eq('user_id', user.id)
    .eq('active', true).eq('role', 'founder').limit(1),
]);
if ((staffRoles ?? []).length === 0 && (founderRows ?? []).length === 0) {
  return json({ error: 'Access denied' }, 403);
}
```
O fluxo do founder na app (`useSurveys.ts:839-841`, com o JWT dele) e o caminho interno do link público não mudam. Os membros de equipa mantêm o acesso ao link, porque o recebem por email por desenho (`send-survey-invites:214-219`).

Opcional: se houver mentores atribuídos a startups com inquéritos por submeter, rode os tokens (invalida os links já enviados, por isso reenvie os convites a essas startups):
```sql
UPDATE public.survey_instances si SET public_token = gen_random_uuid()
 WHERE si.status <> 'submitted'
   AND EXISTS (SELECT 1 FROM public.workspace_users wu
                WHERE wu.workspace_id = si.workspace_id AND wu.role = 'mentor_externo'::public.app_role);
```
pgTAP: mentor com NDA → 0 linhas em `survey_instances`; founder e team_member → 1; anon → 0; `has_function_privilege('authenticated','public.submit_survey_responses(uuid,jsonb,boolean)','EXECUTE') = false`.

## P1.3 — Transcrições "só staff" ficam visíveis a founders e mentores

`supabase/functions/import-teams-transcript/index.ts:523-532` grava `raw_transcript: cleanText` em `sessions` **sempre**. O tier de confidencialidade só é calculado depois (`:541-547`) e só se aplica a `session_transcripts`. `sessions` é legível por qualquer membro (`has_workspace_access`), e `src/hooks/useSessions.ts:211` descarrega `raw_transcript`. O tipo de sessão por omissão é `general`, por isso a maioria das importações fica `staff_only`. Provado: founder, team_member e mentor com NDA veem 0 linhas em `session_transcripts` mas leem o texto completo em `sessions.raw_transcript`. A fuga é automática: o `sweep-session-transcripts` corre de 20 em 20 minutos e importa com service role. Quando o staff reclassifica uma transcrição para `staff_only` (`staff_reclassify_transcript_confidentiality`), a cópia em `sessions` também fica exposta.

A) `import-teams-transcript/index.ts`: substitua `:522-567` (da gravação em `sessions` até ao fim do tratamento de erro do upsert) por:
```ts
// Tier: numa reimportação mantém o tier já gravado (reclassificação do staff).
const sessionType = (typedSession.session_type || '').toLowerCase();
const isWorkspaceTier =
  sessionType.includes('consultor') || sessionType.includes('consultant') ||
  sessionType === 'check_in' || sessionType === 'follow_up';
const { data: existingTranscript } = await supabaseAdmin
  .from('session_transcripts').select('confidentiality')
  .eq('session_id', session_id).eq('source', 'teams_graph').maybeSingle();
const confidentiality: string =
  existingTranscript?.confidentiality ?? (isWorkspaceTier ? 'workspace' : 'staff_only');
// sessions é legível por qualquer membro (founder, team_member, mentor com NDA): só o tier 'workspace' é copiado.
const exposeOnSession = confidentiality === 'workspace';

const { error: transcriptError } = await supabaseAdmin
  .from('session_transcripts')
  .upsert({ session_id, source: 'teams_graph', transcript_text: cleanText, confidentiality },
          { onConflict: 'session_id,source' });
if (transcriptError) {
  log.error('Failed to persist session_transcripts row', transcriptError);
  throw transcriptError; // o catch exterior regista integration_errors e devolve 500; o sweep volta a tentar
}

const { error: updateError } = await supabaseAdmin
  .from('sessions')
  .update({
    raw_transcript: exposeOnSession ? cleanText : null,
    transcript_import_status: 'imported',
    transcript_last_attempt_at: new Date().toISOString(),
    transcript_import_attempts: (typedSession.transcript_import_attempts ?? 0) + 1,
    updated_at: new Date().toISOString(),
  })
  .eq('id', session_id);
if (updateError) {
  log.error('Failed to save transcript to session', updateError);
  throw updateError;
}
```
A transcrição é gravada primeiro em `session_transcripts`: se essa escrita falhar, a sessão não fica marcada como `imported` sem texto. Na resposta (`:590`): `transcript_text: exposeOnSession ? cleanText : null`.

B) `src/components/sessions/SessionAIPanel.tsx:161-164`: com a parte A, o `transcript_text` vem `null` em todas as transcrições que não são `workspace`, que são a maioria. Hoje a condição de `:161` exige o texto e mostraria "Erro ao importar transcrição" a uma importação bem-sucedida. Trate `status === 'ok'` sempre como sucesso:
```ts
if (data?.success && data?.status === 'ok') {
  if (data.transcript_text) setTranscript(data.transcript_text);
  notify.success(t('sessions.transcriçãoImportadaEGuardadaCom'));
  onRefresh?.();
} else if (data?.status === 'not_ready') {
```

C) `generate-session-summary/index.ts:135` usa `transcript || session.raw_transcript || notes`, e o resultado é gravado em `sessions.ai_summary` (`:216`, `:232-233`), que os founders leem (`SessionPrepCard`, `SessionInsightsSection`). Sem a cópia, o "Gerar com IA" passaria a resumir só as notas. Substitua `:134-135` por:
```ts
// Prepare content for AI analysis
let storedTranscript: string | null = session.raw_transcript ?? null;
if (!transcript && !storedTranscript) {
  // O resumo fica em sessions.ai_summary, que todos os membros leem: só o tier 'workspace' o pode alimentar.
  const { data: tRow } = await supabaseUser
    .from("session_transcripts").select("transcript_text")
    .eq("session_id", sessionId)
    .eq("confidentiality", "workspace")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  storedTranscript = tRow?.transcript_text ?? null;
}
const contentToAnalyze = transcript || storedTranscript || session.notes || session.agenda || "";
```

D) Migração nova: um trigger que limpa a cópia sempre que uma transcrição deixa de ser `workspace` (cobre a reclassificação pelo staff), mais a limpeza das cópias já expostas.
```sql
-- migração nova (validada: cobre a ordem antiga de escrita e a reclassificação via RPC; mantém o tier 'workspace' e o texto editado à mão)
CREATE OR REPLACE FUNCTION public.tg_session_transcripts_clear_session_copy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.confidentiality IS DISTINCT FROM 'workspace' THEN
    UPDATE public.sessions s SET raw_transcript = NULL
     WHERE s.id = NEW.session_id AND s.raw_transcript IS NOT NULL
       AND (s.raw_transcript = NEW.transcript_text
            OR (TG_OP = 'UPDATE' AND s.raw_transcript = OLD.transcript_text));
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.tg_session_transcripts_clear_session_copy() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_session_transcripts_clear_session_copy ON public.session_transcripts;
CREATE TRIGGER trg_session_transcripts_clear_session_copy
  AFTER INSERT OR UPDATE OF confidentiality, transcript_text ON public.session_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.tg_session_transcripts_clear_session_copy();

-- limpeza única das cópias já expostas (só anula cópias exatas; não há perda de dados)
UPDATE public.sessions s SET raw_transcript = NULL
  FROM public.session_transcripts st
 WHERE st.session_id = s.id AND st.confidentiality <> 'workspace'
   AND s.raw_transcript IS NOT DISTINCT FROM st.transcript_text;
```
Opcional: o único ecrã que chama `import-teams-transcript` é do staff (`SessionDetailDialog.tsx:577`). Pode exigir admin/consultor às chamadas com JWT de utilizador, para que founders e mentores não disparem reimportações nem a cadeia de IA (P3.17).

## P1.4 — O PDF do contrato é entregue (e regravado) por qualquer membro do workspace

`supabase/functions/generate-contract-pdf/index.ts:613-637` autoriza admin, consultor, backoffice ou **qualquer** linha ativa em `workspace_users` (mentor externo, team_member), sem ver o papel nem o NDA. A RLS de `startup_contracts` só deixa ver ao founder e ao staff. Provado: um mentor com NDA e um team_member não veem o contrato (0 linhas), mas obtêm o `contract_id` por `invoices` e descarregam o PDF com NIF, mensalidade, descontos e equity. Pior: depois do guard a função faz upload e `UPDATE` em `startup_contracts.document_url`, `pricing_snapshot_json`, `regulation_version` e `contract_template_version` (`:683-721`) com service role. Provado num contrato ativo e assinado: `document_url` passou para `generated/...` e perdeu-se o `pdf_bucket`. Esse `document_url` é o PDF canónico usado pelo arquivo no SharePoint e pelo download do founder. A comparação `token === supabaseKey` (`:569`) também não é de tempo constante.

Nenhum ecrã de founder chama esta função. Os chamadores são o `ContractDetailDrawer` (`:194`, `:841`, `:1087`, rota de staff) e as chamadas internas com service role (`public-contract-onboarding`, `docusign-send-envelope:199-205`, `pandadoc-send-document:179-185`, que exigem staff/backoffice). Aceite então só admin/consultor/backoffice nas chamadas com JWT, **antes** de ler o contrato:
1. Depois da linha 8: `import { isServiceRoleBearer } from '../_shared/security.ts'`
2. Substitua `:568-581` por:
```ts
const token = authHeader.replace('Bearer ', '')
// Chamadas internas (public-contract-onboarding, docusign-send-envelope, pandadoc-send-document)
const isInternalServiceCall = isServiceRoleBearer(req)
let user: { id: string } | null = null

if (!isInternalServiceCall) {
  const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token)
  if (userError || !authUser) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  // A função grava em startup_contracts e no bucket contract-documents: a RLS só o permite a staff/backoffice.
  const { data: callerRoles } = await supabase
    .from('user_roles').select('role').eq('user_id', authUser.id)
  const isStaffOrBackoffice = (callerRoles ?? []).some((r: { role: string }) =>
    r.role === 'admin' || r.role === 'consultor' || r.role === 'backoffice')
  if (!isStaffOrBackoffice) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  user = authUser
}
```
3. Apague por completo o bloco `:610-638` (autorização por membership).

Se quiser que o founder descarregue o próprio contrato no futuro, faça-o por um endpoint de leitura que devolva um URL assinado do `document_url` existente, sem regenerar nem gravar. Auditoria só de leitura, para ver se alguém fora do staff já regenerou PDFs:
```sql
SELECT al.created_at, al.user_id, al.entity_id AS contract_id, al.metadata->>'document_path'
  FROM public.activity_log al
 WHERE al.action = 'pdf_generated' AND al.entity_type = 'contract'
   AND NOT EXISTS (SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id = al.user_id AND ur.role IN ('admin','consultor','backoffice'));
```

## P1.5 — `send-survey-invites` envia tokens para qualquer email e contorna a lista de registo

A função usa `requireCronOrStaff`, que aceita backoffice (`_shared/security.ts:281-283`), e aceita `extra_recipients`/`only_emails` arbitrários (`send-survey-invites/index.ts:293-312`). Um utilizador backoffice (que a RLS impede de ver `survey_instances` e de escrever em `signup_allowlist`) consegue enviar o link público de qualquer workspace para um email à escolha, e esse email entra no `signup_allowlist` (`:361-375`). O separador de inquéritos na UI já é só de admin; o endpoint não.

```ts
// send-survey-invites/index.ts:168-169 — em vez do requireCronOrStaff (retire também o import da linha 17)
const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
if (userErr || !user) return corsJsonResponse({ error: 'unauthorized' }, req, 401);
const { data: adminRole, error: roleErr } = await admin
  .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
if (roleErr || !adminRole) return corsJsonResponse({ error: 'forbidden' }, req, 403);
// :370 — allowlist com autoria
const toAllow = unregistered.filter((e) => !already.has(e)).map((email) => ({ email, added_by: user.id }));
```
O único chamador é o separador Inquéritos (só admin) e nenhum cron chama a função, por isso deixar de aceitar cron, service role, consultor e backoffice não parte nada.

## P1.6 — O limite de pedidos do MCP não limita nada, e qualquer utilizador esgota a quota de outro

`src/lib/mcp/rateLimit.ts` chama `check_ai_rate_limit` com `_workspace_id = NULL`. A constraint `UNIQUE (user_id, workspace_id, function_name, window_start)` nunca colide em NULL, portanto cada chamada insere uma linha nova com contagem 1. Provado: **65 de 65 chamadas passam com limite 60**. Além disso, a função aceita qualquer `_user_id` sem o comparar com `auth.uid()`: um utilizador autenticado esgota a quota de IA de outro.

```sql
-- migração nova
WITH agg AS (
  SELECT user_id, function_name, window_start, SUM(request_count) AS total, MAX(id::text)::uuid AS keep_id
  FROM public.ai_rate_limits WHERE workspace_id IS NULL
  GROUP BY 1,2,3 HAVING COUNT(*) > 1
)
UPDATE public.ai_rate_limits r SET request_count = agg.total FROM agg WHERE r.id = agg.keep_id;
DELETE FROM public.ai_rate_limits r USING public.ai_rate_limits k
 WHERE r.workspace_id IS NULL AND k.workspace_id IS NULL
   AND r.user_id = k.user_id AND r.function_name = k.function_name AND r.window_start = k.window_start
   AND r.id::text < k.id::text;
ALTER TABLE public.ai_rate_limits DROP CONSTRAINT ai_rate_limits_unique_window;
ALTER TABLE public.ai_rate_limits ADD CONSTRAINT ai_rate_limits_unique_window
  UNIQUE NULLS NOT DISTINCT (user_id, workspace_id, function_name, window_start);

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(_user_id uuid, _workspace_id uuid, _function_name text, _max_requests integer DEFAULT 20)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
DECLARE
  v_window_start timestamptz := date_trunc('hour', now());
  v_current_count integer;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'check_ai_rate_limit: _user_id must match the caller' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.ai_rate_limits (user_id, workspace_id, function_name, window_start, request_count)
  VALUES (_user_id, _workspace_id, _function_name, v_window_start, 1)
  ON CONFLICT (user_id, workspace_id, function_name, window_start)
  DO UPDATE SET request_count = ai_rate_limits.request_count + 1, updated_at = now()
  RETURNING request_count INTO v_current_count;
  RETURN v_current_count <= _max_requests;
END; $fn$;
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid,uuid,text,integer) TO authenticated, service_role;
```
Os chamadores atuais passam o próprio uid (copilot-chat e MCP com o JWT do utilizador) ou usam o cliente service role. pgTAP: 61.ª chamada com limite 60 → `false`; chamada com o uid de outro utilizador → `42501`.

## P1.7 — Arrastar uma lead para "Contratado" ativa e marca como assinado um contrato por assinar

O trigger `sync_funnel_stage_to_contract` (`20260714164318:172-200`) põe o contrato ligado em `active` com `signed_at = now()` sempre que a lead passa a `contracted`/`incubating`, sem assinatura nem evento. Qualquer arrastar no Pipeline (`PipelineView.tsx:171-190`) ou mudança em massa (`CrmBulkActions.tsx:130-134`) ativa o contrato, dispara `reconcile_contract_founders` e entra no MRR e na ocupação. O "Desfazer" só repõe a fase da lead; o contrato fica ativo (provado).

```sql
-- migração nova: o CRM nunca assina contratos
CREATE OR REPLACE FUNCTION public.sync_funnel_stage_to_contract()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.linked_contract_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN RETURN NEW; END IF;
  IF NEW.stage = 'sent_for_signature' THEN
    UPDATE public.startup_contracts
       SET status = 'pending_signature',
           signature_status = COALESCE(signature_status, 'sent_for_signature'),
           signature_requested_at = COALESCE(signature_requested_at, now())
     WHERE id = NEW.linked_contract_id AND signed_at IS NULL
       AND status NOT IN ('active','terminated','cancelled');
  ELSIF NEW.stage IN ('contracted','incubating') THEN
    -- só espelha a ativação quando a assinatura já está registada
    UPDATE public.startup_contracts SET status = 'active'
     WHERE id = NEW.linked_contract_id
       AND status IN ('draft','pending_signature')
       AND (signed_at IS NOT NULL OR signature_status IN ('completed','signed'));
  END IF;
  RETURN NEW;
END;
$function$;
```
A única diferença para o corpo atual é o ramo `contracted`/`incubating`, que deixa de escrever `signed_at` e `signature_status`. O trigger `trg_sync_funnel_stage_to_contract` e os grants mantêm-se. Como a correção está no trigger, cobre todos os pontos de escrita: arrastar, ação em massa, seletor de fase do drawer e a conversão `staff_convert_funnel_item_to_startup`, que hoje cria um contrato `draft` e o vê logo passar a `active`. A assinatura pelo fornecedor continua a mover a lead para "Contratado". Mudança de comportamento: um contrato assinado em papel passa a ser ativado só por "Marcar como assinado" no `ContractDetailDrawer`.

**Dados já afetados** (consulta só de leitura, não a ponha na migração). Para cada contrato devolvido, reveja também o founder que o `reconcile_contract_founders` possa ter criado a partir do representante legal:
```sql
SELECT c.id, c.contract_number, c.status, c.signature_status, c.signed_at, f.id AS funnel_item_id, f.stage
  FROM public.startup_contracts c
  JOIN public.funnel_items f ON f.linked_contract_id = c.id
 WHERE c.status = 'active'
   AND COALESCE(c.signature_status, 'pending') NOT IN ('completed', 'signed')
   AND NOT EXISTS (SELECT 1 FROM public.contract_signature_events e
                    WHERE e.contract_id = c.id AND e.to_status = 'signed');
```

## P1.8 — Renovar um contrato apaga a data de início da incubação

`RenewContractDialog.tsx:60` faz `patch.start_date = newStart` (fim atual + 1 dia). `start_date` é o início da incubação: o próprio diálogo diz "Atualiza a data de fim e regista um evento no histórico", e a renovação automática do cron só mexe em `end_date`. A data original perde-se: o evento `renewal` em `contract_lifecycle_events` falha em silêncio porque usa a coluna `notes`, que não existe (as colunas são `id, contract_id, event_type, event_date, details, performed_by, created_at`). O cron `check-contract-anniversaries`, `getIncubationYear` ("Ano N", aumento a partir do ano 4) e os alertas do 3.º ano reiniciam para o ano 1. Provado como backoffice: início 2024-10-15 e fim 2026-12-31; depois de renovar, `start_date` = 2027-01-01.

Em `RenewContractDialog.tsx` substitua **só** `:55-71` (patch e update) e `:90-98` (evento). Mantenha as guardas de `:52-53`, o bloco das alocações de `:73-88` (a P3.1 trata dele) e o `notify_contract_event` de `:100-112` (a P2.2 trata dele).

`:55-71`:
```ts
// start_date = início da incubação (cron de aniversários, "Ano N", limite de 3 anos): nunca sobrescrever
const patch: TablesUpdate<'startup_contracts'> = { end_date: newEnd, monthly_fee: monthlyFee };
if (contract.status === 'expired') {
  patch.status = 'active';
  patch.terminated_at = null;
  patch.termination_reason = null;
}
const { error: updErr } = await supabase
  .from('startup_contracts')
  .update(patch)
  .eq('id', contract.id);
if (updErr) throw updErr;
```
`:90-98`:
```ts
// Evento de ciclo de vida: a tabela não tem 'notes'; o texto vai em details
const { data: authData } = await supabase.auth.getUser();
const { error: evErr } = await supabase.from('contract_lifecycle_events').insert({
  contract_id: contract.id,
  event_type: 'renewal',
  event_date: new Date().toISOString().split('T')[0],
  performed_by: authData.user?.id ?? null,
  details: {
    previous_end_date: contract.end_date,
    new_term_start: newStart || null,
    new_end_date: newEnd,
    previous_monthly_fee: contract.monthly_fee,
    monthly_fee: monthlyFee,
  },
});
if (evErr) console.warn('[RenewContractDialog] lifecycle event failed', evErr.message);
```
No topo do ficheiro: `import type { TablesUpdate } from '@/integrations/supabase/types';`. O campo "Novo início" (`:151-156`) deixa de ter efeito: passe-o a `<Input id="renew-start" type="date" value={newStart} readOnly disabled />` e mude o texto de `contractDetail.renewStart` para `"Início do novo período (a data de início da incubação mantém-se)"` em `pt.json:2978` e `"New term start (incubation start date is kept)"` em `en.json:2978`.

Em `src/hooks/backoffice/useTerminateContract.ts` substitua `:106-113` (o mesmo `notes` inexistente) por:
```ts
const { data: evUser } = await supabase.auth.getUser();
const { error: evErr } = await supabase.from('contract_lifecycle_events').insert({
  contract_id: contract.id,
  event_type: 'termination',
  event_date: today,
  performed_by: evUser.user?.id ?? null,
  details: { reason: reason.trim() },
});
if (evErr) console.warn('[useTerminateContract] lifecycle event failed', evErr.message);
```

**Dados já afetados.** A base não guarda o valor antigo destas renovações: o trigger de auditoria só regista `_direct_update`, sem valores. Corra a consulta abaixo, que só lê, e diga-me quantos contratos devolve. A data original de cada um tem de ser confirmada no PDF arquivado e reposta no `ContractDetailDrawer`, onde `start_date` é editável.
```sql
SELECT c.id, c.contract_number, c.start_date AS start_date_atual,
       c.signed_at::date AS assinado_em, c.created_at::date AS criado_em,
       (SELECT min(ra.start_date) FROM public.room_allocations ra WHERE ra.contract_id = c.id) AS primeira_alocacao,
       (SELECT min(i.issue_date) FROM public.invoices i WHERE i.contract_id = c.id) AS primeira_fatura,
       (SELECT min(e.event_date) FROM public.contract_lifecycle_events e WHERE e.contract_id = c.id) AS primeiro_evento
  FROM public.startup_contracts c
 WHERE c.start_date > COALESCE(c.signed_at, c.created_at)::date + 60
    OR EXISTS (SELECT 1 FROM public.room_allocations ra WHERE ra.contract_id = c.id AND ra.start_date < c.start_date)
    OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.contract_id = c.id AND i.issue_date < c.start_date)
 ORDER BY c.start_date;
```

## P1.9 — Higiene de privilégios (fecha o que a migração de 09/set deixou aberto)

A migração `20260909165853` revogou `EXECUTE` a `anon`, mas não a `PUBLIC`. Funções com o grant via `PUBLIC` continuam executáveis por `anon` (ex.: `approve_user_account`, cujo corpo verifica admin). Na mesma migração feche também as duas funções de ausências novas (`20260914135852:53-54,71-72`), que ficaram com `EXECUTE` para `anon` pelas default privileges do Supabase.

```sql
-- migração nova: tira EXECUTE a PUBLIC e anon, preservando exatamente o acesso atual de authenticated e service_role
DO $$
DECLARE r record; v_auth boolean; v_srv boolean;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
       AND has_function_privilege('anon', p.oid, 'EXECUTE')
       AND p.proname !~ '^(is_|has_|can_|resolve_canonical|get_canonical|check_signup_allowed|accept_workspace_invitation|touch_public_booking_rate_limit|safe_profiles)'
  LOOP
    v_auth := has_function_privilege('authenticated', r.oid, 'EXECUTE');
    v_srv  := has_function_privilege('service_role', r.oid, 'EXECUTE');
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF v_auth THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig); END IF;
    IF v_srv  THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig); END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.get_consultant_time_off(uuid, date, date) FROM anon;
REVOKE ALL ON FUNCTION public.consultant_time_off_blocks(uuid, timestamptz, timestamptz) FROM anon;
```
**Não dê `EXECUTE` a `authenticated` em bloco**: há funções que são deliberadamente só de service role (por exemplo `apply_contract_signature_atomic`, `cron_invoke_edge`), e um GRANT genérico abria-as a qualquer utilizador. O bloco acima só repõe o que cada papel já tinha (validado na base: 0 alterações para `authenticated` e `service_role`).
Antes de aplicar, liste as RPCs que as páginas públicas chamam **antes do login** (`grep -rn "\.rpc(" src/pages/Public* src/pages/BookResolver.tsx src/pages/Login.tsx src/pages/AcceptInvite.tsx`) e confirme que estão todas na exclusão. pgTAP: `has_function_privilege('anon','public.approve_user_account(uuid)','EXECUTE') = false`.

## P1.10 — URL `javascript:` gravável no website da startup pelo link público

`apply-survey-responses/index.ts:227-255` grava `startups.website` sem validar o esquema, e o valor é renderizado em `href` sem `sanitizeUrl` (`StartupSettingsTab.tsx:309`, `PendingApprovalsManager.tsx:619`). Qualquer portador do token, incluindo anónimos, pode gravar `javascript:…` quando o campo está vazio.

```ts
// apply-survey-responses/index.ts, em applyRecordField antes do SELECT
if (mapping.key === 'website') {
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(u.protocol)) return skip(questionId, mapping, 'URL inválido', answer);
  } catch { return skip(questionId, mapping, 'URL inválido', answer); }
}
if (mapping.key === 'main_contact_email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
  return skip(questionId, mapping, 'Email inválido', answer);
}
```
Nos dois `href`, o `sanitizeUrl` sozinho apagaria a ligação dos sites gravados sem `https://` (o write-back, o assistente de onboarding e as definições gravam `www.…`). Em `src/lib/sanitizeUrl.ts` acrescente:
```ts
export const safeExternalHref = (u?: string | null) => {
  const v = (u ?? '').trim();
  return v ? sanitizeUrl(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`) : undefined;
};
```
e use-o em `StartupSettingsTab.tsx:309` (`href={safeExternalHref(startup.website)}`) e em `PendingApprovalsManager.tsx:619` (`href={safeExternalHref(workspace.startup.website)}`). Testado: `javascript:` e `data:` dão `undefined`; `www.x.pt` dá `https://www.x.pt`.

## P1.11 — Em produção, qualquer utilizador autenticado executa as RPCs internas de DocuSign, cron e CRM

As migrações que criaram estas funções fazem `REVOKE ALL … FROM PUBLIC` e `GRANT … TO service_role`, mas **nunca** `REVOKE … FROM authenticated`. Num projeto Supabase alojado, cada função nova recebe `EXECUTE` explícito para `anon`, `authenticated` e `service_role` (default privileges da plataforma), e esse grant sobrevive ao `REVOKE FROM PUBLIC`. A migração de 09/set só retirou o `anon`. O harness local não reproduz os default privileges, por isso nenhuma suite apanhou isto.

Reproduzido no harness com os default privileges emulados: **17 funções** SECURITY DEFINER sem verificação de papel continuam executáveis por `authenticated`, e `touch_public_booking_rate_limit` também por `anon`. As mais graves:
- `claim_docusign_envelope` + `finalize_docusign_envelope`: um founder de outra startup, que nem vê o contrato, põe-no em `sent_for_signature` com um envelope forjado e um `counter_signer_email` à escolha (provado: `ENV-FORGED-123`, `fake@evil.test`). `release_docusign_envelope_command` põe qualquer contrato em `failed`;
- `log_cron_job_run`: forja corridas `ok` e esconde um cron morto do watchdog;
- `admin_commit_crm_import_job`, `admin_rollback_crm_import_job`, `commit_import_funnel_item_v2`: escrevem `funnel_items`;
- `check_ecosystem_invariants`, `check_automation_health`, `check_email_sync_health`: escrevem `system_settings` e `system_alerts`;
- `touch_public_booking_rate_limit` (também `anon`): bloqueia a marcação pública de qualquer email.

Nenhuma destas funções é chamada pelo frontend. As edge functions que as chamam usam todas o cliente service role (`docusign-send-envelope:77`, `commit-crm-import:126`, `bulk-import-leads:94`, `public-book-first-contact:289`, `sync-outlook-emails:591`, `_shared/cronRun.ts:33`, `run-checkin-reminders:70`, `open-monthly-founder-pulse:23`, `sweep-session-transcripts:40`, `automation-engine:157`). A migração abaixo cobre as 37 funções que as migrações quiseram fechar a `authenticated`; para as que já estavam fechadas é idempotente.

**Primeiro, ponha o harness a reproduzir produção**, para que o pgTAP apanhe isto (Regra 5). Em `scripts/rc5/local-pg-harness.sh`, logo a seguir à linha que aplica `supabase-shim.sql`:
```bash
# Emula os default privileges do Supabase alojado (grants automáticos em cada objeto novo).
"${PSQL[@]}" -c "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;" >/dev/null
```
E acrescente esta suite:
```sql
-- supabase/tests/service_only_function_privileges.test.sql
-- Funções internas (edge functions com service role ou pg_cron) não podem ser executáveis por anon/authenticated.
-- Só é significativo com o harness a emular os default privileges do Supabase (P1.11).
BEGIN;
SELECT plan(1);
SELECT is_empty($q$
  SELECT s AS exposed_function,
         has_function_privilege('anon', s::regprocedure, 'EXECUTE') AS anon,
         has_function_privilege('authenticated', s::regprocedure, 'EXECUTE') AS authenticated
    FROM unnest(ARRAY[
    'public.generate_weekly_checkins()',
    'public.cleanup_old_rate_limits()',
    'public.commit_import_funnel_item_v2(uuid,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,text,text[])',
    'public.admin_commit_crm_import_job(uuid)',
    'public.admin_rollback_crm_import_job(uuid)',
    'public.check_ecosystem_invariants()',
    'public.log_cron_job_run(text,text,integer,text,text,jsonb,text)',
    'public.check_automation_health()',
    'public.check_email_sync_health()',
    'public.reconcile_contract_founders(uuid)',
    'public.open_monthly_founder_pulse_cycles()',
    'public.claim_notification_attempts(text,integer,integer)',
    'public.mark_notification_delivered(uuid,text,jsonb)',
    'public.mark_notification_failed(uuid,text,text,boolean)',
    'public.commit_first_contact_booking_atomic(text,jsonb,jsonb,uuid,uuid,jsonb,jsonb)',
    'public.commit_crm_lead_import_batch_atomic(uuid,uuid[])',
    'public.claim_docusign_envelope(uuid,text)',
    'public.finalize_docusign_envelope(uuid,text,text,text,text,text)',
    'public.release_docusign_envelope_command(uuid,text,text)',
    'public.enqueue_pulse_notifications(uuid)',
    'public.open_and_notify_monthly_founder_pulse_cycles()',
    'public.apply_contract_signature_atomic(uuid,uuid,text,text,uuid,jsonb,text,text,text,text,text)',
    'public.claim_docusign_dispatch_lease(uuid,text,text,integer,text)',
    'public.mark_docusign_dispatch_in_flight(text,text)',
    'public.mark_docusign_dispatch_unknown(text,text,text)',
    'public.finalize_docusign_dispatch_lease(text,text,text)',
    'public.reconcile_docusign_dispatch_lease(text,text,text)',
    'public.anonymize_stale_founder_pulse_responses()',
    'public.claim_first_contact_outbox_batch(integer,integer)',
    'public.mark_first_contact_outbox_completed(uuid)',
    'public.mark_first_contact_outbox_failed(uuid,text,integer)',
    'public.serialize_program_tree(uuid)',
    'public.issue_cron_token(text)',
    'public.consume_cron_token(text,text)',
    'public.cron_invoke_edge(text,jsonb)',
    'public.cron_invoke_rpc(text,text)',
    'public.touch_public_booking_rate_limit(text,text)'
    ]::text[]) AS s
   WHERE has_function_privilege('anon', s::regprocedure, 'EXECUTE')
      OR has_function_privilege('authenticated', s::regprocedure, 'EXECUTE')
$q$, 'internal SECURITY DEFINER functions are not executable by anon or authenticated');
SELECT * FROM finish();
ROLLBACK;
```
Corra o harness e confirme que a suite **falha** e lista as 17 funções. Depois aplique a migração:

```sql
-- migração nova — aplicar DEPOIS da P1.9
DO $$
DECLARE s text;
BEGIN
  -- funções só para edge functions (service role): tirar EXECUTE a PUBLIC, anon e authenticated
  FOREACH s IN ARRAY ARRAY[
    'public.generate_weekly_checkins()',
    'public.commit_import_funnel_item_v2(uuid,uuid,uuid,timestamptz,text,jsonb,jsonb,jsonb,text,text[])',
    'public.admin_commit_crm_import_job(uuid)',
    'public.admin_rollback_crm_import_job(uuid)',
    'public.check_ecosystem_invariants()',
    'public.log_cron_job_run(text,text,integer,text,text,jsonb,text)',
    'public.check_automation_health()',
    'public.check_email_sync_health()',
    'public.reconcile_contract_founders(uuid)',
    'public.open_monthly_founder_pulse_cycles()',
    'public.claim_notification_attempts(text,integer,integer)',
    'public.mark_notification_delivered(uuid,text,jsonb)',
    'public.mark_notification_failed(uuid,text,text,boolean)',
    'public.commit_first_contact_booking_atomic(text,jsonb,jsonb,uuid,uuid,jsonb,jsonb)',
    'public.commit_crm_lead_import_batch_atomic(uuid,uuid[])',
    'public.claim_docusign_envelope(uuid,text)',
    'public.finalize_docusign_envelope(uuid,text,text,text,text,text)',
    'public.release_docusign_envelope_command(uuid,text,text)',
    'public.enqueue_pulse_notifications(uuid)',
    'public.open_and_notify_monthly_founder_pulse_cycles()',
    'public.apply_contract_signature_atomic(uuid,uuid,text,text,uuid,jsonb,text,text,text,text,text)',
    'public.claim_docusign_dispatch_lease(uuid,text,text,integer,text)',
    'public.mark_docusign_dispatch_in_flight(text,text)',
    'public.mark_docusign_dispatch_unknown(text,text,text)',
    'public.finalize_docusign_dispatch_lease(text,text,text)',
    'public.reconcile_docusign_dispatch_lease(text,text,text)',
    'public.anonymize_stale_founder_pulse_responses()',
    'public.claim_first_contact_outbox_batch(integer,integer)',
    'public.mark_first_contact_outbox_completed(uuid)',
    'public.mark_first_contact_outbox_failed(uuid,text,integer)',
    'public.serialize_program_tree(uuid)',
    'public.consume_cron_token(text,text)',
    'public.touch_public_booking_rate_limit(text,text)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', s);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', s);
  END LOOP;
  -- funções só para o pg_cron (dono postgres): tirar EXECUTE a PUBLIC, anon e authenticated
  FOREACH s IN ARRAY ARRAY[
    'public.cleanup_old_rate_limits()',
    'public.issue_cron_token(text)',
    'public.cron_invoke_edge(text,jsonb)',
    'public.cron_invoke_rpc(text,text)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', s);
  END LOOP;
END $$;
```
Validado no harness com default privileges emulados: antes, a suite falha com as 17 funções; depois, as 37 funções ficam com `anon` = `authenticated` = false, as 33 de service role continuam com `service_role` = true, e todas as suites passam, as 23 do RC9 e esta. As 4 do segundo array (`cleanup_old_rate_limits`, `issue_cron_token`, `cron_invoke_edge`, `cron_invoke_rpc`) só correm no pg_cron, como dono.

## P1.12 — Qualquer founder torna-se "consultor" de uma startup alheia e lê o NIF e escreve os dados financeiros

O trigger `sync_assigned_consultor_to_members` (`20260420214929:1-30`, disparado por `trg_sync_assigned_consultor`) insere em `workspace_users` quem estiver em `workspaces.assigned_consultor_id`, **sem verificar que é staff**. A policy "Founders can create pending workspaces" (`20260712195708:24-35`) deixa qualquer founder inserir um workspace `pending` com qualquer `startup_id`, e qualquer utilizador autenticado obtém o papel founder por `ensure_founder_role()`.

Provado na base: um founder sem relação com a startup alvo insere `workspaces(startup_id = <alvo>, program_id = <outro programa>, status = 'pending', created_by = self, assigned_consultor_id = self)`. O trigger torna-o membro ativo `consultor`, e a seguir `can_write_startup_data(<alvo>)` = true e ele lê a linha completa de `startups`, com o NIF. Com o mesmo mecanismo, um team_member (só leitura) escala para escrita em `funding_rounds` e `investors` da própria startup. Entre startups basta conhecer o UUID.

```sql
-- migração nova (validada: ataque → can_write_startup_data = f e 0 linhas; admin a atribuir um consultor real → membro consultor ativo)
CREATE OR REPLACE FUNCTION public.sync_assigned_consultor_to_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.assigned_consultor_id IS DISTINCT FROM NEW.assigned_consultor_id THEN
    IF OLD.assigned_consultor_id IS NOT NULL THEN
      UPDATE public.workspace_users SET active = false
       WHERE workspace_id = NEW.id AND user_id = OLD.assigned_consultor_id AND role = 'consultor';
    END IF;
  END IF;
  -- Só quem tem papel global de staff pode ser membro 'consultor'
  IF NEW.assigned_consultor_id IS NOT NULL
     AND (public.has_role(NEW.assigned_consultor_id, 'consultor'::public.app_role)
          OR public.has_role(NEW.assigned_consultor_id, 'admin'::public.app_role)) THEN
    INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
    VALUES (NEW.id, NEW.assigned_consultor_id, 'consultor', true)
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET active = true, role = 'consultor';
  END IF;
  RETURN NEW;
END; $fn$;

-- A app nunca usa estas duas policies: o founder cria a candidatura pela RPC create_startup_application
-- (CreateStartupDialog.tsx:166), que é SECURITY DEFINER. A segunda nunca passa, porque o criador não vê o
-- próprio workspace pendente. Sem elas, ninguém cria workspaces "sombra" apontados a startups alheias.
DROP POLICY IF EXISTS "Founders can create pending workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Founders can add themselves to pending workspaces" ON public.workspace_users;
```
Antes de aplicar, confirme com `grep -rn -A3 "from(['\"]workspaces['\"])" src | grep -E "^\S+-[0-9]+-\s*\.(insert|upsert)\("` que só o admin (`AdminDataImport.tsx:830-832`) e o Smart Import de staff (`SmartImportDialog.tsx:240-242`) inserem workspaces diretamente. **Dados já afetados:** liste os workspaces com `created_by` founder e `assigned_consultor_id = created_by`:
```sql
SELECT w.id, w.startup_id, w.status, w.created_by FROM public.workspaces w
 WHERE w.assigned_consultor_id = w.created_by
   AND NOT public.has_role(w.created_by, 'consultor'::public.app_role)
   AND NOT public.has_role(w.created_by, 'admin'::public.app_role);
```
pgTAP: founder a inserir um workspace com `assigned_consultor_id = self` → `throws_ok` (sem a policy) e nenhuma linha nova em `workspace_users`; admin a atribuir um consultor → membro `consultor` ativo.

---
**Fim da Parte 1.** Corra o harness e o `rc5:verify`, e diga-me o que não aplicou antes de colar a Parte 2.


# PROMPT LOVABLE — RC9 · PARTE 2 de 5 — Fluxos centrais partidos

Mesmas regras da Parte 1. A maioria destes itens parte um fluxo inteiro para um papel (founder, membro de equipa, mentor, backoffice); os que têm gravidade menor estão marcados no título. Todos foram provados na base replayada com o papel em causa.

**Decisão de produto assumida nesta parte (diga-me se não concordar):** o **backoffice é o dono operacional** de contratos, espaços, intakes, aprovações de contas e candidaturas, pedidos de alteração de dados legais e fila de trabalho, porque é para aí que a própria navegação da app o envia. **Programas, KPIs, Templates e Materiais de apoio** ficam só para admin e consultor. Hoje o `isStaff` do cliente inclui o backoffice (`AuthContext.tsx:335`), mas o `is_staff()` da base não, e é essa diferença que produz botões que falham ou, pior, dão sucesso sem fazer nada.

---

## P2.1 — Aprovações: o backoffice não consegue aprovar nada, e aprovar uma candidatura mostra sucesso sem efeito

O backoffice tem "Aprovações" na navegação e no cockpit, com badge (`AppSidebar.tsx:169`, `StaffCockpit.tsx:151`). Provado com a persona backoffice:
- aprovar ou rejeitar uma **startup** pendente dá 0 linhas sem erro, aparece "Startup aprovada" e a candidatura fica pendente;
- aprovar uma **conta** → `Only admins can approve user accounts`;
- "Atribuir Workspace" → `Only staff can assign workspaces`.

O consultor também falha a aprovar contas. Em "Associar claim", `approve_startup_claim` já aprova a conta, mas a seguir `PendingApprovalsManager.tsx:312-340` chama `approve_user_account` (só admin), que falha. Aparece então "Erro ao aprovar claim" com o claim já aprovado, e a segunda tentativa dá "already resolved".

```sql
-- migração nova (validada com a P1.1: backoffice aprova conta pendente → t; repetido → t; utilizador
-- inexistente → f; conta suspensa → erro para backoffice e consultor, admin → t;
-- backoffice aprova workspace pendente → active, rejeita → rejected; arquivar workspace ativa → 0 linhas)
CREATE OR REPLACE FUNCTION public.approve_user_account(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.account_status;
BEGIN
  IF NOT (public.is_staff() OR public.can_access_backoffice()) THEN
    RAISE EXCEPTION 'Only staff can approve user accounts' USING ERRCODE = '42501';
  END IF;
  SELECT account_status INTO v_status FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_status = 'approved' THEN RETURN true; END IF;
  -- só o admin reativa contas suspensas (senão o controlo da P1.1 volta a abrir por aqui)
  IF v_status <> 'pending' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can reactivate suspended accounts' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET account_status = 'approved', updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.activity_log(user_id, entity_type, entity_id, action, metadata)
  VALUES (auth.uid(), 'profile', p_user_id, 'account_approved',
          jsonb_build_object('approved_user_id', p_user_id, 'previous_status', v_status));
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.approve_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_user_account(uuid) TO authenticated;

DROP POLICY IF EXISTS "Backoffice can review pending workspaces" ON public.workspaces;
CREATE POLICY "Backoffice can review pending workspaces"
  ON public.workspaces FOR UPDATE TO authenticated
  USING (public.can_access_backoffice() AND status = 'pending')
  WITH CHECK (public.can_access_backoffice() AND status IN ('pending','active','rejected'));
```
A RPC fica idempotente (conta já aprovada → `true`). O trigger da Parte 1 (P1.1) não a bloqueia porque ela é SECURITY DEFINER.

Em `PendingApprovalsManager.tsx`:
- `useApproveWorkspace` e `useRejectWorkspace`: `.update(...).eq('id', workspaceId).select('id')`, com `if (!data?.length) throw new Error(t('errors.noPermission', 'Sem permissão para esta ação.'))`;
- `handleAssignClaim`: **remova** a chamada a `approve_user_account` depois de `approve_startup_claim` (esta já aprova a conta na mesma transação) e invalide `['pending-claim-requests']`, `['pending-user-accounts']` e `['workspaces']`;
- importe `useAuth` e, a seguir a `:248`, `const { isAdmin, isConsultor } = useAuth();`. "Atribuir Workspace" (`:494`) só para `isAdmin || isConsultor` (a RPC exige `is_staff()`); "Rejeitar" conta (`:486-493`) só para `isAdmin` (a RLS de `profiles` só deixa o admin).

`approve_startup_claim` também reativa contas suspensas (`account_status != 'approved'`). Para só o admin reativar contas, troque essa condição (validado: uma única definição e o `EXECUTE` de `authenticated` mantém-se):
```sql
-- migração nova: approve_startup_claim só aprova contas pendentes (reativar contas suspensas fica só para o admin, P1.1/P2.1)
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.approve_startup_claim(uuid,uuid)'::regprocedure);
  IF position($q$WHERE id = v_claim.user_id AND account_status != 'approved';$q$ IN d) = 0 THEN
    RAISE EXCEPTION 'approve_startup_claim: texto esperado não encontrado';
  END IF;
  d := replace(d, $q$WHERE id = v_claim.user_id AND account_status != 'approved';$q$,
                  $q$WHERE id = v_claim.user_id AND account_status = 'pending';$q$);
  EXECUTE d;
END $$;
```

Alternativa, se não quiser o backoffice a aprovar: retire o item de `AppSidebar.tsx:169` e de `StaffCockpit.tsx:151`, e em `Admin.tsx:87-91` acrescente `if (tab === 'approvals') return isAdmin || isConsultor;` (o `useAuth()` de `Admin.tsx:81` hoje só devolve `isAdmin` e `isBackoffice`: acrescente `isConsultor` e junte-o às dependências do `useMemo`). Diga-me qual das duas escolheu.

## P2.2 — Backoffice: botões que a base rejeita ou que dão sucesso sem efeito

Provado com a persona backoffice, ecrã a ecrã:

| Ecrã do backoffice | O que acontece hoje |
|---|---|
| Terminar/renovar contrato | sem notificações (`notify_contract_event` → `forbidden`); "Arquivar workspace associado" (ligado por defeito) → 0 linhas; tarefa de limpeza não criada; toast de sucesso |
| Tipos de Incubação | criar/editar → `new row violates row-level security` |
| Contrato → Descontos | adicionar/remover → RLS |
| Pedidos de founders → alterações de NIF/IBAN/morada | Aprovar/Recusar → `Only admins can approve change requests` |
| Contratos → Atribuir workspace | 403 `Staff role required` |
| Intake → Pedir correções / Copiar Link | `Only staff can rotate intake tokens` |
| ContractLifecycleHub → Converter lead contratada | `staff_only` |
| Painel → Trabalho do Dia | sempre vazio; "Nova tarefa" → sem permissão |
| Programas, KPIs, Templates, Materiais | "eliminado"/"atualizado" com 0 linhas; criar → RLS |
| Ecossistema → Atribuir consultor / Arquivar | "Consultor atribuído com sucesso" com 0 linhas (e email falso ao consultor) |

```sql
-- migração nova
-- 1) notificações de contrato também para quem opera contratos
CREATE OR REPLACE FUNCTION public.notify_contract_event(p_contract_id uuid, p_event_type text, p_staff_title text, p_staff_message text, p_founder_title text, p_founder_message text, p_founder_link text DEFAULT '/workspace'::text, p_staff_link text DEFAULT '/admin?tab=backoffice&subtab=contracts'::text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_workspace uuid; v_count integer := 0;
BEGIN
  IF NOT (public.is_staff() OR public.can_access_backoffice()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_event_type IS NULL OR btrim(p_event_type) = '' THEN RAISE EXCEPTION 'event_type_required'; END IF;
  SELECT workspace_id INTO v_workspace FROM public.startup_contracts WHERE id = p_contract_id;
  INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, link, read)
  SELECT DISTINCT ur.user_id, p_event_type, p_staff_title, p_staff_message, 'contract', p_contract_id, p_staff_link, false
    FROM public.user_roles ur WHERE ur.role IN ('admin','consultor','backoffice');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_workspace IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, link, read)
    SELECT DISTINCT wu.user_id, p_event_type, p_founder_title, p_founder_message, 'contract', p_contract_id, p_founder_link, false
      FROM public.workspace_users wu
     WHERE wu.workspace_id = v_workspace AND wu.active = true AND wu.role = 'founder';
  END IF;
  RETURN v_count;
END; $function$;

-- 2) arquivar o workspace de um contrato terminado
CREATE OR REPLACE FUNCTION public.backoffice_archive_workspace(p_workspace_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_staff() OR public.can_access_backoffice()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  -- o backoffice só arquiva o workspace de um contrato terminado/expirado e sem outro contrato em vigor
  IF NOT public.is_staff() AND (
       NOT EXISTS (SELECT 1 FROM public.startup_contracts c
                    WHERE c.workspace_id = p_workspace_id AND c.status IN ('terminated','expired'))
       OR EXISTS (SELECT 1 FROM public.startup_contracts c
                   WHERE c.workspace_id = p_workspace_id AND c.status IN ('active','pending_signature','suspended'))) THEN
    RAISE EXCEPTION 'workspace_not_archivable' USING ERRCODE = '42501';
  END IF;
  UPDATE public.workspaces SET status = 'archived', archived_at = now(), updated_at = now()
   WHERE id = p_workspace_id AND status <> 'archived';
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.backoffice_archive_workspace(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.backoffice_archive_workspace(uuid) TO authenticated;

-- 3) tabelas que o backoffice opera
DROP POLICY IF EXISTS "Backoffice can manage incubation types" ON public.incubation_types;
CREATE POLICY "Backoffice can manage incubation types" ON public.incubation_types
  FOR ALL TO authenticated USING (public.can_access_backoffice()) WITH CHECK (public.can_access_backoffice());
DROP POLICY IF EXISTS "Backoffice can manage contract discounts" ON public.contract_discounts;
CREATE POLICY "Backoffice can manage contract discounts" ON public.contract_discounts
  FOR ALL TO authenticated USING (public.can_access_backoffice()) WITH CHECK (public.can_access_backoffice());
DROP POLICY IF EXISTS "Backoffice can view work queue items" ON public.staff_work_queue_items;
CREATE POLICY "Backoffice can view work queue items" ON public.staff_work_queue_items
  FOR SELECT TO authenticated USING (public.is_backoffice());
DROP POLICY IF EXISTS "Backoffice can update work queue items" ON public.staff_work_queue_items;
CREATE POLICY "Backoffice can update work queue items" ON public.staff_work_queue_items
  FOR UPDATE TO authenticated USING (public.is_backoffice()) WITH CHECK (public.is_backoffice());
DROP POLICY IF EXISTS "Staff can create tasks" ON public.staff_tasks;
CREATE POLICY "Staff can create tasks" ON public.staff_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.is_backoffice()
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'consultor'));

-- 4) RPCs de contratos/intakes/pedidos que o backoffice opera: acrescentar o backoffice ao guard
DO $$
DECLARE r record; def text; before text;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('staff_convert_funnel_item_to_startup','staff_rotate_intake_token',
                               'approve_startup_change_request','reject_startup_change_request')
  LOOP
    def := pg_get_functiondef(r.oid); before := def;
    def := replace(def, 'IF NOT public.is_staff() THEN', 'IF NOT (public.is_staff() OR public.is_backoffice()) THEN');
    def := replace(def, 'IF NOT (public.is_staff() OR coalesce(auth.role(), '''') = ''service_role'') THEN',
                        'IF NOT (public.is_staff() OR public.is_backoffice() OR coalesce(auth.role(), '''') = ''service_role'') THEN');
    def := replace(def, 'IF NOT is_admin() THEN', 'IF NOT (is_admin() OR is_backoffice()) THEN');
    -- a conversão insere quem converte como membro 'consultor': só staff (o backoffice não fica membro)
    def := replace(def, 'VALUES (v_workspace_id, v_user, ''consultor''::public.app_role, true)',
                        'SELECT v_workspace_id, v_user, ''consultor''::public.app_role, true WHERE public.is_staff()');
    IF def = before THEN RAISE EXCEPTION 'guard not found in %', r.proname; END IF;
    IF r.proname = 'staff_convert_funnel_item_to_startup' AND position('true WHERE public.is_staff()' IN def) = 0 THEN
      RAISE EXCEPTION 'membership insert not found in %', r.proname;
    END IF;
    EXECUTE def;
  END LOOP;
END $$;
```
As quatro funções do bloco 4 não têm overloads (verificado), e o bloco aborta se algum guard não for encontrado. O segundo `replace` do bloco evita que o operador de backoffice que converte uma lead fique membro `consultor` ativo da nova startup, com acesso de membro aos dados dela. Validado: a conversão pelo backoffice cria 0 membros e a do admin cria 1; o consultor da lead continua a entrar pelo `assigned_consultor_id`.

No código:
- `supabase/functions/staff-assign-workspace-to-contract/index.ts:43`: `['admin', 'consultor', 'backoffice'].includes(r.role)`.
- `useTerminateContract.ts`:
  - `:98-104`: troque o `update` por `supabase.rpc('backoffice_archive_workspace', { p_workspace_id: contract.workspace_id })` e lance se houver erro;
  - `:81-95`: leia o `{ error }` do insert em `staff_tasks` em vez do `try/catch` morto (`const { error: taskErr } = await supabase.from('staff_tasks').insert({...}); if (taskErr) notify.warn(...)`);
  - `:178-181` e `RenewContractDialog.tsx:112`: se `notifyErr`, mostre `notify.warn(t('contractDetail.notifyFailed', { defaultValue: 'Contrato atualizado, mas as notificações falharam.' }))` (a chave vem no anexo de i18n);
- `src/pages/Admin.tsx`: separadores `programs-setup`, `kpis`, `templates` e `support-materials` só para `isAdmin || isConsultor` (acrescente `isConsultor` ao `useAuth()` de `:81` e às dependências do `useMemo`). `StaffCockpit.tsx:128`: `CockpitQuickActions` e o atalho de programas só para `isAdmin || isConsultor`. `StaffCockpit.tsx:197`: `unassignedActiveWorkspacesCount={isAdmin ? (backofficeCounts?.unassignedActiveWorkspacesCount ?? 0) : 0}`, para o cockpit não mandar o backoffice atribuir consultores.
- `AdminBackoffice.tsx`: os seletores de programa (`:584/:592`), de fase (`:615`) e de prioridade (`:642`), o popover de consultor (`:696/:712`) e bloquear/desbloquear (`:747/:757`) só para `isAdmin`. Nos updates de `changeProgram`, `changeStage` (`:204-214`), `changePriority` (`:216-226`) e `removeConsultor`, use `.select('id')` e lance "Sem permissão para esta ação." quando vier vazio.
- `InlineConsultantSelect.tsx:27-45`, `EcosystemTable.tsx:141-146` e os deletes de `useAdminData.ts`, `AdminSupportMaterialsManager.tsx` e `useTemplates.ts`: `.select('id')` depois do update/delete e erro "Sem permissão para esta ação." quando vier vazio.
- `useWorkQueue.ts:42-47`: o scope do consultor passa a incluir workspaces sem consultor atribuído: `query.or(\`assigned_consultor_id.eq.${user!.id},assigned_consultor_id.is.null\`, { referencedTable: 'workspace' })`.

## P2.3 — Assistente de contrato do founder: página inalcançável que falha em silêncio (LOW)

`ContractOnboarding.tsx` grava com `update` direto em `startup_contracts` (`:154-179`), que a RLS reduz a 0 linhas, e mostra "Dados guardados". Ao submeter envia `token: null` e recebe 400, mas a UI avança para o passo de assinatura. Na prática nenhum founder chega a esta página: o único link é o botão "Assinar Contrato" do `PendingContractBanner.tsx:87-94`, que só aparece com `signature_status = 'intake_requested'`, e nenhum código escreve esse valor em `startup_contracts` (o default é `pending`). O caminho real de assinatura é o link `/contract-signing/:token`, que a P2.6 corrige.

Remova o código morto, sem mudar o comportamento real:
- `PendingContractBanner.tsx:29`: `.in('signature_status', ['sent_for_signature'])`;
- `:86-95`: troque o ramo do `<Button>` por `null`;
- `App.tsx`: retire a rota `/contract-onboarding/:contractId` (`:198`) e o `lazy` import (`:70`), e apague `src/pages/ContractOnboarding.tsx`.

Um assistente autenticado para o founder preencher o contrato na app é trabalho de funcionalidade nova, não uma correção; se o quiser, peça-o à parte.

## P2.4 — Membro de equipa atribuído pelo admin fica preso em /claim-startup (MED)

Quem se regista fica com o papel global `founder` (o default do `Login.tsx:45`). Se o admin o atribuir a um workspace como `team_member` (Admin → Utilizadores → Atribuir workspace, `AdminUsersManager.tsx:128-137` → `useAdminData.ts:223-233`), o `useFounderOnboardingState.ts:57` só procura memberships com `role = 'founder'`, não encontra nenhuma e devolve "precisa de verificar a startup". O `ProtectedRoute` (`App.tsx:128-146`) manda `/workspace/:id` para `/claim-startup`, e a página de claim devolve `already_member` e manda de volta para `/my-workspaces`: um ciclo. Provado na base.

- `useFounderOnboardingState.ts:49-58`: inclua o papel no `select` e aceite as duas memberships:
```ts
const { data: workspaceData, error: workspaceError } = await supabase
  .from('workspace_users')
  .select(`
    workspace_id,
    role,
    workspaces!inner(id, status, needs_onboarding, startup_id, startups(name))
  `)
  .eq('user_id', user.id)
  .eq('active', true)
  .in('role', ['founder', 'team_member'])
  .limit(5);
```
  e em `:64-69`, prefira a membership de founder e só abra o assistente de onboarding a founders:
```ts
const isLive = (w: any) => w.workspaces?.status === 'active' || w.workspaces?.status === 'claimed';
const activeWs: any =
  workspaceData.find((w: any) => w.role === 'founder' && isLive(w)) ??
  workspaceData.find((w: any) => isLive(w));
if (activeWs) {
  const needsOnboarding = activeWs.role === 'founder' && activeWs.workspaces?.needs_onboarding === true;
```
- `WorkspaceDetail.tsx`: importe `useUserWorkspaceRole` de `@/hooks/useKpis` e, em `:80`:
```ts
const { data: myWorkspaceRole } = useUserWorkspaceRole(id);
const canWrite = isAdmin || isConsultor || isMentor || (isFounder && myWorkspaceRole !== 'team_member');
```
  Em `:92-98`, só mostre o assistente de onboarding quando `myWorkspaceRole` já carregou e não é `team_member`.

Não há migração nem dados a corrigir: o estado é calculado no cliente. O team_member continua a ver "Sem nome" até aplicar a P4.8 (RLS de `startups`).

## P2.5 — O founder não vê a disponibilidade do mentor que o staff lhe atribuiu

A policy de `mentor_availability` (`20260715233511`) só mostra a disponibilidade a founders com `mentor_connections.status = 'accepted'`. Mas `assign_mentor_request` e a atribuição pelo admin só inserem o mentor em `workspace_users`. Resultado: em /mentors → "Os meus mentores" → "Agendar", aparece "Este mentor ainda não definiu a sua disponibilidade", mesmo com janelas definidas. Provado: mentor membro ativo, 1 janela, founder vê 0.

```sql
-- migração nova
DROP POLICY IF EXISTS "Connected users and staff can view mentor availability" ON public.mentor_availability;
CREATE POLICY "Connected users and staff can view mentor availability"
ON public.mentor_availability FOR SELECT TO authenticated
USING (
  public.is_staff()
  OR mentor_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.mentor_connections mc
             WHERE mc.mentor_id = mentor_availability.mentor_id
               AND mc.founder_id = auth.uid() AND mc.status = 'accepted')
  OR EXISTS (SELECT 1 FROM public.workspace_users wm
             JOIN public.workspace_users wf ON wf.workspace_id = wm.workspace_id
             WHERE wm.user_id = mentor_availability.mentor_id
               AND wm.role = 'mentor_externo' AND wm.active
               AND wf.user_id = auth.uid() AND wf.active
               AND wf.role IN ('founder', 'team_member'))
);
```
Validado: founder, co-founder e team_member do mesmo workspace → 1; founder ou mentor de outro workspace → 0; anon → 0; founder suspenso → 0 (a subquery herda a RLS de `workspace_users`). A reserva passa a ficar `pending`, como deve. O team_member entra porque o `CreateSessionDialog` do separador Sessões usa a mesma disponibilidade. Não é preciso mudar o frontend. Esta correção não repõe a galeria de mentores (`user_roles` e `safe_profiles()` só mostram co-membros); isso é uma decisão de produto e de segurança, a tratar à parte.

## P2.6 — Assinatura nativa: o link público dá sempre "Invalid or expired token"

`public-contract-onboarding/index.ts:828` seleciona `startup_contracts.documents_json`, que **não existe** (só existe em `contract_intakes`). O SELECT falha e a função responde 404 "Invalid or expired token" em **todas** as ações do link `/contract-signing/:token`: ver, guardar, carregar documentos, assinar e descarregar. Provado com o SELECT exato. O upload de documentos (`:932-951`) também lê e escreve esta coluna.

```sql
-- migração nova
ALTER TABLE public.startup_contracts
  ADD COLUMN IF NOT EXISTS documents_json jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.startup_contracts.documents_json IS
  'Documentos carregados pelo founder no link público (public-contract-onboarding upload_document)';
NOTIFY pgrst, 'reload schema';
```
Regenere o `types.ts` depois. Validado: com a coluna, o lookup por token devolve o contrato e a rota nativa completa (`signature_status` `completed`, signatário `signed`). Não é preciso redeploy da função. Opcional: em `PublicContractSigning.tsx`, no `useEffect` de pré-preenchimento (`:190-208`), releia `documents_json` para os documentos já carregados não desaparecerem ao recarregar a página.

## P2.7 — Intake: "Aprovar para assinatura" falha sempre

`src/hooks/useContractIntakes.ts:355` copia `billing_email` para `startup_contracts`, onde a coluna **não existe**. O PATCH é rejeitado (PGRST204) e aparece "Falha ao copiar dados fiscais/legais para o contrato… Aprovação cancelada". O intake nunca chega a `approved_for_signature`. Remova a linha `billing_email: current.billing_email,` (o valor fica no `approved_data_snapshot` do intake) e **retire o `as any`** desse `update` para o `tsc` apanhar colunas inexistentes.

## P2.8 — "Marcar como assinado" pelo backoffice ativa o contrato, mas o workspace fica pendente (MED)

Com um utilizador só de backoffice, `ContractDetailDrawer.tsx:1185-1205` → `contractLifecycleSync.ts:173-180` faz `update workspaces set status='active'`, que a RLS reduz a 0 linhas sem erro, e o toast diz "Marcado como assinado". O contrato fica ativo, mas o workspace `pending` (conversão de lead ou candidatura própria) continua pendente e o founder é mandado para `/claim-startup`. O painel do backoffice mostra "Pronto para ativação manual", mas o backoffice não consegue ativar. Só afeta as rotas manuais (`pandadoc_manual` e `manual`): a assinatura digital passa pelo servidor e funciona. O admin não é afetado.

```sql
-- migração nova (validada: founder → forbidden; antes de assinar → 'no_signed_contract'; depois → 'active';
-- workspace já ativa ou arquivada → 'unchanged', não reativa arquivadas; anon sem EXECUTE)
CREATE OR REPLACE FUNCTION public.activate_workspace_for_signed_contract(p_contract_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ws uuid; v_status text;
BEGIN
  IF NOT (public.is_staff() OR public.is_backoffice()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT workspace_id INTO v_ws FROM public.startup_contracts
   WHERE id = p_contract_id AND status = 'active' AND signed_at IS NOT NULL;
  IF v_ws IS NULL THEN RETURN 'no_signed_contract'; END IF;
  UPDATE public.workspaces SET status = 'active', updated_at = now()
   WHERE id = v_ws AND status IN ('pending','claimed','imported_unclaimed')
  RETURNING status INTO v_status;
  RETURN COALESCE(v_status, 'unchanged');
END; $$;
REVOKE EXECUTE ON FUNCTION public.activate_workspace_for_signed_contract(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_workspace_for_signed_contract(uuid) TO authenticated;
```
Em `src/lib/contractLifecycleSync.ts`, substitua o bloco "3. Activate workspace" (`:173-180`) por:
```ts
    // 3. Ativa o workspace por RPC SECURITY DEFINER (um UPDATE bloqueado pela RLS devolve 0 linhas sem erro)
    if (workspaceId) {
      const { data: wsResult, error: wsErr } = await supabase.rpc(
        'activate_workspace_for_signed_contract',
        { p_contract_id: contractId },
      );
      if (wsErr) syncErrors.push(`workspace_activate: ${wsErr.message}`);
      else if (wsResult === 'no_signed_contract') syncErrors.push('workspace_activate: no_signed_contract');
    }
```
Em `ContractDetailDrawer.tsx:1203`, a seguir a `invalidateQueries({ queryKey: ['workspaces'] })`, invalide também `['ops-action-prompts']` e `['pending-workspaces']`.

**Dados já afetados** (opcional, validado: só ativa workspaces `pending` com contrato manual assinado e com membros ativos):
```sql
UPDATE public.workspaces w SET status = 'active', updated_at = now()
 WHERE w.status = 'pending'
   AND EXISTS (SELECT 1 FROM public.startup_contracts c
                WHERE c.workspace_id = w.id AND c.status = 'active' AND c.signed_at IS NOT NULL
                  AND c.signature_provider IN ('pandadoc_manual', 'manual'))
   AND EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = w.id AND wu.active = true);
```
pgTAP: backoffice com contrato assinado → `'active'`; founder → `throws_ok('42501')`.

## P2.9 — Definições → Perfil apaga o telefone, LinkedIn, bio e especialidades

O `AuthContext.tsx:79` só carrega `id, email, full_name, avatar_url, account_status, created_at, updated_at`. `Settings.tsx:37-41` inicializa telefone, LinkedIn, bio e especialidades a partir desse perfil, portanto sempre vazios. Cada "Guardar" (`:158-161`) envia-os a `NULL`. O `Settings` é o único sítio que escreve estas colunas, e elas são lidas pela lista de mentores, pelo matching por especialidades e pelo contacto do consultor que o founder vê. Para mentores, apaga a bio e as especialidades que o `MentorDashboard` lhes pede para preencher. Provado como mentor: os quatro campos passam a `NULL` ao guardar só o nome. Os valores já apagados não são recuperáveis.

Em `src/pages/Settings.tsx`, carregue o perfil completo com uma query própria e hidrate o formulário a partir dela:
```ts
// :1
import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// :31
const { user, profile, roles, refreshProfile } = useAuth();
const queryClient = useQueryClient();
// logo a seguir a :43 (depois dos useState do perfil)
const { data: fullProfile, isLoading: loadingProfile } = useQuery({
  queryKey: ['my-profile', user?.id],
  enabled: !!user?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, phone, linkedin_url, bio, expertise')
      .eq('id', user!.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});
useEffect(() => {
  if (!fullProfile) return;
  setFullName(fullProfile.full_name ?? '');
  setAvatarUrl(fullProfile.avatar_url ?? '');
  setPhone(fullProfile.phone ?? '');
  setLinkedinUrl(fullProfile.linkedin_url ?? '');
  setBio(fullProfile.bio ?? '');
  setExpertise(fullProfile.expertise ?? []);
}, [fullProfile]);
// handleUpdateProfile, :138
if (!user || !fullProfile) return; // nunca gravar sem os valores atuais carregados
// depois de `if (error) throw error;` (:163)
queryClient.invalidateQueries({ queryKey: ['my-profile', user.id] });
void refreshProfile(); // não bloqueante: o canal realtime do AuthContext também atualiza a barra de topo
// :446
<Button type="submit" disabled={isUpdatingProfile || loadingProfile || !fullProfile} loading={isUpdatingProfile}>
```
O `!fullProfile` no botão e no handler é o que impede o apagamento quando a query falha: sem ele, o formulário vazio voltaria a gravar `NULL`. É compatível com a P1.1, porque o `Settings` não envia `account_status` nem `email`.

## P2.10 — Voltar ao separador desmonta a app (e pode mostrar o ecrã de erro a quem já tinha permissões)

O `@supabase/auth-js` 2.89 emite `SIGNED_IN` sempre que o separador volta a ficar visível (`GoTrueClient._onVisibilityChanged` → `_recoverAndRefresh`). O guarda em `AuthContext.tsx:209-217` só ignora esse evento se `initialUserId` estiver preenchido. Mas quem fez login na própria página tem `initialUserId = null`, porque o `INITIAL_SESSION` veio sem sessão. Então, cada alt-tab faz `setIsAuthReady(false)`, o `ProtectedRoute` mostra o ecrã de carregamento e **desmonta a página**, perdendo formulários e diálogos abertos. Isto é provavelmente a queixa "a app fecha" com outra causa. Com a rede ainda em baixo (portátil a acordar), as 3 tentativas falham e aparece o ecrã de erro a quem já tinha papéis.

```ts
// AuthContext.tsx
const loadedUserIdRef = useRef<string | null>(null);
// em fetchUserData, no ramo de sucesso:
loadedUserIdRef.current = userId;
// no ramo SIGNED_OUT:
loadedUserIdRef.current = null;
// substituir o guarda de :209-217
if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && loadedUserIdRef.current === newSession.user.id) {
  // refrescar em silêncio, sem desmontar a app
  setIsAuthReady(true);
  void fetchUserData(newSession.user.id, { isRefetch: true });
  return;
}
```
Garanta que o `fetchUserData` com `isRefetch: true` **não** marca `authError` quando já há papéis carregados.

## P2.11 — Mentor preso num ciclo /mentor-nda ↔ /my-workspaces depois de aceitar o NDA

`MentorNda.tsx:111-112` navega sem atualizar a cache `['mentor-nda-gate', userId]` (`useMentorNdaStatus.ts`, `staleTime` de 5 min). O `ProtectedRoute` continua a ler "não aceitou" e devolve-o ao NDA. O `MentorNda` vê que já aceitou e volta a mandá-lo para `/my-workspaces`. O ciclo dura até a cache expirar.

```ts
// MentorNda.tsx — topo: import { useQueryClient } from '@tanstack/react-query';
// dentro do componente, a seguir a :57: const queryClient = useQueryClient();
// depois do sucesso:
queryClient.setQueryData(['mentor-nda-gate', user?.id], true);
await queryClient.invalidateQueries({ queryKey: ['mentor-nda-gate'] });
navigate('/my-workspaces', { replace: true });
```

## P2.12 — Quem se regista a partir de um convite perde o convite

`AcceptInvite.tsx:105-108` manda para `/login?mode=signup&returnTo=/accept-invite?...`, mas `Login.tsx:152` chama `signUp(..., undefined, ...)` e ignora o `returnTo`. O email de confirmação leva a `/`, a conta fica `pending` e o utilizador vai parar a "Conta pendente". O convite, que aprovaria a conta, nunca é aceite. O founder convidado para uma startup existente também é obrigado a inventar um "Nome do projeto".

```ts
// Login.tsx
const safeReturnTo = useMemo(() => {
  if (!returnTo) return undefined;
  try {
    const d = decodeURIComponent(returnTo);
    return d.startsWith('/') && !d.startsWith('//') && !d.startsWith('/\\') ? d : undefined;
  } catch { return undefined; }
}, [returnTo]);
const isInviteSignup = !!safeReturnTo?.startsWith('/accept-invite');
// validação do nome da startup só quando !isInviteSignup
const { error } = await signUp(email, password, fullName, roleToAssign, safeReturnTo, startupName.trim() || undefined);
```
Esconda o campo "Nome do projeto" quando `isInviteSignup`.

Há um segundo bloqueio: em pré-lançamento (`open_registration` desligado), `check_signup_allowed` só aceita emails da allowlist, e um convidado que não esteja nela nem consegue criar conta. Aceite também quem tem um convite pendente:
```sql
-- migração nova (validada: convidado → t; email qualquer → f; o EXECUTE de anon mantém-se, porque é CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.check_signup_allowed(p_email text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_open boolean; v_domain text;
BEGIN
  SELECT enabled INTO v_open FROM feature_flags WHERE key = 'open_registration' AND scope = 'global' LIMIT 1;
  IF COALESCE(v_open, false) THEN RETURN true; END IF;
  v_domain := split_part(lower(p_email), '@', 2);
  RETURN EXISTS (SELECT 1 FROM signup_allowlist WHERE lower(email) = lower(p_email) OR lower(domain) = v_domain)
      OR EXISTS (SELECT 1 FROM workspace_invitations wi
                  WHERE lower(wi.email) = lower(p_email) AND wi.accepted_at IS NULL AND wi.expires_at > now());
END; $function$;
```
**Ação manual (Vítor):** em Supabase → Authentication → URL Configuration, confirme que os Redirect URLs aceitam `https://<domínio>/**` (só é indispensável se a app correr num domínio diferente do Site URL).

## P2.13 — Página pública de marcação: o pitch deck nunca é carregado

Desde a migração `20260426194940`, a policy de INSERT no bucket `booking-uploads` é só para `authenticated`. A página `/book/:token` é usada por visitantes **anónimos**, por isso `PublicBooking.tsx:212` (`supabase.storage.from('booking-uploads').upload(...)`) falha sempre. A app segue com "o ficheiro não carregou, envie por email". Não volte a abrir o INSERT a `anon`: foi fechado por segurança. Use um URL de upload assinado emitido pela edge function que já valida o token:

- Em `public-get-availability` (já `verify_jwt = false`), nova ação `upload_url`:
  1. valida o token como na ação `validate`;
  2. aplica `touch_public_booking_rate_limit`;
  3. aceita só as extensões `pdf, ppt, pptx, xls, xlsx, png, jpg, jpeg`;
  4. gera `path = \`pending/${crypto.randomUUID()}.${ext}\``;
  5. devolve `await supabase.storage.from('booking-uploads').createSignedUploadUrl(path)` (cliente service role).
- `PublicBooking.tsx:208-216`: peça o URL (`functions.invoke('public-get-availability', { body: { token, action: 'upload_url', ext } })`) e faça `supabase.storage.from('booking-uploads').uploadToSignedUrl(data.path, data.token, pitchFile)`.
- `public-book-first-contact/index.ts:119`: aceite `pitch_deck_path` só se começar por `pending/`.

## P2.14 — Inquéritos: nenhuma campanha pode ser lançada

O RC9 passou o botão "Lançar" para a RPC `launch_survey_campaign` (`useSurveys.ts:303-306`), como pedia o RC8. A RPC falha sempre com `42702 column reference "campaign_id" is ambiguous`: o parâmetro de saída `campaign_id` de `RETURNS TABLE` colide com a coluna no `ON CONFLICT (campaign_id, workspace_id)` (`20260713160803`). Provado como admin: a campanha fica em `draft` e não é criada nenhuma instância. Como as campanhas em rascunho só têm o botão "Lançar", nenhuma campanha fica ativa, a inscrição automática nunca corre, e o `send-survey-invites` e o link `/survey/:token` (novos no RC9) não têm nada para servir. O ledger do vendor marca este item como `FIXED + PASS`, e nenhuma suite pgTAP chama a RPC.

```sql
-- migração nova: o parâmetro OUT campaign_id (RETURNS TABLE) colide com a coluna no ON CONFLICT (42702);
-- e o lançamento passa a ser só de admin, como o separador de inquéritos (Admin.tsx:64)
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.launch_survey_campaign(uuid,uuid[])'::regprocedure);
  IF position(E'AS $function$\nDECLARE' IN d) = 0
     OR position($q$IF NOT is_staff() THEN
    RAISE EXCEPTION 'permission denied: staff only' USING ERRCODE = '42501';$q$ IN d) = 0 THEN
    RAISE EXCEPTION 'launch_survey_campaign: texto esperado não encontrado';
  END IF;
  d := replace(d, E'AS $function$\nDECLARE', E'AS $function$\n#variable_conflict use_column\nDECLARE');
  d := replace(d, $q$IF NOT is_staff() THEN
    RAISE EXCEPTION 'permission denied: staff only' USING ERRCODE = '42501';$q$,
                  $q$IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'permission denied: admin only' USING ERRCODE = '42501';$q$);
  EXECUTE d;
END $$;
```
Validado: o admin lança a campanha (1 instância criada), um segundo lançamento dá "campaign is not in draft state" e o consultor recebe "permission denied: admin only". A função irmã `submit_survey_responses` tem o mesmo defeito, mas a P1.2 retira-lhe o `EXECUTE` (não tem chamadores). pgTAP: admin → `lives_ok` e 1 linha em `survey_instances`; consultor → `throws_ok('42501')`. Em `useSurveys.ts:316`, mostre a mensagem do erro: `toast.error(t('surveys.launchFailed', 'Não foi possível lançar a campanha') + ': ' + (error as Error).message)`.

## P2.15 — DocuSign: o webhook nunca atualiza o contrato

`supabase/functions/docusign-webhook/index.ts:325-351` junta `canonical_signature_status` ao `update` de `startup_contracts` em todos os eventos (`completed`, `declined`, `voided`, `sent_for_signature`, `viewed`). Essa coluna não existe. O PATCH é rejeitado, a função marca o evento como `failed` no `webhook_inbox` e responde 200 (`:353-365`), por isso o DocuSign não volta a tentar. Um contrato assinado por DocuSign nunca fica `active`, recusas e anulações nunca ficam registadas, e o `syncIntakeOnCompleted` e a criação da conta do founder nunca correm. O DocuSign é escolhível em `IntakeReviewPanel.tsx:45`.

Em `docusign-webhook/index.ts`, apague a linha `:338` (`updatePayload.canonical_signature_status = 'completed'`) e todo o bloco `:343-351` (os `else if` de `declined`, `voided`, `sent_for_signature` e `viewed`, que só escrevem essa coluna). O resto do `updatePayload` fica igual.

**Eventos já perdidos.** Liste os contratos afetados (só leitura):
```sql
SELECT wi.contract_id, wi.event_name, wi.received_at, sc.status, sc.signature_status
  FROM public.webhook_inbox wi
  JOIN public.startup_contracts sc ON sc.id = wi.contract_id
 WHERE wi.provider = 'docusign' AND wi.status = 'failed'
   AND wi.error_message LIKE 'contract_update_failed%'
 ORDER BY wi.received_at;
```
Para cada envelope concluído, confirme no DocuSign e use "Marcar como assinado" (que, com a P2.8, também ativa o workspace).

Nota de seguimento, que não bloqueia este item: depois de "Repor e reenviar" (P3.3) num envelope DocuSign recusado, o reenvio devolve `already_sent` com o envelope antigo, porque o `command_id` é determinístico (`docusign-send-envelope/index.ts:141-146`) e a lease em `docusign_dispatch_leases` fica `sent`. Até existir uma RPC de reset do lado do servidor, reenvie esses contratos por outro fornecedor.

---

**Fim da Parte 2.** Corra o harness e o `rc5:verify`, e diga-me o que ficou por aplicar antes de colar a Parte 3.


# PROMPT LOVABLE — RC9 · PARTE 3 de 5 — Contratos, ocupação, CRM e automações

Mesmas regras da Parte 1. Aqui estão defeitos de gravidade média e baixa (os de gravidade baixa estão marcados no título): cada um parte uma ação concreta. Mais de metade são **colunas que não existem** (`released_at`, `canonical_signature_status`, `startup_contracts.startup_id`, `startups.sector`, `startups.stage`, `sessions.summary`). O `tsc` só não as apanha por causa do `as any`. Quando tocar nestas linhas, retire o `as any` do payload.

---

## P3.1 — Ocupação: renovar não prolonga a sala, terminar não a liberta, "Desocupar" só liberta no dia seguinte

Três sintomas com a mesma raiz: as leituras de ocupação tratam `end_date >= hoje` como alocação atual (`useBackoffice.ts:385-386`, `useBuildingOccupancy.ts:187-188`), mas as escritas não seguem essa convenção.

- **Renovar** (`RenewContractDialog.tsx:73-88`) filtra por `.is('released_at', null)`, e essa coluna não existe. O erro é engolido pelo `try/catch` (o supabase-js não lança, por isso `allocs` fica `null`). A alocação nunca é prolongada: o contrato vai até 2027 e a sala aparece livre a partir do fim antigo.
- **Terminar** (`useTerminateContract.ts:64-73`) só fecha alocações com `end_date IS NULL`. Uma alocação com data de fim futura continua a ocupar a sala até essa data, e `rooms.status` fica `occupied`. Provado com admin: 2 alocações, só 1 fechada.
- **Desocupar** (`useEndRoomAllocation`, `useBackoffice.ts:540`) grava `end_date = hoje`, que continua a contar como "atual" hoje. O drawer mantém o ocupante e o botão "Atribuir Startup" só aparece amanhã. Há ainda um toast duplicado em `SpaceDetailDrawer.tsx:122` e `:137`, porque o hook já notifica.

Um workspace pode ter mais de um contrato com sala, e uma lead do CRM pode ter alocação ligada só pelo `contract_id`. Por isso as alocações de um contrato são as que têm o `contract_id` dele, mais as do workspace sem contrato; nunca as de outro contrato.

**Correção.** Em `src/hooks/useBackoffice.ts`, acrescente três utilitários exportados:
```ts
// Fim inclusivo: os leitores tratam end_date >= hoje como "atual". Libertar agora = terminar ontem.
export const releaseNowEndDate = () => new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

// Alocações de um contrato: as dele e as do workspace sem contrato (nunca as de outro contrato ativo).
export async function findContractAllocations(contract: { id: string; workspace_id: string | null }) {
  const owner = contract.workspace_id
    ? `contract_id.eq.${contract.id},workspace_id.eq.${contract.workspace_id}`
    : `contract_id.eq.${contract.id}`;
  const { data, error } = await supabase.from('room_allocations')
    .select('id, room_id, contract_id, end_date').or(owner);
  if (error) throw error;
  return (data ?? []).filter((a) => a.contract_id === contract.id || a.contract_id === null);
}

export async function markRoomsAvailableIfFree(roomIds: string[]) {
  const today = new Date().toISOString().split('T')[0];
  for (const roomId of new Set(roomIds)) {
    const { data: current, error } = await supabase
      .from('room_allocations').select('id')
      .eq('room_id', roomId).lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`);
    if (error) throw error;
    if (!current?.length) {
      // só salas ocupadas; uma sala em manutenção fica como está
      const { error: roomErr } = await supabase.from('rooms')
        .update({ status: 'available' }).eq('id', roomId).eq('status', 'occupied');
      if (roomErr) throw roomErr;
    }
  }
}
```
- `useEndRoomAllocation` (`:540`): troque `end_date: today` por `end_date: releaseNowEndDate()`. Remova o `notify.success` de `SpaceDetailDrawer.tsx:122` e `:137`.
- `src/hooks/backoffice/useTerminateContract.ts`: importe `findContractAllocations`, `releaseNowEndDate` e `markRoomsAvailableIfFree` de `@/hooks/useBackoffice` (hoje o import desse módulo é só `import type`) e substitua o bloco `if (contract.workspace_id) { … }` de `:64-73` por:
```ts
// reutiliza `today` de :51
const openAllocs = (await findContractAllocations(contract)).filter((a) => !a.end_date || a.end_date >= today);
if (openAllocs.length) {
  const { data: closed, error: allocErr } = await supabase.from('room_allocations')
    .update({ end_date: releaseNowEndDate() }).in('id', openAllocs.map((a) => a.id)).select('id');
  if (allocErr) throw new Error(`Failed to close room allocation: ${allocErr.message}`);
  if ((closed?.length ?? 0) !== openAllocs.length) throw new Error('Sem permissão para libertar a sala (room_allocations).');
  await markRoomsAvailableIfFree(openAllocs.map((a) => a.room_id));
}
```
- `RenewContractDialog.tsx`: importe `findContractAllocations` de `@/hooks/useBackoffice` e substitua o bloco que começa em `// Extend the linked room_allocation end_date` (`:73-88`) por:
```ts
// Prolonga as alocações em curso deste contrato
try {
  const today = new Date().toISOString().split('T')[0];
  const ids = (await findContractAllocations(contract))
    .filter((a) => a.end_date && a.end_date >= today).map((a) => a.id);
  if (ids.length) {
    const { data: upd, error: allocUpdErr } = await supabase.from('room_allocations')
      .update({ end_date: newEnd }).in('id', ids).select('id');
    if (allocUpdErr || (upd?.length ?? 0) !== ids.length) throw new Error(allocUpdErr?.message ?? 'rls');
  }
} catch {
  notify.warn('Contrato renovado, mas a alocação da sala não foi prolongada. Prolongue-a em Espaços.');
}
```
  Aqui o `try/catch` é válido, porque o `findContractAllocations` e o `throw` lançam de facto. As alocações sem data de fim já estão em curso e não precisam de ser prolongadas.

No `onSuccess` do `RenewContractDialog` acrescente `['rooms']`, `['rooms-with-allocations']` e `['building-occupancy']`. Um contrato `expired` reativado já não tem alocação corrente; nesse caso a sala tem de ser atribuída de novo em Espaços. Não a realoque automaticamente, porque pode já estar ocupada por outra startup.

Validado na base: com dois contratos no mesmo workspace, terminar o primeiro fecha a sala dele, a sala do workspace sem contrato e a sala da lead CRM ligada pelo `contract_id`, e deixa a sala do segundo contrato.

## P3.2 — Novo contrato: a "Sala" escolhida nunca gera alocação

`BackofficeContractsTab.tsx:291` grava a sala escolhida no formulário (`ContractReviewForm.tsx:260`) só em `startup_contracts.room_id`. Nenhum código, trigger ou função lê essa coluna, por isso a sala fica livre no mapa de ocupação.

Em `BackofficeContractsTab.tsx`, importe `useCreateRoomAllocation` de `@/hooks/useBackoffice`, declare `const createRoomAllocation = useCreateRoomAllocation();` junto de `useAuth()` (`:103`) e, logo a seguir a `const newContract = await createContract.mutateAsync(payload);` (`:305`), acrescente:
```ts
// Só contratos em vigor ou a caminho, com fim no futuro, e só se a sala estiver livre nesse período
const todayIso = new Date().toISOString().split('T')[0];
const allocatable = ['draft', 'pending_signature', 'active'].includes(rest.status) && (!end_date || end_date >= todayIso);
if (newContract?.id && room_id && (workspace_id || crmFunnelId) && allocatable) {
  const { data: busy, error: busyErr } = await supabase.from('room_allocations').select('id')
    .eq('room_id', room_id).lte('start_date', end_date || '9999-12-31')
    .or(`end_date.is.null,end_date.gte.${rest.start_date}`);
  if (busyErr || (busy?.length ?? 0) > 0) {
    notify.warn('Contrato criado, mas a sala já está ocupada nesse período. Atribua-a em Espaços.');
  } else {
    try {
      await createRoomAllocation.mutateAsync({
        room_id,
        workspace_id: workspace_id || null,
        funnel_item_id: workspace_id ? null : crmFunnelId,
        contract_id: newContract.id,
        allocation_type: 'permanent',
        start_date: rest.start_date,
        end_date: end_date || null,
        created_by: user?.id ?? null,
      });
    } catch {
      // o hook já mostra o erro; o contrato fica criado e a sala pode ser atribuída em Espaços
    }
  }
}
```
Acrescente `createRoomAllocation` ao array de dependências do `useCallback` (`:350`). O `notify` e o `supabase` já estão importados. Com a P3.1, terminar o contrato liberta esta alocação, incluindo a de uma lead CRM sem workspace, porque o `findContractAllocations` também procura pelo `contract_id`.

## P3.3 — "Repor e reenviar" (contrato recusado ou anulado) falha sempre

`ContractDetailDrawer.tsx:1053` inclui `canonical_signature_status: null` no `update`, e essa coluna não existe. O PATCH é rejeitado e o contrato não volta a rascunho. O webhook do DocuSign escreve a mesma coluna (ver P2.15). Substitua `:1044-1058` por (sem `as any`, todas as colunas existem):
```ts
// ContractDetailDrawer.tsx:1044-1058
const { data: resetRows, error } = await supabase
  .from('startup_contracts')
  .update({
    signature_status: 'draft',
    status: 'draft',
    provider_document_id: null,
    docusign_envelope_id: null,
    provider_last_error: null,
    provider_last_event: null,
    founder_signer_status: 'pending',
    counter_signer_status: null,
  })
  .eq('id', contract.id)
  .select('id');
if (error) throw error;
if (!resetRows?.length) throw new Error(t('contractDetail.resetFailed', { defaultValue: 'Falha ao repor estado' }));
```

## P3.4 — Listagens de contratos vazias: "Contratos a Expirar (30 dias)", `/admin/contracts` e pesquisa global

`startup_contracts` não tem `startup_id` nem FK para `startups` (só para `workspaces`), e também não tem `billing_email`. Cada uma destas queries devolve erro, e a lista aparece vazia.

- `StaffCockpit.tsx:324`:
```ts
.select('id, contract_number, end_date, organization_name, workspace:workspaces(startup:startups(name))')
```
  e em `:358`: `{(c.workspace as any)?.startup?.name ?? c.organization_name}`.
- `AdminContracts.tsx:90`: retire `billing_email,` do `select` e a propriedade `billing_email` do tipo em `:33`.
- `useGlobalSearch.ts:404`:
```ts
.select('id, contract_number, status, updated_at, workspace_id, organization_name, workspace:workspaces(startup:startups(name))')
```
  Em `:413` e `:416` use `c.workspace?.startup?.name || c.organization_name`. Em `:415` use `url: \`/admin/contracts?open=${c.id}\``, porque a página lê `searchParams.get('open')` (`AdminContracts.tsx:112`).

## P3.5 — CRM, ficha da lead, separador Contexto: a startup associada nunca aparece

`startups` não tem `sector`. As duas queries de `LinkedContextPanel.tsx` falham e o painel mostra "sem contexto".
- `:104`: `.select('id, stage, status, startup:startups(id, name, main_contact_email, main_contact_name), program:programs(id, name)')`
- `:120`: `.select('id, name, main_contact_email, main_contact_name')`
- Remova os dois blocos que mostram o sector (`:255-259` e `:281-285`).

## P3.6 — Contrato assinado sem workspace (criado no CRM): a criação automática da startup falha sempre

`supabase/functions/_shared/lifecycleSync.ts:149-183` insere `stage: 'ideation'` em `startups` (a coluna não existe) e cria o workspace sem `program_id`, que é `NOT NULL` sem default. Mesmo corrigidas as colunas, o workspace novo fica sem membros, e a ativação em `:251-259` é recusada pelo trigger `validate_workspace_status_transition` ("no active members found"). O contrato fica ativo sem workspace e o founder sem conta. Substitua o `try { … } catch (mintErr) { … }` de `:149-183` (validado na base: com o founder já membro e o workspace em `claimed`, a ligação do contrato não cria tarefa e o workspace termina `active`):
```ts
// supabase/functions/_shared/lifecycleSync.ts — no topo
import { autoCreateFounderAccount } from './founderAccount.ts'

// substituir o try { … } catch (mintErr) { … } de :149-183 por:
      try {
        // 1) Programa resolvido ANTES de criar linhas (evita startups órfãs)
        let programId: string | null = null
        if (fallbackFunnelItemId) {
          const { data: fi } = await supabase.from('funnel_items').select('program_id').eq('id', fallbackFunnelItemId).maybeSingle()
          programId = fi?.program_id ?? null
        }
        if (!programId) {
          const { data: active } = await supabase.from('programs').select('id').eq('is_active', true).limit(2)
          if (active?.length === 1) programId = active[0].id
        }
        if (!programId) throw new Error('auto_mint_no_program: associe a lead a um programa e crie o workspace manualmente')

        // 2) startups não tem coluna stage; workspaces.program_id é NOT NULL
        const { data: newStartup, error: startupErr } = await supabase.from('startups')
          .insert({ name: orgName, main_contact_email: contactEmail, main_contact_name: contactName })
          .select('id').single()
        if (startupErr) throw startupErr
        const { data: newWs, error: wsErr } = await supabase.from('workspaces')
          .insert({ startup_id: newStartup.id, program_id: programId, status: 'pending', needs_onboarding: true })
          .select('id').single()
        if (wsErr) {
          await supabase.from('startups').delete().eq('id', newStartup.id)
          throw wsErr
        }
        effectiveWorkspaceId = newWs.id

        // 3) A ativação exige um membro ativo (trigger validate_workspace_status_transition):
        //    criar já a conta + membro founder (idempotente; põe o workspace em 'claimed')
        const acct = await autoCreateFounderAccount(supabase, {
          id: contractId,
          workspace_id: effectiveWorkspaceId,
          legal_representative_email: contactEmail,
          legal_representative_name: contactName,
        })
        if (!acct.ok) errors.push(`auto_mint_founder: ${acct.reason ?? 'unknown'}`)

        // 4) Ligar contrato e lead (igual ao código atual)
        const { error: contractLinkErr } = await supabase.from('startup_contracts')
          .update({ workspace_id: effectiveWorkspaceId })
          .eq('id', contractId)
        if (contractLinkErr) errors.push(`contract_workspace_link: ${contractLinkErr.message}`)
        if (fallbackFunnelItemId) {
          const { error: funnelLinkErr } = await supabase.from('funnel_items')
            .update({ linked_workspace_id: effectiveWorkspaceId })
            .eq('id', fallbackFunnelItemId)
          if (funnelLinkErr) errors.push(`funnel_workspace_link: ${funnelLinkErr.message}`)
        }
      } catch (mintErr: any) {
        console.error('[lifecycleSync] auto-mint workspace failed', { contractId, error: mintErr?.message })
        errors.push(`auto_mint_workspace: ${mintErr?.message || mintErr}`)
      }
```
Em `_shared/lifecycleSyncResultHandler.ts:54`, troque `.in('role', ['admin', 'consultor'])` por `.in('role', ['admin', 'consultor', 'backoffice'])`, para o backoffice (dono dos contratos) receber o aviso de falha. Recomendado: nos chamadores, ao criar a conta do founder, use o `workspaceId` devolvido pelo `syncIntakeOnCompleted` em vez do `workspace_id` lido antes do sync (`public-contract-onboarding/index.ts:1441-1455`, `pandadoc-webhook/index.ts:392-405` e `docusign-webhook/index.ts:425-440`: `r.workspaceId ?? contract.workspace_id`).

## P3.7 — Ecossistema, "Eliminar lead": o "Anular" falha sempre e o histórico é apagado

`EcosystemTable.tsx:219-223` apaga a lead. Seis tabelas têm FK em cascata para `funnel_items` (`communication_log`, `funnel_events`, `relationship_recaps`, `space_waiting_list`, `crm_stage_email_log`, `first_contact_outbox`), por isso notas e eventos desaparecem. O "Anular" (`:234`) reinsere o snapshot com as colunas geradas `email_normalized` e `company_normalized`, e falha sempre com `cannot insert a non-DEFAULT value into column "email_normalized"`.

O CRM já arquiva leads (`CrmBulkActions.tsx:316`, `stage: 'archived'`). Use o mesmo caminho aqui. Falta, porém, que a listagem do Ecossistema esconda as leads arquivadas: `list_ecosystem_items_v2` exclui `'lost','disqualified','contracted'`, e os dois primeiros nem existem no CHECK de `funnel_items.stage`.

```sql
-- migração nova (validada: 1 overload, filtro substituído uma vez, ACL mantida; lead 'archived' deixa de aparecer e volta com o "Anular")
DO $$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'list_ecosystem_items_v2';
  IF d IS NULL OR position($q$NOT IN ('lost','disqualified','contracted')$q$ IN d) = 0 THEN
    RAISE EXCEPTION 'list_ecosystem_items_v2: filtro de estados esperado não encontrado';
  END IF;
  d := replace(d, $q$NOT IN ('lost','disqualified','contracted')$q$,
                  $q$NOT IN ('lost','disqualified','contracted','archived')$q$);
  EXECUTE d;
END $$;
```
Em `EcosystemTable.tsx`, `handleDeleteLead` passa a arquivar, com um "Anular" que repõe a fase anterior:
```ts
// EcosystemTable.tsx — handleDeleteLead (substitui :175-262)
const handleDeleteLead = async (item: EcosystemItem) => {
  const leadId = item.funnel_item_id;
  if (!leadId) return;
  try {
    const { data: before } = await supabase.from('funnel_items').select('stage').eq('id', leadId).maybeSingle();
    const prevStage = before?.stage ?? 'new';
    const { data: upd, error } = await supabase.from('funnel_items')
      .update({ stage: 'archived', updated_at: new Date().toISOString() })
      .eq('id', leadId).select('id');
    if (error) throw error;
    if (!upd?.length) throw new Error('Sem permissão para arquivar esta lead.');
    const { data: authData } = await supabase.auth.getUser();
    const performedBy = authData.user?.id ?? null;
    await supabase.from('funnel_events').insert({
      funnel_item_id: leadId, event_type: 'archived', from_stage: prevStage, to_stage: 'archived', performed_by: performedBy,
    });
    let undoInFlight = false;
    notify.success(t('ecosystem.leadDeleted', { defaultValue: 'Lead arquivada' }), {
      duration: 8000,
      action: {
        label: t('common.undo', { defaultValue: 'Anular' }),
        onClick: async () => {
          if (undoInFlight) return;
          undoInFlight = true;
          const { data: back, error: undoErr } = await supabase.from('funnel_items')
            .update({ stage: prevStage, updated_at: new Date().toISOString() })
            .eq('id', leadId).eq('stage', 'archived').select('id');
          if (undoErr || !back?.length) {
            notify.error(t('common.undoFailed', { defaultValue: 'Não foi possível anular' }));
          } else {
            await supabase.from('funnel_events').insert({
              funnel_item_id: leadId, event_type: 'unarchived', from_stage: 'archived', to_stage: prevStage, performed_by: performedBy,
            });
            notify.success(t('ecosystem.leadRestored', { defaultValue: 'Lead restaurada' }));
          }
          queryClient.invalidateQueries({ queryKey: ['ecosystem-items-v2'] });
        },
      },
    });
    queryClient.invalidateQueries({ queryKey: ['ecosystem-items-v2'] });
  } catch (err: any) {
    notify.error(t('ecosystem.deleteLeadError', { defaultValue: 'Erro ao arquivar a lead' }), { description: err?.message || undefined });
  }
};
```
Os textos (`ecosystem.deleteLead`, `ecosystem.leadDeleted`, `ecosystem.confirmDeleteTitle`, `ecosystem.confirmDeleteDesc`, `ecosystem.deleteLeadError`) já vêm com "Arquivar" no anexo de i18n da Parte 5. No botão de confirmação do diálogo (`EcosystemTable.tsx:593`), troque `t('common.delete', …)` por `t('common.archive', { defaultValue: 'Arquivar' })`.

## P3.8 — Intake, "Pedir correções": a falha do email aparece como sucesso (LOW)

`useContractIntakes.ts:410-426` envolve `invokeWithAuth('send-intake-email', …)` num `try/catch`, mas `invokeWithAuth` devolve `{ data, error }` e nunca lança (`invokeWithAuth.ts:37-57`). Se a Resend falhar, o estado passa a `changes_requested` e aparece sucesso. O founder acaba por receber o pedido no lembrete diário (`run-intake-reminders`, com link novo) e o staff tem o "Copiar Link", mas o staff não sabe que o email falhou, e repetir a ação é recusado, porque `changes_requested → changes_requested` não é uma transição válida (`intakeStates.ts:31`).

Substitua `:410-426` por:
```ts
const { error: mailErr } = await invokeWithAuth('send-intake-email', {
  body: {
    type: 'changes_requested',
    intakeId: params.intakeId,
    recipientEmail: preparedChangesRequestedEmail.recipientEmail,
    recipientName: preparedChangesRequestedEmail.recipientName,
    organizationName: preparedChangesRequestedEmail.organizationName,
    intakeToken: preparedChangesRequestedEmail.intakeToken,
    changesNotes: params.notes,
  },
});
if (mailErr) {
  logger.error('changes_requested_email_failed', { error: mailErr.message });
  throw new Error(`Falha ao enviar o email de pedido de correções ao fundador: ${mailErr.message}. O estado não foi alterado; tente novamente.`);
}
```
Nos outros dois sítios onde o resultado de `invokeWithAuth` é ignorado (`useSessions.ts:122` e `BulkContractImport.tsx:231`), leia o `{ error }` e registe-o com `logger.warn`, **sem lançar**: são notificações de melhor esforço e lançar partiria o fluxo.

## P3.9 — Fila de trabalho: "Adiar 1 dia / 1 semana" esconde o item para sempre e o recálculo cria um duplicado

`useWorkQueue.ts:147-150` e `WorkQueueBulkActions.tsx:96` gravam `status: 'snoozed'` e `snoozed_until`, mas nada volta a abrir o item. E todos os escritores da fila criam um item `open` igual ao lado do adiado: o `recompute-work-queue` (`:51-57`, só procura `open`/`in_progress`), a reconciliação horária `reconcile_contract_founders`, o `enqueueFounderInviteTask` e o trigger de stage gates. Provado: com um item de triagem adiado 7 dias, a reconciliação seguinte deixa um `open` e um `snoozed`.

```sql
-- migração nova (validada: expirado sem duplicado → open; expirado com open existente → done; futuro → snoozed;
-- com o item adiado, a reconciliação não duplica; depois de expirar, reabre e a reconciliação seguinte também não duplica)
CREATE OR REPLACE FUNCTION public.reopen_expired_work_queue_snoozes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.staff_work_queue_items s SET status = 'done', updated_at = now()
   WHERE s.status = 'snoozed' AND s.snoozed_until <= now()
     AND EXISTS (SELECT 1 FROM public.staff_work_queue_items o
                  WHERE o.workspace_id = s.workspace_id AND o.type = s.type
                    AND o.status IN ('open','in_progress'));
  WITH c AS (
    SELECT DISTINCT ON (workspace_id, type) id FROM public.staff_work_queue_items
     WHERE status = 'snoozed' AND snoozed_until <= now()
     ORDER BY workspace_id, type, snoozed_until DESC)
  UPDATE public.staff_work_queue_items s SET status = 'open', snoozed_until = NULL, updated_at = now()
    FROM c WHERE s.id = c.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.reopen_expired_work_queue_snoozes() FROM PUBLIC, anon, authenticated;

-- Enquanto um item estiver adiado, nenhum escritor cria outro igual (cobre recompute, reconciliação, convites e stage gates)
CREATE OR REPLACE FUNCTION public.tg_work_queue_respect_snooze()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('open','in_progress') AND EXISTS (
       SELECT 1 FROM public.staff_work_queue_items s
        WHERE s.workspace_id = NEW.workspace_id AND s.type = NEW.type
          AND s.status = 'snoozed' AND s.snoozed_until > now()) THEN
    RETURN NULL; -- item adiado: não criar duplicado
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_work_queue_respect_snooze() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_work_queue_respect_snooze ON public.staff_work_queue_items;
CREATE TRIGGER trg_work_queue_respect_snooze BEFORE INSERT ON public.staff_work_queue_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_work_queue_respect_snooze();

DO $do$
BEGIN
  PERFORM cron.unschedule('reopen-work-queue-snoozes')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reopen-work-queue-snoozes');
  PERFORM cron.schedule('reopen-work-queue-snoozes', '23 * * * *',
    $cron$SELECT public.cron_invoke_rpc('reopen_expired_work_queue_snoozes', 'public.reopen_expired_work_queue_snoozes()')$cron$);
END $do$;
INSERT INTO public.automation_health_expectations (job_name, expected_cadence_seconds, grace_seconds, severity)
VALUES ('reopen_expired_work_queue_snoozes', 3600, 900, 'low')
ON CONFLICT (job_name) DO NOTHING;
```
O trigger devolve `NULL` em silêncio: um `insert` sem `.select()` não dá erro, e a RPC da P4.5 (`ON CONFLICT … RETURNING`) devolve `NULL` sem erro. O job passa pelo `cron_invoke_rpc`, por isso fica registado em `cron_job_runs` e aparece na Saúde do Sistema. Não é preciso alterar o `recompute-work-queue`.

## P3.10 — Contra-assinatura nativa: o item da fila nunca é criado

`public-contract-onboarding/index.ts:1396-1407` insere `type: 'counter_sign_contract'` em `staff_work_queue_items`, mas o CHECK `staff_work_queue_items_type_check` não inclui esse tipo. O erro é engolido por um `try/catch` morto e o contrato fica `partially_signed` sem aviso ao staff.
```sql
-- migração nova
ALTER TABLE public.staff_work_queue_items DROP CONSTRAINT IF EXISTS staff_work_queue_items_type_check;
ALTER TABLE public.staff_work_queue_items ADD CONSTRAINT staff_work_queue_items_type_check CHECK (type = ANY (ARRAY[
  'triage','outreach','schedule_session','post_session_followup','overdue_actions','missing_kpis',
  'stage_gate_review','escalation','monthly_review','quarterly_review','validate_actions','review_checkin',
  'counter_sign_contract','financial_assumption_skipped','milestone_missed']));
```
O tipo `financial_assumption_skipped` é o da P4.5. Fica já aqui para o CHECK ser redefinido uma única vez; não o volte a redefinir na Parte 4.

O mesmo CHECK recusa também o alerta de marco falhado: o cron diário `check-missed-milestones` (09:00) insere `type: 'milestone_missed'` (`check-missed-milestones/index.ts:141-153`) e ignora o erro, por isso nenhum marco falhado chega à fila do staff. Provado: o INSERT dá `violates check constraint "staff_work_queue_items_type_check"`. Acrescente `'milestone_missed'` à lista do CHECK acima.

No `index.ts` da `public-contract-onboarding`, troque o `try/catch` por `const { error: qErr } = await supabase.from('staff_work_queue_items').insert({...}); if (qErr) console.error('counter-sign work-queue insert failed:', qErr.message);`. Acrescente `counter_sign_contract`, `financial_assumption_skipped` e `milestone_missed` a `TYPE_KEYS` em `WorkQueuePanel.tsx`, e as chaves `workQueue.types.counter_sign_contract` ("Contra-assinar contrato" / "Counter-sign contract"), `workQueue.types.financial_assumption_skipped` ("Rever pressuposto financeiro" / "Review financial assumption") e `workQueue.types.milestone_missed` ("Marco falhado" / "Missed milestone") a `pt.json` e `en.json`.

## P3.11 — Avisos (admin): "Enviar para todas" inclui startups arquivadas, a opção Teams não faz nada e falhas de email aparecem como sucesso

- `AdminAnnouncementsManager.tsx:72-75`: acrescente `.eq('status', 'active').is('archived_at', null)` à query de workspaces.
- Substitua `:131-151` (envio e `onSuccess`) por:
```ts
      if (data.sendEmail && insertedAnnouncements?.length) {
        const { data: emailData, error: emailError } = await invokeWithAuth<{ emailsSent: number; errors?: string[] }>(
          'send-announcement-email', { body: { announcement_ids: insertedAnnouncements.map((a) => a.id) } });
        if (emailError || (emailData?.errors?.length ?? 0) > 0) {
          logger.error('Email send error', { errors: emailData?.errors }, emailError ?? undefined);
          return { emailOk: false };
        }
        return { emailOk: true };
      }
      return { emailOk: null };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      if (res?.emailOk === false) notify.warn(t('admin.announcements.emailFailed'));
      else notify.success(res?.emailOk ? t('admin.announcements.sentWithEmail') : t('admin.announcements.sent'));
      setFormData(EMPTY_FORM);
      setIsDialogOpen(false);
    },
```
  Hoje a função devolve `success: true` mesmo com erros (`send-announcement-email/index.ts:243-246`), e o `onSuccess` mostrava "emails entregues a todos" logo a seguir ao aviso de falha.
- Remova o checkbox `sendTeams` (`:333-343`): `send_teams` só é gravado (`:120`) e nada o lê.
- Nenhum ecrã de founder lê `admin_announcements`: sem email, o aviso não chega a ninguém. Enquanto não houver leitor na app, retire também o checkbox `sendEmail` (`:322-332`) e envie sempre (`sendEmail: true`).
- `send-announcement-email/index.ts:175-177`: `startups` não tem `founder_email`. Use `.select('main_contact_email, name')` e, em `:188-192`, `startup.main_contact_email`.

## P3.12 — Qualidade de Dados: "Workspaces sem founder" ignora os workspaces sem membros e conta founders inativos (LOW)

`DataQualityDashboard.tsx:54-61` usa `workspace_users!inner`, o que exclui os workspaces ativos **sem nenhum membro**, e não lê `active`, por isso um founder desativado conta como founder. O `error` também é ignorado, e um erro aparece como "sem problemas".
```ts
const { data: activeWs, error: wsErr } = await supabase
  .from('workspaces')
  .select('id, startup:startups!workspaces_startup_id_fkey(id, name, main_contact_email), workspace_users(user_id, role, active)')
  .eq('status', 'active');
if (wsErr) throw wsErr;
activeWs?.forEach((w) => {
  const hasFounder = ((w.workspace_users as { role: string; active: boolean }[]) ?? [])
    .some((wu) => wu.role === 'founder' && wu.active);
  if (!hasFounder && w.startup) { /* empurrar missing_founder como hoje */ }
});
```
Faça o mesmo (`const { data, error } = …; if (error) throw error;`) nas queries de `:37-41` e `:81-85`.

## P3.13 — Utilizadores & Permissões não permite atribuir nem filtrar o papel backoffice

`AdminUsersManager.tsx:34` lista `['admin','consultor','mentor_externo','founder','team_member']`, e o mesmo array alimenta o filtro (`:235`), o diálogo "Adicionar papel" (`:469`) e o papel de workspace (`:536`). Nenhuma edge function nem RPC atribui o papel backoffice, por isso hoje só se consegue por SQL. A base aceita-o (policy "Admin can manage all roles").

O backoffice é um papel global, não um papel de workspace. Por isso separe as duas listas:
```ts
// AdminUsersManager.tsx:34-35
const ROLES = ['admin', 'consultor', 'backoffice', 'mentor_externo', 'founder', 'team_member'] as const;
type Role = typeof ROLES[number];
const WORKSPACE_ROLES = ['consultor', 'mentor_externo', 'founder', 'team_member'] as const;
type WorkspaceRole = typeof WORKSPACE_ROLES[number];
// :62
const [wsRole, setWsRole] = useState<WorkspaceRole>('founder');
// :531 e :536
<Select value={wsRole} onValueChange={(v) => setWsRole(v as WorkspaceRole)}>
  {WORKSPACE_ROLES.map(role => (<SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>))}
```
- `useAdminData.ts:177` (`useAddUserRole`): tipe `role` como `AppRole` (`import type { AppRole } from '@/types/database'`), que já inclui `backoffice`.
- Não acrescente `backoffice` a `useAddWorkspaceUser` nem a `useUpdateWorkspaceUser`. Se o `tsc` se queixar do `wsRole`, é porque o seletor de workspace ainda usa `ROLES`: corrija o seletor, não o hook.
- O rótulo "Backoffice" vem com o anexo de i18n da Parte 5 (`roles.backoffice`).

## P3.14 — Caixas de pedidos do staff sem identificação

- `FounderRequestsInbox.tsx:63` seleciona `workspaces.name`, que não existe. A query falha e cada pedido aparece com o UUID truncado. Use `.select('id, startup:startups(name)')`.
- `PendingApprovalsManager.tsx:96-110` faz o embed `profile:profiles(...)` a partir de `workspace_users`, sem FK entre as duas (PGRST200). Os cartões de startups pendentes aparecem sem nome nem email do founder. Substitua `:96-110`, incluindo a declaração do `founderMap` em `:105`, por duas queries:
```ts
const founderMap = new Map<string, NonNullable<PendingWorkspace['founder']>>();
const { data: members, error: mErr } = await supabase.from('workspace_users')
  .select('workspace_id, user_id').in('workspace_id', workspaceIds).eq('role', 'founder');
if (mErr) throw mErr;
const ids = [...new Set((members ?? []).map((m) => m.user_id))];
const { data: profs, error: pErr } = ids.length
  ? await supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', ids)
  : { data: [], error: null };
if (pErr) throw pErr;
const byId = new Map((profs ?? []).map((p) => [p.id, p]));
members?.forEach((m) => { const p = byId.get(m.user_id); if (p) founderMap.set(m.workspace_id, p); });
```

## P3.15 — Snapshot de faturação: "Faturas em atraso" nunca conta nada

`BillingSnapshotCard.tsx:39` filtra `status.eq.pending`, que não existe (o CHECK aceita `draft|sent|paid|overdue|cancelled|refunded`). Use:
```ts
.or(`status.eq.overdue,and(status.eq.sent,due_date.lt.${todayStr})`)
```

## P3.16 — `sweep-session-transcripts` conta cada importação bem-sucedida como falha e gera alertas críticos falsos

O sweep (`:113`) só aceita `imported | already_imported | not_ready | gave_up | skipped`, mas `import-teams-transcript` responde `status: 'ok'` (`:589`) e nenhum dos outros valores. Cada importação conta como falha, e três seguidas geram `cron_failed` (critical) e `cron_stale` (high). Além disso, os estados terminais (sem link de reunião, transcrição inexistente) não ficam registados e são repetidos a cada corrida.

- `sweep-session-transcripts/index.ts:113`:
```ts
const OK_STATUSES = new Set(['ok', 'imported', 'already_imported', 'not_ready', 'gave_up', 'skipped', 'no_meeting_url', 'not_found']);
```
- `import-teams-transcript/index.ts`, logo depois de `typedSession`:
```ts
const recordAttempt = (status: string) => supabaseAdmin.from('sessions').update({
  transcript_import_attempts: (typedSession.transcript_import_attempts ?? 0) + 1,
  transcript_last_attempt_at: new Date().toISOString(),
  transcript_import_status: status,
}).eq('id', session_id);
```
  Chame `await recordAttempt('no_meeting_url')` antes do `return` de `if (!joinUrl)` (`:347-348`), `await recordAttempt('not_found')` antes dos dois `return` de reunião inexistente (`:418-419`, 404, e `:432-433`, "No online meeting found"), e `await recordAttempt('forbidden_policy')` antes dos dois `return` de 403 (`:410`, Application Access Policy, e `:465-466`). Os números de linha são os do RC9, antes da P1.3. Assim o sweep respeita `MIN_ATTEMPT_INTERVAL_MIN` e `MAX_ATTEMPTS`. O `forbidden_policy` continua a contar como falha de propósito: é configuração do M365 que o admin tem de corrigir.
- Opcional, para os dois `return` HTTP 500 sem tentativa registada (Graph não configurado, `:308-313`, e organizador por resolver, `:360-365`), que hoje se repetem a cada 20 minutos durante 48 horas: chame `await recordAttempt('error');` antes de cada um.
- Limpeza opcional dos alertas falsos: `DELETE FROM public.system_alerts WHERE kind IN ('cron_failed','cron_stale') AND payload->>'job' = 'sweep-session-transcripts';`

## P3.17 — Importar transcrição → gerar artefactos: coluna inexistente, ações de transcrições confidenciais e duplicados

`import-teams-transcript` (`:571-585`) chama sempre `generate-session-artifacts` com a service role. Esta função:
- grava em `sessions.summary`, que não existe (a coluna é `ai_summary`), e o erro é ignorado (`:168-176`);
- gera ações visíveis ao founder a partir de transcrições `staff_only` (complementa a P1.3);
- duplica as ações a cada nova importação, porque `action_items` não tem chave única;
- passa ao lado do limite de IA, porque o rate limit (`:82`) só se aplica a chamadas com utilizador;
- tenta gravar `activity_log` com `user_id` nulo numa coluna `NOT NULL` (`:200-212`).

- `import-teams-transcript/index.ts`: acrescente `transcript_import_status` ao `select` de `:258-260` e substitua `:571-585` por:
```ts
// Só na 1.ª importação e só para transcrições visíveis ao workspace
const prevStatus = (session as { transcript_import_status?: string | null }).transcript_import_status;
if (exposeOnSession && prevStatus !== 'imported') {
  const p = fetch(`${supabaseUrl}/functions/v1/generate-session-artifacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'x-cron-secret': expectedCronSecret || '',
    },
    body: JSON.stringify({ session_id, source: 'transcript_import' }),
  }).catch((e) => log.warn('generate-session-artifacts chain failed', { error: safeErrorMessage(e) }));
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil?.(p);
}
```
  (`exposeOnSession` é a variável introduzida na P1.3.) Logo a seguir à validação de acesso (`:304`):
```ts
if (!isCronCall && userId) {
  const { data: allowed } = await supabaseAdmin.rpc('check_ai_rate_limit', {
    _user_id: userId, _workspace_id: typedSession.workspace_id,
    _function_name: 'import-teams-transcript', _max_requests: 10,
  });
  if (allowed !== true) return corsJsonResponse({ success: false, error: 'Rate limit exceeded' }, req, 429);
}
```
- `generate-session-artifacts/index.ts:66-73`: a função também pode ser chamada diretamente por um founder, team_member ou mentor com NDA (`verify_jwt = true` e só `has_workspace_access`, `:56-64`), e lê a transcrição com service role. Filtre por tier para todos os chamadores:
```ts
    // Só transcrições do tier 'workspace' alimentam artefactos visíveis a todo o workspace
    // (vale para a cadeia do import e para chamadas diretas com JWT de founder/membro).
    const { data: transcript } = await supabaseAdmin
      .from('session_transcripts')
      .select('transcript_text')
      .eq('session_id', session_id)
      .eq('confidentiality', 'workspace')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (isCron && !transcript) {
      return corsJsonResponse({ success: true, skipped: 'no_workspace_transcript' }, req);
    }
```
  Em `:167-176` (a UI, em `SessionAIPanel` e `SessionInsightsSection`, espera `ai_risks = [{ risk, severity }]`):
```ts
    if (artifacts.summary) {
      const risks = (Array.isArray(artifacts.risks) ? artifacts.risks : []) as unknown[];
      const { error: sumErr } = await supabaseAdmin.from('sessions').update({
        ai_summary: artifacts.summary,
        ai_decisions: Array.isArray(artifacts.decisions) ? artifacts.decisions : [],
        ai_risks: risks.map((r) => (typeof r === 'string' ? { risk: r, severity: 'medium' } : r)),
        ai_generated_at: new Date().toISOString(),
        ai_generated_by: userId,
      }).eq('id', session_id);
      if (sumErr) return corsJsonResponse({ error: 'Failed to persist artifacts' }, req, 500);
    }
```
  Em `:180`: `for (const item of artifacts.action_items ?? []) {`. Em `:200`, só grave `activity_log` quando houver utilizador: `if (userId) { await supabaseAdmin.from('activity_log').insert({...}); }`.

## P3.18 — Slack e lembretes de marcos continuam sem funcionar

`send-slack-notification/index.ts:51-58` faz o embed `notification_preferences(...)` a partir de `workspace_users`. Não existe FK entre as duas tabelas (`types.ts`: `Relationships: []`), por isso o PostgREST responde PGRST200 e a função devolve 500. É o mesmo padrão que foi corrigido em `run-checkin-reminders` nesta ronda. Além disso, `:112-126` conta como enviado sem ver a resposta do webhook.

Em `send-slack-notification/index.ts`, substitua `:50-63` por:
```ts
const { data: members, error: usersError } = await supabase
  .from("workspace_users").select("user_id")
  .eq("workspace_id", workspace_id).eq("active", true);
if (usersError) throw usersError;
const ids = (members ?? []).map((m: { user_id: string }) => m.user_id);
const { data: prefsRows, error: prefsError } = ids.length
  ? await supabase.from("notification_preferences")
      .select("user_id, slack_enabled, slack_webhook_url").in("user_id", ids)
  : { data: [], error: null };
if (prefsError) throw prefsError;
type SlackPrefs = { user_id: string; slack_enabled: boolean | null; slack_webhook_url: string | null };
const prefsByUser = new Map<string, SlackPrefs>(
  ((prefsRows ?? []) as SlackPrefs[]).map((p): [string, SlackPrefs] => [p.user_id, p]),
);
const workspaceUsers = ids.map((id: string) => ({
  user_id: id,
  notification_preferences: prefsByUser.has(id) ? [prefsByUser.get(id)!] : [],
}));
```
E em `:112-126`: `const res = await fetch(prefs.slack_webhook_url, { /* igual */ }); if (!res.ok) { console.error(\`Slack webhook ${res.status} for user ${user.user_id}\`); continue; } sentCount++;`

`send-milestone-reminders/index.ts:71-86` (cron diário das 08:30) tem a mesma causa: embute `profiles!inner(...)` e `notification_preferences(...)` a partir de `workspace_users`, o PostgREST responde PGRST200, o código faz `continue` (`:88-91`) e **nenhum lembrete de marco é enviado** (email, Slack nem na app). Substitua `:70-91` por:
```ts
      // Sem FK workspace_users -> profiles / notification_preferences: o embed dá PGRST200.
      const { data: members, error: usersError } = await supabase
        .from("workspace_users").select("user_id, role")
        .eq("workspace_id", milestone.workspace_id).eq("active", true);
      if (usersError) { console.error("Error fetching workspace users:", usersError); continue; }
      type MemberProfile = { id: string; email: string | null; full_name: string | null; preferred_language: string | null };
      type ReminderPrefs = { user_id: string; milestone_reminders_enabled: boolean | null; milestone_reminder_days: number | null;
        email_on_founder_delays: boolean | null; slack_enabled: boolean | null; slack_webhook_url: string | null };
      const memberIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
      const { data: profileRows, error: profilesError } = memberIds.length
        ? await supabase.from("profiles").select("id, email, full_name, preferred_language").in("id", memberIds)
        : { data: [], error: null };
      const { data: prefRows, error: prefsError } = memberIds.length
        ? await supabase.from("notification_preferences")
            .select("user_id, milestone_reminders_enabled, milestone_reminder_days, email_on_founder_delays, slack_enabled, slack_webhook_url")
            .in("user_id", memberIds)
        : { data: [], error: null };
      if (profilesError || prefsError) { console.error("Error fetching member profiles/preferences:", profilesError ?? prefsError); continue; }
      const profileById = new Map<string, MemberProfile>(((profileRows ?? []) as MemberProfile[]).map((p): [string, MemberProfile] => [p.id, p]));
      const prefsByUser = new Map<string, ReminderPrefs>(((prefRows ?? []) as ReminderPrefs[]).map((p): [string, ReminderPrefs] => [p.user_id, p]));
      const workspaceUsers = ((members ?? []) as { user_id: string; role: string }[])
        .filter((m) => profileById.has(m.user_id)) // equivalente ao profiles!inner
        .map((m) => ({ ...m, profiles: profileById.get(m.user_id)!,
          notification_preferences: prefsByUser.has(m.user_id) ? [prefsByUser.get(m.user_id)!] : [] }));

      // Um registo por (marco, dias antes): verificar uma vez, antes do ciclo, para todos os membros receberem
      const { data: existingReminder } = await supabase
        .from("milestone_reminders").select("id")
        .eq("milestone_id", milestone.id).eq("days_before", daysUntilDue)
        .limit(1).maybeSingle();
      if (existingReminder) {
        console.log(`Reminder already sent for milestone ${milestone.id}`);
        continue;
      }
      let notifiedAny = false;
```
Quando a função voltar a correr, aparece um defeito latente: o registo em `milestone_reminders` (`:248-254`) é feito dentro do ciclo por utilizador, e a verificação (`:104-115`) não tem `user_id`, por isso só o primeiro membro recebe o lembrete. O bloco acima já faz a verificação antes do ciclo. Complete assim:
- apague a verificação de dentro do ciclo (`:104-115`);
- no fim de cada iteração do ciclo, onde hoje está o registo (`:248-254`), ponha só `notifiedAny = true;`;
- logo a seguir ao fecho do ciclo de utilizadores (`:256`):
```ts
      if (notifiedAny) {
        await supabase.from("milestone_reminders").insert({
          milestone_id: milestone.id,
          workspace_id: milestone.workspace_id,
          reminder_type: "combined",
          days_before: daysUntilDue,
        });
      }
```
- no Slack (`:210-226`), `const res = await fetch(...)` e só conte `slackSent++` com `res.ok`;
- na notificação na app (`:234-246`), troque o `try/catch` por `const { error: nErr } = await supabase.from("notifications").insert({...}); if (nErr) console.error("Error creating notification:", nErr); else notificationsSent++;`.

## P3.19 — O watchdog aceita corridas manuais como prova de que o cron está vivo

`check_automation_health` (`20260907175945`) conta qualquer corrida recente, incluindo as `manual`. `recompute-health-scores`, por exemplo, é chamado por staff sempre que se grava uma sessão (`useSessions.ts:591`). Se o job pg_cron morrer, nunca aparece `cron_stale`. Agora que o `triggered_by` é gravado corretamente (`cronRun.ts:129-130`), basta filtrar.
```sql
-- migração nova (validada: só uma corrida manual recente → cron_stale medium)
DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.check_automation_health()'::regprocedure);
  IF position('WHERE job_name = e.job_name' IN d) = 0 THEN
    RAISE EXCEPTION 'check_automation_health: texto esperado não encontrado';
  END IF;
  d := replace(d, 'WHERE job_name = e.job_name', 'WHERE job_name = e.job_name AND triggered_by = ''cron''');
  EXECUTE d;
END $$;
```
O default de `cron_job_runs.triggered_by` é `'cron'`, por isso as suites `automation_health_window` continuam válidas.

## P3.20 — Envios que falham aparecem como sucesso

- `send-notification-email/index.ts`: `sendEmail` devolve um booleano, mas os chamadores (`:345`, `:385`, `:404`, `:438`, `:453`, `:478`) ignoram-no e devolvem `{ sent: recipients.length }` (`:354`). Em cada ramo de `handle()`, use `let delivered = 0;` e `if (await sendEmail(supabase, log, {...})) delivered++;`, e devolva `{ sent: delivered, recipients: recipients.length }`. Mude a assinatura de `handle` (`:295`) para `Promise<{ sent: number; recipients?: number }>`, senão o `deno check` falha. Em `:518`:
```ts
const result = await handle(supabaseAdmin, log, body);
const ok = (result.recipients ?? 0) === 0 || result.sent > 0;
return corsJsonResponse({ success: ok, ...result }, req, ok ? 200 : 502);
```
- `run-intake-reminders/index.ts:256-262` devolve sempre `success: true`, e o `withCronRunLogging` regista `ok` mesmo com tudo falhado:
```ts
const failed = intakesFailed + signatureFailed;
const sent = intakesSent + signatureSent;
return new Response(JSON.stringify({
  success: failed === 0,
  status: failed === 0 ? 'ok' : (sent > 0 ? 'partial' : 'failed'),
  intakeRemindersSent: intakesSent,
  intakeRemindersFailed: intakesFailed,
  signatureRemindersSent: signatureSent,
  signatureRemindersFailed: signatureFailed,
}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
```

## P3.21 — A anonimização RGPD do Founder Pulse nunca corre

`anonymize_stale_founder_pulse_responses` (`20260907175945:86-99`) foi criada, mas não está agendada nem é chamada em lado nenhum (0 jobs em `cron.job`).
```sql
-- migração nova (validada: o job aparece em cron.job e a corrida fica registada em cron_job_runs)
DO $do$
BEGIN
  PERFORM cron.unschedule('anonymize-founder-pulse-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'anonymize-founder-pulse-daily');
  PERFORM cron.schedule(
    'anonymize-founder-pulse-daily', '41 3 * * *',
    format('SELECT public.cron_invoke_rpc(%L, %L)',
           'anonymize_stale_founder_pulse_responses',
           'public.anonymize_stale_founder_pulse_responses()'));
END
$do$;
INSERT INTO public.automation_health_expectations (job_name, expected_cadence_seconds, grace_seconds, severity, owner)
VALUES ('anonymize_stale_founder_pulse_responses', 86400, 3600, 'low', 'ops')
ON CONFLICT (job_name) DO NOTHING;
```

## P3.22 — Importação de leads: o lote nunca é finalizado

`finalize_crm_import_batch` (`20260907175945:107-126`) não tem chamadores, e o guard (admin ou backoffice) não coincide com quem importa (`bulk-import-leads/index.ts:78`: admin ou consultor). `lifecycle_state` fica em `draft` para sempre.
```sql
-- migração nova
CREATE OR REPLACE FUNCTION public.finalize_crm_import_batch(p_batch_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pending int; v_failed int; v_new_state text;
BEGIN
  IF NOT (public.is_staff() OR public.has_role(auth.uid(),'backoffice') OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  SELECT count(*) FILTER (WHERE valid AND committed_funnel_item_id IS NULL),
         count(*) FILTER (WHERE NOT valid)
    INTO v_pending, v_failed
    FROM public.crm_lead_import_rows WHERE batch_id = p_batch_id;
  v_new_state := CASE WHEN v_failed = 0 AND v_pending = 0 THEN 'committed' ELSE 'partial_needs_review' END;
  UPDATE public.crm_lead_import_batches
     SET lifecycle_state = v_new_state, updated_at = now() WHERE id = p_batch_id;
  RETURN v_new_state;
END; $$;
REVOKE ALL ON FUNCTION public.finalize_crm_import_batch(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_crm_import_batch(uuid) TO service_role, authenticated;
```
Em `bulk-import-leads/index.ts`, logo depois do bloco `if (rpcErr) {...}` (cerca de `:240`):
```ts
const { error: finErr } = await sbSvc.rpc("finalize_crm_import_batch", { p_batch_id: batchId });
if (finErr) console.error("finalize_crm_import_batch failed:", finErr.message);
```

## P3.23 — Atribuir workspace (Aprovações): lista workspaces arquivados e reativa-os

Regressão do RC9 em `WorkspaceAssignmentDialog.tsx:92-121`: o filtro de estado foi removido. "Associar" um founder a uma workspace `archived` ou `rejected` passa-a a `active` com `archived_at` preenchido e dá ao novo founder acesso aos dados antigos. O `.or()` sem aspas parte com vírgulas ("Empresa, Lda") e mostra "Nenhum workspace encontrado". "Criar e Atribuir" sem programa mostra o erro SQL em bruto (`program_id` NOT NULL).
```ts
const pattern = `%${trimmedSearch.replace(/[%_",()\\]/g, '')}%`;
// …
let query = supabase
  .from('workspaces')
  .select('id, status, startup:startups(id, name, main_contact_email)')
  .in('status', ['imported_unclaimed', 'active', 'claimed', 'pending'])
  .order('created_at', { ascending: false })
  .limit(trimmedSearch ? 100 : 20);
// …
.or(`name.ilike."${pattern}",main_contact_email.ilike."${pattern}"`)
```
No botão "Criar e Atribuir" (`:382`): `disabled={isSubmitting || !newProgramId || !(newStartupName.trim() || suggestedName)}`.

## P3.24 — Definições › Assinaturas: guardar credenciais volta a ligar um fornecedor desligado

`set-global-integrations/index.ts:97` grava `is_enabled: body.is_enabled ?? true`. `SignatureProvidersCard.tsx:176-179` e `:335-345` enviam só `settings_json`, por isso guardar as credenciais DocuSign ou mudar o fornecedor padrão volta a ativar DocuSign e PandaDoc, mesmo o que o admin desligou. A validação de `tenant_id`/`client_id` do `graph_api` (`:73`) lê `body.settings` e ignora `body.settings_json`. Substitua `:70-100` (da validação até à construção do `payload`) por:
```ts
const rawSettings = body.settings ?? body.settings_json;
if (body.integration_type === 'graph_api') {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const s = (rawSettings ?? {}) as { tenant_id?: string; client_id?: string };
  if (s.tenant_id && !uuidRegex.test(s.tenant_id)) return corsJsonResponse({ error: 'Invalid tenant_id format' }, req, 400);
  if (s.client_id && !uuidRegex.test(s.client_id)) return corsJsonResponse({ error: 'Invalid client_id format' }, req, 400);
}
const { client_secret: _removed, ...sanitizedSettings } = rawSettings ?? {};
if (_removed) log.warn('Rejected attempt to store client_secret in database - use MS_GRAPH_CLIENT_SECRET env var');
const payload: Record<string, unknown> = { integration_type: body.integration_type, created_by: user.id };
if (typeof body.is_enabled === 'boolean') payload.is_enabled = body.is_enabled; // omitido → mantém (registo novo: default false)
if (rawSettings !== undefined) payload.settings_json = { ...sanitizedSettings };
```

## P3.25 — Saúde do Sistema: 14 das 21 automações aparecem "sem execuções" com o sistema saudável

`SystemHealthDashboard.tsx:86-95` lê `cron_job_runs` só das últimas 24 horas e com `.limit(200)`. Os jobs de 5, 10, 15 e 20 minutos geram cerca de 690 linhas por dia, por isso o limite só cobre umas 7 horas. Os jobs semanais e o mensal nunca têm linha em 24 horas. Resultado provado com 8 dias de corridas `ok` nos horários reais do `cron.job`: o painel marca 14 jobs como `never_run` e mostra 14 no KPI "Falhas de cron (24h)", enquanto a view do servidor `automation_health_summary` (P1.1 do RC8) dá 21/21 `OK`. O passo 12 do runsheet manual ("Nenhuma tarefa em never_run") falha sempre, e o operador aprende a ignorar o alarme.

Em `SystemHealthDashboard.tsx`, use a verdade do servidor, que já tem a janela por cadência:
```tsx
// :95
        .limit(1000);
// depois da query das expectations (:124)
  const summaryQuery = useQuery({
    enabled: isAdmin,
    queryKey: ['admin', 'system-health', 'automation-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_health_summary')
        .select('job_name, health_state, last_started, failures_24h')
        .eq('enabled', true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const summaries = summaryQuery.data ?? [];
// :128
  const cronUnknown = cronRunsQuery.isError || expectationsQuery.isError || summaryQuery.isError;
// :173-193 — substitua o cálculo de estado (remova `const now` e `const exp`)
    for (const [name, row] of map) {
      const s = summaries.find(x => x.job_name === name);
      if (s) {
        row.lastAt = s.last_started ?? row.lastAt;
        row.status =
          s.health_state === 'NEVER_RUN' ? 'never_run' :
          s.health_state === 'FAILING' ? 'failed' :
          s.health_state === 'STALE' ? 'stale' :
          (s.failures_24h ?? 0) > 0 ? (s.health_state === 'RECOVERED' ? 'degraded' : 'failed') :
          row.partial > 0 ? 'degraded' :
          (s.health_state === 'OK' || s.health_state === 'RECOVERED') ? 'healthy' : 'unknown';
      } else {
        row.status = row.failed > 0 ? 'failed' : row.partial > 0 ? 'degraded' : row.total > 0 ? 'healthy' : 'unknown';
      }
    }
// :196
  }, [cronRuns, expectations, summaries, cronUnknown]);
```
A view é `security_invoker` e só o admin vê este separador, que já lê as mesmas tabelas.

## P3.26 — `send-whatsapp-reminder` aceita qualquer utilizador autenticado

A função está listada como "dormente" em `docs/rc5/dead-edge-functions.md`, mas o comentário `// Verify caller is staff` (`index.ts:30-40`) só valida o JWT, sem ver o papel, e o destinatário e a mensagem vêm do corpo do pedido. Se o Twilio for ligado, qualquer founder, team_member ou mentor envia SMS ou WhatsApp arbitrários pela conta da incubadora. Hoje os segredos são verificados antes da autenticação (`:16-23`), e qualquer JWT recebe a mensagem de configuração em falta.

Em `supabase/functions/send-whatsapp-reminder/index.ts`, passe as verificações de `:16-23` para depois da autorização e substitua `:30-40` por:
```ts
// Só staff (admin/consultor); falha fechada
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
const { data: staffRoles } = await supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'consultor']);
if (!staffRoles || staffRoles.length === 0) {
  return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```

---

**Fim da Parte 3.** Corra o harness e o `rc5:verify`, e diga-me o que ficou por aplicar antes de colar a Parte 4.


# PROMPT LOVABLE — RC9 · PARTE 4 de 5 — Founder, sessões, mentores e inquéritos

Mesmas regras da Parte 1. Todo o SQL desta parte foi compilado numa só transação sobre a base replayada, já com as Partes 1 a 3 aplicadas. A constraint `staff_work_queue_items_type_check` **não** é redefinida aqui: a P3.10 já inclui o tipo `financial_assumption_skipped` usado na P4.5.

---

## P4.1 — A regra "só o consultor conclui ações" é contornada pela própria UI do founder

`ActionItemCard.tsx:79-98` impede o founder de marcar uma ação como concluída. Mas em Marcos & Ações o founder pode:
- mudar o **marco** para "Concluído" (`MilestonesActionsTab.tsx:679` → `complete_milestone_with_actions`), que fecha todas as ações do marco, incluindo as `awaiting_validation` e os entregáveis do programa;
- escolher "Concluída" na **barra de ações em massa** (`:559`);
- reabrir na barra em massa ações que o consultor já validou.

A RPC só verifica `can_write_workspace`, e a RLS permite o UPDATE. O progresso, a saúde e os relatórios de impacto ficam com ações que nenhum consultor validou.

```sql
-- migração nova (validada: founder → only_staff_can_complete_actions ao concluir ou reabrir; o marco do founder passa as ações a awaiting_validation; marco sem ações abertas fecha; o consultor valida e reabre)
CREATE OR REPLACE FUNCTION public.guard_action_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_staff()
     AND (   (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
          OR (OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed')) THEN  -- 2.ª linha = ponto (3), opcional
    RAISE EXCEPTION 'only_staff_can_complete_actions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_action_completion ON public.action_items;
CREATE TRIGGER trg_guard_action_completion BEFORE UPDATE OF status ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_action_completion();

CREATE OR REPLACE FUNCTION public.complete_milestone_with_actions(_workspace_id uuid, _milestone_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_closed_count integer := 0;
BEGIN
  IF NOT public.can_write_workspace(_workspace_id) THEN
    RAISE EXCEPTION 'Not allowed to update this workspace' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.milestones WHERE id = _milestone_id AND workspace_id = _workspace_id) THEN
    RAISE EXCEPTION 'Milestone not found in workspace' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_staff() THEN
    WITH req AS (UPDATE public.action_items SET status = 'awaiting_validation', completed_at = NULL
                  WHERE workspace_id = _workspace_id AND milestone_id = _milestone_id
                    AND status IN ('pending','in_progress') RETURNING id)
    SELECT count(*) INTO v_closed_count FROM req;
    -- sem ações por validar, o marco pode fechar (nenhuma ação fica concluída sem o consultor)
    IF NOT EXISTS (SELECT 1 FROM public.action_items
                    WHERE milestone_id = _milestone_id
                      AND status IN ('pending','in_progress','awaiting_validation')) THEN
      UPDATE public.milestones SET status = 'completed', completed_at = now()
       WHERE id = _milestone_id AND workspace_id = _workspace_id;
    END IF;
    RETURN v_closed_count;
  END IF;
  WITH u AS (UPDATE public.action_items SET status = 'completed', completed_at = now()
              WHERE workspace_id = _workspace_id AND milestone_id = _milestone_id
                AND status NOT IN ('completed','cancelled') RETURNING id)
  SELECT count(*) INTO v_closed_count FROM u;
  UPDATE public.milestones SET status = 'completed', completed_at = now()
   WHERE id = _milestone_id AND workspace_id = _workspace_id;
  RETURN v_closed_count;
END $function$;
```
Em `MilestonesActionsTab.tsx`, barra em massa (`:555-560`):
```ts
statusOptions={[
  { value: 'pending', label: t('actions.open') },
  { value: 'in_progress', label: t('actions.doing') },
  { value: 'awaiting_validation', label: t('actions.awaitingValidation', 'A aguardar validação') },
  ...(isStaff ? [{ value: 'completed', label: t('actions.done') }] : []),
]}
```
Em `handleBulkStatusChange` (`:412`), para quem não é staff, retire dos ids as ações já concluídas, para o lote não falhar inteiro:
```ts
const targetIds = isStaff ? ids : ids.filter((id) => actionItems?.find((a) => a.id === id)?.status !== 'completed');
```
E substitua o ramo `status === 'completed'` de `handleMilestoneStatusChange` (`:216-241`), para não haver "N ações fechadas", confetti nem a celebração "primeiro marco concluído" quando o founder só pediu validação:
```ts
if (status === 'completed') {
  const { data: closedCount, error } = await supabase.rpc('complete_milestone_with_actions', {
    _workspace_id: workspaceId,
    _milestone_id: milestone.id,
  });
  if (error) throw error;
  if ((closedCount ?? 0) > 0) {
    notify.success(isStaff
      ? t('milestones.cascadeClosed', { count: closedCount, defaultValue: `${closedCount} ação(ões) fechada(s) com o gate` })
      : t('milestones.validationRequested', { count: closedCount, defaultValue: '{{count}} ação(ões) enviada(s) para validação do consultor' }));
  }
  // só celebra se o marco ficou mesmo concluído (o founder apenas pede validação)
  const { data: ms } = await supabase.from('milestones').select('status').eq('id', milestone.id).maybeSingle();
  if (ms?.status === 'completed') {
    triggerMilestoneCelebration();
    void supabase
      .from('workspace_celebrations')
      .upsert(
        { workspace_id: workspaceId, event_key: 'first_milestone_completed' },
        { onConflict: 'workspace_id,event_key', ignoreDuplicates: true },
      )
      .then(({ error: celErr }) => {
        if (celErr) console.debug('first_milestone_celebration_skip', celErr.message);
      });
  }
}
```
O guard cobre o `UPDATE`. Um `INSERT` direto com `status = 'completed'` (a policy "Write action items in workspace" permite-o) continua a passar. Fechá-lo exige `BEFORE INSERT OR UPDATE OF status` com `(TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')`, mas então o "Anular" da eliminação em massa (P4.6) deixa de conseguir repor ações que já estavam concluídas. Não o feche sem resolver isso primeiro.

## P4.2 — A aprovação de alterações sensíveis da startup só existe no cliente

`StartupSettingsTab.tsx:204-214` encaminha nome, NIF, morada e contactos para um pedido de alteração. A policy "Founders can update their startup" não tem restrição de coluna, por isso um PATCH direto ao PostgREST grava tudo. Grava também `phc_customer_id` (usado na correspondência das importações PHC) e `archived_*`. São dados legais e de faturação dos contratos.

```sql
-- migração nova (validada: descrição/logo ok; NIF → startup_change_requires_approval, também com um 2.º workspace arquivado
-- e com o único workspace arquivado; phc_customer_id → startup_field_staff_only; NIF durante o onboarding ok; consultor ok)
CREATE OR REPLACE FUNCTION public.startup_is_established(p_startup_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- 'archived' conta: um contrato terminado não volta a abrir os dados legais à edição direta
  SELECT EXISTS (SELECT 1 FROM public.workspaces w
                  WHERE w.startup_id = p_startup_id
                    AND w.status IN ('active','archived') AND w.needs_onboarding IS NOT TRUE);
$$;
REVOKE ALL ON FUNCTION public.startup_is_established(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.startup_is_established(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_startup_protected_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- service_role e RPCs SECURITY DEFINER (approve_startup_change_request) passam
  IF current_user NOT IN ('authenticated','anon') THEN RETURN NEW; END IF;
  IF public.is_staff() THEN RETURN NEW; END IF;
  IF NEW.phc_customer_id IS DISTINCT FROM OLD.phc_customer_id OR NEW.nif_normalized IS DISTINCT FROM OLD.nif_normalized
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
     OR NEW.archived_reason IS DISTINCT FROM OLD.archived_reason THEN
    RAISE EXCEPTION 'startup_field_staff_only' USING ERRCODE = '42501';
  END IF;
  IF (   nullif(btrim(NEW.name),'')               IS DISTINCT FROM nullif(btrim(OLD.name),'')
      OR nullif(btrim(NEW.nif),'')                IS DISTINCT FROM nullif(btrim(OLD.nif),'')
      OR nullif(btrim(NEW.address),'')            IS DISTINCT FROM nullif(btrim(OLD.address),'')
      OR nullif(btrim(NEW.phone),'')              IS DISTINCT FROM nullif(btrim(OLD.phone),'')
      OR nullif(btrim(NEW.website),'')            IS DISTINCT FROM nullif(btrim(OLD.website),'')
      OR nullif(btrim(NEW.main_contact_name),'')  IS DISTINCT FROM nullif(btrim(OLD.main_contact_name),'')
      OR nullif(btrim(NEW.main_contact_email),'') IS DISTINCT FROM nullif(btrim(OLD.main_contact_email),'')
      OR nullif(btrim(NEW.main_contact_phone),'') IS DISTINCT FROM nullif(btrim(OLD.main_contact_phone),''))
     AND public.startup_is_established(NEW.id) THEN
    RAISE EXCEPTION 'startup_change_requires_approval' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_startup_protected_fields ON public.startups;
CREATE TRIGGER trg_guard_startup_protected_fields BEFORE UPDATE ON public.startups
  FOR EACH ROW EXECUTE FUNCTION public.guard_startup_protected_fields();
```
A verificação de "startup já estabelecida" corre numa função SECURITY DEFINER para não depender da RLS do founder: assim, um workspace antigo arquivado ou uma candidatura pendente a outro programa não desligam a proteção. Um workspace arquivado também conta como estabelecido, porque a P2.2 mantém o founder como membro depois de o contrato terminar. Durante o onboarding o founder continua a poder preencher estes campos. O backoffice passa pela RPC `approve_startup_change_request` (P2.2). Se o assistente de onboarding (`WorkspaceOnboardingWizard.tsx:502-510`) for reaberto depois, mostra erro ao gravar nome ou NIF, o que é o comportamento correto; nesse caso, quando a mensagem contiver `startup_change_requires_approval`, indique "Use Definições → pedido de alteração".

## P4.3 — KPIs: "Concluir" o check-in mensal falha sempre para o founder

`useKpis.ts:224-237` faz `update workspaces set last_checkin_at` com `.select().single()`. A RLS só deixa o staff atualizar `workspaces`, por isso o founder recebe 0 linhas, o `.single()` dá PGRST116 e aparece "Falha ao marcar check-in" todos os meses. Os valores ficam gravados (autosave), mas o fluxo parece falhado.
```sql
-- migração nova (validada: founder ok; outro workspace, founder suspenso e team_member → forbidden)
CREATE OR REPLACE FUNCTION public.mark_workspace_checkin(p_workspace_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_now timestamptz := now();
BEGIN
  -- can_write_workspace já cobre founder com conta ativa, admin e consultor
  IF auth.uid() IS NULL OR NOT public.can_write_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.workspaces SET last_checkin_at = v_now WHERE id = p_workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'workspace_not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_now;
END $$;
REVOKE ALL ON FUNCTION public.mark_workspace_checkin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_workspace_checkin(uuid) TO authenticated;
```
Em `useMarkCheckinComplete` (`useKpis.ts:224-237`): `const { data, error } = await supabase.rpc('mark_workspace_checkin', { p_workspace_id: workspaceId }); if (error) throw error; return data;`

## P4.4 — Visão geral: o founder muda a fase, vê "Fase atualizada" e nada muda

`WorkspaceOverview.tsx:243-263` mostra o seletor de fase a quem tem `canWrite`, incluindo o founder. A RLS filtra o UPDATE (0 linhas, sem erro) e a fase volta ao valor anterior. O caminho do founder é o pedido de stage gate em Governança, que funciona.
```ts
const canChangeStage = isAdmin || isConsultor;
// :243
{canChangeStage ? (<Select …>) : (<StageBadge stage={workspace.stage} />)}
// handleStageChange (:141-153)
const { data, error } = await supabase.from('workspaces').update({ stage: newStage }).eq('id', workspace.id).select('id');
if (error || !data?.length) {
  notify.error(t('workspaceOverview.stageUpdateFailed', { defaultValue: 'Falha ao atualizar fase' }));
  return;
}
notify.success(t('workspaceOverview.stageUpdated', { defaultValue: 'Fase atualizada' }));
queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
queryClient.invalidateQueries({ queryKey: ['workspaces'] });
```

## P4.5 — Plano financeiro guiado: "Ainda não sei" nunca chega ao consultor

`GuidedPlanTab.tsx:87-125` insere diretamente em `staff_work_queue_items` com `status: 'pending'` e `type: 'financial_assumption_skipped'`. Falha sempre por três razões: a RLS (o founder não pode inserir), o `status` fora do CHECK e o `type` fora do CHECK. O `try/catch` engole o erro e o staff nunca sabe que o founder está bloqueado.
```sql
-- migração nova (o CHECK de type já foi alargado na P3.10; validada: 1 item ativo com 2 chaves, duplicado ignorado, team_member → forbidden)
CREATE OR REPLACE FUNCTION public.enqueue_financial_assumption_review(
  p_workspace_id uuid, p_assumption_key text, p_scenario text, p_title text, p_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item jsonb := jsonb_build_object('assumption_key', p_assumption_key, 'scenario', p_scenario); v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_write_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.staff_work_queue_items (workspace_id, type, title, description, priority, status, created_by, evidence_json)
  VALUES (p_workspace_id, 'financial_assumption_skipped', left(p_title,200), left(p_description,2000), 'medium', 'open', auth.uid(),
          jsonb_build_object('source','guided_financial_plan','items', jsonb_build_array(v_item)))
  ON CONFLICT (workspace_id, type) WHERE status IN ('open','in_progress')
  DO UPDATE SET evidence_json = jsonb_set(COALESCE(staff_work_queue_items.evidence_json,'{}'::jsonb), '{items}',
       CASE WHEN COALESCE(staff_work_queue_items.evidence_json->'items','[]'::jsonb) @> jsonb_build_array(v_item)
            THEN staff_work_queue_items.evidence_json->'items'
            ELSE COALESCE(staff_work_queue_items.evidence_json->'items','[]'::jsonb) || jsonb_build_array(v_item) END),
     updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_financial_assumption_review(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_financial_assumption_review(uuid,text,text,text,text) TO authenticated;
```
Em `GuidedPlanTab.tsx` (o ficheiro ainda não importa `logger` e obtém o `supabase` por import dinâmico):
```ts
// GuidedPlanTab.tsx — topo do ficheiro
import { logger } from '@/lib/logger';

// GuidedPlanTab.tsx:87-126 — substituir a função inteira (remove o pré-check por status 'pending' e o try/catch morto)
async function enqueueConsultorReview(
  workspaceId: string,
  assumptionKey: string,
  assumptionLabelText: string,
  scenario: PlanScenario,
  t: (k: string, opts?: any) => string,
) {
  const { supabase } = await import('@/lib/supabaseClient');
  const { error } = await supabase.rpc('enqueue_financial_assumption_review', {
    p_workspace_id: workspaceId,
    p_assumption_key: assumptionKey,
    p_scenario: scenario,
    p_title: t('financialPlan.queue.skippedTitle', { defaultValue: 'Rever pressuposto: {{label}}', label: assumptionLabelText }),
    p_description: t('financialPlan.queue.skippedDesc', { defaultValue: 'O founder marcou "{{label}}" como desconhecido no cenário {{scenario}}.', label: assumptionLabelText, scenario }),
  });
  if (error) logger.warn('financial_assumption_enqueue_failed', { workspaceId, error: error.message });
}
```

## P4.6 — Barra de ações em massa: sem verificação de escrita e com contagens falsas

O team_member e o mentor veem as checkboxes e a barra de ações em massa. Ao apagar ou mudar o estado recebem "N ações eliminadas/atualizadas", embora a RLS afete 0 linhas. O mentor tem `canWrite = true` (`WorkspaceDetail.tsx:80`), por isso esconder a barra com esse `canWrite` não chega: o separador precisa de um `canWrite` igual ao da base (`can_write_workspace`: admin, consultor e membership de founder ou consultor). Se o founder incluir entregáveis do programa numa eliminação, esses são ignorados em silêncio e contados como eliminados, e o "Desfazer" atual tenta reinserir também os que não foram apagados, falha por chave duplicada e não repõe nada.

```tsx
// src/pages/WorkspaceDetail.tsx:544 — canWrite igual ao da BD (can_write_workspace: admin, consultor, membership founder/consultor).
// Usa o myWorkspaceRole que a P2.4 introduz (se a P2.4 ainda não estiver aplicada: const { data: myWorkspaceRole } = useUserWorkspaceRole(id); de '@/hooks/useKpis', antes de qualquer return).
<MilestonesActionsTab workspaceId={workspace.id}
  canWrite={isAdmin || isConsultor || myWorkspaceRole === 'founder' || myWorkspaceRole === 'consultor'}
  isStaff={isStaff} programId={workspace.program_id} programType={programType} currentWeek={(workspace as any).current_week ?? null} />

// src/hooks/useActionItems.ts — import type { TablesUpdate } from '@/integrations/supabase/types';
// useBulkUpdateActions.mutationFn (:379-394)
mutationFn: async ({ ids, status }: { ids: string[]; status: ActionStatus }): Promise<string[]> => {
  const updateData: TablesUpdate<'action_items'> = {
    status,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from('action_items').update(updateData).in('id', ids).select('id');
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
},
// useBulkDeleteActions.mutationFn (:406-414)
mutationFn: async (ids: string[]): Promise<string[]> => {
  const { data, error } = await supabase.from('action_items').delete().in('id', ids).select('id');
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
},

// src/components/workspace/MilestonesActionsTab.tsx
// :548-561  {canWrite && (<BulkActionsBar … />)}
// :716 e :747  onToggleSelect={canWrite ? toggleItem : undefined}
// handleBulkDelete (:460-473)
const handleBulkDelete = async (ids: string[]) => {
  try {
    const { data: snapshots } = await supabase.from('action_items').select('*').in('id', ids);
    const deletedIds = await bulkDelete.mutateAsync(ids);
    if (deletedIds.length === 0) { notify.error(t('actions.failedToDelete')); return; }
    const restorable = (snapshots ?? []).filter((s) => deletedIds.includes(s.id)); // só repõe o que foi mesmo apagado
    notify.success(t('actions.deletedCount', { count: deletedIds.length }), {
      duration: 8000,
      action: restorable.length > 0 ? { label: t('common.undo'), onClick: () => restoreActions(restorable) } : undefined,
    });
    if (deletedIds.length < ids.length) {
      notify.warn(t('actions.bulkPartialSkipped', { skipped: ids.length - deletedIds.length }));
    }
    deselectAll();
  } catch { notify.error(t('actions.failedToDelete')); }
};
// handleBulkStatusChange (:412-458): mesmo padrão
//   const updatedIds = await bulkUpdate.mutateAsync({ ids, status: status as ActionStatus });
//   if (updatedIds.length === 0) { notify.error(t('actions.failedToUpdate')); return; }
//   const priorUpdated = (prior ?? []).filter((r) => updatedIds.includes(r.id));
//   notify.success(t('actions.updatedCount', { count: updatedIds.length }), { duration: 8000, action: priorUpdated.length > 0 ? { …onClick de hoje, a iterar priorUpdated em vez de prior… } : undefined });
```
Em `handleBulkStatusChange`, passe ao `bulkUpdate` os `targetIds` da P4.1 (sem as ações já concluídas, para quem não é staff). As chaves `actions.bulkPartialSkipped` e `milestones.validationRequested` vêm no anexo de i18n (P5.1).

## P4.7 — Agendar sessão: horários do mentor sempre vazios e períodos bloqueados ignorados

Dois defeitos no mesmo `useMemo` de `CreateSessionDialog.tsx:167-195`:
- **Mentor.** `new Date(\`${dateStr}T${w.start_time}:00\`)` com `start_time = "09:00:00"` dá `"…T09:00:00:00"`, que é `Invalid Date`. A lista fica sempre vazia e aparece "Sem horários disponíveis". A verificação de conflitos (`:271`) filtra `['pending','confirmed']`, mas o estado `confirmed` não existe em `mentor_bookings` (o correto é `accepted`).
- **Ausências.** O time-off do consultor ou do mentor (funcionalidade nova do RC9) só é respeitado na página Mentores e nos links públicos. No fluxo principal (Agenda do workspace → CreateSessionDialog) o founder vê e reserva horários dentro do bloqueio, e o servidor aceita. A UI de ausências promete o contrário: "Estes períodos deixam de aparecer nas marcações e são recusados no servidor".

```sql
-- migração nova (validada em 8 casos: consultor no dia bloqueado → erro; mentor nas férias do consultor → ok;
-- mentor nas próprias férias → erro; sessão sem participante → ok; editar só o título → ok;
-- reagendar para o dia bloqueado → erro; consultor no próprio dia bloqueado → ok; mentor_transition_booking 'accepted' → ok)
CREATE OR REPLACE FUNCTION public.tg_sessions_block_participant_time_off()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.scheduled_at IS NULL OR NEW.status IS DISTINCT FROM 'scheduled'
     OR COALESCE(NEW.source, '') = 'off_platform' OR NEW.scheduled_at < now() THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at
     AND NEW.duration IS NOT DISTINCT FROM OLD.duration
     AND NEW.primary_consultant_id IS NOT DISTINCT FROM OLD.primary_consultant_id
     AND NEW.primary_mentor_id IS NOT DISTINCT FROM OLD.primary_mentor_id THEN
    RETURN NEW;
  END IF;
  -- staff, backoffice, service role e mentores (mentor_transition_booking corre como mentor) passam
  IF auth.uid() IS NULL OR public.is_staff() OR public.is_backoffice()
     OR public.has_role(auth.uid(), 'mentor_externo') THEN
    RETURN NEW;
  END IF;
  -- conta a ausência de quem está na sessão: o mentor, senão o consultor
  v_owner := COALESCE(NEW.primary_mentor_id, NEW.primary_consultant_id);
  IF v_owner IS NOT NULL AND public.consultant_time_off_blocks(
       v_owner, NEW.scheduled_at, NEW.scheduled_at + make_interval(mins => COALESCE(NEW.duration, 60))) THEN
    RAISE EXCEPTION 'consultant is unavailable in this period' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.tg_sessions_block_participant_time_off() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sessions_block_participant_time_off ON public.sessions;
CREATE TRIGGER trg_sessions_block_participant_time_off
  BEFORE INSERT OR UPDATE OF scheduled_at, duration, primary_consultant_id, primary_mentor_id ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_sessions_block_participant_time_off();
```
O trigger só vê a ausência de quem está na sessão, por isso a sessão tem de passar a gravar o participante (as colunas já existem e só são lidas por `log_completed_session_atomic`, `v_sessions_operational` e `SessionCompletionDialog`, que passa a abrir pré-preenchido):
- `useSessions.ts`, `SessionFormData` (`:187-198`): `primary_consultant_id?: string | null; primary_mentor_id?: string | null;`
- insert de `useCreateSession` (`:270-284`): `primary_consultant_id: session.primary_consultant_id ?? null, primary_mentor_id: session.primary_mentor_id ?? null,`
- `CreateSessionDialog.tsx`, no `createMutation.mutateAsync` (`:424-434`): `primary_consultant_id: meetingWith === 'consultor' ? (participantId || assignedConsultant?.user_id || null) : null, primary_mentor_id: meetingWith === 'mentor_externo' ? (participantId || null) : null,`

As sessões genéricas do Calendário, sem participante, não são bloqueadas. Editar só o título de uma sessão marcada antes da ausência também não.
Em `CreateSessionDialog.tsx`:
```ts
import { useConsultantTimeOff } from '@/hooks/useConsultantTimeOff';
// depois de useMentorAvailability(...):
const timeOffOwnerId = meetingWith === 'consultor'
  ? (participantId || assignedConsultant?.user_id || undefined)
  : (participantId || undefined);
const { data: participantTimeOff } = useConsultantTimeOff(timeOffOwnerId);
const overlapsTimeOff = useCallback((startMs: number, minutes: number) => {
  const endMs = startMs + minutes * 60000;
  return (participantTimeOff ?? []).some(
    (o) => new Date(o.starts_at).getTime() < endMs && new Date(o.ends_at).getTime() > startMs,
  );
}, [participantTimeOff]);

// availableSlots (:167-195): ambos os ramos devolvem hora de parede de Lisboa ("yyyy-MM-ddTHH:mm:00"), como já faz o consultor
const notBlocked = (s: string) => !overlapsTimeOff(new Date(lisbonWallClockToUtcIso(s)).getTime(), durationMinutes);
if (meetingWith === 'consultor') {
  // …slotStarts como hoje
  return slotStarts.filter(notBlocked);
}
const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
const pad = (n: number) => String(n).padStart(2, '0');
const slots: string[] = [];
for (const w of windows) {
  for (let m = toMin(w.start_time); m + durationMinutes <= toMin(w.end_time); m += 30) {
    slots.push(`${dateStr}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`);
  }
}
return Array.from(new Set(slots)).filter(notBlocked).sort();
// deps: acrescente overlapsTimeOff
```
Em `submitSession`, antes do `findSchedulingConflict` (cobre também a hora manual):
```ts
if (!logPast && overlapsTimeOff(new Date(scheduledAtISO).getTime(), parseInt(duration, 10))) {
  notify.error(t('mentors.bookingTimeOff', { defaultValue: 'O consultor bloqueou esse período. Escolha outro horário.' }));
  return;
}
```
E em `:271` troque `['pending', 'confirmed']` por `['pending', 'accepted']`.

A verificação de conflitos lê `mentor_bookings` com a RLS de quem marca, por isso não vê as reservas de outros founders com o mesmo mentor. Use o hook que já existe (`useMentorBusySlots`, RPC `get_mentor_busy_slots`, sem dados pessoais) para esconder esses horários:
```ts
import { useMentorAvailability, useMentorBusySlots } from '@/hooks/useMentorAvailability';
const { data: mentorBusy } = useMentorBusySlots(meetingWith === 'mentor_externo' ? (participantId || undefined) : undefined);
// no ramo do mentor de availableSlots, depois de gerar `slots` (P4.7):
const busy = (mentorBusy ?? []).filter((b) => b.busy_date === dateStr).map((b) => [toMin(b.start_time), toMin(b.end_time)] as const);
const isFree = (s: string) => { const m = toMin(s.slice(11, 16)); return !busy.some(([a, e]) => a < m + durationMinutes && e > m); };
return Array.from(new Set(slots)).filter(notBlocked).filter(isFree).sort();
// deps do useMemo: acrescente mentorBusy
```

## P4.8 — O membro de equipa (e o mentor) não consegue ler a própria startup

A policy SELECT de `startups` só inclui founder, consultor, staff e backoffice; `startups_safe` é `security_invoker`, por isso também devolve 0. O team_member vê "Sem nome" na lista, "Workspace" no cabeçalho e o separador Definições vazio, e o mentor tem o mesmo sintoma. Abrir a tabela ao team_member por policy daria-lhe também o NIF, a morada, os contactos e o `phc_customer_id`, contra o endurecimento de dados pessoais de `20260105095352`. A UI destes papéis só precisa de nome, logo, website e descrição, por isso a correção é uma RPC sem dados pessoais:
```sql
-- migração nova (validada: team_member e mentor obtêm o nome; founder de outro workspace obtém 0; a tabela continua oculta ao team_member)
CREATE OR REPLACE FUNCTION public.get_member_startup_basics(p_workspace_ids uuid[])
RETURNS TABLE (workspace_id uuid, id uuid, name text, description text, logo_url text, website text, has_startup_portugal_status boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, s.id, s.name, s.description, s.logo_url, s.website, s.has_startup_portugal_status
    FROM public.workspaces w
    JOIN public.startups s ON s.id = w.startup_id
   WHERE w.id = ANY (p_workspace_ids)
     AND public.has_workspace_access(w.id);   -- membership ativa + gate de NDA do mentor
$$;
REVOKE ALL ON FUNCTION public.get_member_startup_basics(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_member_startup_basics(uuid[]) TO authenticated;
```
```ts
// src/hooks/useWorkspaces.ts — useWorkspaces, logo a seguir a `if (error) throw error;` (:142)
const missingIds = workspaces.filter((w) => !w.startup).map((w) => w.id);
if (missingIds.length > 0) {
  const { data: basics } = await supabase.rpc('get_member_startup_basics', { p_workspace_ids: missingIds });
  const byWs = new Map((basics ?? []).map((b) => [b.workspace_id, b]));
  workspaces.forEach((w) => {
    const b = byWs.get(w.id);
    if (!w.startup && b) {
      w.startup = { id: b.id, name: b.name, description: b.description, logo_url: b.logo_url, has_startup_portugal_status: b.has_startup_portugal_status };
    }
  });
}
// useWorkspace (:270-292), logo a seguir a `if (error) throw error;`
if (data && !data.startup) {
  const { data: basics } = await supabase.rpc('get_member_startup_basics', { p_workspace_ids: [data.id] });
  const b = basics?.[0];
  if (b) {
    return { ...data, startup: { id: b.id, name: b.name, description: b.description, logo_url: b.logo_url, website: b.website,
      nif: null, main_contact_name: null, main_contact_email: null, main_contact_phone: null,
      has_startup_portugal_status: b.has_startup_portugal_status } };
  }
}
```

## P4.9 — Marcação pública: bloqueios desfasados 1 hora no inverno, e o filtro falha aberto

- **Fuso.** `public-get-availability/index.ts:541-542` e `public-book-first-contact/index.ts:395` convertem o horário com `+01:00` fixo. A partir de 25/10/2026 (hora de inverno, UTC+0), um bloqueio das 14:00 às 15:00 deixa as 14:00 reserváveis e fecha as 15:00, que estão livres. O comentário "UTC+1/+2" está errado: Lisboa é UTC+0/+1. Do lado SQL, `create_mentor_booking_idempotent` usa `AT TIME ZONE 'Europe/Lisbon'` e está correto.
- **Fail-open.** Em `public-get-availability:532` o `error` do RPC `get_consultant_time_off` é ignorado. Em `public-book-first-contact:402-403` o erro é só registado e a reserva avança, com criação do evento Teams.

Crie `supabase/functions/_shared/lisbonTime.ts`:
```ts
export function lisbonWallClockToDate(date: string, time: string): Date {
  const asUtc = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(asUtc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const lisbonAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return new Date(asUtc.getTime() - (lisbonAsUtc - asUtc.getTime()));
}
```
Nas duas funções, importe o helper (`import { lisbonWallClockToDate } from '../_shared/lisbonTime.ts';`, a seguir à linha 10 em `public-get-availability` e à linha 11 em `public-book-first-contact`) e use `const slotStart = lisbonWallClockToDate(slot.date, slot.time);` com o comentário "Lisbon wall clock (WET UTC+0 / WEST UTC+1)". Validado: 14:00 de 10/07/2026 dá 13:00Z e 14:00 de 10/11/2026 dá 14:00Z. Opcional: um `supabase/functions/_shared/lisbonTime_test.ts` com estes dois casos, para o CI apanhar regressões.

`public-get-availability/index.ts:532`:
```ts
const { data: timeOff, error: timeOffErr } = await supabase.rpc('get_consultant_time_off', {
  p_consultant_id: consultantId,
  p_from: format(now, 'yyyy-MM-dd'),
  p_to: format(addDays(now, 21), 'yyyy-MM-dd'),
});
if (timeOffErr) {
  return failClosed('time_off_unavailable', 'high', { message: timeOffErr.message });
}
```
`public-book-first-contact/index.ts:402`:
```ts
if (blockErr) {
  console.error('time-off check failed:', blockErr.message);
  return corsJsonResponse({
    success: false,
    error: 'Não foi possível confirmar a disponibilidade. Tente novamente.',
    reason: 'time_off_check_failed',
  }, req, 503);
}
```

## P4.10 — Página Mentores: dias bloqueados continuam selecionáveis

`MentorBookingPanel.tsx:143-147` (`isDateAvailable`) só olha para o dia da semana. O filtro de ausências e das 24 horas só existe em `getAvailableSlotsForDate`. O founder escolhe um dia de férias do mentor, o seletor de horas abre vazio e não há mensagem. Depois do erro "unavailable in this period" as ausências não são recarregadas.
```ts
// troque a linha 77 (já declara mentorTimeOff) por:
const { data: mentorTimeOff, refetch: refetchTimeOff } = useConsultantTimeOff(mentorId);
// isDateAvailable (:143-147):
const isDateAvailable = (date: Date) => {
  if (isBefore(date, startOfDay(new Date()))) return false;
  if (!availability?.some(a => a.day_of_week === date.getDay())) return false;
  return getAvailableSlotsForDate(date, 30).length > 0;
};
// depois do <Select> de horários:
{selectedDate && getAvailableSlotsForDate(selectedDate).length === 0 && (
  <p className="text-sm text-muted-foreground">
    {t('mentors.noSlotsForDate', { defaultValue: 'Sem horários livres neste dia. Escolha outra data.' })}
  </p>
)}
// no onError, ramo 'unavailable in this period': void refetchTimeOff();
```
Acrescente `mentors.noSlotsForDate` a `pt.json` e `en.json` ("No free slots on this day. Choose another date.").

## P4.11 — Bloqueio de "dia inteiro" soma 24 horas em milissegundos

`ConsultantTimeOffSettings.tsx:35-37`. No dia da mudança de hora (25/10/2026 tem 25 horas) a última hora fica reservável; em março o bloqueio invade a primeira hora do dia seguinte.
```ts
import { addDays } from 'date-fns';
const endsAt = allDay
  ? addDays(new Date(`${endDate}T00:00:00`), 1).toISOString() // meia-noite local seguinte (respeita a mudança de hora)
  : toIso(startDate, endTime);
```

## P4.12 — Pedido de stage gate falha com erro de chave duplicada

O trigger `tg_stage_gate_review_enqueue` (`20260907195645:10-22`) faz INSERT sem `ON CONFLICT`. Se já houver um item `stage_gate_review` ativo no workspace (dois co-founders quase ao mesmo tempo, ou fase mudada à mão com revisão pendente), o pedido do founder falha com o toast cru `duplicate key value violates unique constraint "idx_work_queue_unique_active"`. O `created_by` vem ainda de `NEW.requested_by`, enviado pelo cliente.
```sql
-- migração nova (validada: 2 pedidos seguidos → 1 item, título do mais recente)
CREATE OR REPLACE FUNCTION public.tg_stage_gate_review_enqueue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.staff_work_queue_items (
    workspace_id, type, title, description, priority, status, due_at, evidence_json, created_by
  ) VALUES (
    NEW.workspace_id, 'stage_gate_review',
    format('Stage Gate Review: %s → %s', NEW.from_stage, NEW.to_stage),
    'Pedido de revisão de stage gate', 'high', 'open', now() + interval '7 days',
    jsonb_build_object('review_id', NEW.id), COALESCE(auth.uid(), NEW.requested_by)
  )
  ON CONFLICT (workspace_id, type) WHERE status IN ('open','in_progress')
  DO UPDATE SET title         = EXCLUDED.title,
                evidence_json = COALESCE(staff_work_queue_items.evidence_json, '{}'::jsonb) || EXCLUDED.evidence_json,
                updated_at    = now();
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.tg_stage_gate_review_enqueue() FROM PUBLIC, anon, authenticated;
```
Em `useGovernance.ts:233-237`, feche também os itens `in_progress` e leia o erro:
```ts
const { error: queueErr } = await supabase
  .from('staff_work_queue_items')
  .update({ status: 'done' })
  .eq('workspace_id', workspaceId)
  .eq('type', 'stage_gate_review')
  .in('status', ['open', 'in_progress']);
if (queueErr) notify.error(queueErr.message);
```

## P4.13 — Inquéritos: a fase do workspace volta atrás sem ninguém a escolher

O trigger de inscrição congela a fase em `auto_filled_data` (`20260903135424:92`). Se o staff avançar a fase depois, o respondente vê o seletor de fase vazio (o valor em inglês não é nenhuma das opções PT) mas marcado "Auto-filled", e a submissão é aceite. No write-back (`apply-survey-responses:227-250`), o valor antigo é válido, `overwrite` é `true`, e `workspaces.stage` regride, com uma linha nova em `stage_history`.

- `apply-survey-responses/index.ts`: não aplique respostas pré-preenchidas que o respondente nunca confirmou, e registe o motivo no write-back (em vez de "Sem resposta"):
```ts
// apply-survey-responses/index.ts:430-444
const { data: responses, error: responsesError } = await supabase
  .from('survey_responses')
  .select('question_id, response_value, response_json, is_auto_filled')
  .eq('instance_id', instanceId);
if (responsesError) throw responsesError;
const autoFilled = new Set<string>();
const answers = new Map<string, string>();
for (const response of responses ?? []) {
  if (response.is_auto_filled === true) { autoFilled.add(response.question_id); continue; }
  const raw = response.response_value
    ?? (Array.isArray(response.response_json) ? response.response_json.join(', ') : null);
  if (raw !== null && raw !== undefined && String(raw).trim() !== '') answers.set(response.question_id, String(raw).trim());
}
// :455-460, no início do ciclo dos mappings
if (autoFilled.has(questionId)) { results.push(skip(questionId, mapping, 'Pré-preenchido, não confirmado')); continue; }
```
- `SurveyForm.tsx` e `PublicSurvey.tsx`: só semeie valores que existam nas opções. Exporte a constante no `SurveyForm.tsx` e reutilize-a no `PublicSurvey.tsx` (que já importa `QuestionField` deste ficheiro):
```ts
// SurveyForm.tsx (topo do ficheiro); em PublicSurvey.tsx: import { QuestionField, STAGE_LABELS } from "@/components/surveys/SurveyForm";
export const STAGE_LABELS: Record<string, string> = {
  ideation: "Ideação", validation: "Validação", mvp: "MVP / Produto no mercado", growth: "Crescimento", scale: "Escala",
};
// SurveyForm.tsx:79-88
const autoFillData = (data.instance.auto_filled_data ?? {}) as Record<string, unknown>;
questions.forEach((q) => {
  const raw = q.autoFillKey ? autoFillData[q.autoFillKey] : undefined;
  if (!q.autoFillKey || raw === null || raw === undefined || initial[q.id]) return;
  let seeded = String(raw);
  if (q.type === "select" && q.options && !q.options.includes(seeded)) {
    const label = STAGE_LABELS[seeded];
    seeded = label && q.options.includes(label) ? label : "";
  }
  if (seeded) { initial[q.id] = seeded; autoKeys.add(q.id); }
});
```
  No `PublicSurvey.tsx:94-100` aplique a mesma lógica sobre `state.data.autoFill`.
- Para encontrar regressões de fase já aplicadas (a funcionalidade é nova), corra só de leitura:
```sql
SELECT sw.workspace_id, sw.value_text, sw.detail, sw.created_at
  FROM survey_writebacks sw
  JOIN survey_responses sr ON sr.instance_id = sw.instance_id AND sr.question_id = sw.question_id
 WHERE sw.target_key = 'stage' AND sw.status = 'applied' AND sr.is_auto_filled;
```
  e reponha a fase a partir de `stage_history`.

## P4.14 — Convites de inquérito: falhas do envio aparecem como sucesso

`send-survey-invites` devolve 200 com `failures[]` (domínio rejeitado, endereço inválido). `useSurveys.ts:960-971` mostra sempre o toast verde e só regista as falhas no logger.
```ts
onSuccess: (result, variables) => {
  if (variables.dryRun) return;
  queryClient.invalidateQueries({ queryKey: ["survey-instances"] });
  const failed = result.failures?.length ?? 0;
  if (failed > 0) {
    const show = (result.sent ?? 0) === 0 ? toast.error : toast.warning;
    show(t("admin.surveys.invitesPartial", {
      sent: result.sent ?? 0,
      failed,
      emails: result.failures!.slice(0, 5).map((f) => f.email).join(", "),
      defaultValue: "{{sent}} convites enviados, {{failed}} falharam: {{emails}}",
    }), { duration: 15000 });
    logger.warn("survey_invites_partial_failure", { failures: failed });
    return;
  }
  toast.success(t("admin.surveys.invitesSent", { count: result.sent ?? 0, defaultValue: "{{count}} convites enviados" }));
},
```
Chave nova `admin.surveys.invitesPartial`: PT "{{sent}} convites enviados, {{failed}} falharam: {{emails}}"; EN "{{sent}} invitations sent, {{failed}} failed: {{emails}}".

## P4.15 — Estatísticas da campanha nunca são atualizadas (LOW)

`['campaign-stats']` (`useSurveys.ts:904-906`) nunca é invalidada. Depois de Lançar, Gerir participantes ou Incluir todas, o cartão fica com os números antigos. Lançar e sincronizar também não invalidam `['survey-candidates']`, e o diálogo reaberto pode dar 23505.
```ts
function invalidateCampaignViews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["survey-campaigns"] });
  queryClient.invalidateQueries({ queryKey: ["survey-instances"] });
  queryClient.invalidateQueries({ queryKey: ["survey-candidates"] });
  queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });
}
```
Use-a no `onSuccess` de `useLaunchCampaign`, `useSyncCampaignParticipants`, `useToggleCampaignParticipant`, `useEnrollAllCandidates`, `useCloseCampaign` e `useReopenCampaign`. Em `useSaveSurveyResponses` (`useSurveys.ts:783`, que trata a submissão), acrescente ao `onSuccess` (`:851-854`) só `queryClient.invalidateQueries({ queryKey: ["campaign-stats"] });`. O cartão corrige-se sozinho ao mudar de separador, por isso é só apresentação.

## P4.16 — Link público do inquérito: o write-back pode falhar em silêncio

- `public-survey/index.ts:218-229` só tenta o write-back se `CRON_SECRET` estiver definido, e uma falha fica num `console.error`. A página diz sempre "Os dados da sua startup foram atualizados".
- `apply-survey-responses/index.ts:525-532` grava `activity_log` com `user_id: userId ?? 'system'`, e a coluna é `uuid NOT NULL`. Falha sempre nas submissões públicas.

Em `apply-survey-responses/index.ts`:
```ts
import { isServiceRoleBearer } from '../_shared/security.ts';
// :392
const isInternal = isServiceRoleBearer(req) || (Boolean(cronSecret) && req.headers.get('x-cron-secret') === cronSecret);
// :525-532
if (userId) {
  const { error: logErr } = await supabase.from('activity_log').insert({
    workspace_id: instance.workspace_id, user_id: userId, entity_type: 'survey', entity_id: instanceId,
    action: 'write_back', metadata: { campaign: campaign?.name, applied, skipped, errors, period_month: periodMonth },
  });
  if (logErr) console.error('[apply-survey-responses] activity_log failed', logErr.message);
}
```
Em `public-survey/index.ts`, substitua `:218-229` por:
```ts
if (submit) {
  const applyRes = await fetch(`${supabaseUrl}/functions/v1/apply-survey-responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify({ instance_id: instance.id }),
  });
  if (!applyRes.ok) {
    const detail = (await applyRes.text()).slice(0, 500);
    console.error(`[public-survey] write-back failed [${applyRes.status}]: ${detail}`);
    const { error: alertError } = await supabase.from('system_alerts').upsert({
      kind: 'survey_writeback_failed', severity: 'medium',
      dedupe_key: `survey_writeback_failed:${instance.id}`,
      payload: { instance_id: instance.id, status: applyRes.status, detail },
    }, { onConflict: 'dedupe_key' });
    if (alertError) console.error('[public-survey] alert upsert failed', alertError.message);
  }
}
```
O gate de founder/staff da P1.2 fica no ramo JWT e não afeta esta chamada interna.

## P4.17 — Convites não idempotentes

`send-survey-invites` volta a enviar para todos os não submetidos a cada clique, porque `last_reminder_sent_at` é escrito mas nunca lido. O envio é sequencial e o registo só acontece no fim do ciclo: se o pedido passar o timeout, os emails saem e nada fica registado, e um novo clique duplica. `email_log.recipients` (jsonb) é gravado como string.
```ts
const RESEND_COOLDOWN_MS = 20 * 60 * 60 * 1000;
const force = (body as { force?: boolean }).force === true;
const { data: allInstances, error: instancesError } = await admin
  .from('survey_instances')
  .select('id, workspace_id, status, public_token, last_reminder_sent_at')
  .eq('campaign_id', campaign.id)
  .neq('status', 'submitted');
if (instancesError) throw instancesError;
const instances = force ? (allInstances ?? []) : (allInstances ?? []).filter((i) =>
  !i.last_reminder_sent_at || Date.now() - new Date(i.last_reminder_sent_at).getTime() > RESEND_COOLDOWN_MS);
// dentro do ciclo, logo a seguir a um envio com sucesso:
if (ok) {
  sent += 1;
  const { error: touchError } = await admin.from('survey_instances')
    .update({ last_reminder_sent_at: new Date().toISOString() })
    .in('id', recipient.instanceIds);
  if (touchError) log.warn('instance_touch_failed', { message: touchError.message });
}
// email_log:
recipients: [...recipients.keys()],
```

## P4.18 — O link público devolve as respostas depois da submissão

O GET de `public-survey/index.ts:101-118` devolve todas as respostas sem verificar o estado. A campanha contínua termina daqui a 10 anos (`20260903135424:174`) e o token vai na query string, que fica nos logs e no histórico. **Só no ramo GET**, logo a seguir a `if (!instance) return json({ error: 'not_found' }, 404);` da linha 81 (não na linha 131, que é o POST: aí a submissão repetida tem de continuar a dar 409, que a P4.20 trata):
```ts
if (instance.status === 'submitted') {
  const c = instance.campaign as unknown as { name: string; ends_at: string | null } | null;
  return json({ status: 'submitted', campaignName: c?.name ?? '', endsAt: c?.ends_at ?? null,
    surveyName: c?.name ?? '', surveyDescription: null, questions: [], autoFill: {}, startupName: null, responses: [] });
}
```

## P4.19 — Corrida no envio do inquérito público

O UPDATE de estado (`public-survey/index.ts:209-215`) filtra só por `id`. Um rascunho que termine depois do submit repõe `in_progress`, e dois submits correm o write-back duas vezes.
```ts
const { data: updated, error: updateError } = await supabase
  .from('survey_instances')
  .update({
    status: submit ? 'submitted' : 'in_progress',
    ...(submit ? { submitted_at: new Date().toISOString(), submitted_by: null } : {}),
  })
  .eq('id', instance.id)
  .neq('status', 'submitted')
  .select('id');
if (updateError) throw updateError;
if (!updated || updated.length === 0) return json({ error: 'already_submitted' }, 409);
```

## P4.20 — Página pública do inquérito: sem confirmação do rascunho e erros genéricos

`PublicSurvey.tsx:171-185`: "Guardar rascunho" não dá confirmação; 409 (já submetido) e 410 (campanha fechada) aparecem como "Tente novamente". `SurveyForm.tsx:381` mostra "Select an option" em PT.
```ts
const [savedAt, setSavedAt] = useState<Date | null>(null);
// …
if (!res.ok) {
  const code = body?.error;
  if (code === "already_submitted") {
    setState((prev) => prev.kind === "ready" ? { kind: "ready", data: { ...prev.data, status: "submitted" } } : prev);
    return;
  }
  setSubmitError(
    code === "required_missing" ? t("publicSurvey.requiredMissing", "Responda a todas as perguntas obrigatórias antes de submeter.")
    : code === "survey_closed" ? t("publicSurvey.closed", "Este inquérito já não está disponível.")
    : t("publicSurvey.saveFailed", "Não foi possível guardar. Tente novamente."));
  return;
}
if (!submit) setSavedAt(new Date());
// junto aos botões:
{savedAt && <p className="text-sm text-muted-foreground">{t("publicSurvey.draftSaved", "Rascunho guardado")}</p>}
```
`SurveyForm.tsx:381`: `<SelectValue placeholder={t("surveys.selectOption", "Selecione uma opção")} />`. Chaves novas: `publicSurvey.draftSaved` ("Rascunho guardado" / "Draft saved") e `surveys.selectOption` ("Selecione uma opção" / "Select an option").

## P4.21 — Terminação em massa: placeholders literais e "0 contratos terminados" a verde

`useTerminateContract.ts:228-232` passa `count`, mas o catálogo usa `{{ok}}` e `{{failed}}`. Se tudo falhar, aparece primeiro um toast verde.
```ts
onSuccess: ({ ok, failed }) => {
  invalidateTerminationViews(queryClient);
  if (failed === 0) {
    notify.success(t('contracts.bulk.terminateSuccess', { count: ok, defaultValue: '{{count}} contratos terminados' }));
  } else {
    notify.error(t('contracts.bulk.terminatePartial', { ok, failed, defaultValue: '{{ok}} contratos terminados, {{failed}} falharam' }));
  }
},
```

## P4.22 — `.limit(5000)` não evita perder registos

`useFunnel.ts:8,59,70-71` e `useAdminData.ts:7,212-215,300-303` pedem 5000 linhas e avisam se vierem 5000. O PostgREST corta em `max_rows` (1000 por omissão), por isso com mais de 1000 leads o quadro CRM perde registos e o aviso nunca dispara. Crie `src/lib/fetchAllRows.ts`:
```ts
import { logger } from '@/lib/logger';

export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000, hardCap = 20000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < hardCap; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) return out;
  }
  logger.warn('[fetchAllRows] hard cap reached', { hardCap });
  return out;
}
```
Use-o em `useFunnelItems` (com `.order('updated_at', { ascending: false }).order('id').range(from, to)`), `useWorkspaceUsers` e `useAllWorkspaces`.

## P4.23 — Pequenos defeitos de navegação

- `EnrollmentControlCenter.tsx:170-178`: o cartão "Importadas não reclamadas" navega para o separador onde já está. Use `navigate('/staff-cockpit')`, onde está a fila de claims (`ClaimRequestsQueue`).
- `EcosystemHeatmap.tsx:134` navega com `?stage=&health=`, mas `Ecosystem.tsx:38-52` ignora os parâmetros. Inicialize `stage: searchParams.get('stage') || 'all'` e passe `healthScore: searchParams.get('health') || undefined` a `useEcosystemItems` (o RPC ainda aceita `p_health`).
- `WorkspaceOverview.tsx:606`: "Ver tudo" nas Interações usa `tab: 'communications'`, que não existe. Use `tab: 'agenda'`.

## P4.24 — Founder com candidatura pendente cai em /claim-startup

`TransitionalFounderDashboard.tsx:45,230` aponta "Preparar documentação" e "Ver espaço" para `/workspace/:id`, mas o gate em `App.tsx:136-146` redireciona o estado `has_pending_workspace` para `/claim-startup`. O `PendingWorkspaceView` de `WorkspaceDetail.tsx:319-330` nunca é atingido.
```ts
// App.tsx (ProtectedRoute)
const isPendingWorkspaceRoute = founderState.status === 'has_pending_workspace' && location.pathname.startsWith('/workspace/');
// acrescente && !isPendingWorkspaceRoute à condição do <Navigate to="/claim-startup" replace />
```
Em `CreateStartupDialog.tsx:178-188`, depois do sucesso e antes do `navigate`, invalide `['founder-onboarding-state']`, `['my-pending-workspaces']` e `['workspaces']` (use `useQueryClient()`).

## P4.25 — Defeitos menores no fluxo do founder

- `useSessions.ts` (`useCreateSession`): o insert não inclui `session_type`, por isso o tipo escolhido no Calendário perde-se. Acrescente `session_type: session.session_type || 'general'`.
- `CalendarTab.tsx:242` e `:285`: converta a hora com `lisbonWallClockToUtcIso(\`${formData.date}T${formData.startTime}\`)`, como o `CreateSessionDialog`.
- `useSessions.ts:331` e `:612`: `workspaces.owner_user_id` não existe, e as notificações Teams saem sem o nome da startup. Use `.select('startup:startups(name), assigned_consultor_id')`.
- `ChatTab.tsx:188-203` (`handleSend`): `if (!trimmed || !conversation?.id || sendMutation.isPending) return;`, para Enter duplo não enviar duas vezes.
- `useFounderStaffRequests.ts:72,74,105`: troque os toasts PT fixos por `i18n.t('founderRequests.sent', { defaultValue: 'Pedido enviado à equipa' })` (e equivalentes), com `import i18n from '@/i18n';` no topo.

## P4.26 — "Terminar sessão" pode não terminar a sessão

`AuthContext.tsx:314-328` ignora o `{ error }` de `supabase.auth.signOut()`. Com erro de rede ou 5xx, o auth-js devolve o erro antes de remover a sessão local. A app vai para `/login`, o `getSession` ainda devolve a sessão e o utilizador volta a entrar. Isto acontece sobretudo no botão "Terminar sessão" do ecrã de erro de perfil, que aparece precisamente quando o backend falha.
```ts
const { error } = await supabase.auth.signOut();
if (error) {
  logger.error('signout_failed', {}, error);
  await supabase.auth.signOut({ scope: 'local' }); // remove a sessão local sem depender da rede
}
```

---

**Fim da Parte 4.** Corra o harness e o `rc5:verify`, e diga-me o que ficou por aplicar antes de colar a Parte 5.


# PROMPT LOVABLE — RC9 · PARTE 5 de 5 — i18n, CI, testes e processo

Mesmas regras da Parte 1. Esta parte deixa o CI verde e fecha as causas que fazem os mesmos defeitos voltar em cada ronda.

---

## P5.1 — Textos da UI: aplicar o anexo `LOVABLE-RC9-I18N-PATCH.json`

O anexo corrige os catálogos de uma vez (achados H1 a H8 e C11):
- diálogos destrutivos que perderam o alvo e o aviso ("Suspend Confirmar", "Confirmar Eliminar Desc", "A Startup será movida de ");
- a notificação de renovação que diz "Renovação enviada ao signatário" quando o contrato já foi renovado;
- mais de 20 valores que descartam as variáveis que o código passa;
- cerca de 130 valores em inglês ou misturados na UI PT, incluindo a página pública de marcação ("Voltar To Reservar", "Phone") e o Login;
- chaves cruas no ecrã (`roles.backoffice`, `admin.backoffice.pending`);
- cerca de 170 valores PT em `en.json`, incluindo `common.retry` = "Tentar novamente";
- 20 chaves mortas com lixo `${…}` ou inglês.

Números: `pt` 156 alterações e 71 chaves novas; `en` 69 alterações e 71 chaves novas; 20 chaves removidas dos dois catálogos. Validado contra o ZIP: todas as chaves de `update` existem, nenhuma de `add` existe, nenhuma de `remove` é usada no código (nem por chave dinâmica). Com o anexo aplicado passam `i18n-check.cjs`, `i18n-lint.mjs`, `rc5/i18n-quality.mjs` e o gate novo da P5.2.

Como aplicar: o anexo chega na mensagem a seguir a esta parte (ou como ficheiro). Cada chave do anexo é o caminho completo no catálogo (pontos separam níveis). Aplique as entradas diretamente em `src/i18n/locales/pt.json` e `en.json`. Em alternativa, crie `scripts/rc9/i18n-patch.json` (o anexo) e `scripts/rc9/apply-i18n-patch.mjs` (abaixo) e corra `node scripts/rc9/apply-i18n-patch.mjs scripts/rc9/i18n-patch.json`: o script recusa um `update` de chave inexistente. Um `add` de uma chave que já exista (as que as Partes 3 e 4 mandaram acrescentar) fica com o valor do anexo.
```js
// scripts/rc9/apply-i18n-patch.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const [patchPath, dir = 'src/i18n/locales'] = process.argv.slice(2);
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
const walk = (root, key, create) => {
  const parts = key.split('.');
  let node = root;
  for (const p of parts.slice(0, -1)) {
    if (!(p in node)) { if (!create) throw new Error(`missing parent for ${key}`); node[p] = {}; }
    node = node[p];
    if (typeof node !== 'object' || node === null) throw new Error(`parent of ${key} is not an object`);
  }
  return [node, parts.at(-1)];
};
for (const lang of ['pt', 'en']) {
  const file = `${dir}/${lang}.json`;
  const cat = JSON.parse(readFileSync(file, 'utf8'));
  for (const [k, v] of Object.entries(patch[lang].update)) { const [n, l] = walk(cat, k, false); if (!(l in n)) throw new Error(`${lang}: update of missing key ${k}`); n[l] = v; }
  for (const [k, v] of Object.entries(patch[lang].add)) { const [n, l] = walk(cat, k, true); if (l in n && n[l] !== v) console.warn(`${lang}: ${k} já existia — fica o valor do anexo`); n[l] = v; }
  for (const k of patch.remove) { const [n, l] = walk(cat, k, false); if (!(l in n)) throw new Error(`${lang}: remove of missing key ${k}`); delete n[l]; }
  writeFileSync(file, JSON.stringify(cat, null, 2) + '\n');
  console.log(`${lang}: ${Object.keys(patch[lang].update).length} updated, ${Object.keys(patch[lang].add).length} added, ${patch.remove.length} removed`);
}
```
O anexo já inclui as chaves novas usadas nas Partes 3 e 4 (`workQueue.types.counter_sign_contract`, `workQueue.types.financial_assumption_skipped`, `workQueue.types.milestone_missed`, `mentors.noSlotsForDate`, `admin.surveys.invitesPartial`, `publicSurvey.draftSaved`, `milestones.validationRequested`, `actions.bulkPartialSkipped`, `founderRequests.sent`) e os textos de "Arquivar lead" da P3.7.

Alterações de código que acompanham o anexo:
- `AdminUsersManager.tsx:114`: `const getRoleLabel = (role: string) => t(\`roles.${role}\`, { defaultValue: role });` (hoje o `t()` devolve a chave, que é truthy, e o `|| role` nunca atua).
- `AdminBackoffice.tsx:737`: `{t(\`admin.backoffice.${item.status}\`, { defaultValue: item.status })}`.
- `BulkContractImport.tsx:483`: `{t('bulkImport.upload.uploading', 'Uploading {{done}} / {{total}}...', uploadProgress)}` (hoje mostra `{{done}}` à letra).
- `GovernanceTab.tsx:122`: `notify.success(t('workspace.review', { decision: t(\`governance.${decision}\`) }));` (hoje sai "Reviewapproved").
- `AdminDataImport.tsx:880`: `notify.success(t('dataImport.importSummary', { inserted, updated }));`.
- Texto fixo em ficheiros alterados no RC9:
  - `CreateSessionDialog.tsx:875-883, 911-913`: "Meeting Link" e "Cancel" passam a `t('sessions.meetingLink', 'Link da Reunião')`, `t('sessions.meetingLinkHint')`, `t('sessions.meetingLinkPlaceholder')` e `t('common.cancel')`;
  - `useSurveys.ts:316` e `:878`: `toast.error(t('surveys.launchFailed', 'Não foi possível lançar a campanha'))` e `toast.error(t('surveys.saveResponseFailed', 'Não foi possível guardar o inquérito'))`;
  - `AdminSurveysManager.tsx:365-367`: `t('admin.surveys.legendSubmitted', { count: stats.submitted })`, `legendInProgress` e `legendPending`;
  - `BulkContractImport.tsx` (`StatusBadge`): `t(\`bulkImport.rowStatus.${status}\`, …)` para `will_create`, `will_update`, `committed`, `error`, `pending` e `skipped`.
- Datas e moeda na UI PT (achado H10): importe `getDateLocale` de `@/lib/dateLocale` e passe `{ locale: getDateLocale() }` ao `format()` em `BackofficeContractsTab.tsx:646,771`, `BackofficeInvoicesTab.tsx:197`, `MentorSessionPrepEnhanced.tsx:117`, `KpisTab.tsx:258` e `UnitEconomicsCalculator.tsx:326`. Em `FundingTrackerTab.tsx:125`: `new Intl.NumberFormat(i18n.language?.startsWith('en') ? 'en-GB' : 'pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })`.

## P5.2 — CI `i18n-sync-guard`: falha só por ordem de chaves, e o próprio sync gera texto errado

O job corre `node scripts/i18n-sync.cjs` e falha com qualquer diferença em bytes. No RC9 o sync não acrescenta nem altera nenhuma chave ("Added 0 / Filled 0 / Fixed 0"): só reordena. O job está vermelho só por isso. Pior: quando há chaves novas, o `i18n-sync.cjs` preenche o `en.json` com o `defaultValue` PT e traduz o `pt.json` palavra a palavra com um dicionário. É daí que vêm "Voltar To Reservar", "Suspend Confirmar" e os valores PT no inglês.

Substitua o passo do job por uma verificação de **conteúdo** (ignora a ordem e falha se faltar uma chave ou se o sync quiser mudar um valor). Crie `scripts/ci/i18n-semantic-guard.cjs`:
```js
#!/usr/bin/env node
// Falha só se o i18n-sync alterar CONTEÚDO (chaves ou valores); ignora a ordem das chaves.
const fs = require('fs');
const path = require('path');
const DIR = path.resolve(process.cwd(), 'src/i18n/locales');
const SNAP = path.resolve(process.cwd(), '.i18n-snapshot.json');
const flat = (o, p = '', r = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const kk = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, kk, r); else r[kk] = v;
  }
  return r;
};
const read = () => Object.fromEntries(['pt', 'en'].map((l) => [l, flat(JSON.parse(fs.readFileSync(path.join(DIR, `${l}.json`), 'utf8')))]));
const mode = process.argv[2];
if (mode === 'snapshot') { fs.writeFileSync(SNAP, JSON.stringify(read())); console.log('i18n snapshot saved'); process.exit(0); }
if (mode !== 'compare') { console.error('usage: snapshot | compare'); process.exit(2); }
const before = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
const after = read();
const problems = [];
for (const l of ['pt', 'en']) {
  const b = before[l], a = after[l];
  for (const k of Object.keys(a)) if (!(k in b)) problems.push(`${l}: chave em falta no catálogo → ${k} = ${JSON.stringify(a[k])}`);
  for (const k of Object.keys(b)) if (!(k in a)) problems.push(`${l}: chave removida pelo sync → ${k}`);
  for (const k of Object.keys(a)) if (k in b && a[k] !== b[k]) problems.push(`${l}: valor alterado pelo sync → ${k}: ${JSON.stringify(b[k])} → ${JSON.stringify(a[k])}`);
}
if (problems.length) {
  console.error(`❌ i18n fora de sincronia (${problems.length}). Acrescente as chaves com tradução revista, não a gerada:`);
  for (const p of problems.slice(0, 80)) console.error(' •', p);
  process.exit(1);
}
console.log('✅ i18n: conteúdo em sincronia (ordem das chaves ignorada)');
```
Em `.github/workflows/ci.yml`, no job `i18n-sync-guard`, troque os passos "Run i18n sync" e "Verify no changes after sync" por:
```yaml
      - name: i18n semantic sync guard (key order ignored)
        run: |
          node scripts/ci/i18n-semantic-guard.cjs snapshot
          node scripts/i18n-sync.cjs
          node scripts/ci/i18n-semantic-guard.cjs compare
```
Validado: com os catálogos do RC9 e com o anexo aplicado, o guard passa; uma chave em falta ou um valor que o sync queira mudar fazem-no falhar.

Acrescente também ao job `i18n-check` o gate de qualidade estendido: crie `scripts/rc5/i18n-quality-ext.mjs` com o conteúdo abaixo e um passo `run: node scripts/rc5/i18n-quality-ext.mjs`. Deteta valor igual a uma chave, "X Desc/Placeholder/Hint/Button/Confirm", valor truncado, `${` literal, placeholder colado ao texto, PT igual a EN com marcadores ingleses e variáveis diferentes entre PT e EN. No RC9 dá 102 problemas; com o anexo, 0.
```js
// scripts/rc5/i18n-quality-ext.mjs — uso: node scripts/rc5/i18n-quality-ext.mjs [dir]
import { readFileSync } from 'node:fs';
const dir = process.argv[2] ?? 'src/i18n/locales';
const PT = JSON.parse(readFileSync(`${dir}/pt.json`, 'utf8'));
const EN = JSON.parse(readFileSync(`${dir}/en.json`, 'utf8'));
const flat = (o, p = '', r = {}) => { for (const [k, v] of Object.entries(o)) { const kk = p ? `${p}.${k}` : k; v && typeof v === 'object' ? flat(v, kk, r) : (r[kk] = v); } return r; };
const pt = flat(PT), en = flat(EN);
const VAR = /\{\{\s*([^}\s,]+)\s*(?:,[^}]*)?\}\}/g;
const vars = (s) => new Set([...String(s).matchAll(VAR)].map((m) => m[1]));
const humanize = (leaf) => leaf.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
const EN_PT = /\b(the|and|to|of|for|with|your|you|this|is|are|during|another|complete|configuration|invalid|valid|rows|first|over|before|reminders?|timing|how|due|on|last|generated|suggested|insights|contact|main|missing|across|programs|export|phone|month|select|duplicates|errors|expected|format|importing|synced|sent|logged|recomputed|deactivated|role)\b/i;
const ALLOW = new Set(['admin.groups.insights', 'dashboard.insights', 'financialPanel.insights', 'inbox.tab.insights', 'glossary.b2b', 'glossary.b2c', 'crm.import.hint']);
const problems = [];
for (const [k, v] of Object.entries(pt)) {
  if (ALLOW.has(k)) continue;
  const leaf = k.split('.').at(-1);
  if (/^[a-z]+(\.[A-Za-z0-9_]+)+$/.test(v)) problems.push(`pt.${k}: value is an i18n key → "${v}"`);
  if (/\S\s+(Desc|Placeholder|Hint|Button|Confirm|Confirmar)$/.test(v.trim()) && v.split(' ').length <= 5) problems.push(`pt.${k}: key-name placeholder → "${v}"`);
  if (v === en[k] && /^[A-Z]?[a-z]+[A-Z]/.test(leaf) && v.toLowerCase().replace(/[^a-z ]/g, '').trim() === humanize(leaf) && EN_PT.test(v)) problems.push(`pt.${k}: humanized English key → "${v}"`);
  if (/[ =]$/.test(v) && !/[.:!?…] $/.test(v)) problems.push(`pt.${k}: truncated value → "${v}"`);
  if (/[A-Za-zÀ-ÿ]\{\{\s/.test(v)) problems.push(`pt.${k}: placeholder glued to text → "${v}"`);
  if (v.includes('${')) problems.push(`pt.${k}: JS template literal → "${v}"`);
  if (EN_PT.test(v.replace(VAR, ' ')) && v === en[k] && /[a-z]{3}/.test(v)) problems.push(`pt.${k}: identical to EN → "${v}"`);
  const a = vars(v), b = vars(en[k] ?? '');
  if ([...a].some((x) => !b.has(x)) || [...b].some((x) => !a.has(x))) problems.push(`${k}: pt/en placeholders differ (${[...a]} vs ${[...b]})`);
}
for (const [k, v] of Object.entries(en)) if (/^[a-z]+(\.[A-Za-z0-9_]+)+$/.test(v)) problems.push(`en.${k}: value is an i18n key → "${v}"`);
if (problems.length) { console.error(`❌ ${problems.length} problem(s)`); for (const p of problems) console.error(' •', p); process.exit(1); }
console.log('✅ extra i18n checks passed');
```
No job `i18n-lint` (`ci.yml:118-119`), apague o passo `i18n sync (populate missing keys)`: hoje o lint valida o catálogo já completado pelo sync no runner, e nunca o que foi commitado.

Regra daqui para a frente: uma chave nova entra no mesmo commit com PT e EN escritos à mão. Não faça commit do que o `i18n-sync.cjs` gera para chaves novas.

## P5.3 — CI `db-tests` e `e2e`: a cadeia de migrações não arranca de uma base vazia

Os dois jobs começam com `supabase start`, que aplica as migrações por ordem. A `20260103024619` (`:72-75`) cria `workspace_readiness_status` com FK para `investor_readiness_items`, mas essa tabela só é criada em `20260220001543:18`. A `20260115005921` usa `investor_update_templates`, que também só é criada em `20260220001543:5`. Em produção as tabelas já existiam, por isso nunca falhou lá. O `supabase start` falha, e os dois jobs ficam vermelhos.

O harness local contorna isto aplicando `scripts/rc5/legacy-baseline.sql` antes do replay, mas esse ficheiro cria as três tabelas **sem as FKs** que produção tem (`investor_readiness_items_program_id_fkey`, `workspace_readiness_status_item_id_fkey`, `workspace_readiness_status_workspace_id_fkey`, visíveis no `types.ts`). Por ser aplicado antes, os `CREATE TABLE IF NOT EXISTS` das migrações passam a ser ignorados, e a base de teste fica diferente de produção. O comentário do ficheiro ("os CREATE TABLE nunca foram commitados") e a linha do ledger que o dá como `PASS` estão errados: as tabelas são criadas por migrações commitadas, só que fora de ordem.

Correção (sem ficheiros "prereq", que o próprio CI proíbe): crie a migração `supabase/migrations/20260103024618_create_investor_tables_early.sql`, **com este nome exato** para ficar antes da `20260103024619`, só com o DDL das duas tabelas que são usadas cedo demais (cópia literal de `20260220001543:5-28`):
```sql
-- As duas tabelas já são referenciadas por 20260103024619 e 20260115005921, mas só eram criadas em 20260220001543.
-- Mesmo DDL de 20260220001543:5-28. Em produção é um no-op (as tabelas já existem).
CREATE TABLE IF NOT EXISTS public.investor_update_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    audience text NOT NULL DEFAULT 'investors',
    sections_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investor_readiness_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text NOT NULL,
    stage text NOT NULL,
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
```
Em produção é um no-op, porque as tabelas já existem. Depois:
- retire de `scripts/rc5/local-pg-harness.sh:70` a linha que aplica `legacy-baseline.sql`, e apague esse ficheiro;
- em `docs/rc5/evidence-ledger.md:304`, troque o `PASS` por uma nota a dizer que as tabelas eram criadas fora de ordem e que a migração `20260103024618` corrige a ordem.

Validado no harness sem o pré-passo: as 477 migrações correm a partir de uma base vazia com 0 falhas, as 23 suites passam, e a base fica com as três FKs de produção. O `migration-scan` continua verde. Não consegui correr o `supabase start` aqui (sem Docker). Se o job falhar noutro ponto depois disto, cole-me o log.

## P5.4 — Harness com os privilégios de produção (já feito na P1.11)

A emulação dos default privileges do Supabase e a suite `service_only_function_privileges.test.sql` entraram na P1.11. Confirme que continuam no `local-pg-harness.sh` e em `supabase/tests/`, e que todas as suites passam com a emulação ligada.

## P5.5 — Testes do RC9 que não testam o que prometem

- `pulse_notifications_kill_switch.test.sql:12-17` só procura o nome da função no código-fonte. Substitua por um teste de comportamento: ative a flag `feature_flags (key = 'founder_monthly_pulse', scope = 'global', enabled = true)`, que está desligada por omissão (sem ela a função devolve sempre 0), e crie um ciclo `open` com um founder aprovado. Com `notifications.founders_disabled = true`, `enqueue_pulse_notifications(<ciclo>)` devolve 0 e não cria `notification_attempts`; com `false`, devolve 1.
- `stage_gate_review_queue.test.sql` só cobre o primeiro pedido. Acrescente um segundo pedido pendente com o item ainda aberto (`lives_ok`, que hoje falha com 23505 e passa com a P4.12), "continua a haver exatamente 1 item ativo", `created_by` igual ao founder e `evidence_json ? 'review_id'`.
- `founder_pulse_retention.test.sql` não tem caso negativo: acrescente uma resposta de há 2 meses que fica intacta, a verificação de que `blockers`/`wins`/`ask` ficam a NULL, `has_function_privilege('authenticated', 'public.anonymize_stale_founder_pulse_responses()', 'EXECUTE') = false` e o agendamento em `cron.job` (P3.21).
- `serialize_program_tree_privileges.test.sql`: acrescente `has_function_privilege('authenticated', 'public.serialize_program_tree(uuid)', 'EXECUTE') = false`. `action_items_milestone_scope.test.sql`: acrescente o caso positivo (mesmo workspace, `lives_ok`) e troque o `throws_ok` genérico por `throws_like(…, '%action_items_milestone_ws_fkey%')`.
- `finalize_crm_import_batch.test.sql` não corre como `authenticated`: acrescente um founder a receber `42501` e um admin (com `SET LOCAL role authenticated`) a obter `partial_needs_review` persistido.
- Suite nova `rc9_delta_guards.test.sql`: `list_ecosystem_items_v2` sem `pending_start`; `survey_instances.public_token` NOT NULL; ausência que bloqueia `create_mentor_booking_idempotent` com `22023` e o horário adjacente livre; e, depois da P1.2, mentor com NDA → 0 linhas em `survey_instances`.
- Para cada item das Partes 1 a 4 com SQL, escreva o pgTAP indicado no próprio item **antes** do SQL e confirme que falha sem a correção.

## P5.6 — CI `deno-check-edge`

Não consegui reproduzir o erro: o esm.sh e o deno.land estão bloqueados no ambiente de auditoria. O que verifiquei: com o `@supabase/supabase-js` resolvido pelo npm (fixado em 2.89.0, a versão do frontend, ou nas versões atuais de cada ficheiro), os 134 ficheiros passam no `deno check` (Deno 2.9.6). A diferença está portanto na resolução pelo esm.sh ou na versão do Deno do runner.

Hoje as edge functions importam o supabase-js de cinco formas: `esm.sh/@supabase/supabase-js@2` (91 imports, versão flutuante), `@2.48.1` (9), `@2.39.3` (4), `@2.45.0` (2), e `npm:@supabase/supabase-js@2` / `@^2.89.0` (3). Torne a resolução determinística pelo import map de `supabase/functions/deno.json`, sem tocar nos ficheiros:
```json
{
  "nodeModulesDir": "auto",
  "compilerOptions": { "lib": ["deno.window", "deno.ns", "dom", "dom.iterable", "es2022"], "strict": true },
  "imports": {
    "resend": "npm:resend@4.0.0",
    "https://esm.sh/@supabase/supabase-js@2": "npm:@supabase/supabase-js@2.89.0",
    "https://esm.sh/@supabase/supabase-js@2.48.1": "npm:@supabase/supabase-js@2.89.0",
    "https://esm.sh/@supabase/supabase-js@2.39.3": "npm:@supabase/supabase-js@2.89.0",
    "https://esm.sh/@supabase/supabase-js@2.45.0": "npm:@supabase/supabase-js@2.89.0",
    "npm:@supabase/supabase-js@2": "npm:@supabase/supabase-js@2.89.0",
    "npm:@supabase/supabase-js@^2.89.0": "npm:@supabase/supabase-js@2.89.0",
    "https://esm.sh/jszip@3.10.1": "npm:jszip@3.10.1",
    "https://esm.sh/date-fns@3.6.0": "npm:date-fns@3.6.0",
    "https://esm.sh/unpdf@0.12.1": "npm:unpdf@0.12.1"
  }
}
```
Esta configuração foi a que validei. Faça deploy de uma função de teste antes de publicar todas, para confirmar que o runtime das edge functions aceita o mapa. Se o job continuar vermelho, cole-me as primeiras 40 linhas do log.

## P5.7 — O caminho de verificação em staging nunca pode dar "pass"

O `PUBLISH_READY.md:38-51` e o `manual-test-runsheet.md:29-35` dizem que o veredicto passa a GO quando `RC5_ALLOW_STAGING_TESTS=true bun run rc5:verify` escrever `"overall": "pass"` em `docs/rc5/results.json`. Esse caminho não pode passar:
- `scripts/rc5/seed.mjs:18-31` faz upsert em colunas que não existem (`startups.stage`, `workspaces.name`, `public_booking_links.slug`) e com `onConflict` em colunas sem índice único;
- `scripts/rc5/cleanup.mjs:24-32` apaga por `workspaces.name`, `funnel_items.title` e `public_booking_links.slug`, que também não existem, e termina com `exit 2` no primeiro alvo;
- o guia (`docs/rc5/staging-setup-guide.md:84-89`) manda configurar `STAGING_GRAPH_*` e `STAGING_EMAIL_SANDBOX_API_KEY`, mas os scripts leem `RC5_GRAPH_*` (`probe-graph.mjs:8-9`) e `RC5_EMAIL_SANDBOX_API_KEY/_FROM/_TO` (`probe-email.mjs:8-10`), e omite `RC5_DISPOSABLE_DATABASE_URL`, `RC5_TEST_WORKSPACE_ID` e `RC5_TEST_ACTOR_ID`;
- o `e2e/global-setup.ts:21-22` lê `E2E_<PAPEL>_EMAIL/PASSWORD`, mas o guia e o `seed-personas.mjs` criam contas `RC5_TEST_*`;
- `migrate-fresh-replay.mjs:25` reaplica as migrações sem a baseline e cai na mesma migração da P5.3.

Correções:
- `scripts/rc5/seed.mjs:18-31`:
```js
const SEED = {
  program: 'e2e00000-0000-4000-8000-000000000001',
  startup: 'e2e00000-0000-4000-8000-000000000002',
  workspace: 'e2e00000-0000-4000-8000-000000000003',
  link: 'e2e00000-0000-4000-8000-000000000004',
};
const { createHash } = await import('node:crypto');
const steps = [
  ['programs', { id: SEED.program, name: `${NS}program` }],
  ['startups', { id: SEED.startup, name: `${NS}alpha` }],
  ['workspaces', { id: SEED.workspace, startup_id: SEED.startup, program_id: SEED.program, status: 'active' }],
  ['public_booking_links', { id: SEED.link, label: `${NS}book`, active: true,
    token_hash: createHash('sha256').update(`${NS}book`).digest('hex') }],
];
for (const [table, row] of steps) {
  const { error } = await supa.from(table).upsert([row], { onConflict: 'id' });
  if (error) die(`${table} upsert: ${error.message}`);
}
console.log(`[rc5:seed] OK — RC5_TEST_WORKSPACE_ID=${SEED.workspace}`);
```
- `scripts/rc5/cleanup.mjs:24-32` (apagar `workspaces` antes de `startups` e `programs`):
```js
const targets = [
  { table: 'workspaces', col: 'id', op: 'eq', val: 'e2e00000-0000-4000-8000-000000000003' },
  { table: 'startups', col: 'name', op: 'like', val: `${NS}%` },
  { table: 'programs', col: 'name', op: 'like', val: `${NS}%` },
  { table: 'funnel_items', col: 'organization_name', op: 'like', val: `${NS}%` },
  { table: 'public_booking_links', col: 'label', op: 'like', val: `${NS}%` },
  { table: 'workspace_invitations', col: 'email', op: 'like', val: `${NS}%` },
  { table: 'mentor_bookings', col: 'idempotency_key', op: 'like', val: `${NS}%` },
  { table: 'notification_ledger', col: 'business_key', op: 'like', val: `${NS}%` },
];
// no ciclo: const q = supa.from(t.table).delete();
//           const { data, error } = await (t.op === 'eq' ? q.eq(t.col, t.val) : q.like(t.col, t.val)).select('id');
```
- `e2e/global-setup.ts:21-22`: aceite também os nomes do guia (idem para a password), e acrescente a persona `founder_unclaimed` a `seed-personas.mjs:20-26`:
```ts
const envEmail = process.env[`E2E_${role.toUpperCase()}_EMAIL`]
  ?? process.env[`RC5_TEST_${role === 'consultant' ? 'CONSULTANT' : role.toUpperCase()}_EMAIL`];
```
- `docs/rc5/staging-setup-guide.md`: use os nomes que os scripts leem (`RC5_GRAPH_TENANT_ID`, `RC5_GRAPH_CLIENT_ID`, `RC5_GRAPH_CLIENT_SECRET`, `RC5_EMAIL_SANDBOX_API_KEY`, `RC5_EMAIL_SANDBOX_FROM`, `RC5_EMAIL_SANDBOX_TO`), acrescente `RC5_DISPOSABLE_DATABASE_URL`, `RC5_TEST_WORKSPACE_ID` (o id que o seed imprime) e `RC5_TEST_ACTOR_ID`, e diga que a opção sem chave de serviço não consegue `overall: pass`.
- `scripts/rc5/migrate-fresh-replay.mjs:25-32`: com a P5.3 aplicada a cadeia corre a partir de uma base vazia; aplique só `scripts/rc5/supabase-shim.sql` antes do ciclo.

## P5.8 — Testes E2E que passam sem testar nada

- `e2e/failure-injection.spec.ts:15-23` ("Graph 429"): a asserção está dentro de um `.catch(() => {})` e o `data-testid="email-sync-status"` não existe em `src`. O teste passa sempre. Marque-o `test.fixme(true, 'Sem widget email-sync-status com data-testid')` até acrescentar o `data-testid` ao componente que mostra o estado da sincronização.
- `e2e/failure-injection.spec.ts:25-38` (dupla marcação) chama `${STAGING_APP_URL}/functions/v1/create-mentor-booking`, que não existe (a lógica é a RPC `create_mentor_booking_idempotent`), e o host da SPA responde 200 com HTML. A única asserção fica dentro de `if (a?.id && b?.id)` e nunca corre. Substitua por:
```ts
test('duplicate mentor booking is rejected by idempotency key', async ({ request }) => {
  const api = process.env.STAGING_SUPABASE_URL, anon = process.env.STAGING_SUPABASE_ANON_KEY;
  const mentorId = process.env.RC5_TEST_MENTOR_ID, workspaceId = process.env.RC5_TEST_WORKSPACE_ID;
  test.skip(!api || !anon || !mentorId || !workspaceId, 'staging API/persona ids not set');
  const login = await request.post(`${api}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anon! },
    data: { email: process.env.RC5_TEST_FOUNDER_EMAIL, password: process.env.RC5_TEST_FOUNDER_PASSWORD },
  });
  expect(login.ok()).toBe(true);
  const { access_token } = await login.json();
  const headers = { apikey: anon!, Authorization: `Bearer ${access_token}` };
  const data = {
    p_mentor_id: mentorId, p_workspace_id: workspaceId, p_requested_date: '2030-01-07',
    p_requested_start_time: '10:00', p_requested_end_time: '11:00', p_message: 'rc5-e2e',
    p_idempotency_key: `rc5-e2e-${Date.now()}`,
  };
  const first = await request.post(`${api}/rest/v1/rpc/create_mentor_booking_idempotent`, { headers, data });
  const second = await request.post(`${api}/rest/v1/rpc/create_mentor_booking_idempotent`, { headers, data });
  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);
  expect((await second.json()).id).toBe((await first.json()).id);
});
```
- `e2e/mentor-double-booking.spec.ts:34,102,119` faz `import('/src/integrations/supabase/client.ts')`, que só existe no servidor de desenvolvimento do Vite. O job `e2e` corre `vite preview` sobre o build, por isso o spec falha sempre, mesmo depois da P5.3. Crie o cliente no processo de teste (`createClient` de `@supabase/supabase-js` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`, seguido de `signInWithPassword`), apague `:94-110` (dispara o próprio toast e depois verifica que ele apareceu) e acrescente essas duas variáveis ao `env:` do passo de testes em `ci.yml:337-340`.
- `scripts/rc5/verify.mjs:125`: acrescente `run('e2e:personas-mobile', 'bunx', ['playwright', 'test', '--project=staging-personas-mobile']);`. O `PUBLISH_READY.md:35` promete "4 tamanhos de ecrã", mas o projeto mobile nunca corre.

## P5.9 — Documentos de release e guard de segredos

Os documentos dizem que "todos os testes automáticos locais passam, falta a validação em staging" (`PUBLISH_READY.md:3-4`, última verificação a 08/set), com quatro jobs do CI vermelhos em `main` e com seis migrações posteriores a essa data. O ledger marca como `FIXED + PASS` itens que não passam: P4.3 (i18n sync), P4.6 (documentos contraditórios) e P2.9 (inquéritos, ver P2.14). `RELEASE_AUDIT.md:5,116` e `REGRESSION_CHECKLIST.md:148` continuam a dizer GO sem aviso de que estão ultrapassados.
- `PUBLISH_READY.md:3-4`: data real da última verificação, o que ela não cobre, e o veredicto NO-GO com os jobs vermelhos. Na tabela "O que falta para dar GO" (`:33-36`), acrescente "CI verde em `main`" e "verificação das entregas de 14/set (nome da startup no registo, pesquisa em Atribuir Workspace, ausências, inquéritos públicos)". Em `:50-51`, o GO passa a exigir todos os jobs verdes no SHA a publicar.
- `docs/rc5/evidence-ledger.md`: P4.3, P4.6 e P2.9 passam a `FAILING REPRO` com o motivo; a linha `:304` (tabelas "sem migração") é corrigida como na P5.3.
- Topo de `RELEASE_AUDIT.md` e `REGRESSION_CHECKLIST.md`: "SUPERSEDED — documento histórico. O estado em vigor está em `PUBLISH_READY.md`."
- `docs/rc5/manual-test-runsheet.md:23` (passo 10): o interruptor de notificações a founders só bloqueia avisos in-app. Ou muda o texto para "Founders deixam de ver avisos in-app; os emails automáticos não são afetados", ou faz os envios de email consultarem `founder_notifications_blocked` (`run-checkin-reminders:198`, `send-milestone-reminders:94`, `send-survey-invites:281`, `send-template-notification`). Diga-me qual prefere.
- `docs/rc5/dead-edge-functions.md:9-11`: 8 das 12 funções têm `verify_jwt = true` (explícito ou por omissão); só `bulk-create-workspaces`, `graph-config-status`, `run-workflow-rules` e `validate-booking-slot` têm `false`.
- `ci.yml:169-178` (guard de `.env`): linhas com `export ` ou espaço inicial escapam ao `grep -oE '^[A-Z0-9_]+'`. Substitua a extração por:
```bash
KEYS=$(grep -oE '^[[:space:]]*(export[[:space:]]+)?[A-Za-z0-9_.-]+[[:space:]]*[=:]' .env \
  | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//; s/[[:space:]]*[=:]$//' || true)
BAD=$(printf '%s\n' "$KEYS" | grep -vE '^(VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL)?$' || true)
```

## P5.10 — Regras de trabalho para as próximas rondas

Estas regras resumem as causas dos defeitos desta ronda. Acrescente-as ao `README.md` na secção de contribuição:
1. Cada migração nova com `CREATE FUNCTION … SECURITY DEFINER` termina com `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon, authenticated;` e só depois os `GRANT` pretendidos. `REVOKE FROM PUBLIC` sozinho não chega no Supabase.
2. Nenhum `update`/`delete`/`insert` do cliente sem `.select('id')` e verificação de linhas afetadas quando o resultado importa ao utilizador. Um toast de sucesso só depois dessa verificação.
3. Nada de `try/catch` à volta de chamadas supabase-js, `invokeWithAuth` ou Resend: leia o `{ error }`.
4. Nenhum `as any`/`as never` em payloads de `insert`/`update`. Doze dos defeitos desta ronda eram colunas inexistentes que o `tsc` teria apanhado.
5. Botões visíveis só para quem a RLS deixa escrever. O `isStaff` do cliente inclui o backoffice; o `is_staff()` da base não. Use `can_access_backoffice()` na base e `isBackoffice` no cliente quando o dono do fluxo for o backoffice.
6. Chaves i18n novas com PT e EN escritos à mão no mesmo commit.
7. pgTAP antes do SQL, a correr no harness com os default privileges emulados (P1.11).

---

**Fim da Parte 5.** Corra o harness, o `rc5:verify` e o CI completo, e diga-me que jobs ficaram vermelhos (com o log) antes de publicar.
