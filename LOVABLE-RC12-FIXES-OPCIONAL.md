<!-- Pacote opcional: defeitos LOW (robustez, texto, acessibilidade). Só depois de o essencial estar aplicado e verificado. -->

# PROMPT LOVABLE — RC12 · PARTE OPCIONAL 1 de 3 — RLS: acesso por workspace avaliado por conjunto em vez… · Higiene de integridade: updated_at parado, FKs em… · commit-crm-import: sem reclamação do job, row_ids… [LOW]

## Regras (valem para esta parte)
1. Aplique TUDO o que está nesta parte e NADA mais. Não refatore, não renomeie, não "melhore" o que não é descrito.
2. Cada secção traz o diff exato (`diff -U2`, números de linha do ficheiro ORIGINAL, que é o que você tem agora). Se um diff não aplicar porque o ficheiro já mudou, **pare nessa secção e diga qual**; não improvise outra solução.
3. "Criar `caminho`" = ficheiro novo com o conteúdo exato. "Apagar" = remover o ficheiro.
4. Migrações SQL: crie-as em `supabase/migrations/` com o nome indicado, pela ordem dos nomes. Correm numa transação (sem `CONCURRENTLY`). São idempotentes. Várias começam por um bloco `DO $guard$` que **aborta de propósito** se a função real tiver divergido da definição de partida: se isso acontecer, **pare e devolva o `md5` e o resultado de `pg_get_functiondef` dessa função**; nunca desative o guarda nem reescreva a função por conta própria.
5. Nunca edite migrações que já existem, nem `src/integrations/supabase/types.ts` (é regenerado depois de cada migração).
6. Edge functions: depois de aplicar, publique as que foram alteradas e todas as que importam um `_shared/*` alterado.
7. Texto de UI: use as chaves `t('chave', 'texto PT')` dos diffs. As chaves novas estão no anexo `LOVABLE-RC12-I18N-PATCH.json` (aplicado uma vez, na Parte 1 do pacote essencial).
8. No fim, responda com: (a) a lista de secções aplicadas, (b) o que não aplicou e porquê, (c) qualquer erro de compilação ou de migração, com o texto exato.

**Edge functions alteradas nesta parte:** accept-mentor-nda, accept-workspace-invite, commit-crm-import, commit-hubspot-import, run-intake-reminders, staff-assign-workspace-to-contract.

---

## Gatilho de notificações a founders não acompanhou o RC11 D.9 (ids: FEF-11)
**Gravidade:** LOW. **Quem é afetado:** membros de workspace sem papel global founder/team_member.
**Problema:** O RC11 D.9 (`supabase/migrations/20261022110000_rc11_part_d.sql:45-58`) só corrigiu o helper `founder_notifications_blocked`; o gatilho `block_founder_notifications` continua a olhar só para `has_role`, pelo que um membro ativo sem papel global recebe notificações in-app com `notifications.founders_disabled = true`.
**Correção:** O gatilho passa a chamar `founder_notifications_blocked(NEW.user_id)` (mesma lógica, incluindo a isenção de staff e mentores). Guarda md5.
**Criar `supabase/migrations/20261103106000_rc12_founder_notifications_trigger.sql`** (conteúdo exato):

```sql
-- RC12 (sql_sec) · FEF-11 · block_founder_notifications passa a usar o mesmo critério de founder_notifications_blocked (RC11 D.9):
-- membros ativos de um workspace (founder/team_member) sem papel global também deixam de receber notificações in-app com o
-- interruptor notifications.founders_disabled ligado. Staff e mentores continuam isentos (a isenção está no helper).
-- Parte da definição VIVA (md5 ee55a0328c8307152cee258b300cb554); aborta se tiver divergido. Idempotente.
DO $guard$
DECLARE v_md5 text;
BEGIN
  SELECT md5(pg_get_functiondef(p.oid)) INTO v_md5 FROM pg_proc p
   WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'block_founder_notifications' AND pg_get_function_identity_arguments(p.oid) = '';
  IF v_md5 NOT IN ('ee55a0328c8307152cee258b300cb554', '3d565dcd55e46fd58c1beb634bc2e7e7') THEN
    RAISE EXCEPTION 'rc12: definição de public.block_founder_notifications divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', v_md5;
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.block_founder_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.founder_notifications_blocked(NEW.user_id) THEN
    RETURN NULL; -- descartar em silêncio
  END IF;
  RETURN NEW;
END;
$function$;
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## Teste pgTAP das proteções de dados (ids: E2E-05, ED3-05, SCH-03, FEF-11, FEB-01, FES-08)
**Gravidade:** LOW. **Quem é afetado:** equipa de desenvolvimento (regressões).
**Problema:** As correções acima precisam de cobertura automática.
**Correção:** Teste novo com 18 asserções (falham sem as migrações e passam com elas) para a reutilização da startup importada, o trigger do data room, a nota rápida do mentor, o gatilho de notificações e os CHECK de URL. Corre com `supabase test db`.

---

## RLS: acesso por workspace avaliado por conjunto em vez de uma função por linha (ids: DBP-04)
**Gravidade:** LOW (desempenho/escala, sem resultado errado). **Quem é afetado:** founder, team_member, consultor, backoffice, admin e mentor_externo.
**Problema:** `has_workspace_access`, `can_write_workspace`, `is_founder` e `is_conversation_participant` são `SQL STABLE SECURITY DEFINER` (não inlináveis) e as políticas (`supabase/migrations/20261019110000_rc11_part_b.sql:92` e outras) chamam-nas uma vez por linha: ~0,15 ms/linha para staff e 0,5 a 0,7 ms/linha para founder. Em `milestones` com 5 200 linhas um founder pagava 3,3 s só no RLS (em 100 mil linhas, 14 a 44 s por listagem); o backoffice demorava segundos a ver 0 linhas.
**Correção:** Migração que (1) acrescenta helpers de conjunto equivalentes, avaliados uma vez por consulta: `has_global_workspace_access()`, `has_global_write_access()` (exige conta aprovada também a admin/consultor, como o `can_write_workspace` atual), `member_workspace_ids()`, `writer_workspace_ids()`, `founder_workspace_ids()` e `my_conversation_ids()` (com `EXECUTE` para `anon` porque há políticas `TO public`, e devolvem vazio sem sessão); (2) reescreve, nas políticas de `action_items`, `milestones`, `sessions`, `documents`, `kpi_values`, `notifications`, `messages` e `conversation_participants`, `has_workspace_access(col)` para `(has_global_workspace_access() OR col IN (SELECT member_workspace_ids()))` e equivalentes, e `auth.uid()`/`is_admin()`/`has_role(...)` para `(SELECT ...)` (InitPlan). Medido na réplica com founder e 5 200 milestones: 3 314 ms para 3,8 ms; admin/consultor/backoffice ~2 ms. Equivalência verificada com 19 personas (incl. contas `pending`/suspensas, mentor com e sem NDA, workspace bloqueado, `anon`, `service_role`) em 20 tabelas: 380 comparações de leitura e 306 tentativas de escrita, 0 divergências. A migração lê `pg_policy` (por isso parte das políticas reais e as que não casarem ficam como estão), tem guarda de md5 sobre as 9 funções de que depende (aborta se divergirem) e a 2.ª aplicação não altera nada. Âmbito deliberadamente reduzido às 8 tabelas mais quentes: o `ALTER POLICY` pede `ACCESS EXCLUSIVE` nas tabelas durante a transação, por isso aplique fora das horas de ponta; depois de medir com `EXPLAIN (ANALYZE)` em produção pode alargar a lista `v_tables` (ver `workspace_users`, `communication_log`, `funnel_items`, `startup_contracts`).
**Criar `supabase/migrations/20261103202000_rc12_rls_set_helpers.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-04 — RLS: avaliar o acesso por conjunto (1x por consulta) em vez de uma funcao SECURITY DEFINER por linha.
-- has_workspace_access / can_write_workspace / is_founder / is_conversation_participant sao SQL STABLE SECURITY DEFINER
-- (nao inlinaveis): o Postgres chama-as uma vez por linha (~0,15 a 0,7 ms/linha; em 20k linhas 3 a 9 s).
-- Esta migracao (a) acrescenta helpers de conjunto equivalentes e (b) reescreve, nas politicas das 8 tabelas mais quentes,
-- as chamadas por linha para `col IN (SELECT helper())` / `(SELECT fn())` (InitPlan). Comportamento identico:
-- equivalencia verificada para 19 personas x 20 tabelas (leitura e escrita), incluindo contas pending/suspensas,
-- mentor com e sem NDA, workspace bloqueado, anon e service_role.
-- Nota: o ALTER POLICY pede ACCESS EXCLUSIVE nas tabelas durante a transacao; aplicar fora das horas de ponta.
-- Idempotente: a 2.a aplicacao nao altera nenhuma politica.

-- Guarda: aborta (em vez de pisar) se as funcoes de que os helpers dependem divergirem da definicao de que partimos.
DO $guard$
DECLARE r record; v_expected jsonb := '{
  "can_write_workspace(_workspace_id uuid)": "2d4228fe6c8662cf41a45b5fa1031c9d",
  "has_workspace_access(_workspace_id uuid)": "5f79d5f43dde0df140e34aa1d7235cf3",
  "is_founder(_workspace_id uuid)": "bd39034be5befffbf413c5da16d3c750",
  "is_admin()": "34c2c6de8c80c4b013fb02c8d797bf5f",
  "is_account_active()": "ce406d5946bdd3a6e7c5a6875575cd6b",
  "is_account_active(_user_id uuid)": "a5d7a21723d2e213432adb8b229311c5",
  "account_not_suspended(_user_id uuid)": "323d060dd1ca1c4c0c7ccf01d637e46d",
  "is_conversation_participant(_user_id uuid, _conversation_id uuid)": "2392f9e8d0dcb27b9fead7d3bf0d7a19",
  "has_accepted_nda(_user_id uuid, _nda_version text)": "665aee8fd8adc952d56b56227c7e729f"
}'::jsonb;
BEGIN
  FOR r IN SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS sig, md5(pg_get_functiondef(p.oid)) AS m
             FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
              AND p.proname IN ('can_write_workspace','has_workspace_access','is_founder','is_admin','is_account_active',
                                'account_not_suspended','is_conversation_participant','has_accepted_nda')
  LOOP
    IF v_expected ? r.sig AND v_expected->>r.sig <> r.m THEN
      RAISE EXCEPTION 'rc12: definicao de public.% divergente (md5 %), envie pg_get_functiondef antes de aplicar', r.sig, r.m;
    END IF;
  END LOOP;
END $guard$;

-- Helpers de conjunto (equivalentes exatos, repartidos em parte global + conjunto de workspaces do utilizador).
CREATE OR REPLACE FUNCTION public.has_global_workspace_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_admin()
      OR (public.account_not_suspended(auth.uid()) AND EXISTS (
            SELECT 1 FROM public.user_roles
             WHERE user_id = auth.uid() AND role = 'consultor'::public.app_role))
$$;

-- Parte global de can_write_workspace(uuid): exige conta aprovada (is_account_active(uuid)) tambem para admin/consultor.
CREATE OR REPLACE FUNCTION public.has_global_write_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.is_account_active(auth.uid())
     AND (public.is_admin()
          OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'consultor'::public.app_role))
$$;

CREATE OR REPLACE FUNCTION public.member_workspace_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT wu.workspace_id
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
   WHERE wu.user_id = auth.uid()
     AND wu.active = true
     AND w.status <> 'blocked'
     AND w.blocked_at IS NULL
     AND public.is_account_active()
     AND (NOT EXISTS (SELECT 1 FROM public.user_roles
                       WHERE user_id = auth.uid() AND role = 'mentor_externo'::public.app_role)
          OR public.has_accepted_nda(auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.writer_workspace_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT wu.workspace_id
    FROM public.workspace_users wu
    JOIN public.workspaces w ON w.id = wu.workspace_id
   WHERE wu.user_id = auth.uid()
     AND wu.active = true
     AND wu.role IN ('founder'::public.app_role, 'consultor'::public.app_role)
     AND w.blocked_at IS NULL
     AND public.is_account_active(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.founder_workspace_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT wu.workspace_id
    FROM public.workspace_users wu
   WHERE wu.user_id = auth.uid()
     AND wu.active = true
     AND wu.role = 'founder'::public.app_role
$$;

CREATE OR REPLACE FUNCTION public.my_conversation_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.has_global_workspace_access(), public.has_global_write_access(), public.member_workspace_ids(),
                       public.writer_workspace_ids(), public.founder_workspace_ids(), public.my_conversation_ids() FROM PUBLIC;
-- anon tem de poder executar: varias politicas sao "TO public" e o Postgres avalia-as tambem para anon (devolvem vazio/false).
GRANT EXECUTE ON FUNCTION public.has_global_workspace_access(), public.has_global_write_access(), public.member_workspace_ids(),
                          public.writer_workspace_ids(), public.founder_workspace_ids(), public.my_conversation_ids()
  TO anon, authenticated, service_role;

-- Reescrita das politicas das tabelas quentes (le pg_policy, por isso parte das politicas atuais; o que nao casar fica como esta).
DO $$
DECLARE
  v_tables text[] := ARRAY[
    'action_items','milestones','sessions','documents','kpi_values','notifications','messages','conversation_participants'
  ];
  v_old_path text := current_setting('search_path');
  p record;
  v_q text; v_nq text; v_nw text; v_sql text; v_n int := 0;
BEGIN
  PERFORM set_config('search_path', 'public, pg_catalog', true);   -- pg_get_expr devolve nomes sem prefixo
  FOR p IN
    SELECT pol.oid, pol.polname, pol.polrelid, c.relname,
           pg_get_expr(pol.polqual, pol.polrelid) AS q, pg_get_expr(pol.polwithcheck, pol.polrelid) AS w
      FROM pg_policy pol JOIN pg_class c ON c.oid = pol.polrelid
     WHERE c.relnamespace = 'public'::regnamespace AND c.relname = ANY (v_tables)
  LOOP
    v_nq := p.q; v_nw := p.w;
    FOR i IN 1..2 LOOP
      v_q := CASE i WHEN 1 THEN v_nq ELSE v_nw END;
      IF v_q IS NULL THEN CONTINUE; END IF;
      -- 1) funcoes de pertenca por linha -> conjuntos
      v_q := regexp_replace(v_q, '(?<!SELECT )\yhas_workspace_access\(((?:[a-z_]+\.)?[a-z_]+)\)',
                            '((SELECT public.has_global_workspace_access()) OR \1 IN (SELECT public.member_workspace_ids()))', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )\ycan_write_workspace\(((?:[a-z_]+\.)?[a-z_]+)\)',
                            '((SELECT public.has_global_write_access()) OR \1 IN (SELECT public.writer_workspace_ids()))', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )\yis_founder\(((?:[a-z_]+\.)?[a-z_]+)\)',
                            '((SELECT public.is_admin()) OR \1 IN (SELECT public.founder_workspace_ids()))', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )\yis_conversation_participant\(auth\.uid\(\), ((?:[a-z_]+\.)?[a-z_]+)\)',
                            '(\1 IN (SELECT public.my_conversation_ids()))', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )\yis_conversation_participant\(\( SELECT auth\.uid\(\) AS uid\), ((?:[a-z_]+\.)?[a-z_]+)\)',
                            '(\1 IN (SELECT public.my_conversation_ids()))', 'g');
      -- 2) auth.uid()/auth.role() e helpers sem argumentos -> InitPlan
      v_q := regexp_replace(v_q, '(?<!SELECT )(?<![a-z_.])auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )(?<![a-z_.])auth\.role\(\)', '(SELECT auth.role())', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )(?<![a-z_.])(is_admin|is_staff|is_backoffice|can_access_backoffice|is_admin_only|is_founder_user)\(\)',
                            '(SELECT public.\1())', 'g');
      -- 3) has_role(<uid>, '<papel>'): argumentos constantes
      v_q := regexp_replace(v_q, '(?<!SELECT )(?<![a-z_.])has_role\(\( SELECT auth\.uid\(\) AS uid\), (''[a-z_]+''::app_role)\)',
                            '(SELECT public.has_role((SELECT auth.uid()), \1))', 'g');
      v_q := regexp_replace(v_q, '(?<!SELECT )(?<![a-z_.])has_role\(\(SELECT auth\.uid\(\)\), (''[a-z_]+''::app_role)\)',
                            '(SELECT public.has_role((SELECT auth.uid()), \1))', 'g');
      IF i = 1 THEN v_nq := v_q; ELSE v_nw := v_q; END IF;
    END LOOP;
    IF v_nq IS NOT DISTINCT FROM p.q AND v_nw IS NOT DISTINCT FROM p.w THEN CONTINUE; END IF;
    v_sql := format('ALTER POLICY %I ON public.%I', p.polname, p.relname)
          || CASE WHEN v_nq IS NOT NULL THEN ' USING (' || v_nq || ')' ELSE '' END
          || CASE WHEN v_nw IS NOT NULL THEN ' WITH CHECK (' || v_nw || ')' ELSE '' END;
    EXECUTE v_sql;
    v_n := v_n + 1;
  END LOOP;
  PERFORM set_config('search_path', v_old_path, true);
  RAISE NOTICE 'RC12 DBP-04: % politicas reescritas', v_n;
END $$;
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## Lembrete de assinatura herda os contadores da fase de preenchimento (ids: CRM-08)
**Gravidade:** LOW. **Quem é afetado:** founder (recebe o email), backoffice.
**Problema:** `supabase/functions/run-intake-reminders/index.ts:205-213` usa `last_reminder_sent_at` e `reminder_count` nas duas fases (preenchimento e assinatura) e nunca os repõe ao entrar em `signature_sent`: um intake com lembretes de há 20 dias recebe "Assinatura pendente" (com novo link, que invalida o anterior) na primeira corrida do cron a seguir ao envio do contrato, em vez de aos D+3.
**Correção:** Trigger `BEFORE UPDATE OF status` em `contract_intakes` que, ao mudar para `signature_sent` ou `changes_requested` sem que o próprio UPDATE mexa nos contadores, repõe `reminder_count = 0` e `last_reminder_sent_at = NULL`. O UPDATE do cron (que só grava os contadores) não é anulado. Função e trigger novos (não substitui objetos existentes). Testes em `rc12_sql_db_triggers.test.sql` (ver secção E2E-04).
**Criar `supabase/migrations/20261103209000_rc12_intake_reminders_reset.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · CRM-08 — lembretes de intake: a fase de assinatura recomeca a contagem.
-- run-intake-reminders usa reminder_count / last_reminder_sent_at nas duas fases (preenchimento e assinatura) e nunca os repunha
-- ao entrar em 'signature_sent': um intake com lembretes antigos recebia "Assinatura pendente" logo na primeira corrida do cron
-- a seguir ao envio do contrato (com novo link, que invalida o anterior), em vez de aos D+3.
-- Idempotente (CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
CREATE OR REPLACE FUNCTION public.reset_intake_reminders_on_phase_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Ao entrar em 'signature_sent' ou 'changes_requested' a contagem recomeca, salvo se a propria instrucao UPDATE
  -- ja mexeu nesses campos (o UPDATE do cron nao toca em status, por isso nao e anulado).
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('signature_sent', 'changes_requested')
     AND NEW.reminder_count IS NOT DISTINCT FROM OLD.reminder_count
     AND NEW.last_reminder_sent_at IS NOT DISTINCT FROM OLD.last_reminder_sent_at THEN
    NEW.reminder_count := 0;
    NEW.last_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_reset_intake_reminders ON public.contract_intakes;
CREATE TRIGGER trg_reset_intake_reminders
  BEFORE UPDATE OF status ON public.contract_intakes
  FOR EACH ROW EXECUTE FUNCTION public.reset_intake_reminders_on_phase_change();
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## Higiene de integridade: updated_at parado, FKs em falta e trigger duplicado em auth.users (ids: DBP-10, DBP-11, DBP-12)
**Gravidade:** LOW. **Quem é afetado:** admin, mentor_externo e quem ordena por "última alteração".
**Problema:** (DBP-10) 11 tabelas têm `updated_at` mas nenhum trigger o atualiza (`investors`, `funding_rounds`, `cap_table_entries`, `workflow_rules`, `saved_filters`, `stage_gate_criteria`, `health_model_templates`, `contract_notices`, `crm_import_conflicts`, `crm_lead_import_batches`, `contract_field_ownership`): a coluna fica sempre com a data de criação. (DBP-11) `mentor_connections.workspace_id` e `sessions.session_template_id` não têm FK (apagar um workspace deixa a ligação mentor-workspace órfã, e essa ligação alimenta políticas de acesso); `survey_writebacks.applied_by` é a única FK de `public` para `auth.users` com `NO ACTION`, pelo que apagar fisicamente o utilizador que aplicou um writeback falha. (DBP-12) `auth.users` tem dois triggers (`on_auth_user_created_assign_role`, criado em `supabase/migrations/20260101124809_27ae575f-bc9d-4cc4-aab2-ea767f777aca.sql:32`, e `on_auth_user_created_role`, `20260101131226_e3c11b8e-8f25-4473-96c7-0b22f8c0e7df.sql:33`) a chamar `handle_new_user_role`, que corre duas vezes por registo (inofensivo por causa do `ON CONFLICT DO NOTHING`, mas trabalho duplicado e risco de divergência).
**Correção:** Migração idempotente com quatro blocos. (1) Trigger `BEFORE UPDATE ... update_updated_at_column()` nas 11 tabelas. (2) As duas FKs em falta entram `NOT VALID` (protegem linhas novas sem varrer nem rejeitar as antigas): `mentor_connections.workspace_id ... ON DELETE CASCADE` (decisão consciente: apagar o workspace apaga a ligação mentor-workspace) e `sessions.session_template_id ... ON DELETE SET NULL`, com índices parciais de suporte. Depois de limpar os órfãos (consultas abaixo), valide com `ALTER TABLE public.mentor_connections VALIDATE CONSTRAINT mentor_connections_workspace_id_fkey;` e `ALTER TABLE public.sessions VALIDATE CONSTRAINT sessions_session_template_id_fkey;`. (3) `survey_writebacks_applied_by_fkey` passa a `ON DELETE SET NULL`. (4) Remove `on_auth_user_created_assign_role` e mantém `on_auth_user_created_role`; se o ambiente não permitir DDL no esquema `auth`, a migração regista um aviso e continua (impacto desprezável). As restantes colunas `*_id` sem FK (por exemplo `mentor_bookings.founder_id/mentor_id`, `time_entries.user_id`, `notifications.user_id`) precisam de decisão sua (CASCADE ou SET NULL) e não estão incluídas. Testes em `rc12_sql_db_triggers.test.sql` (ver secção E2E-04).
**Criar `supabase/migrations/20261103204000_rc12_integrity_hygiene.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · DBP-10, DBP-11, DBP-12 — higiene de integridade (idempotente).

-- 1) DBP-10 · updated_at que nunca avancava num UPDATE (a coluna existe mas nao ha trigger).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['investors','funding_rounds','cap_table_entries','workflow_rules','saved_filters',
                           'stage_gate_criteria','health_model_templates','contract_notices','crm_import_conflicts',
                           'crm_lead_import_batches','contract_field_ownership']
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='updated_at')
       AND to_regprocedure('public.update_updated_at_column()') IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
    END IF;
  END LOOP;
END $$;

-- 2) DBP-11 · Orfaos: colunas *_id sem FK. NOT VALID = protege linhas novas sem varrer/rejeitar as antigas.
--    Depois de limpar os orfaos (consultas no relatorio): ALTER TABLE ... VALIDATE CONSTRAINT ...
--    mentor_connections.workspace_id usa ON DELETE CASCADE (decisao consciente: apagar o workspace apaga a ligacao mentor-workspace,
--    que alimenta politicas de acesso); sessions.session_template_id usa ON DELETE SET NULL.
DO $$
BEGIN
  IF to_regclass('public.mentor_connections') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentor_connections_workspace_id_fkey' AND conrelid = 'public.mentor_connections'::regclass) THEN
      ALTER TABLE public.mentor_connections
        ADD CONSTRAINT mentor_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE NOT VALID;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_mentor_connections_workspace_id ON public.mentor_connections (workspace_id) WHERE workspace_id IS NOT NULL;
  END IF;
  IF to_regclass('public.sessions') IS NOT NULL AND to_regclass('public.session_templates') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_session_template_id_fkey' AND conrelid = 'public.sessions'::regclass) THEN
      ALTER TABLE public.sessions
        ADD CONSTRAINT sessions_session_template_id_fkey FOREIGN KEY (session_template_id) REFERENCES public.session_templates(id) ON DELETE SET NULL NOT VALID;
    END IF;
    CREATE INDEX IF NOT EXISTS idx_sessions_session_template_id ON public.sessions (session_template_id) WHERE session_template_id IS NOT NULL;
  END IF;
END $$;

-- 3) DBP-11 · Unica FK de public para auth.users com NO ACTION (as outras sao SET NULL/CASCADE): impedia apagar o utilizador
--    que aplicou um writeback.
DO $$
BEGIN
  IF to_regclass('public.survey_writebacks') IS NOT NULL AND EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'survey_writebacks_applied_by_fkey'
          AND conrelid = 'public.survey_writebacks'::regclass AND confdeltype = 'a') THEN
    ALTER TABLE public.survey_writebacks DROP CONSTRAINT survey_writebacks_applied_by_fkey;
    ALTER TABLE public.survey_writebacks
      ADD CONSTRAINT survey_writebacks_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4) DBP-12 · auth.users tinha dois triggers a chamar handle_new_user_role (o 2.o era redundante: a funcao usa ON CONFLICT DO NOTHING).
--    Mantem-se on_auth_user_created_role. Se o ambiente nao permitir DDL em auth, ignora-se (impacto desprezavel).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created_role' AND NOT tgisinternal)
     AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created_assign_role' AND NOT tgisinternal) THEN
    DROP TRIGGER on_auth_user_created_assign_role ON auth.users;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'rc12: sem permissao para alterar triggers em auth.users; on_auth_user_created_assign_role mantido';
END $$;
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## cron_invoke_edge com o URL do projeto de produção fixo (ids: OPS-13)
**Gravidade:** LOW. **Quem é afetado:** equipa técnica (staging, ensaios de restauro).
**Problema:** `v_url := 'https://apxzuslwhjujgrcsfzqw.supabase.co/functions/v1/' || p_function;` (`supabase/migrations/20260811141628_4be9d892-18f1-464a-81cd-4528baf1711c.sql:88`). Qualquer base criada a partir das migrações agenda 17 jobs que chamam as funções de PRODUÇÃO com tokens que lá não existem (401 e linhas `skipped`), e as automações do staging nunca correm.
**Correção:** `cron_invoke_edge` passa a ler o URL base de `current_setting('app.edge_base_url', true)` e, se não estiver definido, mantém o URL de produção (comportamento atual inalterado). Em staging: `ALTER DATABASE postgres SET app.edge_base_url = 'https://<ref-staging>.supabase.co';` e abrir nova sessão. Alteração mínima (só a linha de `v_url`) sobre a definição atual da base viva, com guarda de md5; `EXECUTE` continua só para `service_role`. Teste em `rc12_sql_db_retention_ops.test.sql`.
**Criar `supabase/migrations/20261103207000_rc12_cron_edge_base_url.sql`** (conteúdo exato):

```sql
-- RC12 (sql_db) · OPS-13 — cron_invoke_edge tinha o URL do projeto de producao fixo: qualquer base criada a partir das migracoes
-- (staging, ensaio de restauro) agendaria 17 jobs a chamar as funcoes de PRODUCAO com tokens que la nao existem.
-- Passa a ler o URL base de `app.edge_base_url` e, se nao estiver definido, mantem o URL de producao (comportamento atual).
-- Em staging: ALTER DATABASE postgres SET app.edge_base_url = 'https://<ref-staging>.supabase.co';  (e abrir nova sessao)
-- Alteracao minima: so a linha de v_url. A guarda de md5 aborta se a definicao real divergir da de que partimos.
DO $guard$
DECLARE v_def text; v_md5 text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='cron_invoke_edge' AND pg_get_function_identity_arguments(p.oid)='p_function text, p_payload jsonb';
  v_md5 := md5(v_def);
  IF v_md5 NOT IN ('31e547c774e8660a7c5f95cf7243f042', '1f1cea717b5a1982e1704b9590026f23') THEN
    RAISE EXCEPTION 'rc12: definicao de public.cron_invoke_edge divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', v_md5;
  END IF;
END $guard$;

CREATE OR REPLACE FUNCTION public.cron_invoke_edge(p_function text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  v_url text;
  v_token text;
  v_request_id bigint;
BEGIN
  IF p_function IS NULL OR p_function = '' THEN
    RAISE EXCEPTION 'cron_invoke_edge: function name required' USING ERRCODE = '22023';
  END IF;

  v_url := COALESCE(NULLIF(current_setting('app.edge_base_url', true), ''), 'https://apxzuslwhjujgrcsfzqw.supabase.co')
           || '/functions/v1/' || p_function;
  v_token := public.issue_cron_token(p_function);

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', v_token
    ),
    body := COALESCE(p_payload, '{}'::jsonb),
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_invoke_edge(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_invoke_edge(text, jsonb) TO service_role;
```

---

## Rascunho do modelo de investidor partilhado entre contas (ids: FEX-02)
**Gravidade:** LOW. **Quem é afetado:** founder, team_member e quem partilha o browser.
**Problema:** `InvestorTemplateLibrary.tsx:119` grava o rascunho em `investor_template_draft_<templateId>` sem utilizador, e `src/lib/sessionReset.ts:16-21` não o apaga no logout.
**Correção (lado `lib`):** `resetSession` passa a apagar também o prefixo antigo `investor_template_draft_`. Mudar a chave do componente para `sl-investor-draft:<userId>:<templateId>` (o prefixo `sl-` já é apagado) cabe ao domínio do founder. Não alargar a lista a `template-draft:`, `contract-*-draft:`, `celebrated_` e afins: já levam o id do utilizador e apagá-los no logout perderia rascunhos por gravar e repetiria animações. Inclui testes.
**Alterar `src/lib/sessionReset.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/src/lib/sessionReset.ts
+++ b/src/lib/sessionReset.ts
@@ -19,4 +19,6 @@ const USER_KEY_PREFIXES = [
   'shown_quickguide_',
   'sl-',
+  // Legacy key (no user id) of the investor template drafts; current ones use `sl-investor-draft:<uid>:<tpl>`
+  'investor_template_draft_',
 ];
```

---

## Tema escuro só é aplicado depois do bundle de idioma (ids: FEX-20)
**Gravidade:** LOW. **Quem é afetado:** quem usa tema escuro.
**Problema:** a classe `.dark` só é posta pelo `ThemeProvider` depois de `initI18n()` (`src/main.tsx:53`), por isso a página arranca clara e muda. `index.html` não tem nenhum script de tema.
**Correção:** script inline em `index.html`, antes do `<title>`, que aplica `dark`/`light` a partir de `localStorage.theme` e de `prefers-color-scheme` (compatível com o `ThemeProvider`, que remove e volta a pôr a classe). Nota: `index.html` está fora de `src/`.
**Alterar `index.html`** (diff; os números de linha são do ficheiro original):

```diff
--- a/index.html
+++ b/index.html
@@ -8,4 +8,12 @@
     <meta http-equiv="Pragma" content="no-cache" />
     <meta http-equiv="Expires" content="0" />
+    <!-- Apply the saved theme before first paint (ThemeProvider only runs after the locale bundle loads) -->
+    <script>
+      try {
+        var t = localStorage.getItem('theme');
+        var dark = t === 'dark' || ((!t || t === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
+        document.documentElement.classList.add(dark ? 'dark' : 'light');
+      } catch (e) {}
+    </script>
     <title>Startup Leiria Portal | Plataforma de Mentoria para Startups</title>
     <meta name="description" content="Plataforma de acompanhamento e mentoria de startups. Gestão de sessões, KPIs, milestones e integração com Microsoft Teams." />
```



## Textos de i18n: chaves em falta, plurais e en.json em português (ids: FES-09, FEX-07, OPS-08, FEF-06, FEX-08, FEB-09)
**Gravidade:** LOW. **Quem é afetado:** quem usa a app em inglês; CI (gates `i18n:lint` e `i18n-sync-guard`).
**Problema:** (a) `PendingApprovalsManager.tsx:738,746,754,756` usa 4 chaves `admin.*` que não existem nos catálogos (8 problemas no `i18n:lint`); (b) 26 chaves `X_plural` em `pt.json`/`en.json` são ignoradas com `compatibilityJSON: 'v4'` (`src/i18n/index.ts:24`), por isso "há 5 dia" e "15 startup"; (c) `en.json` tem 116 valores em português ou misturados (ex.: `login.backToLogin`, `bugReport.*`, `admin.erroAoGerarRelatório`) e 17 chaves iguais ao português (`admin.userManagement.cannotSuspendSelf`, `common.open`, `nav.admin.diagnostics`, ...); `pt.json` tem `cannotSuspendSelf` com tratamento por "tu".
**Correção:** as chaves são acrescentadas pela ferramenta de i18n (ficheiro `rc12/i18n/f_shell.json`), não à mão: as 4 chaves `admin.chooseWorkspace`, `searchWorkspace`, `wsStatusActive`, `wsStatusUnclaimed`; as chaves `X_one` e `X_other` para cada `X_plural` (mantém `X` e `X_plural`, porque o guard do CI falha se uma chave for removida); a tradução inglesa de 121 valores acima (valores de `en.json` já existentes, substituídos) e `admin.userManagement.cannotSuspendSelf` em pt = "Não pode suspender a sua própria conta". Em `en.json` a chave `backoffice.edifícioCriado` mantém o acento (é a chave usada no código).


## Gates e testes de segurança tautológicos (ids: FEX-21)
**Gravidade:** LOW. **Quem é afetado:** engenharia.
**Problema:** `src/test/auth.test.ts` reimplementa as regras em vez de importar o código; `sessionReset`, `sanitizeUrl`, `logError`, `lazyWithRetry` e a lógica de contagens não tinham testes.
**Correção:** os testes novos acompanham as correções acima (`sanitizeUrl.test.ts`, `sessionReset.test.ts`, `logError.redact.test.ts`, `queryCount.test.ts`, `lazyWithRetry.storage.test.ts`, `useChecklistRecovery.storage.test.tsx`, `SessionTimeoutWarning.test.tsx`, `useAttentionCount.test.tsx`), já incluídos nos marcadores `{{DIFF}}` dos temas respetivos. Fica por fazer um teste de `ProtectedRoute` com `AuthContext` simulado.

---

## staff-assign-workspace-to-contract: guarda de program_id repetida três vezes (ids: E2E-13, SIGN-12)
**Gravidade:** LOW. **Quem é afetado:** admin, consultor, backoffice (manutenção).
**Problema:** `supabase/functions/staff-assign-workspace-to-contract/index.ts:93-104` repete três vezes o mesmo bloco `if (!programId) return errorResponse(...)` com o mesmo comentário (resíduo de aplicar o C13/SIGN-14 do RC10 várias vezes). As duas últimas são código morto.
**Correção:** apagar as linhas 97-104, mantendo só a primeira guarda.
**Alterar `supabase/functions/staff-assign-workspace-to-contract/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/staff-assign-workspace-to-contract/index.ts
+++ b/supabase/functions/staff-assign-workspace-to-contract/index.ts
@@ -95,12 +95,4 @@ Deno.serve(async (req) => {
         return errorResponse(req, 'program_id required to create workspace', ErrorCode.BAD_REQUEST, 400);
       }
-      // workspaces.program_id é NOT NULL: sem programa o insert falhava e deixava uma startup órfã
-      if (!programId) {
-        return errorResponse(req, "program_id required to create workspace", ErrorCode.BAD_REQUEST, 400);
-      }
-      // workspaces.program_id é NOT NULL: sem programa o insert falhava e deixava uma startup órfã
-      if (!programId) {
-        return errorResponse(req, "program_id required to create workspace", ErrorCode.BAD_REQUEST, 400);
-      }
 
       // Duplicate guard: same startup name + program already has a non-archived workspace.
```

---

## O lembrete de «Correções pedidas» não leva as notas das correções (ids: CRM-09)
**Gravidade:** LOW. **Quem é afetado:** anónimo (founder), backoffice.
**Problema:** `supabase/functions/run-intake-reminders/index.ts:102,144-151` envia `type:'changes_requested'` sem `changesNotes`; o email diz «identificou alguns pontos que necessitam de correção:» e não mostra nenhum.
**Correção:** acrescentar `changes_requested_notes` ao select e passá-lo como `changesNotes` quando o estado é `changes_requested`. Fazer deploy de `run-intake-reminders`.
**Alterar `supabase/functions/run-intake-reminders/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/run-intake-reminders/index.ts
+++ b/supabase/functions/run-intake-reminders/index.ts
@@ -100,5 +100,5 @@ Deno.serve(withCronRunLogging('run-intake-reminders', async (req) => {
     const { data: pendingIntakes, error: intakesErr } = await supabase
       .from('contract_intakes')
-      .select('id, organization_name, legal_representative_email, legal_representative_name, created_at, last_reminder_sent_at, reminder_count, status, updated_at')
+      .select('id, organization_name, legal_representative_email, legal_representative_name, created_at, last_reminder_sent_at, reminder_count, status, updated_at, changes_requested_notes')
       .in('status', ['intake_requested', 'intake_in_progress', 'changes_requested'])
       .not('legal_representative_email', 'is', null)
@@ -149,4 +149,6 @@ Deno.serve(withCronRunLogging('run-intake-reminders', async (req) => {
           organizationName: intake.organization_name,
           intakeToken: freshToken,
+          // o lembrete de correções tem de repetir o que há a corrigir
+          ...(intake.status === 'changes_requested' ? { changesNotes: intake.changes_requested_notes ?? undefined } : {}),
         }, serviceKey)
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## commit-crm-import: sem reclamação do job, `row_ids` vazio comita tudo e corpo inválido dá 500 (ids: ED1-10)
**Gravidade:** LOW. **Quem é afetado:** admin (importador de dados V2).
**Problema:** `commit-crm-import/index.ts:169` põe o job em `committing` sem verificar o estado anterior: um segundo pedido (reenvio depois de o browser desistir de um commit longo) corre em paralelo sobre as mesmas linhas `approved` e as leads sem ids externos ficam duplicadas. `row_ids: []` é tratado como "sem filtro" (`:172`, `[]?.length` é falsy) e comita todas as linhas aprovadas; `req.json()` sem `catch` (`:149`) devolve 500 em vez de 400; o job fica `committed` mesmo com falhas ou linhas `stale` (`:248-252`); o 500 devolve `e.message` (texto de Postgres) ao cliente (`:257`).
**Correção:** corpo inválido, `job_id` que não seja UUID e `row_ids` presente mas vazio, com mais de 5000 itens ou com valores que não sejam UUID passam a dar 400; o job é reclamado com um UPDATE condicional (`status<>'committing'` ou `updated_at` com mais de 15 minutos) e um segundo pedido recebe 409 `job_already_committing`; o job fecha como `committed_with_errors` se houve falhas ou linhas `stale` (valor novo, que nenhum consumidor lê; a UI não depende do estado do job) e o erro do UPDATE final fica no log; o 500 devolve só `internal_error`. Aviso: se a execução lançar uma exceção depois de reclamar o job, este fica em `committing` e um retry dentro dos 15 minutos seguintes recebe 409. Depois de publicar, faça deploy de `commit-crm-import`.
**Alterar `supabase/functions/commit-crm-import/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/commit-crm-import/index.ts
+++ b/supabase/functions/commit-crm-import/index.ts
@@ -147,6 +147,14 @@ Deno.serve(async (req) => {
     if (!isAdmin) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders });
 
-    const body = await req.json() as CommitBody;
-    if (!body?.job_id) return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders });
+    const body = await req.json().catch(() => null) as CommitBody | null;
+    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+    // row_ids, quando enviado, tem de ser uma lista não vazia de UUIDs (uma lista vazia comitava todas as linhas aprovadas).
+    const rowIdsInvalid = body?.row_ids != null && (
+      !Array.isArray(body.row_ids) || body.row_ids.length === 0 || body.row_ids.length > 5000 ||
+      !body.row_ids.every((v: unknown) => typeof v === 'string' && UUID_RE.test(v))
+    );
+    if (!body || typeof body.job_id !== 'string' || !UUID_RE.test(body.job_id) || rowIdsInvalid) {
+      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders });
+    }
 
     const { data: job, error: jobErr } = await sbSvc.from('data_import_jobs').select('*').eq('id', body.job_id).single();
@@ -167,5 +175,15 @@ Deno.serve(async (req) => {
     }
 
-    await sbSvc.from('data_import_jobs').update({ status: 'committing', approved_by: uid }).eq('id', job.id);
+    // Reclamação atómica do job: um segundo pedido em simultâneo recebe 409 (um job preso em 'committing' há mais de 15 min pode ser retomado).
+    const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
+    const { data: claimedJob, error: claimErr } = await sbSvc.from('data_import_jobs')
+      .update({ status: 'committing', approved_by: uid })
+      .eq('id', job.id)
+      .or(`status.neq.committing,updated_at.lt.${staleBefore}`)
+      .select('id');
+    if (claimErr) throw claimErr;
+    if (!claimedJob?.length) {
+      return new Response(JSON.stringify({ error: 'job_already_committing' }), { status: 409, headers: jsonHeaders });
+    }
 
     let q = sbSvc.from('data_import_rows').select('*').eq('job_id', job.id).eq('approval_state', 'approved');
@@ -246,14 +264,15 @@ Deno.serve(async (req) => {
     }
 
-    await sbSvc.from('data_import_jobs').update({
-      status: 'committed',
+    const { error: jobDoneErr } = await sbSvc.from('data_import_jobs').update({
+      status: summary.failed > 0 || summary.stale > 0 ? 'committed_with_errors' : 'committed',
       committed_at: new Date().toISOString(),
       counts_json: { ...(job.counts_json ?? {}), commit: summary },
     }).eq('id', job.id);
+    if (jobDoneErr) console.error('commit-crm-import: failed to finalize job', jobDoneErr.message);
 
     return new Response(JSON.stringify({ success: true, source, summary, sample: results.slice(0, 20) }), { headers: jsonHeaders });
   } catch (e: any) {
     console.error('commit-crm-import error', e?.message ?? e);
-    return new Response(JSON.stringify({ error: 'internal_error', message: e?.message ?? String(e) }), {
+    return new Response(JSON.stringify({ error: 'internal_error' }), {
       status: 500, headers: jsonHeaders,
     });
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## accept-mentor-nda reescreve a data e o IP do 1.º aceite e usa um sal fixo (ids: ED2-13)
**Gravidade:** LOW. **Quem é afetado:** mentor_externo.
**Problema:** `accept-mentor-nda/index.ts:46-56` faz upsert com `onConflict` e `accepted_at` novo: cada vez que o mentor volta a carregar em aceitar, a data, o `ip_hash` e o `user_agent` do 1.º aceite perdem-se; a resposta (`:71`) devolve um segundo `new Date()` diferente do gravado. O `ip_hash` é SHA-256 de `ip + 'salt-for-privacy'` truncado a 8 bytes (`:39-43`): o sal está no código e o espaço IPv4 é pequeno, logo é reversível por força bruta.
**Correção:** o `ip_hash` passa a ser um HMAC-SHA-256 com `SUPABASE_SERVICE_ROLE_KEY` como segredo (os hashes novos deixam de ser comparáveis com os antigos); o upsert passa a `ignoreDuplicates: true` (ON CONFLICT DO NOTHING), sem `accepted_at` (usa o `DEFAULT now()`), preservando o 1.º aceite; a resposta lê o `accepted_at` realmente gravado. A RLS continua a recusar quem não é mentor. Depois de publicar, faça deploy de `accept-mentor-nda`.
**Alterar `supabase/functions/accept-mentor-nda/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/accept-mentor-nda/index.ts
+++ b/supabase/functions/accept-mentor-nda/index.ts
@@ -37,11 +37,15 @@ Deno.serve(async (req: Request) => {
                      'unknown';
 
-    const encoder = new TextEncoder();
-    const data = encoder.encode(clientIp + 'salt-for-privacy');
-    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
-    const hashArray = Array.from(new Uint8Array(hashBuffer));
-    const ipHash = hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
+    // HMAC com segredo do servidor (o sal fixo no código tornava o hash reversível por força bruta).
+    const hmacKey = await crypto.subtle.importKey(
+      'raw', new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? 'nda-ip-hash'),
+      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
+    );
+    const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(clientIp));
+    const ipHash = Array.from(new Uint8Array(sig)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
 
-    // Upsert NDA acceptance — RLS ensures only mentor_externo users can insert/update their own row
+    // Regista o aceite — RLS garante que só mentor_externo insere a sua própria linha.
+    // O 1.º aceite é a prova: ignoreDuplicates (ON CONFLICT DO NOTHING) não reescreve data nem IP,
+    // e accepted_at fica com o DEFAULT now() da tabela.
     const { error: upsertError } = await supabase
       .from('mentor_nda_acceptances')
@@ -51,7 +55,7 @@ Deno.serve(async (req: Request) => {
         ip_hash: ipHash,
         user_agent: userAgent?.substring(0, 500),
-        accepted_at: new Date().toISOString(),
       }, {
-        onConflict: 'user_id,nda_version'
+        onConflict: 'user_id,nda_version',
+        ignoreDuplicates: true,
       });
 
@@ -65,9 +69,17 @@ Deno.serve(async (req: Request) => {
     }
 
+    // Devolve a data realmente gravada (a do 1.º aceite, se já existia)
+    const { data: stored } = await supabase
+      .from('mentor_nda_acceptances')
+      .select('accepted_at')
+      .eq('user_id', userId)
+      .eq('nda_version', CURRENT_NDA_VERSION)
+      .maybeSingle();
+
     return corsJsonResponse({
       success: true,
       message: 'NDA accepted successfully',
       nda_version: CURRENT_NDA_VERSION,
-      accepted_at: new Date().toISOString(),
+      accepted_at: stored?.accepted_at ?? new Date().toISOString(),
     }, req);
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## commit-hubspot-import: dupla invocação duplica funnel_items e aceita jobs que não são HubSpot (ids: ED2-14)
**Gravidade:** LOW. **Quem é afetado:** admin (função sem chamador na UI; o importador V2 usa `commit-crm-import`).
**Problema:** duas invocações em simultâneo leem as mesmas linhas `approved` (`commit-hubspot-import/index.ts:51-53`) e chamam `commit_import_funnel_item`, que não marca a linha: ambas inserem. Não há verificação de `job.source` (um job PHC passa e é gravado com payload HubSpot); os erros dos UPDATE ao job (`:49`, `:148-152`) são ignorados, uma exceção a meio deixa o job em `committing` e o 500 devolve `e.message`.
**Correção:** `job.source` tem de ser `hubspot` (400 `unsupported_source`); corpo inválido não rebenta; o UPDATE de `committing` e o final lançam em caso de erro; cada linha é reclamada com um UPDATE condicional `approval_state: 'approved' -> 'committing'` antes de qualquer trabalho (quem não reclama conta como `skipped`); o 500 devolve só `internal_error`. Aviso: uma linha reclamada e não concluída porque o processo morreu fica em `committing` e tem de ser reposta à mão. Alternativa válida: apagar a função, que não tem chamadores. Depois de publicar, faça deploy de `commit-hubspot-import`.
**Alterar `supabase/functions/commit-hubspot-import/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/commit-hubspot-import/index.ts
+++ b/supabase/functions/commit-hubspot-import/index.ts
@@ -41,5 +41,5 @@ Deno.serve(async (req) => {
     if (!isAdmin) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: jsonHeaders });
 
-    const body = await req.json() as CommitBody;
+    const body = await req.json().catch(() => null) as CommitBody | null;
     if (!body?.job_id) return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: jsonHeaders });
 
@@ -47,5 +47,10 @@ Deno.serve(async (req) => {
     if (jobErr || !job) return new Response(JSON.stringify({ error: 'job_not_found' }), { status: 404, headers: jsonHeaders });
 
-    await sbSvc.from('data_import_jobs').update({ status: 'committing', approved_by: uid }).eq('id', job.id);
+    if (job.source !== 'hubspot') {
+      return new Response(JSON.stringify({ error: 'unsupported_source' }), { status: 400, headers: jsonHeaders });
+    }
+
+    const { error: claimJobErr } = await sbSvc.from('data_import_jobs').update({ status: 'committing', approved_by: uid }).eq('id', job.id);
+    if (claimJobErr) throw claimJobErr;
 
     let q = sbSvc.from('data_import_rows').select('*').eq('job_id', job.id).eq('approval_state', 'approved');
@@ -65,4 +70,11 @@ Deno.serve(async (req) => {
       await Promise.all(slice.map(async (row: any) => {
         try {
+          // Reclamação atómica da linha: duas invocações em simultâneo não inserem a mesma linha duas vezes.
+          const { data: claimed, error: claimErr } = await sbSvc.from('data_import_rows')
+            .update({ approval_state: 'committing' })
+            .eq('id', row.id).eq('approval_state', 'approved').select('id');
+          if (claimErr) throw claimErr;
+          if (!claimed || claimed.length === 0) { summary.skipped++; return; }
+
           const n = row.normalized_json ?? {};
           const toggles = row.approve_toggles_json ?? {};
@@ -146,14 +158,15 @@ Deno.serve(async (req) => {
     }
 
-    await sbSvc.from('data_import_jobs').update({
+    const { error: jobDoneErr } = await sbSvc.from('data_import_jobs').update({
       status: summary.failed > 0 ? 'committed' : 'committed', // keep single status; failures visible per row
       committed_at: new Date().toISOString(),
       counts_json: { ...(job.counts_json ?? {}), commit: summary },
     }).eq('id', job.id);
+    if (jobDoneErr) throw jobDoneErr;
 
     return new Response(JSON.stringify({ success: true, summary, sample: results.slice(0, 20) }), { headers: jsonHeaders });
   } catch (e: any) {
     console.error('commit-hubspot-import error', e?.message ?? e);
-    return new Response(JSON.stringify({ error: 'internal_error', message: e?.message ?? String(e) }), {
+    return new Response(JSON.stringify({ error: 'internal_error' }), {
       status: 500, headers: jsonHeaders,
     });
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## accept-workspace-invite: corpo JSON inválido dá 500 (ids: ED2-15)
**Gravidade:** LOW. **Quem é afetado:** qualquer utilizador autenticado com um link de convite.
**Problema:** `accept-workspace-invite/index.ts:42-43` faz `await req.json()` sem `catch`: um corpo que não seja JSON lança e responde 500 em vez de 400. (O outro defeito do achado, o RPC `accept_workspace_invitation` devolver `workspace_id`/`startup_id` de um convite já aceite antes de comparar o e-mail, é uma migração de base de dados e fica a cargo de quem a escreve: ver `cross_domain`.)
**Correção:** `req.json().catch(() => null)` e o token passa a validar-se com `/^[0-9a-f]{64}$/i` (o token gerado em `send-workspace-invite` tem sempre 32 bytes em hexadecimal), devolvendo 400 "Invalid invitation token". Depois de publicar, faça deploy de `accept-workspace-invite`.
**Alterar `supabase/functions/accept-workspace-invite/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/accept-workspace-invite/index.ts
+++ b/supabase/functions/accept-workspace-invite/index.ts
@@ -40,6 +40,6 @@ serve(async (req) => {
     }
 
-    const payload: AcceptInviteRequest = await req.json();
-    if (!payload.token || typeof payload.token !== 'string' || payload.token.length !== 64) {
+    const payload = await req.json().catch(() => null) as AcceptInviteRequest | null;
+    if (!payload || typeof payload.token !== 'string' || !/^[0-9a-f]{64}$/i.test(payload.token)) {
       return corsJsonResponse({ error: "Invalid invitation token" }, req, 400);
     }
```



# PROMPT LOVABLE — RC12 · PARTE OPCIONAL 2 de 3 — apply-survey-responses: autenticar antes de ler,… · Convite da sessão falha em silêncio no diálogo… · copilot-apply-playbook: o preflight não reflete o RLS… [LOW]

**Regras (as mesmas da Parte 1, em resumo):** aplique só o que está nesta parte; os diffs são `-U2` com números de linha do ficheiro ORIGINAL e, se um não aplicar, pare nessa secção e diga qual; "Criar" = ficheiro novo com o conteúdo exato; as migrações SQL são idempotentes, correm numa transação e os blocos `DO $guard$` abortam de propósito se a função real divergiu (devolva o `md5` e o `pg_get_functiondef`, nunca desative o guarda); não edite migrações existentes nem `types.ts`; publique as edge functions alteradas; no fim responda com as secções aplicadas, as não aplicadas (com razão) e qualquer erro, com o texto exato.

**Edge functions alteradas nesta parte:** apply-survey-responses, check-missed-milestones, copilot-apply-playbook, dataroom-revoke-link, export-cohort-health-pdf, generate-financial-prefill, recompute-health-scores, run-ecosystem-snapshot, run-workflow-rules, send-announcement-email, send-commercial-proposal, send-email-digest, send-intake-email, send-notification-email, send-session-invite, sync-graph-email-history.

---

## apply-survey-responses: autenticar antes de ler, auditoria preservada e marco duplicado (ids: ED2-10, ED2-11, ED2-12)
**Gravidade:** LOW. **Quem é afetado:** founder, consultor, admin; anónimo (oráculo de ids).
**Problema:** (ED2-10) `apply-survey-responses/index.ts:387-403` (`verify_jwt=false`) consulta `survey_instances` com o service role e responde 404 antes de pedir credenciais, por isso um anónimo distingue instâncias existentes (404 vs 401/403); o `x-cron-secret` é comparado com `===`. (ED2-11) Nada marca a instância como aplicada: uma segunda chamada refaz tudo, `periodMonth` usa `new Date()` (um retry no mês seguinte grava os KPI no mês errado) e as linhas de `survey_writebacks` são apagadas e reinseridas, pelo que as `applied` (com `anterior: ...`, a única informação de anulação) passam a `skipped: Campo já preenchido`, sem ler o erro do insert. (ED2-12) O marco existente é procurado com `.ilike('title', title)`, onde `%` e `_` são curingas (um título `100%` casa com outros marcos), e `.maybeSingle()` falha com 2 ou mais correspondências, deixando `existing = null` e inserindo o marco outra vez em cada execução.
**Correção:** o `x-cron-secret` passa por `timingSafeEqual` e a autenticação (JWT) corre antes de carregar a instância, guardando `authedUserId`; só depois vêm a instância, `has_workspace_access` e a verificação de papel. O select da instância ganha `submitted_at` e `periodMonth` usa o mês da submissão. A auditoria faz `upsert` por `(instance_id, question_id)` (a constraint única existe) sem rebaixar linhas `applied` para `skipped`, e um erro da auditoria passa a lançar. A procura do marco escapa `\`, `%` e `_`, troca `*` (curinga do PostgREST) por `_` e usa `.limit(1)`. Fica por resolver (fora deste LOW) que `applyKpi` substitui um valor manual do mesmo mês sem registar o valor anterior.
**Alterar `supabase/functions/apply-survey-responses/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/apply-survey-responses/index.ts
+++ b/supabase/functions/apply-survey-responses/index.ts
@@ -2,5 +2,5 @@ import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-
 import { getCorsHeaders, handleCorsOptions } from '../_shared/cors.ts';
 import { validateUUID, parseAndValidateBody } from '../_shared/validation.ts';
-import { isServiceRoleBearer } from '../_shared/security.ts';
+import { isServiceRoleBearer, timingSafeEqual } from '../_shared/security.ts';
 
 /**
@@ -303,10 +303,12 @@ async function applyMilestone(
   const title = answer.trim().slice(0, 200);
 
-  const { data: existing } = await supabase
+  // ilike trata % e _ (e * no PostgREST) como wildcards e maybeSingle() falha com 2+ linhas (-> duplicava o marco).
+  const { data: existingRows } = await supabase
     .from('milestones')
     .select('id')
     .eq('workspace_id', workspaceId)
-    .ilike('title', title)
-    .maybeSingle();
+    .ilike('title', title.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_'))
+    .limit(1);
+  const existing = existingRows?.[0] ?? null;
 
   if (existing) {
@@ -385,8 +387,26 @@ Deno.serve(async (req) => {
     const instanceId = instanceIdResult.value!;
 
+    // Auth: the founder's own JWT, or an internal call carrying the cron secret.
+    // Autenticar ANTES de ler survey_instances (service role): sem sessão não há oráculo 404/403.
+    const providedCron = req.headers.get('x-cron-secret');
+    const isInternal = isServiceRoleBearer(req)
+      || (Boolean(cronSecret) && providedCron !== null && timingSafeEqual(providedCron, cronSecret!));
+    let authedUserId: string | null = null;
+
+    if (!isInternal) {
+      const authHeader = req.headers.get('Authorization');
+      if (!authHeader) return json({ error: 'Unauthorized' }, 401);
+
+      const { data: { user }, error: authError } = await supabase.auth.getUser(
+        authHeader.replace('Bearer ', ''),
+      );
+      if (authError || !user) return json({ error: 'Unauthorized' }, 401);
+      authedUserId = user.id;
+    }
+
     const { data: instance, error: instanceError } = await supabase
       .from('survey_instances')
       .select(`
-        id, workspace_id, status, submitted_by,
+        id, workspace_id, status, submitted_by, submitted_at,
         campaign:survey_campaigns(
           id, name,
@@ -400,19 +420,9 @@ Deno.serve(async (req) => {
     if (!instance) return json({ error: 'Survey instance not found' }, 404);
 
-    // Auth: the founder's own JWT, or an internal call carrying the cron secret.
-    const isInternal = isServiceRoleBearer(req) || (Boolean(cronSecret) && req.headers.get('x-cron-secret') === cronSecret);
     let userId: string | null = null;
 
-    if (!isInternal) {
-      const authHeader = req.headers.get('Authorization');
-      if (!authHeader) return json({ error: 'Unauthorized' }, 401);
-
-      const { data: { user }, error: authError } = await supabase.auth.getUser(
-        authHeader.replace('Bearer ', ''),
-      );
-      if (authError || !user) return json({ error: 'Unauthorized' }, 401);
-
+    if (authedUserId) {
       const { data: hasAccess } = await supabase.rpc('has_workspace_access', {
-        _user_id: user.id,
+        _user_id: authedUserId,
         _workspace_id: instance.workspace_id,
       });
@@ -421,7 +431,7 @@ Deno.serve(async (req) => {
       const [{ data: staffRoles }, { data: founderRows }] = await Promise.all([
         supabase.from('user_roles').select('role')
-          .eq('user_id', user.id).in('role', ['admin', 'consultor']),
+          .eq('user_id', authedUserId).in('role', ['admin', 'consultor']),
         supabase.from('workspace_users').select('id')
-          .eq('workspace_id', instance.workspace_id).eq('user_id', user.id)
+          .eq('workspace_id', instance.workspace_id).eq('user_id', authedUserId)
           .eq('active', true).eq('role', 'founder').limit(1),
       ]);
@@ -430,5 +440,5 @@ Deno.serve(async (req) => {
       }
 
-      userId = user.id;
+      userId = authedUserId;
     } else {
       userId = instance.submitted_by ?? null;
@@ -474,5 +484,6 @@ Deno.serve(async (req) => {
       .single();
 
-    const periodMonth = startOfMonth(new Date());
+    // O período é o mês da submissão, não o de agora: um reenvio/retry tardio não pode gravar noutro mês.
+    const periodMonth = startOfMonth(instance.submitted_at ? new Date(instance.submitted_at) : new Date());
     const results: WriteBackResult[] = [];
 
@@ -533,14 +544,24 @@ Deno.serve(async (req) => {
     }
 
-    // Re-running the survey replaces the previous audit rows for the instance.
-    await supabase.from('survey_writebacks').delete().eq('instance_id', instanceId);
-    await supabase.from('survey_writebacks').insert(
-      results.map((result) => ({
+    // Re-running the survey updates the audit rows, but never downgrades a row that
+    // already recorded an applied write ("anterior: ..." is the only undo information).
+    const { data: previousRows, error: previousError } = await supabase
+      .from('survey_writebacks').select('question_id, status').eq('instance_id', instanceId);
+    if (previousError) throw previousError;
+    const alreadyApplied = new Set((previousRows ?? []).filter((r) => r.status === 'applied').map((r) => r.question_id));
+    const auditRows = results
+      .filter((result) => !(result.status === 'skipped' && alreadyApplied.has(result.question_id)))
+      .map((result) => ({
         ...result,
         instance_id: instanceId,
         workspace_id: instance.workspace_id,
         applied_by: userId,
-      })),
-    );
+      }));
+    if (auditRows.length > 0) {
+      const { error: auditError } = await supabase
+        .from('survey_writebacks')
+        .upsert(auditRows, { onConflict: 'instance_id,question_id' });
+      if (auditError) throw auditError;
+    }
 
     const applied = results.filter((r) => r.status === 'applied').length;
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## check-missed-milestones: o 2.º marco em atraso perde o item da fila (ids: ED1-08, SCH-17)
**Gravidade:** LOW. **Quem é afetado:** consultor e admin (fila de trabalho do staff).
**Problema:** `staff_work_queue_items` tem o índice único `idx_work_queue_unique_active (workspace_id, type)` para itens `open`/`in_progress`. Quando um workspace tem 2 marcos em atraso (ou já existe um item aberto), o `INSERT` do 2.º falha com 23505 e `check-missed-milestones/index.ts:141-157` só testa `!alertError && alertData`: o marco fica `delayed`, cria-se a ação e envia-se o Teams, mas a fila só mostra um marco. O `fetch` ao `teams-notify` (`:20-32`) não tem timeout e é sequencial, pelo que um pedido pendurado bloqueia o cron inteiro. O erro do `UPDATE ... 'delayed'` (`:135-138`) também é ignorado.
**Correção:** o item novo passa a levar `evidence_json: { milestone_ids: [id] }`; no 23505 lê-se o item aberto do workspace, junta-se o id do marco a `evidence_json.milestone_ids` e atualizam-se `title`/`description` para "Milestones em atraso (N)" (outros erros são registados com `log.warn`); o `fetch` ganha `AbortSignal.timeout(10_000)`; o erro do `UPDATE` é registado. O fallback do URL da aplicação passa a `PUBLIC_APP_URL || APP_URL || https://fb.startupleiria.com`.
**Alterar `supabase/functions/check-missed-milestones/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/check-missed-milestones/index.ts
+++ b/supabase/functions/check-missed-milestones/index.ts
@@ -30,4 +30,5 @@ async function sendTeamsNotification(
         payload,
       }),
+      signal: AbortSignal.timeout(10_000), // um teams-notify pendurado não pode bloquear o cron inteiro
     });
     if (!response.ok) {
@@ -133,8 +134,9 @@ Deno.serve(withCronRunLogging('check-missed-milestones', async (req) => {
 
       // Mark milestone as delayed
-      await supabase
+      const { error: delayErr } = await supabase
         .from('milestones')
         .update({ status: 'delayed' })
         .eq('id', milestone.id);
+      if (delayErr) log.error('Error marking milestone delayed', delayErr, { milestoneId: milestone.id });
 
       // Create workspace alert
@@ -149,4 +151,5 @@ Deno.serve(withCronRunLogging('check-missed-milestones', async (req) => {
           status: 'open',
           related_milestone_id: milestone.id,
+          evidence_json: { milestone_ids: [milestone.id] },
         })
         .select()
@@ -155,8 +158,34 @@ Deno.serve(withCronRunLogging('check-missed-milestones', async (req) => {
       if (!alertError && alertData) {
         createdAlerts.push(alertData.id);
+      } else if (alertError?.code === '23505') {
+        // idx_work_queue_unique_active: só 1 item aberto 'milestone_missed' por workspace.
+        // Em vez de perder o 2.º milestone em atraso, acrescenta-o à evidência do item aberto.
+        const { data: openItem } = await supabase
+          .from('staff_work_queue_items')
+          .select('id, evidence_json')
+          .eq('workspace_id', milestone.workspace_id)
+          .eq('type', 'milestone_missed')
+          .in('status', ['open', 'in_progress'])
+          .limit(1)
+          .maybeSingle();
+        if (openItem) {
+          const evidence = (openItem.evidence_json ?? {}) as { milestone_ids?: string[] };
+          const ids = Array.from(new Set([...(evidence.milestone_ids ?? []), milestone.id]));
+          const { error: mergeErr } = await supabase
+            .from('staff_work_queue_items')
+            .update({
+              title: `Milestones em atraso (${Math.max(ids.length, 2)})`,
+              description: `Há ${Math.max(ids.length, 2)} milestones com a data-alvo ultrapassada neste workspace.`,
+              evidence_json: { ...evidence, milestone_ids: ids },
+            })
+            .eq('id', openItem.id);
+          if (mergeErr) log.warn('work_queue_merge_failed', { milestoneId: milestone.id, error: mergeErr.message });
+        }
+      } else if (alertError) {
+        log.warn('work_queue_insert_failed', { milestoneId: milestone.id, error: alertError.message });
       }
 
       // Send Teams notification for action overdue
-      const appUrl = Deno.env.get('APP_URL') || 'https://startupleiria.app';
+      const appUrl = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('APP_URL') || 'https://fb.startupleiria.com';
       const teamsSent = await sendTeamsNotification(
         supabaseUrl,
```



## createLogger.error perde o contexto em 13 chamadores (ids: HRD-10, ED4-11, ED1-11)
**Gravidade:** LOW. **Quem é afetado:** quem diagnostica incidentes (admin, equipa técnica).
**Problema:** `_shared/security.ts:66-70` define `error(msg, error?, data?)` e faz `String(error)` quando o 2.º argumento não é um `Error`. Treze chamadores passam o contexto como 2.º argumento (`{ status, errText }`, `{ error: msg }`, erros do PostgREST): `analyze-contract/index.ts:176,222`, `analyze-contract-document/index.ts:54,172,209`, `check-consultant-availability/index.ts:248,285`, `validate-booking-slot/index.ts:197`, `send-message-email-alert/index.ts:174`, `sweep-session-transcripts/index.ts:194`, `transcribe-audio/index.ts:100`, `staff-assign-workspace-to-contract/index.ts:223`, `send-announcement-email/index.ts:247`. O log sai com `errMsg:"[object Object]"` e perde-se o estado HTTP e o texto de erro do gateway de IA. `log.error('x')` sem erro também gravava `errMsg:"undefined"`.
**Correção:** (diff em `security.ts`, na primeira secção deste domínio) um objeto simples (não `Error`, não array) passa a ser espalhado no JSON do log e `errMsg` fica com `message` se for texto, ou `see fields`; `Error` mantém `errMsg`/`errName`; `undefined`/`null` já não geram `errMsg`; `level` e `msg` ficam sempre por último para um objeto de contexto não os poder sobrescrever. Não é preciso mexer nos chamadores (em `send-message-email-alert` passámos `err` em vez de `{ err: String(err) }`). Cuidado habitual: não passe segredos como contexto. As partes de `analyze-contract` do achado ED1-11 (limite de pedidos de IA, UUID, timeout, `JSON.parse` dentro de `try`) estão na secção do domínio dono desse ficheiro.

---

## send-session-invite recusa o lote inteiro por um destinatário (ids: HRD-13)
**Gravidade:** LOW. **Quem é afetado:** consultor, founder (quem cria ou reagenda sessões).
**Problema:** `selectSessionRecipients` (`_shared/sessionRecipients.ts:4-15`) lança `recipient_not_authorized` (403) se QUALQUER endereço pedido estiver fora do conjunto registado. O cliente envia os emails de todos os membros do workspace (`CreateSessionDialog.tsx:469-480`); o servidor só considera perfis `approved` e membros ativos (`:34`). Um único membro pendente ou inativo faz perder o convite de todos, e o cliente só faz `logger.error` e mostra "sessão criada".
**Correção:** nova `intersectSessionRecipients(requested, allowed)` que devolve `{ recipients, skipped }` (o que está fora do conjunto é descartado e contado; lista malformada continua a lançar `invalid_recipients`). `send-session-invite/index.ts` usa-a: só devolve 403 se não sobrar nenhum destinatário e houve descartados; a resposta ganha `skipped`. `selectSessionRecipients` continua exportada (usada por `send-session-followup`, `send-survey-invites` e pelos testes). O cliente (`CreateSessionDialog.tsx`) continua a não mostrar o erro: cabe ao domínio do front-end.
**Alterar `supabase/functions/_shared/sessionRecipients.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/_shared/sessionRecipients.ts
+++ b/supabase/functions/_shared/sessionRecipients.ts
@@ -15,4 +15,21 @@ export function selectSessionRecipients(requested: unknown, allowed: string[]):
 }
 
+/**
+ * Like selectSessionRecipients, but addresses outside the server-recorded set are
+ * dropped (and counted) instead of rejecting the whole batch. A malformed list still throws.
+ */
+export function intersectSessionRecipients(requested: unknown, allowed: string[]): { recipients: string[]; skipped: number } {
+  const normalize = (value: string) => value.trim().toLowerCase();
+  const known = new Set(allowed.map(normalize).filter(Boolean));
+  if (requested == null) return { recipients: [...known], skipped: 0 };
+  if (!Array.isArray(requested) || requested.length > 50 || requested.some(value =>
+    typeof value !== 'string' || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))) {
+    throw new Error('invalid_recipients');
+  }
+  const unique = [...new Set(requested.map(normalize))];
+  const recipients = unique.filter(email => known.has(email));
+  return { recipients, skipped: unique.length - recipients.length };
+}
+
 export async function getSessionRecipientEmails(admin: SupabaseClient, sessionId: string, workspaceId: string): Promise<string[]> {
   const [members, participants, session, workspace] = await Promise.all([
```

**Alterar `supabase/functions/send-session-invite/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-session-invite/index.ts
+++ b/supabase/functions/send-session-invite/index.ts
@@ -3,5 +3,5 @@ import { Resend } from "npm:resend@4.0.0";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { isAccountActive } from '../_shared/security.ts';
-import { getSessionRecipientEmails, selectSessionRecipients } from '../_shared/sessionRecipients.ts';
+import { getSessionRecipientEmails, intersectSessionRecipients } from '../_shared/sessionRecipients.ts';
 
 const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
@@ -249,7 +249,11 @@ serve(async (req) => {
     }
     
+    let skippedRecipients = 0;
     try {
-      payload.recipientEmails = selectSessionRecipients(payload.recipientEmails,
+      const selected = intersectSessionRecipients(payload.recipientEmails,
         await getSessionRecipientEmails(supabaseService, payload.sessionId, payload.workspaceId));
+      if (selected.recipients.length === 0 && selected.skipped > 0) throw new Error('recipient_not_authorized');
+      payload.recipientEmails = selected.recipients;
+      skippedRecipients = selected.skipped;
     } catch (error) {
       const lookupFailed = error instanceof Error && error.message === 'recipient_lookup_failed';
@@ -447,4 +451,5 @@ serve(async (req) => {
       JSON.stringify({ 
         message: `Sent ${successCount} invites`,
+        skipped: skippedRecipients,
         results 
       }),
```

---

## Emails de intake: assunto com escape HTML e `email_log.recipients` gravado como texto (ids: CRM-06)
**Gravidade:** LOW. **Quem é afetado:** anónimo (lead que recebe o email), staff.
**Problema:** `supabase/functions/send-intake-email/index.ts:143` reutiliza `safeOrg` (já com escape HTML) no assunto: `Silva & Filhos, Lda` chega como `Silva &amp; Filhos, Lda`. `send-intake-email/index.ts:267` e `send-commercial-proposal/index.ts:517` gravam `recipients: JSON.stringify([...])` numa coluna `jsonb`, ou seja uma string em vez de um array (as outras funções gravam arrays), o que parte `jsonb_array_elements`.
**Correção:** o assunto usa o nome sem escape (só com as quebras de linha removidas; `safeOrg` continua no HTML) e `recipients` passa a array. Fazer deploy das duas funções.
**Alterar `supabase/functions/send-intake-email/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-intake-email/index.ts
+++ b/supabase/functions/send-intake-email/index.ts
@@ -141,5 +141,6 @@ Deno.serve(async (req) => {
 
     if (type === 'intake_request') {
-      subject = `${safeOrg ? safeOrg + ' — ' : ''}Pedido de Contratação — Startup Leiria`
+      // O assunto é texto simples: sem escape HTML (senão 'Silva & Filhos' chega como 'Silva &amp; Filhos')
+      subject = `${organizationName ? String(organizationName).replace(/[\r\n]+/g, ' ') + ' — ' : ''}Pedido de Contratação — Startup Leiria`
       html = `
         <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
@@ -265,5 +266,5 @@ Deno.serve(async (req) => {
           email_type: `intake_${type}`,
           subject,
-          recipients: JSON.stringify([recipientEmail]),
+          recipients: [recipientEmail],
           status: 'sent',
           sent_at: new Date().toISOString(),
```

**Alterar `supabase/functions/send-commercial-proposal/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-commercial-proposal/index.ts
+++ b/supabase/functions/send-commercial-proposal/index.ts
@@ -515,5 +515,5 @@ Deno.serve(async (req) => {
         email_type: 'commercial_proposal',
         subject: body.subject,
-        recipients: JSON.stringify([item.contact_email]),
+        recipients: [item.contact_email],
         status: 'sent',
         sent_at: nowIso,
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## send-notification-email: o nome do documento vai sempre "documento" (ids: SCH-10)
**Gravidade:** LOW. **Quem é afetado:** consultor e founder (emails de revisão de documento).
**Problema:** `send-notification-email/index.ts:364-365` faz `select('title, name')` em `documents`, que não tem `title`: o erro 42703 deixa `data = null` e `docName` fica `documento` no assunto, corpo e Slack de `document_review_requested`/`document_review_approved`.
**Correção:** `select('name')` com `.eq('workspace_id', workspaceId)` (um `document_id` de outro workspace não pode aparecer no email) e `maybeSingle()`; sem `workspaceId` não se consulta (falha fechada, mantém `documento`).
**Alterar `supabase/functions/send-notification-email/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-notification-email/index.ts
+++ b/supabase/functions/send-notification-email/index.ts
@@ -361,7 +361,7 @@ async function handle(supabase: any, log: any, body: NotificationRequest): Promi
   if (type === 'document_review_requested' || type === 'document_review_approved') {
     let docName = 'documento';
-    if (body.document_id) {
-      const { data } = await supabase.from('documents').select('title, name').eq('id', body.document_id).single();
-      docName = (data as any)?.title ?? (data as any)?.name ?? docName;
+    if (body.document_id && workspaceId) {
+      const { data } = await supabase.from('documents').select('name').eq('id', body.document_id).eq('workspace_id', workspaceId).maybeSingle();
+      docName = (data as any)?.name ?? docName;
     }
     if (type === 'document_review_requested') {
```



## generate-first-contact-brief: colunas inexistentes (ids: SCH-11)
**Gravidade:** LOW. **Quem é afetado:** consultor e admin (hoje a função não tem chamador na UI, por isso o impacto atual é nulo).
**Problema:** o select de `funnel_items` (`generate-first-contact-brief/index.ts:135`) pede `phone` (a coluna é `contact_phone`): a função responde sempre 404 `not_found`. O select de `communication_log` (`:146`) pede `kind` e `summary` (as colunas são `activity_type` e `preview`).
**Correção:** `contact_phone` nas linhas 43, 135 e 169 e `activity_type, direction, subject, preview, occurred_at, original_timestamp` na 146. O diff está na primeira secção deste domínio (ficheiro único, ver acima).

---

## sync-graph-email-history falha em todas as mensagens fora do dry-run (ids: SCH-13, DBP-03)
**Gravidade:** LOW. **Quem é afetado:** staff (importação do histórico de email do Graph; hoje a UI só usa `dry_run:true`, por isso o estrago é latente).
**Problema:** `sync-graph-email-history/index.ts:331-351` faz `.upsert(..., { onConflict: 'external_source,external_id', ignoreDuplicates: true })` e os índices únicos sobre esse par são parciais: 42P10 em todas as mensagens, `result.errors` enche-se de `Insert error` e nada é gravado. A migração do domínio SQL (`rc12_conflict_targets`) recria o índice completo, o que já basta.
**Correção:** `.insert({...})` sem `onConflict`; duplicados caem no ramo `23505` → `skipped` que já existe. Assim a função funciona com ou sem a migração, independentemente da ordem de aplicação (testámos na base: o segundo `INSERT` do mesmo `ms_graph/external_id` dá 23505 `idx_communication_log_external_dedupe`).
**Alterar `supabase/functions/sync-graph-email-history/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/sync-graph-email-history/index.ts
+++ b/supabase/functions/sync-graph-email-history/index.ts
@@ -327,8 +327,9 @@ Deno.serve(async (req) => {
           }
 
-          // Upsert into communication_log
+          // Insert into communication_log (the unique indexes on external_source/external_id are
+          // partial, so ON CONFLICT cannot be inferred: duplicates come back as 23505 -> skipped)
           const { error } = await supabase
             .from('communication_log')
-            .upsert({
+            .insert({
               workspace_id: workspace_id || null,
               funnel_item_id: funnel_item_id || null,
@@ -347,7 +348,4 @@ Deno.serve(async (req) => {
                 cc: msg.ccRecipients?.map((r: any) => r.emailAddress?.address),
               },
-            }, {
-              onConflict: 'external_source,external_id',
-              ignoreDuplicates: true,
             });
```

---

## run-workflow-rules: tarefas de staff sem assignee_id (ids: SCH-14)
**Gravidade:** LOW. **Quem é afetado:** consultor, admin (a função está dormente: `docs/rc5/dead-edge-functions.md`).
**Problema:** a ação `create_staff_task` (`run-workflow-rules/index.ts:185-194`) insere em `staff_tasks` sem `assignee_id`, que é `NOT NULL` sem default: 23502 em todas as tarefas, e o erro só vai para `actionResult.error`.
**Correção:** o select de workspaces ganha `assigned_consultor_id` (e a interface `Workspace`); a tarefa é atribuída a esse consultor, e sem consultor atribuído a ação devolve `{ executed: false, error: 'workspace_has_no_assigned_consultor' }`.
**Alterar `supabase/functions/run-workflow-rules/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/run-workflow-rules/index.ts
+++ b/supabase/functions/run-workflow-rules/index.ts
@@ -21,4 +21,5 @@ interface Workspace {
   health_status: string | null;
   status: string;
+  assigned_consultor_id: string | null;
 }
 
@@ -58,5 +59,5 @@ Deno.serve(async (req: Request) => {
     const { data: workspaces, error: wsError } = await supabase
       .from('workspaces')
-      .select('id, program_id, health_status, status')
+      .select('id, program_id, health_status, status, assigned_consultor_id')
       .eq('status', 'active');
 
@@ -183,8 +184,14 @@ Deno.serve(async (req: Request) => {
           switch (actionType) {
             case 'create_staff_task': {
+              // staff_tasks.assignee_id is NOT NULL: the task goes to the workspace's assigned consultant.
+              if (!workspace.assigned_consultor_id) {
+                actionResult = { executed: false, error: 'workspace_has_no_assigned_consultor' };
+                break;
+              }
               const { data: task, error: taskError } = await supabase
                 .from('staff_tasks')
                 .insert({
                   workspace_id: workspace.id,
+                  assignee_id: workspace.assigned_consultor_id,
                   title: `[Auto] ${rule.actions_json.task_template || 'Follow-up required'}`,
                   description: `Triggered by workflow rule: ${rule.trigger_type}. Context: ${JSON.stringify(actionContext)}`,
```

---

## run-ecosystem-snapshot: paginação sem ORDER BY (ids: OPS-11)
**Gravidade:** LOW. **Quem é afetado:** admin (exportação diária do ecossistema).
**Problema:** `run-ecosystem-snapshot/index.ts:121-124` lê cada tabela em páginas de 1000 com `.range()` sem ordenar; com escritas concorrentes o Postgres pode repetir ou saltar linhas entre páginas, e a contagem e o checksum do manifesto "validam" um ficheiro incompleto. (Os snapshots nunca são apagados e só cobrem 10 tabelas: a retenção e a cobertura são decisões de produto, ver PITR; não alteradas aqui.)
**Correção:** `.order('id', { ascending: true })` antes de `.range(from, to)` (as 10 fontes têm coluna `id`).
**Alterar `supabase/functions/run-ecosystem-snapshot/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/run-ecosystem-snapshot/index.ts
+++ b/supabase/functions/run-ecosystem-snapshot/index.ts
@@ -122,4 +122,5 @@ Deno.serve(withCronRunLogging('run-ecosystem-snapshot', async (req) => {
           .from(domain.table)
           .select('*')
+          .order('id', { ascending: true })
           .range(from, to);
```

---

## Fallbacks de URL da aplicação inconsistentes (ids: SCH-17)
**Gravidade:** LOW. **Quem é afetado:** founder, consultor e admin (links em notificações e emails de digest/anúncio).
**Problema:** 16 funções usam `PUBLIC_APP_URL || 'https://fb.startupleiria.com'`, mas `recompute-health-scores/index.ts:21`, `calendar-feed/index.ts:201`, `check-missed-milestones/index.ts:160` e `sync-outlook-calendar/index.ts:467` usam `APP_URL || 'https://startupleiria.app'`, e `send-email-digest/index.ts:8` e `send-announcement-email/index.ts:8` usam `SITE_URL || 'https://startupleiria.com'`. Se `APP_URL`/`SITE_URL` não estiverem definidas em produção, os links apontam para outro domínio.
**Correção:** os quatro primeiros passam a `PUBLIC_APP_URL || APP_URL || 'https://fb.startupleiria.com'` e os dois digests a `PUBLIC_APP_URL || SITE_URL || 'https://fb.startupleiria.com'`. Confirme que `fb.startupleiria.com` é o domínio canónico; se não for, use o correto nos 6 sítios. Os diffs de `calendar-feed`, `check-missed-milestones` e `sync-outlook-calendar` estão nas secções acima.
**Alterar `supabase/functions/recompute-health-scores/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/recompute-health-scores/index.ts
+++ b/supabase/functions/recompute-health-scores/index.ts
@@ -19,5 +19,5 @@ async function sendTeamsHealthAlert(
 ) {
   try {
-    const appUrl = Deno.env.get('APP_URL') || 'https://startupleiria.app';
+    const appUrl = Deno.env.get('PUBLIC_APP_URL') || Deno.env.get('APP_URL') || 'https://fb.startupleiria.com';
     const response = await fetch(`${supabaseUrl}/functions/v1/teams-notify`, {
       method: 'POST',
```

**Alterar `supabase/functions/send-email-digest/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-email-digest/index.ts
+++ b/supabase/functions/send-email-digest/index.ts
@@ -6,5 +6,5 @@ import { withCronRunLogging } from '../_shared/cronRun.ts';
 const FUNCTION_NAME = 'send-email-digest';
 const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
-const SITE_URL = Deno.env.get("SITE_URL") || "https://startupleiria.com";
+const SITE_URL = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://fb.startupleiria.com";
 
 type Locale = 'pt' | 'en';
```

**Alterar `supabase/functions/send-announcement-email/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/send-announcement-email/index.ts
+++ b/supabase/functions/send-announcement-email/index.ts
@@ -6,5 +6,5 @@ import { resolveLocalesByEmails, type Locale } from '../_shared/i18n.ts';
 const FUNCTION_NAME = 'send-announcement-email';
 const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
-const SITE_URL = Deno.env.get("SITE_URL") || "https://startupleiria.com";
+const SITE_URL = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://fb.startupleiria.com";
 
 interface AnnouncementRequest { announcement_ids: string[]; }
```

---

## copilot-apply-playbook: o preflight não reflete o RLS e reaplicar o playbook devolve 500 (id: ED1-09)
**Gravidade:** LOW. **Quem é afetado:** team_member e backoffice (recebem 500 com texto de RLS); qualquer papel ao reaplicar o mesmo playbook.
**Problema:** o preflight de `copilot-apply-playbook/index.ts:43-64` aceita qualquer membro ativo e qualquer staff (incluindo backoffice), mas o RLS de `milestones`/`action_items` exige `can_write_workspace`, falso para team_member e backoffice: recebem 500 com `new row violates row-level security policy for table "milestones"`. Aplicar o mesmo playbook duas vezes cria um milestone, falha as ações com 23505 (`action_items_workspace_source_deliverable_uniq`), apaga o milestone e devolve 500 com o nome da constraint no toast (`:120-125`). `due_offset_days` enorme ou negativo gera Date inválida (`:29`), `playbook_key` `__proto__`/`constructor` passa o `if (!playbook)` (`:38`) e o erro do rollback do milestone é ignorado.
**Correção:** `workspace_id` validado como UUID; `due_offset_days` inteiro entre 0 e 365 (senão 14); `hasOwnProperty` no catálogo (404); preflight com `rpc('can_write_workspace')` (o mesmo predicado do RLS: 403 em PT-PT se for falso, 500 `Could not verify workspace access` se a RPC falhar); pré-verificação por `source_deliverable_key` (`playbook:<chave>:%`) com 409 `ALREADY_APPLIED`; 42501 passa a 403 e 23505 a 409; o erro do DELETE de rollback é registado; mensagens genéricas em vez de `aiErr.message`/`e.message`. Nota: `invokeWithAuth` mostra "403: Access denied (copilot-apply-playbook)" para 403 (texto genérico já existente) e a mensagem em PT-PT para o 409.
**Alterar `supabase/functions/copilot-apply-playbook/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/copilot-apply-playbook/index.ts
+++ b/supabase/functions/copilot-apply-playbook/index.ts
@@ -4,4 +4,6 @@ import { handleCorsOptions, corsJsonResponse } from "../_shared/cors.ts";
 import { PLAYBOOK_CATALOG, type PlaybookKey } from "../_shared/playbook-catalog.ts";
 
+const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
+
 serve(async (req: Request) => {
   if (req.method === "OPTIONS") return handleCorsOptions(req);
@@ -27,39 +29,43 @@ serve(async (req: Request) => {
     const playbookKey = body.playbook_key as PlaybookKey;
     const workspaceId = body.workspace_id as string;
-    const dueOffsetDays = Number.isFinite(body.due_offset_days) ? body.due_offset_days : 14;
+    const dueOffsetDays = Number.isInteger(body.due_offset_days) && body.due_offset_days >= 0 && body.due_offset_days <= 365
+      ? body.due_offset_days
+      : 14;
 
     if (!playbookKey || typeof playbookKey !== "string") {
       return corsJsonResponse({ error: "playbook_key is required" }, req, 400);
     }
-    if (!workspaceId || typeof workspaceId !== "string") {
-      return corsJsonResponse({ error: "workspace_id is required" }, req, 400);
+    if (!workspaceId || typeof workspaceId !== "string" || !UUID_RE.test(workspaceId)) {
+      return corsJsonResponse({ error: "workspace_id must be a UUID" }, req, 400);
     }
 
+    if (!Object.prototype.hasOwnProperty.call(PLAYBOOK_CATALOG, playbookKey)) {
+      return corsJsonResponse({ error: "Unknown playbook" }, req, 404);
+    }
     const playbook = PLAYBOOK_CATALOG[playbookKey];
-    if (!playbook) {
-      return corsJsonResponse({ error: `Unknown playbook: ${playbookKey}` }, req, 404);
+
+    // Pré-verificação com o MESMO predicado do RLS de milestones/action_items (can_write_workspace):
+    // evita o 500 com mensagem de RLS para team_member/backoffice (membros ou staff sem escrita).
+    const { data: canWrite, error: canWriteErr } = await supabase.rpc("can_write_workspace", {
+      _workspace_id: workspaceId,
+    });
+    if (canWriteErr) {
+      console.error("can_write_workspace failed:", canWriteErr.message);
+      return corsJsonResponse({ error: "Could not verify workspace access" }, req, 500);
+    }
+    if (canWrite !== true) {
+      return corsJsonResponse({ error: "Sem permissão de escrita neste workspace." }, req, 403);
     }
 
-    // RLS will gate writes via can_write_workspace; do a friendly preflight.
-    const { data: access } = await supabase
-      .from("workspace_users")
-      .select("workspace_id, role")
-      .eq("user_id", user.id)
+    // Idempotência: o mesmo playbook não se aplica duas vezes ao mesmo workspace
+    // (índice único action_items_workspace_source_deliverable_uniq).
+    const { data: alreadyApplied } = await supabase
+      .from("action_items")
+      .select("id")
       .eq("workspace_id", workspaceId)
-      .eq("active", true)
-      .maybeSingle();
-
-    // Staff (admin/consultor/backoffice) can write all workspaces via RLS; only block clear non-members
-    if (!access) {
-      const { data: roles } = await supabase
-        .from("user_roles")
-        .select("role")
-        .eq("user_id", user.id);
-      const isStaff = (roles || []).some((r: any) =>
-        ["admin", "consultor", "backoffice"].includes(r.role)
-      );
-      if (!isStaff) {
-        return corsJsonResponse({ error: "No access to this workspace" }, req, 403);
-      }
+      .like("source_deliverable_key", `playbook:${playbookKey}:%`)
+      .limit(1);
+    if (alreadyApplied && alreadyApplied.length > 0) {
+      return corsJsonResponse({ error: "Este playbook já foi aplicado a este workspace.", code: "ALREADY_APPLIED" }, req, 409);
     }
 
@@ -87,8 +93,9 @@ serve(async (req: Request) => {
     if (msErr || !milestone) {
       console.error("milestone insert failed:", msErr?.message);
+      const denied = msErr?.code === "42501";
       return corsJsonResponse(
-        { error: msErr?.message || "Could not create milestone" },
+        { error: denied ? "Sem permissão de escrita neste workspace." : "Could not create milestone" },
         req,
-        500
+        denied ? 403 : 500
       );
     }
@@ -121,6 +128,10 @@ serve(async (req: Request) => {
       console.error("action_items insert failed:", aiErr.message);
       // Roll back milestone to avoid orphan
-      await supabase.from("milestones").delete().eq("id", milestone.id);
-      return corsJsonResponse({ error: aiErr.message }, req, 500);
+      const { error: rollbackErr } = await supabase.from("milestones").delete().eq("id", milestone.id);
+      if (rollbackErr) console.error("milestone rollback failed:", milestone.id, rollbackErr.message);
+      if (aiErr.code === "23505") {
+        return corsJsonResponse({ error: "Este playbook já foi aplicado a este workspace.", code: "ALREADY_APPLIED" }, req, 409);
+      }
+      return corsJsonResponse({ error: "Could not create playbook actions" }, req, 500);
     }
 
@@ -137,5 +148,5 @@ serve(async (req: Request) => {
   } catch (e: any) {
     console.error("copilot-apply-playbook error:", e?.message);
-    return corsJsonResponse({ error: e?.message || "Internal error" }, req, 500);
+    return corsJsonResponse({ error: "Internal error" }, req, 500);
   }
 });
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## export-cohort-health-pdf: histórico truncado a 1000 linhas e erros de consulta ignorados (id: ED2-09)
**Gravidade:** LOW. **Quem é afetado:** admin, consultor, backoffice (a função não tem chamador em `src/` hoje).
**Problema:** `export-cohort-health-pdf/index.ts:98-129` consulta `workspace_health_history` sem paginar: há 1 snapshot por workspace por dia, por isso 34 workspaces em 30 dias já passam de 1000 linhas e o PostgREST corta os dias mais recentes (ordem ascendente), dando "Pontuação Final" e variações erradas sem aviso. Os erros das consultas de workspaces e histórico são ignorados (relatório vazio como se fosse verdade), o papel só aceita admin/consultor (backoffice excluído, ao contrário do cliente), não há `isAccountActive` e datas inválidas dão 500 com a mensagem interna (`:332-335`).
**Correção:** histórico lido por páginas de 1000 (`order computed_at, id` + `range`), erros de workspaces/histórico lançados, backoffice aceite, `isAccountActive` (403), `program_id` validado como UUID (400), intervalo de datas inválido ou invertido (400) e 500 genérico `Internal server error`.
**Alterar `supabase/functions/export-cohort-health-pdf/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/export-cohort-health-pdf/index.ts
+++ b/supabase/functions/export-cohort-health-pdf/index.ts
@@ -4,4 +4,6 @@ import { getCorsHeaders, handleCorsOptions, corsJsonResponse } from '../_shared/
 import { normalizeLocale, pickLang, type Locale } from '../_shared/i18n.ts';
 import { escapeHtml, REPORT_CSP_META } from '../_shared/html.ts';
+import { isAccountActive } from '../_shared/security.ts';
+import { validateUUID } from '../_shared/validation.ts';
 
 const T = {
@@ -70,15 +72,24 @@ serve(async (req) => {
       .eq("user_id", user.id);
 
-    const isStaff = roles?.some(r => r.role === "admin" || r.role === "consultor");
+    const isStaff = roles?.some(r => r.role === "admin" || r.role === "consultor" || r.role === "backoffice");
     if (!isStaff) {
       return corsJsonResponse({ error: "Forbidden" }, req, 403);
     }
+    if (!(await isAccountActive(supabase, user.id))) {
+      return corsJsonResponse({ error: "Forbidden" }, req, 403);
+    }
 
-    const body: ExportRequest = await req.json();
-    const { program_id, start_date, end_date } = body;
+    const body: ExportRequest = await req.json().catch(() => ({} as ExportRequest));
+    const programCheck = validateUUID(body?.program_id, 'program_id');
+    if (!programCheck.valid) return corsJsonResponse({ error: programCheck.error }, req, 400);
+    const program_id = programCheck.value!;
+    const { start_date, end_date } = body;
 
     const now = new Date();
     const startDate = start_date ? new Date(start_date) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
     const endDate = end_date ? new Date(end_date) : now;
+    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
+      return corsJsonResponse({ error: "Invalid date range" }, req, 400);
+    }
 
     console.log(`Exporting cohort health for program: ${program_id}`);
@@ -96,5 +107,5 @@ serve(async (req) => {
 
     // Get workspaces for this program
-    const { data: workspacesRaw } = await supabase
+    const { data: workspacesRaw, error: workspacesError } = await supabase
       .from("workspaces")
       .select(`
@@ -109,4 +120,6 @@ serve(async (req) => {
       .order("health_score_numeric", { ascending: true });
 
+    if (workspacesError) throw workspacesError;
+
     // Helper to get startup name (supabase returns joined data as array)
     const getStartupName = (ws: any): string => {
@@ -121,11 +134,24 @@ serve(async (req) => {
 
     // Get health history for the period
-    const { data: historyData } = await supabase
-      .from("workspace_health_history")
-      .select("workspace_id, score_numeric, label, computed_at")
-      .in("workspace_id", workspaceIds)
-      .gte("computed_at", startDate.toISOString())
-      .lte("computed_at", endDate.toISOString())
-      .order("computed_at", { ascending: true });
+    // PostgREST devolve no máximo 1000 linhas por pedido (1 snapshot por workspace por dia):
+    // paginar, senão os últimos dias do período desaparecem e a variação sai errada.
+    const historyData: Array<{ workspace_id: string; score_numeric: number; label: string; computed_at: string }> = [];
+    if (workspaceIds.length > 0) {
+      const PAGE = 1000;
+      for (let from = 0; ; from += PAGE) {
+        const { data: page, error: historyError } = await supabase
+          .from("workspace_health_history")
+          .select("workspace_id, score_numeric, label, computed_at")
+          .in("workspace_id", workspaceIds)
+          .gte("computed_at", startDate.toISOString())
+          .lte("computed_at", endDate.toISOString())
+          .order("computed_at", { ascending: true })
+          .order("id", { ascending: true })
+          .range(from, from + PAGE - 1);
+        if (historyError) throw historyError;
+        historyData.push(...(page ?? []));
+        if (!page || page.length < PAGE) break;
+      }
+    }
 
     // Calculate distribution
@@ -332,6 +358,5 @@ serve(async (req) => {
   } catch (error: unknown) {
     console.error("Error in export-cohort-health-pdf:", error);
-    const message = error instanceof Error ? error.message : "Unknown error";
-    return corsJsonResponse({ error: message }, req, 500);
+    return corsJsonResponse({ error: "Internal server error" }, req, 500);
   }
 });
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## generate-financial-prefill pede colunas que não existem em workspaces (id: SCH-09)
**Gravidade:** LOW. **Quem é afetado:** founder (plano financeiro guiado, atrás de feature flag).
**Problema:** `generate-financial-prefill/index.ts:97-99` faz `select("id, name, stage, sector, program_type")` em `workspaces`, e nenhuma de `name`, `sector` e `program_type` existe: o erro é ignorado e `workspace` fica `null`. A fase vem só de `diagnostic.stage` (ou nada), por isso os valores por fase (headcount, salário, capex) caem quase sempre no escalão por defeito e o prompt de IA vai sem nome e sem setor (`:188`). As propostas ficam `pending` e o founder confirma, daí LOW.
**Correção:** `.select("id, stage, startup:startups(name)")` e `workspace: { name: (workspace?.startup as { name?: string } | null)?.name, stage, sector: diagnostic.sector }` no contexto enviado ao modelo.
**Alterar `supabase/functions/generate-financial-prefill/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/generate-financial-prefill/index.ts
+++ b/supabase/functions/generate-financial-prefill/index.ts
@@ -96,5 +96,5 @@ serve(async (req) => {
     ] = await Promise.all([
       supabase.from("workspaces")
-        .select("id, name, stage, sector, program_type")
+        .select("id, stage, startup:startups(name)")
         .eq("id", workspaceId).maybeSingle(),
       supabase.from("financial_plan_sessions")
@@ -186,5 +186,5 @@ serve(async (req) => {
       } else {
         const context = {
-          workspace: { name: workspace?.name, stage, sector: workspace?.sector ?? diagnostic.sector },
+          workspace: { name: (workspace?.startup as { name?: string } | null)?.name, stage, sector: diagnostic.sector },
           diagnostic,
           missing_keys: stillMissing,
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## dataroom-revoke-link: revogar de novo reescreve a data da revogação original (id: ED3-15)
**Gravidade:** LOW. **Quem é afetado:** founder, consultor, admin.
**Problema:** o UPDATE de `dataroom-revoke-link/index.ts:62-65` não restringe a links ainda ativos: se o utilizador clicar duas vezes (ou revogar um link já revogado), `revoked_at` passa a ser a data da última chamada, perdendo o momento real da revogação (auditoria do acesso de investidores).
**Correção:** acrescentar `.is('revoked_at', null)` ao UPDATE; a resposta continua `success: true` (idempotente).
**Alterar `supabase/functions/dataroom-revoke-link/index.ts`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/functions/dataroom-revoke-link/index.ts
+++ b/supabase/functions/dataroom-revoke-link/index.ts
@@ -63,5 +63,6 @@ Deno.serve(async (req: Request) => {
       .from('dataroom_share_links')
       .update({ revoked_at: new Date().toISOString() })
-      .eq('id', link_id);
+      .eq('id', link_id)
+      .is('revoked_at', null); // revogar de novo não reescreve a data da revogação original
 
     if (updateError) {
```

---

## Convite da sessão falha em silêncio no diálogo "Agendar sessão" (ids: HRD-13, parte cliente)
**Gravidade:** LOW. **Quem é afetado:** consultor e admin (quem cria sessões); founder e equipa (quem deixa de receber o convite sem ninguém saber).
**Problema:** `src/components/workspace/sessions/CreateSessionDialog.tsx:469-500` chama `send-session-invite`, só regista o erro com `logger.error` e mostra sempre "Sessão criada". Com a correção do servidor (secção HRD-13 do domínio das funções edge), a função devolve agora `skipped` (destinatários sem conta ativa, em vez de recusar o lote todo) e `results` (por email), mas o cliente continua a ignorá-los: os participantes que não receberam o convite não são avisados a ninguém.
**Correção:** novo ficheiro `sessionInviteOutcome.ts` com `getSessionInviteOutcome(resultado)`, que devolve `failed` (erro da chamada, ou todos os envios falharam), `partial` (soma de `skipped` com os envios falhados) ou `ok`. O diálogo mostra, depois de "Sessão criada", um aviso `notify.warn` (8 s) com o texto adequado; a exceção do `try` também gera o aviso de falha. A sessão continua a ser criada em qualquer dos casos. O teste `sessionInviteOutcome.test.ts` (8 casos) falha sem o ficheiro novo e passa com ele. Chaves novas de i18n (pt/en, juntar a `pt.json` e `en.json`): `sessions.createdInviteFailed` ("Sessão criada, mas não foi possível enviar os convites por email. Avise os participantes manualmente.") e `sessions.createdInvitePartial` ("Sessão criada, mas {{count}} destinatário(s) não receberam o convite por email (sem conta ativa ou envio falhado). Avise-os manualmente.").
**Alterar `src/components/workspace/sessions/CreateSessionDialog.tsx`** (diff; os números de linha são do ficheiro original):

```diff
--- a/src/components/workspace/sessions/CreateSessionDialog.tsx
+++ b/src/components/workspace/sessions/CreateSessionDialog.tsx
@@ -49,4 +49,5 @@ import { invokeWithAuth } from "@/lib/invokeWithAuth";
 import { useLocalFormDraft } from '@/hooks/useLocalFormDraft';
 import { DraftRestoredNotice } from '@/components/shared/DraftRestoredNotice';
+import { getSessionInviteOutcome } from './sessionInviteOutcome';
 
 interface CreateSessionDialogProps {
@@ -452,4 +453,6 @@ export function CreateSessionDialog({ workspaceId, open, onOpenChange }: CreateS
       });
 
+      // HRD-13: o convite por email não pode falhar em silêncio (a sessão já foi criada).
+      let inviteWarning: string | null = null;
       if (!logPast && sendInvites) {
 
@@ -478,5 +481,5 @@ export function CreateSessionDialog({ workspaceId, open, onOpenChange }: CreateS
 
           if (recipientEmails.length > 0) {
-            const { error } = await invokeWithAuth('send-session-invite', {
+            const inviteResult = await invokeWithAuth('send-session-invite', {
               body: {
                 sessionId: session.id,
@@ -494,10 +497,17 @@ export function CreateSessionDialog({ workspaceId, open, onOpenChange }: CreateS
             });
 
-            if (error) {
-              logger.error('Failed to send invites', {}, error);
+            if (inviteResult.error) {
+              logger.error('Failed to send invites', {}, inviteResult.error);
+            }
+            const inviteOutcome = getSessionInviteOutcome(inviteResult);
+            if (inviteOutcome.kind === 'failed') {
+              inviteWarning = t('sessions.createdInviteFailed', 'Sessão criada, mas não foi possível enviar os convites por email. Avise os participantes manualmente.');
+            } else if (inviteOutcome.kind === 'partial') {
+              inviteWarning = t('sessions.createdInvitePartial', 'Sessão criada, mas {{count}} destinatário(s) não receberam o convite por email (sem conta ativa ou envio falhado). Avise-os manualmente.', { count: inviteOutcome.notDelivered });
             }
           }
         } catch (emailError) {
           logger.error('Email sending error', {}, emailError);
+          inviteWarning = t('sessions.createdInviteFailed', 'Sessão criada, mas não foi possível enviar os convites por email. Avise os participantes manualmente.');
         }
       }
@@ -505,4 +515,5 @@ export function CreateSessionDialog({ workspaceId, open, onOpenChange }: CreateS
 
       notify.success(t('sessions.sessionCreated'));
+      if (inviteWarning) notify.warn(inviteWarning, { duration: 8000 });
       onOpenChange(false);
       resetForm();
```

**Criar `src/components/workspace/sessions/sessionInviteOutcome.ts`** (conteúdo exato):

```
/**
 * Traduz a resposta de `send-session-invite` no aviso que o CreateSessionDialog mostra (HRD-13).
 *
 * O servidor devolve `{ message, skipped, results: [{ email, success }] }`: `skipped` conta os
 * destinatários sem conta ativa (ignorados, já não recusam o lote) e `results` o envio por email.
 */
export type SessionInviteOutcome =
  | { kind: 'ok' }
  | { kind: 'failed' }
  | { kind: 'partial'; notDelivered: number };

export function getSessionInviteOutcome(
  result: { data?: unknown; error?: unknown } | null | undefined,
): SessionInviteOutcome {
  if (!result || result.error) return { kind: 'failed' };

  const data = (result.data ?? null) as { skipped?: unknown; results?: unknown } | null;
  const results = Array.isArray(data?.results) ? (data.results as Array<{ success?: unknown } | null>) : [];
  const failed = results.filter((r) => r?.success === false).length;
  if (results.length > 0 && failed === results.length) return { kind: 'failed' };

  const skippedRaw = Number(data?.skipped);
  const skipped = Number.isFinite(skippedRaw) && skippedRaw > 0 ? Math.floor(skippedRaw) : 0;
  const notDelivered = failed + skipped;
  return notDelivered > 0 ? { kind: 'partial', notDelivered } : { kind: 'ok' };
}
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*
## Botão "Gerar update" visível a mentores que recebem 403 (ids: ED2-06, parte cliente)
**Gravidade:** LOW (o achado ED2-06, MED, está corrigido no servidor; isto é só a interface). **Quem é afetado:** mentor externo (com NDA).
**Problema:** depois da correção de `generate-investor-update` e de `dataroom-create-link` (ambas passam a exigir `canMutateWorkspace`, isto é, `can_write_workspace`), o mentor deixa de poder escrever. Mas `src/components/workspace/DataroomTab.tsx:243` mostra o bloco com os botões "Gerar update" e "Criar link" a quem tem `canWrite`, e `src/pages/WorkspaceDetail.tsx:92` calcula `canWrite = isAdmin || isConsultor || isMentor || (...)`, ou seja, dá `canWrite` também ao mentor (passa por `DocumentsTab.tsx:474` até ao `DataroomTab`): o mentor carrega no botão e recebe 403.
**Correção:** uma só linha, `DataroomTab.tsx:243`: `{canWrite && (` passa a `{canWrite && !isMentor && (`. `isMentor` já é prop do componente (linha 47) e está em scope. Não mexe em `canWrite` para não afetar os outros separadores. O diff completo de `DataroomTab.tsx` (que inclui esta linha e a troca de texto da secção FEF-07) aparece uma só vez, na secção FEF-07 do domínio do front-end do founder; por isso não se repete aqui o marcador.
*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*



# PROMPT LOVABLE — RC12 · PARTE OPCIONAL 3 de 3 — Harness pgTAP local falha em PostgreSQL 16 e anula os… · Buckets de storage usados pelo código sem criação em… · .env.example sem as variáveis lidas pelas funções edge [LOW]

**Regras (as mesmas da Parte 1, em resumo):** aplique só o que está nesta parte; os diffs são `-U2` com números de linha do ficheiro ORIGINAL e, se um não aplicar, pare nessa secção e diga qual; "Criar" = ficheiro novo com o conteúdo exato; as migrações SQL são idempotentes, correm numa transação e os blocos `DO $guard$` abortam de propósito se a função real divergiu (devolva o `md5` e o `pg_get_functiondef`, nunca desative o guarda); não edite migrações existentes nem `types.ts`; publique as edge functions alteradas; no fim responda com as secções aplicadas, as não aplicadas (com razão) e qualquer erro, com o texto exato.

---

## Buckets de storage usados pelo código sem criação em migração (ids: SCH-16)
**Gravidade:** LOW. **Quem é afetado:** todos os papéis (avatares, logos, documentos do workspace, capturas de bugs) numa base nova ou restaurada de migrações; admin (census-run, exportação do modelo financeiro).
**Problema:** `workspace-documents`, `bug-report-screenshots`, `profile-avatars`, `startup-logos`, `template_assets`, `phc-extracts` e `admin-exports` têm políticas em migrações mas nenhum `INSERT INTO storage.buckets` (a migração `20260715125639`, do bucket de capturas de bugs, até diz "bucket is created via tool"). Numa base nova o upload dá "Bucket not found" e o `census-run` falha em `exception_upload_failed` (`supabase/functions/census-run/index.ts:200,349`).
**Correção:** migração nova que cria os sete buckets com `INSERT ... ON CONFLICT (id) DO NOTHING`: em produção, onde já existem, não altera nada (nem `public`, nem limites, nem tipos MIME). Flags `public`: `profile-avatars` e `startup-logos` = `true`, porque o cliente guarda `getPublicUrl()` (`src/pages/Settings.tsx:128-130`, `src/components/workspace/StartupSettingsTab.tsx:183-185`) e a migração `20260415224512` os trata como buckets públicos (retira só a listagem anónima); os outros cinco = `false` (leitura por URL assinada ou service role, e políticas só para autenticados, staff ou admin). Não consegui ler a base de produção, por isso estas flags vêm da leitura do código e das políticas: confirme com a consulta abaixo antes de aplicar numa base nova. Validada na réplica viva: `storage.buckets` de 9 para 16 linhas, 2.ª aplicação sem erro nem alteração, e um bucket preexistente com `public=true` mantém-se.
**Criar `supabase/migrations/20261103400000_rc12_storage_buckets.sql`** (conteúdo exato):

```sql
-- RC12 / SCH-16: buckets de storage usados pelo código que só existiam por políticas
-- (nenhuma migração os criava). Numa base nova ou restaurada de migrações o upload dava
-- 'Bucket not found' e o census-run falhava em exception_upload_failed.
--
-- Idempotente e sem efeito em produção: ON CONFLICT (id) DO NOTHING não altera nenhum bucket
-- que já exista (flag public, limites e tipos MIME ficam como estão).
--
-- Flags `public`:
--   * profile-avatars, startup-logos -> true: o cliente guarda `getPublicUrl()`
--     (src/pages/Settings.tsx:128-130, src/components/workspace/StartupSettingsTab.tsx:183-185)
--     e a migração 20260415224512 trata-os como 'public bucket' (remove só a listagem anónima).
--   * workspace-documents, bug-report-screenshots, template_assets, phc-extracts, admin-exports
--     -> false: leitura por URL assinada ou por service_role (useDocuments.ts:238 createSignedUrl,
--     export-financial-model, census-run) e políticas de leitura só para utilizadores autenticados/staff/admin.
INSERT INTO storage.buckets (id, name, public) VALUES
  ('workspace-documents',    'workspace-documents',    false),
  ('bug-report-screenshots', 'bug-report-screenshots', false),
  ('template_assets',        'template_assets',        false),
  ('phc-extracts',           'phc-extracts',           false),
  ('admin-exports',          'admin-exports',          false),
  ('profile-avatars',        'profile-avatars',        true),
  ('startup-logos',          'startup-logos',          true)
ON CONFLICT (id) DO NOTHING;
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## Teste de privilégios não cobria purge_operational_logs (ids: DBP-07, OPS-12, parte de testes)
**Gravidade:** LOW. **Quem é afetado:** quem mantém a base (regressão de segurança: função `SECURITY DEFINER` que apaga registos).
**Problema:** a migração `20261103203000_rc12_log_retention.sql` cria `public.purge_operational_logs()` (só `service_role`), mas `supabase/tests/service_only_function_privileges.test.sql` não a inclui na lista de funções que `anon` e `authenticated` não podem executar, por isso uma futura regressão nos privilégios passava despercebida.
**Correção:** acrescentar `'public.purge_operational_logs()'` ao fim da lista (a vírgula passa para a linha anterior). Corrido na réplica viva com as migrações rc12 aplicadas e pgTAP carregado, tudo em `BEGIN`/`ROLLBACK`: `ok 1 - internal SECURITY DEFINER functions are not executable by anon or authenticated`. Com um `GRANT EXECUTE ON FUNCTION public.purge_operational_logs() TO authenticated` antes do teste, o teste falha como deve (`not ok 1 ... ("public.purge_operational_logs()",f,t)`). O teste só é significativo com os privilégios por omissão do Supabase emulados (a réplica tem-nos), como diz o cabeçalho do ficheiro.
**Alterar `supabase/tests/service_only_function_privileges.test.sql`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/tests/service_only_function_privileges.test.sql
+++ b/supabase/tests/service_only_function_privileges.test.sql
@@ -45,5 +45,6 @@ SELECT is_empty($q$
     'public.cron_invoke_edge(text,jsonb)',
     'public.cron_invoke_rpc(text,text)',
-    'public.touch_public_booking_rate_limit(text,text)'
+    'public.touch_public_booking_rate_limit(text,text)',
+    'public.purge_operational_logs()'
     ]::text[]) AS s
    WHERE has_function_privilege('anon', s::regprocedure, 'EXECUTE')
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## .env.example sem as variáveis lidas pelas funções edge (ids: OPS-14, parte .env.example)
**Gravidade:** LOW. **Quem é afetado:** admin e equipa técnica (quem configura um ambiente novo).
**Problema:** `.env.example` não menciona 14 nomes de variáveis que as funções edge leem (`grep -rhoE "Deno\.env\.get\(...\)" supabase/functions`): `PUBLIC_APP_URL` e `SITE_URL` (que, com `APP_URL`, formam três nomes para o mesmo URL público; configurar só um deixa links de email com o domínio por omissão), `ALLOWED_ORIGINS`, `MS_GRAPH_SHAREPOINT_DRIVE_ID`, `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_BASE_URL`, `DOCUSIGN_RSA_PRIVATE_KEY`, `TWILIO_API_KEY`, `TWILIO_PHONE_NUMBER`, `STRIPE_SECRET_KEY`, `RECONCILER_WRITE_MODE` e `PUBLIC_BOOKING_ALLOW_DEMO`.
**Correção:** acrescentar ao fim do ficheiro um bloco de comentários, só com nomes e uma frase curta em PT-PT sobre cada um (sem valores reais; o ficheiro continua a passar `scripts/secret-scan.cjs`). Avisa que as três variáveis de URL têm de ter o MESMO valor e que `PUBLIC_BOOKING_ALLOW_DEMO` nunca se usa em produção. O resto do achado OPS-14 (documentos e script de reconciliação) está na secção do domínio de operações.
**Alterar `.env.example`** (diff; os números de linha são do ficheiro original):

```diff
--- a/.env.example
+++ b/.env.example
@@ -34,2 +34,28 @@ VITE_SUPABASE_PROJECT_ID=your-project-id
 # PANDADOC_WEBHOOK_KEY - Shared secret for PandaDoc webhook verification
 # WEBHOOK_SECRET is also used for DocuSign webhook verification
+
+# URL público da aplicação nos links dos emails (OPS-14). Use o MESMO valor nas três variáveis
+# (as funções edge leem nomes diferentes; configurar só uma deixa links com o domínio por omissão).
+# PUBLIC_APP_URL - lida pela maioria das funções (links em emails)
+# SITE_URL - lida por send-email-digest, send-announcement-email e automation-engine
+# (APP_URL, mais acima, completa as três)
+
+# Outras variáveis lidas por funções edge (todas opcionais, só nomes: valores em Lovable Cloud > Backend > Secrets):
+# ALLOWED_ORIGINS - lista CORS separada por vírgulas (opcional; há lista por omissão em _shared/cors.ts)
+# MS_GRAPH_SHAREPOINT_DRIVE_ID - identificador da drive do SharePoint onde se arquivam contratos
+
+# DocuSign (envio de contratos):
+# DOCUSIGN_INTEGRATION_KEY - chave de integração da app DocuSign
+# DOCUSIGN_USER_ID - utilizador API (GUID) em nome de quem se envia
+# DOCUSIGN_ACCOUNT_ID - identificador da conta DocuSign
+# DOCUSIGN_BASE_URL - URL base da API (por omissão o ambiente demo; em produção o da sua conta)
+# DOCUSIGN_RSA_PRIVATE_KEY - chave privada RSA do JWT; nunca a comite
+
+# WhatsApp (função dormente):
+# TWILIO_API_KEY - chave da API Twilio
+# TWILIO_PHONE_NUMBER - número remetente
+
+# Outras:
+# STRIPE_SECRET_KEY - import-kpi-data (opcional)
+# RECONCILER_WRITE_MODE - reconciler-run; a escrita só fica ativa com o valor "enabled" E o interruptor em system_settings ligado
+# PUBLIC_BOOKING_ALLOW_DEMO - NUNCA em produção (permite o token 'demo' nas páginas públicas de marcação)
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

---

## Harness pgTAP local falha em PostgreSQL 16 e anula os REVOKE a anon (ids: DRF-03, OPS-07)
**Gravidade:** LOW. **Quem é afetado:** equipa técnica (harness local e CI `db-pgtap-local`).
**Problema:** A baseline `supabase/migrations/20260101120407_remix_migration_from_pg_dump.sql:20` tem `SET transaction_timeout = 0;`, parâmetro que só existe no PostgreSQL 17: em PG16 a transação aborta e as outras ~386 migrações falham em cascata. O harness (`scripts/rc5/local-pg-harness.sh:81`) só retira `CREATE EXTENSION`; as linhas 99-101 fazem `GRANT ALL ON ALL TABLES/SEQUENCES` a `anon` depois do replay, anulando os `REVOKE ... FROM anon` das migrações (`audit_five_blocking_reads` 6-10 falham sempre); e com `set -o pipefail` os `grep | head` das linhas 88 e 126 recebem SIGPIPE e o script termina com exit 141 a meio das suites. `supabase/config.toml` não fixa a versão do Postgres.
**Correção:** O harness remove a linha `SET transaction_timeout` no ficheiro depurado (a baseline não se edita), deixa de dar `GRANT ALL` a `anon` (os `ALTER DEFAULT PRIVILEGES` das linhas 71-73 já cobrem as tabelas criadas) e protege os dois `grep | head` com `|| true`. `supabase/config.toml` passa a declarar `[db] major_version = 17`, a versão da base alojada (o dump é 17.6), para o `supabase start` do CI não depender do valor por omissão do CLI (não testado sem o Supabase CLI). Validado: replay de todas as migrações em PG16.15 com 0 ficheiros em falha e 42 suites, `audit_five_blocking_reads` 10/10, exit 0 após a correção dos testes.
**Alterar `scripts/rc5/local-pg-harness.sh`** (diff; os números de linha são do ficheiro original):

```diff
--- a/scripts/rc5/local-pg-harness.sh
+++ b/scripts/rc5/local-pg-harness.sh
@@ -79,5 +79,6 @@ STRIP=$(mktemp -d)
 for f in "$ROOT"/supabase/migrations/*.sql; do
   # Managed extensions are provisioned by the platform, not by the harness.
-  perl -0pe 's/create\s+extension[^;]*;/-- [rc5 harness] extension stripped;/gis' "$f" > "$STRIP/$(basename "$f")"
+  # SET transaction_timeout only exists on PostgreSQL 17 (the baseline dump is 17.6); drop it so the replay also works on 16.
+  perl -0pe 's/create\s+extension[^;]*;/-- [rc5 harness] extension stripped;/gis; s/^SET transaction_timeout = 0;/-- [rc5 harness] PG17-only GUC stripped/gm' "$f" > "$STRIP/$(basename "$f")"
 done
 failed=0
@@ -86,5 +87,5 @@ for f in "$STRIP"/*.sql; do
     failed=$((failed+1))
     echo "[rc5:local-pg] replay FAIL $(basename "$f")"
-    echo "$out" | grep 'ERROR:' | head -2
+    { echo "$out" | grep 'ERROR:' | head -2; } || true
   fi
 done
@@ -97,7 +98,7 @@ fi
 # platform default privileges); RLS is the only boundary. Mirror that here or
 # privilege errors masquerade as policy passes.
-"${PSQL[@]}" -c 'GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;' \
-  -c 'GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;' \
-  -c 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;' >/dev/null
+# No blanket "GRANT ALL ON ALL TABLES" here: it would undo the REVOKE ... FROM anon of the migrations
+# (audit_five_blocking_reads); the ALTER DEFAULT PRIVILEGES above already cover every table the replay creates.
+"${PSQL[@]}" -c 'GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;' >/dev/null
 fi
 
@@ -124,5 +125,5 @@ for t in "${files[@]}"; do
   if [ "$psql_rc" != "0" ] || [ "$ok" = "0" ] || [ "$nok" != "0" ] || [ "$err" != "0" ]; then
     rc=1
-    printf '%s\n' "$out" | grep -E '^ not ok|# Failed test|caught:|wanted:|ERROR:' | head -12
+    { printf '%s\n' "$out" | grep -E '^ not ok|# Failed test|caught:|wanted:|ERROR:' | head -12; } || true
   fi
 done
```

**Alterar `supabase/config.toml`** (diff; os números de linha são do ficheiro original):

```diff
--- a/supabase/config.toml
+++ b/supabase/config.toml
@@ -1,4 +1,9 @@
 project_id = "apxzuslwhjujgrcsfzqw"
 
+# The baseline migration (20260101120407) was dumped from PostgreSQL 17.6 and starts with "SET transaction_timeout = 0;",
+# a parameter that only exists from PostgreSQL 17. Without this block `supabase start` uses the CLI default version.
+[db]
+major_version = 17
+
 # ============================================
 # USER-FACING FUNCTIONS (Category A)
```

---

## Documentos de operação desatualizados (ids: OPS-14)
**Gravidade:** LOW. **Quem é afetado:** admin e equipa técnica.
**Problema:** `docs/GO_LIVE_CHECKLIST.md` é de março (não fala de cron, segredos, cópias de segurança, interruptores de emergência nem das rondas RC10 a RC12); `docs/rc5/staging-runbook.md:46` manda correr `scripts/rc5/migrate-fresh.mjs`, que não existe (o ficheiro é `migrate-fresh-replay.mjs`, que não usa Docker nem `pg_prove`), e não diz que o staging chama as funções de produção a menos que `app.edge_base_url` esteja definido; `docs/rc5/release-checklist.md:19` repete o nome inexistente.
**Correção:** Nova lista de arranque e operação (20 minutos, 14 consultas SQL só de leitura, todas executadas sem erro numa base reconstruída das migrações da árvore final; verificação semanal; inventário de variáveis das funções edge; cópias de segurança; tabela "se algo falhar"), e correção dos dois runbooks. Fica de fora, por depender de migrações e de ficheiros de outros domínios: o novo manifesto de automações e o `reconcile-automations.mjs` (o confronto com `cron.job` da árvore final continua a dar desvios), o bloco novo de `.env.example` e a troca de `no-reply@` por `noreply@` em `supabase/functions/public-contract-onboarding/index.ts:420`.
