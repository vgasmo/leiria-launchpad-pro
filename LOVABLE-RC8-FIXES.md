# PROMPT PARA O LOVABLE — Correções RC8 (auditoria do export de 2026-09-07 09:06, md5 bb74e90f…)

Contexto para ti (Lovable): este é o prompt de fecho. A ronda anterior (RC7) tinha 38 itens; **14 foram aplicados, 24 não** (lista completa no fim, em "Verificação do RC7"). Os que faltam incluem os dois P0 de segurança. Além disso, o `main` do GitHub tem 6 dos 11 gates de CI vermelhos em todas as corridas desde 2 de setembro, e o harness local (`scripts/rc5/local-pg-harness.sh`) foi executado por nós sobre este export: replay das 467 migrações limpo (as 3 falhas são artefactos conhecidos do harness) e 13 suites pgTAP verdes (168 asserções). Ou seja: o que rebenta é em runtime, não no replay — exatamente a classe que só um pgTAP por RPC apanha.

Tudo o que se segue foi **verificado no export atual** (ficheiro:linha) e, sempre que era SQL, **provado numa base replayada** (a mensagem de erro real está citada). Aplica por ordem P0 → P4. Se algum item não bater com o código que tens, **para e diz-me** — não improvises.

## Regras desta ronda

1. **Não alteres nada fora do que está listado.** Sem refactors, sem melhorias não pedidas.
2. **Cada correção SQL vai numa migração nova.** Nunca edites migrações já aplicadas (incluindo `20260903135424`).
3. **Antes de escrever SQL, confirma as colunas em `src/integrations/supabase/types.ts`.** Cinco itens desta lista são colunas que não existem.
4. **`supabase-js` e o SDK do Resend devolvem `{ data, error }` sem lançar.** `try/catch` à volta é código morto.
5. **Uma função ausente de `supabase/config.toml` tem `verify_jwt = true`** e leva 401 no gateway se for chamada só com `x-cron-token`/`x-cron-secret`.
6. **Para cada RPC nova ou alterada, escreve o pgTAP antes da migração** (`supabase/tests/<rpc>.test.sql`) e corre `bash scripts/rc5/local-pg-harness.sh`. Esta é a regra que faltou no RC7: o replay passa e o runtime rebenta.
7. No fim: `bun run rc5:verify`, faz `node scripts/i18n-sync.cjs` e diz-me **o que não aplicaste e porquê**.

---

# P0 — Segurança e integridade (bloqueadores)

## P0.1 — `serialize_program_tree` continua executável por utilizadores anónimos (repetido do RC7)

`supabase/migrations/20260727120954_*.sql:25` cria a função `SECURITY DEFINER` e nenhuma migração posterior faz `REVOKE`. **Provado na base replayada:** `has_function_privilege('anon', 'public.serialize_program_tree(uuid)', 'EXECUTE') = true`, enquanto `publish_program_atomic` (que tem REVOKE em `:73-74`) dá `false`. Qualquer pessoa com a chave anónima e um `program_id` descarrega a árvore curricular inteira via `/rest/v1/rpc/serialize_program_tree`.

```sql
-- migração nova
REVOKE ALL ON FUNCTION public.serialize_program_tree(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serialize_program_tree(uuid) TO service_role;
-- publish_program_atomic continua a funcionar: é SECURITY DEFINER e corre como owner.
```
pgTAP: em `supabase/tests/program_publish_atomic.test.sql` acrescenta `SELECT function_privs_are('public','serialize_program_tree',ARRAY['uuid'],'anon',ARRAY[]::text[], 'anon cannot execute serialize_program_tree');`.

## P0.2 — Qualquer founder pode corromper marcos de outros workspaces (repetido do RC7; só a parte MCP foi feita)

A verificação no MCP (`src/lib/mcp/tools/create-action-item.ts:25-32`) está aplicada — obrigado. Mas o buraco é na base de dados e continua aberto para a UI e a API REST. **Provado na base replayada:** em `action_items` só existe `action_items_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE`, e `milestones` só tem a PK. A policy de INSERT valida apenas `can_write_workspace(workspace_id)`; o trigger `update_milestone_status_from_actions` (`20260101134947`, SECURITY DEFINER) conta todas as ações do marco e faz `UPDATE milestones` no workspace da vítima.

```sql
-- migração nova
-- 0) higiene: linhas já incoerentes fariam o ALTER falhar. Ver antes:
--    SELECT ai.id FROM public.action_items ai JOIN public.milestones m ON m.id = ai.milestone_id
--     WHERE ai.workspace_id <> m.workspace_id;
--    (a RPC staff_diagnose_program_mismatches já as lista como 'action_workspace_mismatch'). Corrige-as (ou anula milestone_id) antes de aplicar.

-- 1) chave candidata composta
ALTER TABLE public.milestones
  ADD CONSTRAINT milestones_id_workspace_uk UNIQUE (id, workspace_id);

-- 2) a ação só pode apontar a um marco do MESMO workspace (milestone_id continua nullable)
ALTER TABLE public.action_items DROP CONSTRAINT IF EXISTS action_items_milestone_id_fkey;
ALTER TABLE public.action_items
  ADD CONSTRAINT action_items_milestone_ws_fkey
  FOREIGN KEY (milestone_id, workspace_id)
  REFERENCES public.milestones (id, workspace_id) ON DELETE CASCADE;
```
pgTAP novo `supabase/tests/action_items_milestone_scope.test.sql`: inserir ação com `milestone_id` de outro workspace → `throws_ok(..., '23503')`.

## P0.3-bis — A correção do `AuthContext` ficou a meio: o `authError` não é lido por ninguém

O RC7 pedia para não degradar para "sem papéis" numa falha momentânea. O `AuthContext` passou a detetar o erro e a tentar 3× (`src/contexts/AuthContext.tsx:63-90`), mas depois faz `setAuthError(true); return;` e o `finally` (`:150-153`) põe `isAuthReady = true` na mesma. `grep -rn "authError\|retryUserData" src` fora do contexto devolve **zero** ocorrências: o `ProtectedRoute` (`src/App.tsx:74-81`) não lê `authError`. Resultado idêntico ao bug original: staff vai parar a `/my-workspaces` sem menus, founder perde o gate — sem mensagem, sem botão.

**Fix (TSX) em `src/App.tsx`, dentro de `ProtectedRoute`, logo depois do `if (!user)`:**
```tsx
const { user, isLoading, isAuthReady, isAdmin, isStaff, isAccountPending, isAccountSuspended, authError, retryUserData, signOut } = useAuth();
...
if (authError) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-lg font-semibold">{t('auth.loadError.title', 'Não foi possível carregar o seu perfil e permissões.')}</p>
      <p className="text-sm text-muted-foreground">{t('auth.loadError.hint', 'Verifique a ligação e tente novamente.')}</p>
      <Button onClick={() => void retryUserData()}>{t('common.retry', 'Tentar novamente')}</Button>
      <Button variant="ghost" onClick={() => void signOut()}>{t('auth.signOut', 'Terminar sessão')}</Button>
    </div>
  );
}
```
E em `src/contexts/AuthContext.tsx`:
- `retryUserData` (`:121-126`): `setIsAuthReady(false)` antes do `fetchUserData` e `setIsAuthReady(true)` no fim — senão, durante o retry, um admin em `/admin` é redirecionado com `roles=[]`.
- No refetch em `focus` (`:220-238`): só marcar `authError` quando `roles.length === 0 && !profile` (primeira carga). Um refetch falhado com permissões já carregadas não deve tapar o ecrã.
- Em `fetchUserData`, antes de cada `setProfile/setRoles`: `if (userIdRef.current !== userId) return;` (fetch de X a terminar depois de logout/troca para Y).
- Acrescenta `authError: false, retryUserData: async () => {}` ao mock `src/test/mocks/auth.tsx`.

## P0.4 — Voltar a entrar com o mesmo utilizador depois de a sessão expirar deixa a app num spinner infinito

`src/contexts/AuthContext.tsx`: `initialUserId` (`:157`) é preenchido em `INITIAL_SESSION` (`:175-178`) e **nunca limpo** em `SIGNED_OUT` (`:167-171`). `signIn` (`:240-245`) faz `setIsAuthReady(false)` e só o repõe se o login **falhar**. Quando o `SIGNED_IN` chega com `user.id === initialUserId` (`:182-184`) há um `return` antecipado → `isAuthReady` fica `false` para sempre; `Login.tsx:63-76` navega para `/my-workspaces` (só verifica `user && !isLoading`) e `ProtectedRoute:79` mostra `LoadingScreen` indefinidamente. Dispara sempre que o supabase-js emite `SIGNED_OUT` sem reload (refresh token expirado após inatividade, logout noutro separador) e o utilizador volta a entrar — provavelmente parte das queixas "a app fica presa".

```tsx
// :167 — dentro de if (event === 'SIGNED_OUT')
initialUserId = null;
// :182 — só ignorar o SIGNED_IN duplicado se AINDA temos os dados desse utilizador
if (newSession.user.id === initialUserId && event === 'SIGNED_IN' && userIdRef.current === newSession.user.id && roles.length > 0) {
  setIsAuthReady(true);
  return;
}
```

## P0.5 — Founder sem correspondência automática fica preso em "A verificar a sua startup…"

`src/pages/ClaimStartup.tsx:82-107` trata `auto_claimed`, `already_claimed` e `pending`. O RPC `claim_startup` (última definição `supabase/migrations/20260710230740_*.sql:41,53,81,110,125`) devolve `already_member`, `pending_review` e `auto_claimed` — **`already_claimed` e `pending` não existem**. No caminho normal de um founder sem email correspondente (`pending_review`, o pedido fica criado em `startup_claim_requests`) nenhum ramo corre: `pageState` fica `'verifying'` e `getDisplayState()` (`:35`) devolve-o para sempre. Só um reload mostra "Pedido em análise"; alguns founders submetem outra vez.

```tsx
} else if (result.status === 'already_claimed' || result.status === 'already_member') {
  setPageState('already_claimed');
  queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
  queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  setTimeout(() => navigate('/my-workspaces', { replace: true }), 1500);
} else if (result.status === 'pending' || result.status === 'pending_review') {
  setPageState('pending_review');
  queryClient.invalidateQueries({ queryKey: ['founder-onboarding-state'] });
} else {
  logger.error('claim_unknown_status', { status: result.status });
  setPageState('error');
}
```
No ramo `auto_claimed` acrescenta também `queryClient.invalidateQueries({ queryKey: ['workspaces'] })` (`MyWorkspaces.tsx` lê `['workspaces', …]` e pode ter sido carregada vazia há < 30 s).

E o caso de erro do estado de onboarding: `src/hooks/useFounderOnboardingState.ts:148-151` devolve `status: 'error'`, mas `src/App.tsx:113-118` não o exclui → um founder com workspace ativo, numa falha de rede, é atirado para `/claim-startup` e vê "Verificar agora". Acrescenta `founderState.status !== 'error' &&` à condição em `App.tsx:113`, e em `ClaimStartup.tsx:39` `if (founderState.status === 'error') return 'error' as const;` (o ecrã `error` com retry já existe).

---

# P1 — Operação parada ou silenciosa

## P1.1 — O watchdog só olha 48 h: jobs semanais e mensal geram `cron_stale` falsos a toda a hora (repetido do RC7)

`supabase/migrations/20260721072306_*.sql:65` limita `cron_job_runs` a `now() - interval '48 hours'` e `:70-71` alerta quando `last_ok IS NULL`. **Provado na base replayada:** expectation de 604 800 s com um run OK há 3 dias → `check_automation_health()` insere `cron_stale` com `never_run = true`. Afeta `run-checkin-reminders`, `send-email-digest`, `send-weekly-health-digest` (semanais) e `open-monthly-founder-pulse` (mensal): centenas de alertas falsos por semana, com `dedupe_key` por hora. O painel de saúde deixa de ter valor.

```sql
-- migração nova: substituir só o LATERAL (o resto do corpo de check_automation_health fica igual)
    LEFT JOIN LATERAL (
      SELECT MAX(started_at) FILTER (WHERE status='ok') AS last_ok,
             MAX(started_at) FILTER (WHERE status='failed') AS last_failed,
             COUNT(*) FILTER (WHERE status='failed' AND started_at > now()-interval '24 hours') AS failures_24h
      FROM public.cron_job_runs
      WHERE job_name = e.job_name
        AND started_at > now() - GREATEST(interval '48 hours',
              make_interval(secs => 2 * e.expected_cadence_seconds + e.grace_seconds))
    ) r ON TRUE
```
Aplica a mesma janela à view `automation_health_summary` (`20260721072306:139`, hoje 7 dias — o job mensal aparece `NEVER_RUN`). Depois limpa: `DELETE FROM system_alerts WHERE kind='cron_stale' AND payload->>'job' IN ('run-checkin-reminders','send-email-digest','send-weekly-health-digest','open-monthly-founder-pulse');`.

## P1.2 — Todas as corridas agendadas ficam registadas como `manual` (repetido do RC7)

`supabase/functions/_shared/cronRun.ts:128` decide `triggered_by` por `x-cron-secret`, mas `cron_invoke_edge` só envia `x-cron-token` (`20260811141628:91-99`). 16 dos 17 alvos usam `withCronRunLogging`.
```ts
const triggeredBy: 'cron' | 'manual' =
  (req.headers.get('x-cron-token') || req.headers.get('x-cron-secret')) ? 'cron' : 'manual';
```
E `supabase/functions/sweep-session-transcripts/index.ts:24` está embrulhado em `withCronRunLogging` **e** chama o seu próprio `logRun` (`:39-53`) → duas linhas em `cron_job_runs` por corrida, `failures_24h` a dobrar (o `cron_failed` dispara com 2 falhas reais em vez de 3). Remove o wrapper e mantém o `logRun` local.

## P1.3 — Chamadas função→função com a chave service_role não passam nos guards; o push Slack está morto

`_shared/security.ts:220-252` (`requireCronOrStaff`; igual em `requireCronSecret` `:162-187` e `requireCronOrGovernance` `:278-310`): depois do `x-cron-token` e do `x-cron-secret`, o fallback é `auth.getUser(token)` sobre o `Authorization`. O JWT `service_role` não tem `sub` e o GoTrue rejeita-o — o próprio código o sabe (`docusign-send-envelope/index.ts:80-83`). Consequência confirmada: `send-notification-email/index.ts:225-245` chama `supabase.functions.invoke('send-slack-notification', …)` com o cliente service_role e **sem** `x-cron-secret`; `send-slack-notification/index.ts:31` exige `requireCronOrStaff` → **401 sempre**; o `invoke` não lança e o resultado não é lido → todos os pushes Slack de notificações estão mortos e silenciosos. As restantes cadeias internas (`run-intake-reminders` → `send-intake-email`, `sweep-session-transcripts` → `import-teams-transcript` → `generate-session-artifacts`, `recompute-health-scores`/`check-missed-milestones` → `teams-notify`/`send-health-alert-email`, webhooks DocuSign/PandaDoc → `send-notification-email`) só funcionam se `CRON_SECRET` estiver definido no runtime das edge functions — **confirma no dashboard que está** (a migração `20260811141628` diz que o token "dispensa o segredo partilhado", o que não é verdade para estas chamadas).

**Fix (`_shared/security.ts`)** — aceitar explicitamente a chave service_role como chamada interna, nos três `require*`, logo após `verifyCronToken`:
```ts
/** Internal edge→edge call authenticated with the service-role key (no `sub`, so getUser() rejects it). */
export function isServiceRoleBearer(req: Request): boolean {
  const auth = req.headers.get('Authorization') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return auth.startsWith('Bearer ') && key.length > 0 && timingSafeEqual(auth.slice(7), key);
}
// em requireCronSecret / requireCronOrStaff / requireCronOrGovernance:
if (await verifyCronToken(req)) return { valid: true };
if (isServiceRoleBearer(req)) return { valid: true };
```
Replica nos guards locais de `teams-notify`, `import-teams-transcript` e `generate-session-artifacts` (procura `getUser(` nesses ficheiros). Em `run-intake-reminders/index.ts:42-47` acrescenta `'Authorization': \`Bearer ${serviceKey}\``. Em `pushSlack` lê o `{ error }` do `invoke` e regista-o.

## P1.4 — Alertas do reconciler (repetido do RC7, metade feita)

- `supabase/functions/reconciler-run/index.ts:181-185` continua a inserir em `system_alerts` **sem `dedupe_key`** (NOT NULL desde 11/ago → 23502) e sem ler o resultado. Trocar por:
```ts
const { error: alertErr } = await sbSvc.from('system_alerts').upsert({
  kind: 'reconciler_partial_failure', severity: 'high',
  dedupe_key: `reconciler_partial:${body.batch_id}`,
  payload: { batch_id: body.batch_id, committed, errored, skipped },
}, { onConflict: 'dedupe_key', ignoreDuplicates: true });
if (alertErr) console.error('system_alerts upsert failed', alertErr.message);
```
- `reconciler_commit_row` (`20260902141353:224-230`): o `dedupe_key` foi acrescentado, mas o `INSERT` é seguido de `RAISE EXCEPTION` na mesma transação → é revertido; o alerta **nunca persiste**. Remove o INSERT da função e, em `reconciler-run`, quando `rpcErr.message` começar por `invariant_failed_`, faz o upsert em `system_alerts` com `dedupe_key: \`reconciler_invariant_failed:${r.id}\``.
- `public-book-first-contact/index.ts:371` e `public-get-availability/index.ts:441`: `.insert` com `dedupe_key` estável → 23505 na segunda ocorrência. Trocar por `.upsert(..., { onConflict: 'dedupe_key', ignoreDuplicates: true })`.

## P1.5 — A retenção RGPD do Founder Pulse nunca corre (repetido do RC7)

**Provado na base replayada:** `SELECT public.anonymize_stale_founder_pulse_responses()` → `ERROR: column "metadata" does not exist` (`20260727120545:100-101`; `free_text` também não existe e `respondent_id` é NOT NULL).
```sql
ALTER TABLE public.founder_pulse_responses
  ALTER COLUMN respondent_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.anonymize_stale_founder_pulse_responses()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_affected integer := 0;
BEGIN
  UPDATE public.founder_pulse_responses
     SET respondent_id = NULL, blockers = NULL, wins = NULL, ask = NULL,
         metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('anonymized_at', now())
   WHERE submitted_at < now() - interval '18 months' AND respondent_id IS NOT NULL;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END; $$;
```
A policy "Founders manage own response" (`20260721125837:62-66`, `respondent_id = auth.uid()`) tolera NULL (linhas anonimizadas ficam invisíveis ao founder — correto). pgTAP novo: inserir resposta com `submitted_at` há 19 meses → chamar → `respondent_id IS NULL`.

## P1.6 — O fecho de lotes de importação CRM rebenta (repetido do RC7)

**Provado na base replayada (com JWT de admin):** `SELECT public.finalize_crm_import_batch(uuid)` → `ERROR: column "status" does not exist` (`20260727120916:70`; `crm_lead_import_rows` tem `valid`/`error`; `crm_lead_import_batches` não tem `updated_at`, `:76`).
```sql
ALTER TABLE public.crm_lead_import_batches
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.finalize_crm_import_batch(p_batch_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pending int; v_failed int; v_new_state text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'backoffice')) THEN
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
```
pgTAP novo com um lote de 2 linhas (1 válida commitada, 1 inválida) → `partial_needs_review`.

## P1.7 — A deduplicação de reservas públicas é apagada pelo próprio fluxo (repetido do RC7)

O caminho `idempotent_reuse` passou a ler `metadata_json` (`public-book-first-contact/index.ts:456-461`), mas as duas escritas continuam a **substituir** a coluna: `:533` (`metadata_json: { ...bookingMetadata, calendar_event_id, teams_url, calendar_status: 'ok' }`) e `:549` (ramo de erro). `bookingMetadata` (`:398-422`) não contém `link_id`, `submitter_email_normalized` nem `booking_slot_utc`, que a RPC injeta e que o índice `uniq_funnel_items_link_email_slot_utc` (provado vivo na base replayada) exige no predicado. Resubmissões criam leads duplicados e um segundo convite.
```ts
// uma vez, antes dos dois updates:
const { data: cur } = await supabase.from('funnel_items').select('metadata_json').eq('id', funnelItemId).maybeSingle();
const baseMeta = { ...((cur?.metadata_json as Record<string, unknown>) ?? {}), ...bookingMetadata };
// :533
metadata_json: { ...baseMeta, calendar_event_id: calendarEventId, teams_url: teamsLink, calendar_status: 'ok' },
// :549
metadata_json: { ...baseMeta, calendar_status: 'failed', calendar_error: calendarError },
```

## P1.8 — O kill-switch de notificações a founders (novo, 04/set) parte os escritores encadeados quando for ligado

`20260904101216_*.sql:30-31` devolve `NULL` num trigger `BEFORE INSERT` → a linha é descartada em silêncio. **Provado na base replayada:** com `notifications.founders_disabled = true`, `INSERT … RETURNING id` para um founder devolve 0 linhas. Consequências: `enqueue_pulse_notifications` (`20260727120545:60-70`) fica com `v_notification_id = NULL` e cria `notification_attempts` órfãos em `queued` (e conta-os como enviados); `useCreateNotification` (`src/hooks/useNotifications.ts:219-225`, `.insert().select().single()`) recebe PGRST116. Hoje o seed está a `false`, mas é um interruptor que um admin pode ligar.
```sql
-- migração nova: em enqueue_pulse_notifications, no FOR:
      AND NOT public.founder_notifications_blocked(wu.user_id)
-- e depois do RETURNING id INTO v_notification_id:
    IF v_notification_id IS NULL THEN CONTINUE; END IF;
-- e fecha o oráculo (a função é SECURITY DEFINER e ficou executável por anon):
REVOKE ALL ON FUNCTION public.founder_notifications_blocked(uuid) FROM PUBLIC, anon;
```
Em `useNotifications.ts:223` troca `.single()` por `.maybeSingle()` e trata `data == null` como "suprimida".

---

# P2 — Funcionalidades mortas ou enganosas (todas repetidas do RC7, salvo indicação)

## P2.1 — Credenciais de assinatura aparecem vazias e o toggle apaga-as

`src/components/admin/SignatureProvidersCard.tsx:98` `const json = settings?.settings_json || {}` → `{}` é truthy, o efeito (`:102-108`) corre no primeiro render em loading, hidrata campos vazios e marca `initialized`; quando a query resolve, já não volta a correr (o `if (isLoading) return <Skeleton/>` está em `:110`, depois do efeito). O toggle (`:138`, `:244`) envia `settings_json: json` → desligar com `settings` ainda nulo **apaga** a configuração guardada. Mesmo padrão no bloco PandaDoc (`:200-210`).
**Fix:** `if (!settings || initialized) return;` no efeito (ambos os blocos); no toggle enviar apenas `{ integration_type, is_enabled }`, nunca `settings_json`.

## P2.2 — Terminar contrato deixa a sala ocupada, a lead como cliente, e o link do founder dá 404

`src/hooks/backoffice/useTerminateContract.ts:170-175` e `:209-214` invalidam `contracts`, `workspaces`, `room-allocations`, `contract-lifecycle-events`, `lifecycle-events-contracts`, `staff-tasks`. Faltam as keys que os ecrãs de backoffice leem (o conjunto certo está em `src/hooks/useBackoffice.ts:757-759`): `['rooms-with-allocations']`, `['building-occupancy']`, `['backoffice-unified']`, `['contract-intakes']`, `['funnel-items']`, `['crm-pipeline']`, `['crm-inbox']`, `['backoffice-billing-snapshot']`. (`['room-allocations']` **não** faz prefix-match com `['rooms-with-allocations']`.) No bulk (`:196-215`) `failed` é contado mas o toast só diz os sucessos: acrescenta `if (failed > 0) notify.error(t('contracts.bulk.terminatePartial', { count: failed, defaultValue: '{{count}} contratos não foram terminados' }))`. E `p_founder_link: '/workspace'` (`:151`, e `RenewContractDialog.tsx:109`) é uma rota inexistente → `` `/workspace/${contract.workspace_id}` ``.

## P2.3 — Aplicar um playbook não mostra nada

`src/components/ai/CopilotPlaybookActions.tsx:73-95` cria marco e ações e navega **sem invalidar**. Replica `usePlaybooks.ts:300-304` (`workspace-playbook-instances`, `workspace-milestones`, `workspace-actions`, `['milestones', workspaceId]`, `['action-items', workspaceId]`). E `:98-100`: o `setTimeout(…, 0)` depois de `await loadWorkspaces()` lê `workspaces` do render anterior (`null`) — faz `loadWorkspaces()` devolver a lista e decide sobre o valor devolvido.

## P2.4 — Invalidações realtime que não apontam a lado nenhum

`src/hooks/useRealtimeWorkspaces.ts:56` `['workspace-stage-timeline']` → a real é `['stage-history']` (`useProgressHistory.ts`); `:68` `['health-score']` → `['workspace-health']` (`useHealthScore.ts`); `:87` `['kpis']` → `['kpi-values']` e `['workspace-kpi-definitions']` (`useKpis.ts`). Confirmado: as três keys inválidas não têm nenhum `useQuery`.

## P2.5 — Erros engolidos com toast de sucesso

- `src/hooks/useAdminData.ts:223` — `await supabase.from('profiles').update({ account_status: 'approved' })…` sem `{ error }`.
- `src/components/admin/AdminBackoffice.tsx:253-254` (e `:267-268`) — o `delete` e o `insert` em `workspace_users` não são verificados: se o insert falhar, o workspace fica **sem** consultor e a UI diz "atribuído".
- `src/hooks/useContractIntakes.ts:184-186` — `update({ stage: 'intake_requested' })` sem verificação.
- `src/components/backoffice/BillingSnapshotCard.tsx:31-46` — `Promise.all` + `?? 0` mostra **MRR = 0 €** como valor real quando a query falha. Usar `Promise.allSettled` e um estado "dados indisponíveis".
- `src/components/staff/CockpitQuickActions.tsx:85-100` e `:119-134` (novo) — "Agendar sessão rápida" insere direto em `sessions` sem `outlook_sync_status: 'pending'`, sem `syncOutlookCalendar`, sem notificar o founder, e só invalida `workspaces`/`work-queue`/`upcoming-sessions` — a sessão não aparece no separador Sessões (`['sessions', wsId]`, `['calendar-sessions', wsId]`, `['workspace-sessions', wsId]`). Reutiliza `useCreateSession` (aceita `workspaceId`) ou, no mínimo, invalida essas keys e marca `outlook_sync_status`.

## P2.6 — Agenda em branco em erro e duplo clique cria duas sessões

`src/components/workspace/sessions/SessionsTab.tsx:63` só destrutura `{ data, isLoading }`; `:137` `filteredSessions?.length === 0` é falso com `undefined` → um erro RLS/rede mostra "sem sessões". Destruturar `isError` e mostrar estado de erro.
`CreateSessionDialog.tsx:283-351`: `findSchedulingConflict` (assíncrono, `:343`) corre com o botão ativo; `setIsSending(true)` só em `:351`. Move `if (isSending) return; setIsSending(true);` para a primeira instrução do `handleSubmit` e liberta no `finally`.

## P2.7 — Deep-links de admin inválidos

Tabs válidos em `src/pages/Admin.tsx`: `analytics announcements approvals backoffice compliance data-quality enrollment health kpis mentors programs-setup support-materials surveys system-health template-requests templates users`. Corrigir: `EnrollmentControlCenter.tsx:172` `?tab=workspaces` → `enrollment`; `useEcosystemInsights.ts:92` `?tab=quality` → `data-quality`; `useTemplateRequests.ts:98` e `src/pages/BulkContractImport.tsx:392` `?tab=programs` → `programs-setup`; `StaffCockpit.tsx:440` `?tab=startups` → `enrollment`.

## P2.8 — `generate-contract-pdf` não exige membro ativo

`supabase/functions/generate-contract-pdf/index.ts:624-628` verifica `workspace_users` sem `.eq('active', true)` → founder removido continua a descarregar o PDF (mensalidade, NIF, morada). Acrescenta `.eq('active', true)`.

## P2.9 — Inquéritos (novo, 03/set): separador visível a quem não pode escrever, e lançamento fora do RPC

- `src/pages/Admin.tsx:53-63` — `ADMIN_ONLY_TABS` não inclui `'surveys'`, mas **todas** as escritas em `survey_definitions`/`survey_campaigns`/`survey_instances`/`survey_writebacks` são `is_admin()` (provado em `pg_policies` na base replayada) e o SELECT de campanhas/templates é `is_staff()`. Consultor: vê o separador, cada "Criar/Lançar/Fechar" falha com 42501. Backoffice: separador vazio. Acrescenta `'surveys'` a `ADMIN_ONLY_TABS` (ou, se consultores devem gerir campanhas, policies `is_staff()` para INSERT/UPDATE em `survey_campaigns` e `survey_instances`).
- `src/hooks/useSurveys.ts:296-372` — lança a campanha com `insert` em lote em `survey_instances` + `update status='active'`, ignorando o RPC `launch_survey_campaign` (existe em `types.ts:12606`; nunca é chamado em `src`). Sem o RPC: sem `questions_snapshot`/`launched_at` (editar o template altera o inquérito em curso), sem `ON CONFLICT` (relançar rebenta com 23505 e deixa a campanha em `draft` com instâncias parciais). Trocar por `supabase.rpc('launch_survey_campaign', { p_campaign_id })` e verificar `error`.

## P2.10 — Overload antiga de `list_ecosystem_items_v2` ficou viva

`20260902135738` acrescentou 3 parâmetros por `CREATE OR REPLACE` sem `DROP` da assinatura de 13 argumentos (`20260716170557:4`). **Provado na base replayada:** existem duas funções (13 e 16 args). O frontend envia sempre as 16 chaves; qualquer chamador que envie só as 13 (scripts, pgTAP, MCP futuro) recebe `PGRST203`.
```sql
DROP FUNCTION IF EXISTS public.list_ecosystem_items_v2(uuid, text, text, uuid, boolean, text, timestamptz, uuid, integer, uuid, uuid, text, text);
```
Já agora, em `ws_active_contract` (`:11`) `'signed'` e `'pending_start'` não existem em `startup_contracts.status` (CHECK vivo: draft, pending_signature, active, suspended, terminated, expired; `'signed'` é de `contract_intakes`). Deixa só `('active','pending_signature')`.

## P2.11 — Publicar programa: parte do RC7 feita, parte não

`publish_program_atomic` (`20260902141353:84-114`) passou a desativar todos os irmãos — bom. Faltam: (a) a policy de SELECT em `programs` continua `is_active = true OR is_admin()` / `is_staff() OR has_program_access(id)` → founders e consultores mantêm acesso; **backoffice** perde o `program_name` dos programas desativados (a lista do ecossistema mostra NULL); (b) o guard "programa anterior ainda tem workspaces ativos". Nota: nenhum chamador em `src` usa este RPC hoje (a UI publica via `publish_program_setup`) — é latente. Se quiseres fechar:
```sql
DROP POLICY IF EXISTS "Authenticated users can view active programs" ON public.programs;
CREATE POLICY "Authenticated users can view programs" ON public.programs FOR SELECT TO authenticated
  USING (is_active OR public.is_staff() OR public.is_backoffice() OR public.has_program_access(id));
```

## P2.12 — MCP: sem rate-limit; decisão pendente sobre `contact_email`

`src/lib/mcp/tools/*.ts` — `ToolError` e `search`-antes-do-`limit` estão feitos (obrigado). Continua sem rate-limit (o padrão `check_ai_rate_limit` existe em `20260102183804:91` e é usado por 3 funções de IA) e `list_crm_leads` entrega `contact_email` a um cliente LLM externo. Acrescenta `check_ai_rate_limit` por utilizador nas 6 ferramentas; a decisão sobre `contact_email` é do produto — até lá, remove a coluna do `select` de `list-crm-leads.ts:24`.

## P2.13 — O pedido de revisão de stage gate do founder nunca chega à fila de trabalho do staff (novo)

`src/components/workspace/GovernanceTab.tsx:250` mostra "Pedir revisão" só a founders (`canWrite && isFounder && !isStaff`). `src/hooks/useGovernance.ts:150-160` cria a `stage_gate_reviews` (com `if (error) throw`) e depois faz `await supabase.from('staff_work_queue_items').insert({ type: 'stage_gate_review', … })` **sem ler o `{ error }`**. A única policy de escrita em `staff_work_queue_items` é `is_admin() OR consultor` — **provado na base replayada:** um founder a inserir recebe `new row violates row-level security policy`. O founder vê "pedido enviado"; a review existe na tabela, mas o item da fila (o sítio onde o staff trabalha) nunca é criado.
**Fix (SQL, migração nova):** criar o item do lado do servidor, onde a review é criada — trigger `AFTER INSERT ON stage_gate_reviews` `SECURITY DEFINER` que insere o `staff_work_queue_items` (`type='stage_gate_review'`, `status='open'`, `priority='high'`, `due_at=now()+7d`, `evidence_json={review_id}`), e remover o insert do cliente (`useGovernance.ts:150-160`). pgTAP: founder cria review → 1 item na fila.

---

# P3 — i18n (texto partido visível)

1. Placeholders literais (a chave existe em `pt.json`, logo o `defaultValue` é ignorado): `pt.json:2152` `bulkImport.commitSuccess` usa `{{committed}}`/`{{failed}}` mas `src/pages/BulkContractImport.tsx:294` não passa variáveis → passa `{ committed: data?.committed ?? 0, failed: data?.failed ?? 0 }`; `pt.json:2526` `common.operationFailed` = "Falhou: {{error}}" e `src/lib/queryClient.ts:26` não passa `error` → `t('common.operationFailed', { error: error.message })`; `pt.json:10026` `workQueue.bulkPartialFailure` = "{{ok}} concluídas, {{failed}} falharam" e `WorkQueueBulkActions.tsx:78` passa só `count` → `{ ok, failed }`.
2. As famílias `inbox.tab.*`, `story.kind.*`, `privateDocs.source.*` e `founder.transitional.checklist.*` do RC7 já não são usadas ou existem (`founder.transitional.checklistTitle` está no catálogo) — verificado, nada a fazer.
3. `src/components/dashboard/FounderPulseCard.tsx` mantém 12 ternários `pt ? … : …` → `t()`.
4. **Valores em inglês dentro de `pt.json`** (o gate de paridade não apanha idioma): verificados `staff.sessionScheduledSuccessfully:8773` "Session scheduled successfully", `staff.actionItemCreated:8763` "Action item created", `crm.leadCreated:3495` "Lead created", `programs.programPublishedSuccessfully:7370`, `documents.documentDeleted:4152` "Documento deleted", `sessions.noSearchResults:8259` "No Pesquisar resultados". A lente reportou mais (`programs.draftDiscarded`, `workspace.workspaceUpdated`, `workspace.filterSaved/filterDeleted/defaultFilterUpdated`, `workspace.healthNotesSaved`, `financial.created` "Created{{ count }} actions from AI", `financial.activeVersionUpdated`, `financial.financialModelParsedSuccessfully`, `admin.supportMaterials.noMaterials`, `sessions.noWorkspaceMembersWithEmail`, `sessions.noMicrophoneFound`, `startupSettings.profileUpdated`, `intake.intakeRoutingUpdated`, `integrations.webhookUrlSaved`, `settings.tenantIdAndClientId`, `consultor.valuePropositionSaved`, `consultor.titleIsRequired`, `admin.titleIsRequired`, `createStartup.descriptionHint`, `dataImport.uploadDesc`, `workspace.noActionableInsights`, `admin.confirmRemoveMentor`). Corrige-os e acrescenta a `scripts/rc5/i18n-quality.mjs` uma heurística de inglês em `pt.json` (lista de palavras: successfully, created, updated, deleted, saved, failed, required, click, please…) para que o gate falhe.

---

# P4 — CI vermelho em `main` e processo

O `main` do GitHub falha 6 de 11 jobs em todas as corridas desde 2 de setembro (última: `d652a54`, 07/set 08:57). Reproduzimos 3 localmente:
1. **`env-leak-guard`** — o export traz `.env` (só as 3 variáveis públicas `VITE_SUPABASE_*`). O Lovable regrava-o a cada boot, por isso o gate nunca ficará verde: muda o guard para falhar só se `.env` contiver chaves fora de `VITE_SUPABASE_PROJECT_ID|VITE_SUPABASE_PUBLISHABLE_KEY|VITE_SUPABASE_URL` (e o Vítor faz `git rm --cached .env` uma vez, conforme `RELEASE_WRAPPER_MANUAL_STEPS.md`).
2. **`migration-scan`** — `20260903135424` insere UUIDs fixos (`ba5e1100-…`) em `survey_definitions`/`survey_campaigns`. A vossa política (`scripts/ci/migration-scan-allowlist.txt`, "baseline-frozen") proíbe novas entradas, e a migração já está aplicada (não editável). Única saída coerente: entrada no allowlist com comentário "template seed, não são dados pessoais", e daqui em diante seeds de templates via RPC idempotente (`ensure_baseline_survey_template()`), como a `docs/rc5/migration-policy.md` manda.
3. **`i18n-sync-guard`** — `node scripts/i18n-sync.cjs` só **reordena** chaves (Added 0 / Filled 0 / Fixed 0); corre-o e commita o resultado.
4. **`deno-check-edge`, `db-tests`, `e2e`** — não reproduzíveis fora do GitHub; o replay + pgTAP locais estão verdes, portanto `db-tests` falha noutro passo (provavelmente `supabase db lint`, que apanha precisamente `free_text`/`metadata`/`status` das P1.5/P1.6). Cola-me o log de cada um destes três jobs.
5. **pgTAP em falta** (pedido no RC7, não feito): `anonymize_stale_founder_pulse_responses`, `finalize_crm_import_batch`, `serialize_program_tree` (anon não executa), `publish_program_atomic` (desativa todos os irmãos), `enqueue_pulse_notifications` (kill-switch), `action_items` (P0.2). São 13 suites hoje; devem ficar ≥ 18.
6. **Funções mortas** (sem qualquer chamador em `src`, `supabase/functions` ou migrações; superfície de ataque e manutenção): `analyze-template`, `bulk-create-workspaces`, `commit-hubspot-history-import`, `commit-hubspot-import`, `export-cohort-health-pdf`, `generate-first-contact-brief`, `generate-invoices` (desagendada em 20260715 por governança), `generate-session-suggestions`, `graph-config-status`, `run-workflow-rules`, `send-whatsapp-reminder`, `validate-booking-slot`. Remove ou documenta o motivo de cada uma.
7. **Evidence ledger**: `docs/rc5/evidence-ledger.md` termina em "Batch 5 (2026-08-06)"; nada regista a ronda RC7 nem esta. `PUBLISH_READY.md`/`PRODUCTION_READINESS.md` dizem "READY"/"Production Ready" enquanto `docs/rc5/final-release-report.md` diz NO-GO. Alinha os documentos com o ledger e regista esta ronda com `FIXED + PASS` / `NOT PROVEN`.

---

# Verificação final (responde item a item)

1. `bash scripts/rc5/local-pg-harness.sh` → replay + **≥ 18 suites** verdes; cola o resumo.
2. `bun run rc5:verify` → cada gate; depois de `node scripts/i18n-sync.cjs` commitado.
3. Na base de produção (SQL editor): `SELECT has_function_privilege('anon','public.serialize_program_tree(uuid)','EXECUTE');` → `false`; `SELECT conname FROM pg_constraint WHERE conname='action_items_milestone_ws_fkey';` → 1 linha; `SELECT count(*) FROM system_alerts WHERE kind='cron_stale' AND created_at > now()-interval '1 day';` → deve descer para ~0.
4. Testes manuais, reais: (a) founder novo sem email correspondente → `/claim-startup` mostra "Pedido em análise" sem reload; (b) deixar a sessão expirar, voltar a entrar com o mesmo utilizador → entra sem spinner; (c) desligar a rede, recarregar, religar → ecrã "Tentar novamente" e recuperação sem reload; (d) terminar um contrato → sala livre no ecrã de espaços; (e) DocuSign com credenciais guardadas → campos preenchidos; (f) enviar uma notificação de contrato → mensagem chega ao Slack.
5. Diz-me **o que não aplicaste e porquê**.

---

# Verificação do RC7 (estado encontrado neste export)

| Item RC7 | Estado | Onde |
|---|---|---|
| P0.1 REVOKE serialize_program_tree | **não** | ver P0.1 |
| P0.2 FK composta action_items→milestones | **não** (BD) / sim (MCP) | ver P0.2 |
| P0.3 AuthContext não degradar | **parcial** | ver P0.3-bis |
| P1.1 config automation-engine / check-mentor-nda-expiry | sim | config.toml:335-339 |
| P1.2 config mcp | sim | config.toml:343 |
| P1.3 dedupe_key reconciler_commit_row | sim, mas inútil (rollback) | ver P1.4 |
| P1.3 reconciler-run / public-* upsert | **não** | ver P1.4 |
| P2.1 anonymize founder pulse | **não** | ver P1.5 |
| P2.2 finalize_crm_import_batch | **não** | ver P1.6 |
| P2.3 save_financial_scenario_atomic arg order | sim | 20260902141353:32 |
| P2.4 list-crm-leads last_activity_at | sim | list-crm-leads.ts:24 |
| P3.1 merge metadata_json | **não** | ver P1.7 |
| P3.2 publish_program_atomic / policy programs | parcial | ver P2.11 |
| P3.3 SignatureProvidersCard | **não** | ver P2.1 |
| P3.4 useTerminateContract | **não** (notify_contract_event sim) | ver P2.2 |
| P3.5 CopilotPlaybookActions | **não** | ver P2.3 |
| P3.6 realtime keys | **não** | ver P2.4 |
| P3.7 erros engolidos | **não** | ver P2.5 |
| P3.8 Resend | sim (6/6) | crm-stage-transition:141, session-invite:409, workspace-invite:307, health-alert:132, weekly-digest:218, milestone-reminders:191 |
| P3.9 generate-contract-pdf active | **não** | ver P2.8 |
| P3.9 p_founder_link | **não** | ver P2.2 |
| P3.9 SessionsTab isError / CreateSessionDialog guard | **não** | ver P2.6 |
| P3.9 deep-links admin | **não** | ver P2.7 |
| P3.9 buildings policy | sim (mais lato: USING(true)) | 20260902141353:252-256 |
| P3.9 cronRun x-cron-token | **não** | ver P1.2 |
| P3.9 watchdog janela | **não** | ver P1.1 |
| P3.9 open_monthly_founder_pulse_cycles archived_at | sim | 20260902141353:129 |
| P3.9 i18n placeholders / chaves / FounderPulseCard | parcial (uploading e MomentumBadge sim; resto não) | ver P3 |
| P3.9 MCP ToolError / search-before-limit | sim | toolError.ts, list-workspaces.ts:21-32 |
| P3.9 MCP rate-limit / contact_email | **não** | ver P2.12 |
| P3.9 higiene (smart-session-scheduler, tool-results-cache) | sim | — |
| pgTAP por RPC nova | **não** (13 suites, 0 novas) | ver P4.5 |
