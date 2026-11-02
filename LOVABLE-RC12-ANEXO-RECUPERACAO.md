# PROMPT LOVABLE — RC12 · ANEXO R — Recuperar no repositório o DDL que só existe na base viva

**Para que serve.** A base viva recebeu `drizzle/migrations/0000-0018` (aplicadas pelo caminho de migração do Lovable) mas esse DDL nunca foi copiado para `supabase/migrations`. Um ambiente reconstruído só a partir do repositório (CI, staging, `supabase start`) nasce com leituras abertas e sem os guardas de contratos assinados. As duas migrações abaixo são **no-op na base viva** (têm guardas) e repõem o DDL no repositório. **Se o for aplicar, aplique-o ANTES de qualquer parte do pacote essencial** (os guardas `DO $guard$` aceitam a definição atual da base viva, mas abortam de propósito se a função já tiver sido alterada por uma parte posterior). Na base viva não muda nada; só o CI e os ambientes reconstruídos precisam dele. Se o não aplicar, as partes do pacote essencial funcionam na mesma na base viva.

## Regras (valem para esta parte)
1. Aplique TUDO o que está nesta parte e NADA mais. Não refatore, não renomeie, não "melhore" o que não é descrito.
2. Cada secção traz o diff exato (`diff -U2`, números de linha do ficheiro ORIGINAL, que é o que você tem agora). Se um diff não aplicar porque o ficheiro já mudou, **pare nessa secção e diga qual**; não improvise outra solução.
3. "Criar `caminho`" = ficheiro novo com o conteúdo exato. "Apagar" = remover o ficheiro.
4. Migrações SQL: crie-as em `supabase/migrations/` com o nome indicado, pela ordem dos nomes. Correm numa transação (sem `CONCURRENTLY`). São idempotentes. Várias começam por um bloco `DO $guard$` que **aborta de propósito** se a função real tiver divergido da definição de partida: se isso acontecer, **pare e devolva o `md5` e o resultado de `pg_get_functiondef` dessa função**; nunca desative o guarda nem reescreva a função por conta própria.
5. Nunca edite migrações que já existem, nem `src/integrations/supabase/types.ts` (é regenerado depois de cada migração).
6. Edge functions: depois de aplicar, publique as que foram alteradas e todas as que importam um `_shared/*` alterado.
7. Texto de UI: use as chaves `t('chave', 'texto PT')` dos diffs. As chaves novas estão no anexo `LOVABLE-RC12-I18N-PATCH.json` (aplicado uma vez, na Parte 1 do pacote essencial).
8. No fim, responda com: (a) a lista de secções aplicadas, (b) o que não aplicou e porquê, (c) qualquer erro de compilação ou de migração, com o texto exato.

---

## Segurança e guardas da base viva só existem em `drizzle/migrations`: repô-los em `supabase/migrations` (ids: DRF-01, DRF-02, DRF-04, DRF-06)
**Gravidade:** MED (DRF-01, DRF-04); LOW (DRF-02, DRF-06). **Quem é afetado:** todos os papéis em qualquer ambiente reconstruído a partir do repositório (recuperação de desastre, branch de preview, `supabase start`, CI); a base viva atual não muda.
**Problema:** A base viva recebeu `drizzle/migrations/0000` a `0018` pelo caminho de migração do Lovable, mas `supabase start`, `supabase db push` e o job `db-tests` (`.github/workflows/ci.yml:376-386`, passos `supabase start` e `supabase test db`) só leem `supabase/migrations`. Um replay limpo nasce sem `guard_contract_integrity`, `queue_signed_contract_activation`, `guard_activation_recovery`, `wake_contract_activation_recovery`, `guard_intake_activation`, sem `staff_mark_funnel_item_contracted`, `staff_renew_contract`, `staff_record_manual_contract_signature`, `merge_contract_document_metadata`, `expand_recurring_blocks`, `dispatch_contract_activation_recovery`, sem `consultant_recurring_blocks` e `startup_contracts.activation_sync_pending`, com as políticas de `buildings`, `financial_cell_map`, `financial_model_metric_map`, `quality_checks_config`, `session_templates` e `investor_update_templates` em `USING (true)`, `conversations` a aceitar INSERT direto e `anon` com acesso às 5 tabelas de leitura ampla. Além disso, `20261019110000_rc11_part_b.sql:5-16` volta a definir `account_not_suspended` na versão antiga (DRF-04) se for re-executada depois da drizzle 0013, e os patches drizzle 0011/0017/0018 (substituição de texto) duplicam ou rebentam ao repetir. `types.ts` mostra ainda `playbook_template_assignments`, `workspace_template_tasks`, `get_kpi_percentiles`, `workspace_readiness_status.status` e 10 colunas NOT NULL que nenhuma migração cria (DRF-02); 4 migrações têm timestamp retroativo ou foram neutralizadas (DRF-06).
**Correção:** Duas migrações novas, idempotentes, com timestamp posterior a todas as existentes (nunca editar nem renomear as antigas). A `20261102120000` cria `playbook_template_assignments` e `workspace_template_tasks` só se não existirem (reconstruídas a partir de `types.ts`, mínimo para o replay; na base viva é um no-op) e aplica os `SET NOT NULL` de `workflow_rules`, `workflow_executions` e `workspace_readiness_status`. A `20261102120100` é a concatenação idempotente de drizzle 0000 e 0005 a 0018 (`CREATE ... IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION` com a definição final completa, `ALTER POLICY`, triggers e políticas só se ainda não existirem) e, por ser a mais recente das duas, repõe as definições finais de `account_not_suspended`, `can_write_workspace`, `create_conversation`, `search_workspaces_paged` e `get_workspace_stats`. Validada em Postgres 16: replay limpo de todas as migrações com 0 ficheiros em falha; as duas migrações aplicadas duas vezes seguidas sobre a base viva reconstruída não alteram nenhuma função (md5 de todas as funções de `public` iguais antes e depois). A segunda migração começa por um guarda md5 (padrão do prompt): aborta, em vez de pisar, se alguma das 21 funções que substitui existir com uma definição que não seja nem a anterior (só `supabase/migrations`) nem a final do drizzle (função ausente = ambiente novo, segue). Novo guarda de CI `scripts/ci/check-drizzle-mirrored.mjs` (job `migration-scan`): falha se existir um ficheiro em `drizzle/migrations` sem espelho registado em `scripts/ci/drizzle-mirror.json`. Regra permanente em `AGENTS.md`: nunca executar ficheiros de `drizzle/migrations` diretamente e, antes de um `supabase db push`, registar as versões já aplicadas com `supabase migration repair --status applied <versão>` (DRF-04, DRF-06). Aplicar por esta ordem: 1) verificação só de leitura abaixo; 2) as duas migrações; 3) restantes ficheiros.
Cuidados: (a) se o guarda md5 abortar (mensagem `rc12: definição de public.… divergente`), a produção tem uma função que derivou do drizzle: envie `select pg_get_functiondef('public.<função>(<args>)'::regprocedure)` dessa função antes de aplicar a segunda migração; (b) os blocos reconstruídos de `playbook_template_assignments` e `workspace_template_tasks` não trazem UNIQUE, CHECK, índices nem defaults reais: são só o mínimo para o replay e só correm quando as tabelas não existem; em produção são no-op. Para os substituir pelo DDL real extraia-o com `pg_dump --schema-only -t public.playbook_template_assignments -t public.workspace_template_tasks` e `select pg_get_functiondef('public.get_kpi_percentiles(uuid,uuid,text)'::regprocedure)` e peça uma migração nova; `get_kpi_percentiles` e `workspace_readiness_status.status` (a produção tem `status text` e não tem `is_complete`) ficam por recuperar e não foram inventados aqui.
**Criar `supabase/migrations/20261102120000_rc12_recover_prod_only_tables.sql`** (conteúdo exato):

```sql
-- RC12 · migração de recuperação 1/2 — tabelas e colunas que existem na base viva mas em nenhuma migração.
--
-- Prova: src/integrations/supabase/types.ts (gerado da base viva) lista estas tabelas/colunas; nenhum ficheiro de
-- supabase/migrations nem de drizzle/migrations as cria (scripts/rc5/audit-local-fixtures.sql admite-o:
-- "this Cloud table is absent from legacy migration replay").
--
-- ATENÇÃO: o bloco de cada tabela só corre quando a tabela NÃO existe (ambiente novo / replay). Na base viva
-- é um no-op total (nenhuma tabela, política ou permissão é tocada). As colunas, FKs e políticas abaixo foram
-- reconstruídas a partir de types.ts + testes (Row/Insert/Relationships): são o mínimo para o replay ter paridade
-- com types.ts. Os defaults de colunas anuláveis (is_required, order_index, status, priority) NÃO são inferíveis de types.ts e ficam sem default aqui. Se a extração do DDL real de produção (pg_dump --schema-only dessas tabelas) trouxer mais restrições (UNIQUE, CHECK,
-- índices, políticas reais), SUBSTITUA estes blocos pelos valores de produção.

DO $rc12$
BEGIN
  IF to_regclass('public.playbook_template_assignments') IS NULL THEN
    CREATE TABLE public.playbook_template_assignments (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      playbook_id uuid NOT NULL,
      template_id uuid NOT NULL,
      is_required boolean,
      order_index integer,
      created_by uuid,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT playbook_template_assignments_playbook_id_fkey FOREIGN KEY (playbook_id) REFERENCES public.playbooks(id) ON DELETE CASCADE,
      CONSTRAINT playbook_template_assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE
    );
    ALTER TABLE public.playbook_template_assignments ENABLE ROW LEVEL SECURITY;
    -- políticas de partida; a migração 2/2 (drizzle 0007) endurece a de leitura e remove o acesso anónimo
    CREATE POLICY "Authenticated users can view template assignments" ON public.playbook_template_assignments
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Staff can manage template assignments" ON public.playbook_template_assignments
      FOR ALL TO authenticated USING (public.is_staff());
  END IF;

  IF to_regclass('public.workspace_template_tasks') IS NULL THEN
    CREATE TABLE public.workspace_template_tasks (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      workspace_id uuid NOT NULL,
      template_id uuid NOT NULL,
      assigned_by uuid NOT NULL,
      status text,
      priority text,
      due_date date,
      notes text,
      completed_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT workspace_template_tasks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
      CONSTRAINT workspace_template_tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE
    );
    ALTER TABLE public.workspace_template_tasks ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.workspace_template_tasks FROM anon;
    -- PROVISÓRIO: política mínima (só equipa). Trocar pela real de produção (pg_policies) quando extraída.
    CREATE POLICY "Staff can manage workspace template tasks" ON public.workspace_template_tasks
      FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
  END IF;
END
$rc12$;

-- Colunas NOT NULL que types.ts mostra e o replay não tem. Na base viva já são NOT NULL (no-op).
-- (um SET NOT NULL só falha se existirem NULLs; num replay limpo a tabela está vazia)
ALTER TABLE public.workflow_rules
  ALTER COLUMN name SET NOT NULL, ALTER COLUMN enabled SET NOT NULL, ALTER COLUMN conditions_json SET NOT NULL,
  ALTER COLUMN actions_json SET NOT NULL, ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.workflow_executions
  ALTER COLUMN status SET NOT NULL, ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.workspace_readiness_status
  ALTER COLUMN created_at SET NOT NULL, ALTER COLUMN updated_at SET NOT NULL;
```

**Criar `supabase/migrations/20261102120100_rc12_recover_drizzle_migrations.sql`** (conteúdo exato):

```sql
-- RC12 · migração de recuperação 2/2 — DDL que a base viva já tem mas que só existia em drizzle/migrations/*.sql
--
-- Origem: as 19 migrações de drizzle/migrations (0000 a 0018) foram aplicadas à base pelo caminho
-- "LOVABLE_DB_MIGRATION_URL" e nunca passaram por supabase/migrations. Um ambiente novo, um branch
-- de preview ou o CI (`supabase start`) não as recebia: políticas abertas (USING true), sem triggers
-- de imutabilidade de contratos assinados, sem as funções staff_*.
--
-- Regras desta migração (para ser segura na base viva):
--   * idempotente: CREATE ... IF NOT EXISTS / CREATE OR REPLACE / ALTER POLICY / ADD COLUMN IF NOT EXISTS;
--   * triggers e políticas só são criados quando ainda não existem (nunca recriados na base viva);
--   * as 3 funções que o drizzle alterava por substituição de texto (create_conversation,
--     search_workspaces_paged, get_workspace_stats) vêm aqui com a definição final completa;
--   * pré-requisito: correr antes as consultas de verificação só de leitura do prompt; o guarda md5 abaixo aborta
--     a migração se alguma função real tiver divergido (NÃO aplicar sem rever essa função).

-- Guarda (REVAL): esta migração substitui funções que já existem. Aborta, em vez de pisar, se alguma função real
-- não for nem a versão anterior (só supabase/migrations) nem a versão final do drizzle (md5 de pg_get_functiondef).
-- Função ausente = ambiente novo: segue. Se abortar, envie o resultado de pg_get_functiondef dessa função antes de aplicar.
DO $guard$
DECLARE r record; v_md5 text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('account_not_suspended', '_user_id uuid', '323d060dd1ca1c4c0c7ccf01d637e46d', '40867f2208cacde99d610ef34f63a34b'),
    ('can_write_workspace', '_workspace_id uuid', '2d4228fe6c8662cf41a45b5fa1031c9d', '126067bcfd970e4359e0096f80299cd2'),
    ('consultant_time_off_blocks', 'p_consultant_id uuid, p_start timestamp with time zone, p_end timestamp with time zone', '6591ae79fb843dc00c741465229f0cf0', '307f2ada51918ed9af36f37e17216fc5'),
    ('create_conversation', 'participant_ids uuid[], _title text, _workspace_id uuid', 'ad2bdbd0538c5cd5f88923a54389c2ce', '12715e30ed3ab71443888662646d2f71'),
    ('dispatch_contract_activation_recovery', '', 'e050ed24c92c18de9be6f98d10bc4d4b', NULL),
    ('expand_recurring_blocks', 'p_consultant_id uuid, p_from date, p_to date', 'ec062202f3f937decac288db043f9002', NULL),
    ('get_consultant_time_off', 'p_consultant_id uuid, p_from date, p_to date', '1f078e8d21f4223922a0aac92591c683', '17cc9b4f307ac01621a127280f37a567'),
    ('get_dataroom_workspace_id', '_dataroom_id uuid', 'ac25948b82f6de28a9d900f8c131b08f', '83c29dbff9022dacca5c2ba46dcb4fe0'),
    ('get_session_workspace_id', '_session_id uuid', '13c03bd574d217c7d9ba6bc92fc5473c', 'c8c60fd72b3bd7a1e81995aa0dc4c719'),
    ('get_workspace_stats', 'workspace_ids uuid[]', 'f23f90635ebaaef94170fcaf22d22729', 'ad428e9bb929688ee9779bd973a195dd'),
    ('guard_activation_recovery', '', '8b2fecdf798513946324ddf4d720faf8', NULL),
    ('guard_contract_integrity', '', '49c3b28d5b1b8d49f33357c9d6bd091a', NULL),
    ('guard_intake_activation', '', 'd6b42f9b8e30e6d05cfaea3a68d6c6f1', NULL),
    ('merge_contract_document_metadata', '_contract_id uuid, _doc_key text, _metadata jsonb', 'd9d71b1d0b339d1e347caa669a49d97d', NULL),
    ('queue_signed_contract_activation', '', 'c162e1f53504d6c4b94043e69afe0977', NULL),
    ('search_workspaces_paged', '_statuses text[], _assigned_to uuid, _search text, _program_id uuid, _stage startup_stage, _health health_score, _priority workspace_priority, _sort_by text, _limit integer, _offset integer, _missing_kpi_this_month boolean, _overdue_actions boolean', 'd3b8ecec5c083867623abc1b55709ea3', '14bdf6a638bbec1769bfd5c439000b31'),
    ('staff_assign_or_create_workspace', 'p_user_id uuid, p_mode text, p_workspace_id uuid, p_startup_name text, p_program_id uuid, p_stage text, p_description text', 'ba1edf0ea24b38b42d13335eef7c459e', 'a6f4e43d5611ada748b9540d66c86767'),
    ('staff_mark_funnel_item_contracted', 'p_funnel_item_id uuid, p_program_id uuid, p_stage text', '6f13028d78f9856930936305ee7419b1', NULL),
    ('staff_record_manual_contract_signature', 'p_contract_id uuid', '12f96effcc497a29296c646a8fa972c6', NULL),
    ('staff_renew_contract', 'p_contract_id uuid, p_end_date date, p_monthly_fee numeric, p_term_start date', 'c9dcb4ec699e7467dd19911cb3214ee5', NULL),
    ('sync_contract_signature_downstream', '', '6346d207723ea4aab659e49fb38a50ec', '2e544f9da08e219fa77dae8ed4517010'),
    ('wake_contract_activation_recovery', '', '9bceeefd8d8f26789f8ea12485ec3f99', NULL)
  ) AS t(fname, fargs, md5_final, md5_before) LOOP
    SELECT md5(pg_get_functiondef(p.oid)) INTO v_md5
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = r.fname AND pg_get_function_identity_arguments(p.oid) = r.fargs;
    IF v_md5 IS NOT NULL AND v_md5 <> r.md5_final AND v_md5 IS DISTINCT FROM r.md5_before THEN
      RAISE EXCEPTION 'rc12: definição de public.%(%) divergente (md5 %), envie o resultado de pg_get_functiondef antes de aplicar', r.fname, r.fargs, v_md5;
    END IF;
  END LOOP;
END $guard$;

-- ===== drizzle 0000: índices de desempenho (0001-0004 são cópias das supabase/migrations rc11_part_a..d) =====
CREATE INDEX IF NOT EXISTS idx_workspaces_status_updated ON public.workspaces (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_status_created ON public.workspaces (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_assigned_consultor ON public.workspaces (assigned_consultor_id);
CREATE INDEX IF NOT EXISTS idx_action_items_overdue_open ON public.action_items (workspace_id, due_date) WHERE status IN ('pending','in_progress');
CREATE INDEX IF NOT EXISTS idx_funnel_items_contact_email ON public.funnel_items (contact_email);
CREATE INDEX IF NOT EXISTS idx_action_items_title_trgm ON public.action_items USING gin (title gin_trgm_ops);

-- ===== drizzle 0005: tipos de lembrete de contrato (só se a restrição ainda for a antiga) =====
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.contract_reminders'::regclass AND conname = 'contract_reminders_reminder_type_check' AND pg_get_constraintdef(oid) LIKE '%post_incubation_transition%') THEN
ALTER TABLE public.contract_reminders DROP CONSTRAINT IF EXISTS contract_reminders_reminder_type_check;
    ALTER TABLE public.contract_reminders ADD CONSTRAINT contract_reminders_reminder_type_check CHECK (
      reminder_type IN ('anniversary','renewal','expiry','post_incubation_transition')
      OR reminder_type ~ '^anniversary_[0-9]+y$'
      OR reminder_type ~ '^biennial_review_[0-9]+y$'
      OR reminder_type ~ '^renewal_notice_[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    );
  END IF;
END $rc12$;

-- ===== drizzle 0006: bloqueios semanais recorrentes =====
CREATE TABLE IF NOT EXISTS public.consultant_recurring_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time,
  end_time time,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultant_recurring_blocks_times CHECK (
    (start_time IS NULL AND end_time IS NULL) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);
CREATE INDEX IF NOT EXISTS idx_consultant_recurring_blocks_consultant ON public.consultant_recurring_blocks (consultant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_recurring_blocks TO authenticated;
GRANT ALL ON public.consultant_recurring_blocks TO service_role;
ALTER TABLE public.consultant_recurring_blocks ENABLE ROW LEVEL SECURITY;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultant_recurring_blocks' AND policyname = 'Own recurring blocks manage') THEN
    CREATE POLICY "Own recurring blocks manage" ON public.consultant_recurring_blocks
  FOR ALL TO authenticated USING (consultant_id = auth.uid()) WITH CHECK (consultant_id = auth.uid());
  END IF;
END $rc12$;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultant_recurring_blocks' AND policyname = 'Staff manage all recurring blocks') THEN
    CREATE POLICY "Staff manage all recurring blocks" ON public.consultant_recurring_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'backoffice'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'backoffice'::app_role));
  END IF;
END $rc12$;

-- Expande os bloqueios semanais (hora de Lisboa) em janelas concretas
CREATE OR REPLACE FUNCTION public.expand_recurring_blocks(p_consultant_id uuid, p_from date, p_to date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, all_day boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    ((d::date + coalesce(b.start_time, time '00:00')) AT TIME ZONE 'Europe/Lisbon'),
    CASE WHEN b.end_time IS NULL THEN ((d::date + 1) AT TIME ZONE 'Europe/Lisbon')
         ELSE ((d::date + b.end_time) AT TIME ZONE 'Europe/Lisbon') END,
    b.start_time IS NULL
  FROM public.consultant_recurring_blocks b
  CROSS JOIN generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  WHERE b.consultant_id = p_consultant_id
    AND extract(dow FROM d)::int = b.weekday;
$$;
REVOKE EXECUTE ON FUNCTION public.expand_recurring_blocks(uuid, date, date) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_consultant_time_off(p_consultant_id uuid, p_from date, p_to date)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone, all_day boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT t.starts_at, t.ends_at, t.all_day
    FROM public.consultant_time_off t
   WHERE t.consultant_id = p_consultant_id
     AND t.ends_at >= p_from::timestamptz
     AND t.starts_at < (p_to::timestamptz + interval '1 day')
  UNION ALL
  SELECT r.starts_at, r.ends_at, r.all_day
    FROM public.expand_recurring_blocks(p_consultant_id, p_from, p_to) r;
$function$;

CREATE OR REPLACE FUNCTION public.consultant_time_off_blocks(p_consultant_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.consultant_time_off t
     WHERE t.consultant_id = p_consultant_id AND t.starts_at < p_end AND t.ends_at > p_start
  ) OR EXISTS (
    SELECT 1 FROM public.expand_recurring_blocks(
      p_consultant_id,
      ((p_start AT TIME ZONE 'Europe/Lisbon')::date - 1),
      ((p_end AT TIME ZONE 'Europe/Lisbon')::date)
    ) r WHERE r.starts_at < p_end AND r.ends_at > p_start
  );
$function$;

-- ===== drizzle 0007: acessos amplos + integridade de contratos + comandos staff =====
ALTER POLICY "Authenticated users can view buildings" ON public.buildings USING (public.is_staff() OR public.is_backoffice() OR EXISTS (SELECT 1 FROM public.startup_contracts c WHERE c.building_id = buildings.id AND public.has_workspace_access(c.workspace_id)));
ALTER POLICY "Authenticated can read cell map" ON public.financial_cell_map USING (public.is_staff());
ALTER POLICY "Staff can manage cell map" ON public.financial_cell_map USING (public.is_staff()) WITH CHECK (public.is_staff());
ALTER POLICY "Authenticated users can read financial_model_metric_map" ON public.financial_model_metric_map USING (public.is_staff());
ALTER POLICY "Admin and consultors can manage metric mappings" ON public.financial_model_metric_map USING (public.is_staff()) WITH CHECK (public.is_staff());
ALTER POLICY "Authenticated users can view template assignments" ON public.playbook_template_assignments USING (public.is_staff() OR (public.is_account_active() AND EXISTS (SELECT 1 FROM public.playbooks p JOIN public.templates t ON t.id = playbook_template_assignments.template_id WHERE p.id = playbook_template_assignments.playbook_id AND p.is_active AND (p.program_id IS NULL OR public.has_program_access(p.program_id)) AND (t.is_global OR public.has_program_access(t.program_id)))));
ALTER POLICY "Authenticated users can read quality_checks_config" ON public.quality_checks_config USING (public.is_staff());
REVOKE ALL ON public.buildings, public.financial_cell_map, public.financial_model_metric_map, public.playbook_template_assignments, public.quality_checks_config FROM anon;

CREATE OR REPLACE FUNCTION public.guard_contract_integrity() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  trusted boolean := current_user IN ('postgres', 'service_role', 'supabase_admin');
  frozen_keys text[] := ARRAY['contract_number','start_date','end_date','monthly_fee','currency','incubation_type_id','building_id','room_id','square_meters','discount_percentage','discount_reason','discount_applied_by','discount_start_date','discount_end_date','equity_percentage','billing_day','payment_terms_days','company_nif','organization_name','company_address','company_city','company_postal_code','company_country','legal_representative_name','legal_representative_email','legal_representative_phone','additional_representatives','pricing_snapshot_json','pricing_version_id','pricing_line_id','startup_category','is_associate','has_startup_portugal_status','is_post_incubation','contract_template_version','regulation_version','regulation_accepted_at','document_url','contract_pdf_path'];
  k text;
BEGIN
  IF NOT trusted THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.signed_at IS NOT NULL OR NEW.signature_status IN ('signed','completed','partially_signed') OR NEW.status = 'active' OR NEW.signature_proof_json IS NOT NULL OR NEW.founder_signer_status = 'signed' OR NEW.counter_signer_status = 'signed' THEN
        RAISE EXCEPTION 'signature_requires_verified_action' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF NEW.signed_at IS DISTINCT FROM OLD.signed_at OR NEW.signature_proof_json IS DISTINCT FROM OLD.signature_proof_json OR NEW.provider_completed_at IS DISTINCT FROM OLD.provider_completed_at OR (NEW.signature_status IS DISTINCT FROM OLD.signature_status AND NEW.signature_status IN ('signed','completed','partially_signed')) OR (NEW.founder_signer_status IS DISTINCT FROM OLD.founder_signer_status AND NEW.founder_signer_status = 'signed') OR (NEW.counter_signer_status IS DISTINCT FROM OLD.counter_signer_status AND NEW.counter_signer_status = 'signed') THEN
        RAISE EXCEPTION 'signature_requires_verified_action' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    IF NEW.signed_at IS NULL OR NEW.signature_status NOT IN ('signed','completed') OR NEW.signature_status IS NULL THEN
      RAISE EXCEPTION 'contract_signature_required' USING ERRCODE = '42501';
    END IF;
    IF NOT trusted AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'suspended' AND OLD.signed_at IS NOT NULL AND OLD.signature_status IN ('signed','completed')) THEN
      RAISE EXCEPTION 'activation_requires_verified_action' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.signed_at IS NOT NULL OR OLD.signature_status IN ('signed','completed','partially_signed')) THEN
    IF NEW.signed_at IS DISTINCT FROM OLD.signed_at AND OLD.signed_at IS NOT NULL THEN
      RAISE EXCEPTION 'signature_timestamp_immutable' USING ERRCODE = '42501';
    END IF;
    FOREACH k IN ARRAY frozen_keys LOOP
      IF (to_jsonb(NEW)->k) IS DISTINCT FROM (to_jsonb(OLD)->k) THEN
        IF k IN ('end_date','monthly_fee') AND current_user = 'postgres' AND current_setting('app.contract_renewal', true) = OLD.id::text THEN CONTINUE; END IF;
        IF k = 'end_date' AND current_user = 'service_role' AND NEW.end_date > OLD.end_date THEN CONTINUE; END IF;
        RAISE EXCEPTION 'signed_contract_terms_immutable: %', k USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_contract_integrity() FROM PUBLIC, anon, authenticated;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_contract_integrity' AND tgrelid = 'public.startup_contracts'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER guard_contract_integrity BEFORE INSERT OR UPDATE ON public.startup_contracts FOR EACH ROW EXECUTE FUNCTION public.guard_contract_integrity();
  END IF;
END $rc12$;

CREATE OR REPLACE FUNCTION public.staff_record_manual_contract_signature(p_contract_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.startup_contracts%ROWTYPE;
BEGIN
  IF NOT (public.is_staff() OR public.is_backoffice()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.startup_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'contract_not_found' USING ERRCODE = 'P0002'; END IF;
  IF c.status = 'active' AND c.signed_at IS NOT NULL AND c.signature_status IN ('signed','completed') THEN RETURN; END IF;
  IF c.status NOT IN ('draft','pending_signature') OR c.signature_status IN ('declined','voided') THEN RAISE EXCEPTION 'contract_not_signable' USING ERRCODE = '42501'; END IF;
  UPDATE public.startup_contracts SET signature_status = 'signed', signed_at = COALESCE(signed_at, now()), status = 'active', founder_signer_status = 'signed', counter_signer_status = 'signed', updated_at = now() WHERE id = c.id;
  INSERT INTO public.contract_lifecycle_events(contract_id,event_type,event_date,performed_by,details) VALUES(c.id,'manual_signature_recorded',current_date,auth.uid(),jsonb_build_object('source','staff_record_manual_contract_signature','method','staff_attestation'));
END $$;
REVOKE ALL ON FUNCTION public.staff_record_manual_contract_signature(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_record_manual_contract_signature(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_renew_contract(p_contract_id uuid, p_end_date date, p_monthly_fee numeric, p_term_start date DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.startup_contracts%ROWTYPE;
BEGIN
  IF NOT (public.is_staff() OR public.is_backoffice()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO c FROM public.startup_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'contract_not_found' USING ERRCODE = 'P0002'; END IF;
  IF c.status NOT IN ('active','expired') OR c.signed_at IS NULL OR c.signature_status NOT IN ('signed','completed') OR c.signature_status IS NULL THEN RAISE EXCEPTION 'contract_signature_required' USING ERRCODE = '42501'; END IF;
  IF p_end_date IS NULL OR (c.end_date IS NOT NULL AND p_end_date <= c.end_date) THEN RAISE EXCEPTION 'end_date_not_after_current' USING ERRCODE = '22023'; END IF;
  IF p_monthly_fee IS NULL OR p_monthly_fee < 0 THEN RAISE EXCEPTION 'invalid_monthly_fee' USING ERRCODE = '22023'; END IF;
  PERFORM set_config('app.contract_renewal', c.id::text, true);
  UPDATE public.startup_contracts SET end_date=p_end_date, monthly_fee=p_monthly_fee, status='active', terminated_at=NULL, termination_reason=NULL, updated_at=now() WHERE id=c.id;
  PERFORM set_config('app.contract_renewal', '', true);
  INSERT INTO public.contract_lifecycle_events(contract_id,event_type,event_date,performed_by,details) VALUES(c.id,'renewal',current_date,auth.uid(),jsonb_build_object('previous_end_date',c.end_date,'new_term_start',p_term_start,'new_end_date',p_end_date,'previous_monthly_fee',c.monthly_fee,'monthly_fee',p_monthly_fee));
END $$;
REVOKE ALL ON FUNCTION public.staff_renew_contract(uuid,date,numeric,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_renew_contract(uuid,date,numeric,date) TO authenticated;

-- ===== drizzle 0008 (+0009): recuperação de ativação enfileirada =====
DROP POLICY IF EXISTS "Only system can manage activation recovery" ON public.startup_contracts;
ALTER TABLE public.startup_contracts ADD COLUMN IF NOT EXISTS activation_sync_pending boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.queue_signed_contract_activation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.signature_status IN ('signed','completed') AND NEW.signed_at IS NOT NULL AND NEW.status IN ('draft','pending_signature','active') THEN
    IF TG_OP = 'INSERT' OR OLD.signature_status IS DISTINCT FROM NEW.signature_status OR OLD.signed_at IS DISTINCT FROM NEW.signed_at THEN NEW.activation_sync_pending := true; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_signed_contract_activation() FROM PUBLIC, anon, authenticated;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'queue_signed_contract_activation' AND tgrelid = 'public.startup_contracts'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER queue_signed_contract_activation BEFORE INSERT OR UPDATE ON public.startup_contracts FOR EACH ROW EXECUTE FUNCTION public.queue_signed_contract_activation();
  END IF;
END $rc12$;

CREATE OR REPLACE FUNCTION public.guard_activation_recovery() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('postgres','service_role','supabase_admin') AND NEW.activation_sync_pending IS DISTINCT FROM OLD.activation_sync_pending THEN
    RAISE EXCEPTION 'activation_recovery_system_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_activation_recovery() FROM PUBLIC, anon, authenticated;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_activation_recovery' AND tgrelid = 'public.startup_contracts'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER guard_activation_recovery BEFORE UPDATE ON public.startup_contracts FOR EACH ROW EXECUTE FUNCTION public.guard_activation_recovery();
  END IF;
END $rc12$;

-- ===== drizzle 0010: sincronização a jusante da assinatura + despertar da recuperação =====
-- lovable-cron-fallback-reviewed: wake on queued signature, retry every five minutes only while pending rows exist, unschedule after drain; immediate edge invocation is primary
CREATE OR REPLACE FUNCTION public.sync_contract_signature_downstream() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_intake record; became_signed boolean; became_sent boolean;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  became_signed := NEW.signed_at IS NOT NULL AND NEW.signature_status IN ('signed','completed') AND (OLD.signed_at IS NULL OR OLD.signature_status IS DISTINCT FROM NEW.signature_status);
  became_sent := (NEW.signature_status = 'sent_for_signature' AND OLD.signature_status IS DISTINCT FROM NEW.signature_status) OR (NEW.status = 'pending_signature' AND OLD.status IS DISTINCT FROM NEW.status);
  IF NOT COALESCE(became_signed,false) AND NOT COALESCE(became_sent,false) THEN RETURN NEW; END IF;
  SELECT id,status,funnel_item_id INTO v_intake FROM public.contract_intakes WHERE contract_id=NEW.id ORDER BY created_at DESC LIMIT 1;
  IF became_signed THEN
    IF v_intake.id IS NOT NULL AND v_intake.status NOT IN ('signed','activated','cancelled','rejected') THEN
      UPDATE public.contract_intakes SET status='signed' WHERE id=v_intake.id;
      INSERT INTO public.intake_events(intake_id,event_type,from_status,to_status,metadata) VALUES(v_intake.id,'lifecycle_sync_signed',v_intake.status,'signed',jsonb_build_object('source','trigger:contract_downstream','contract_id',NEW.id));
    END IF;
    UPDATE public.funnel_items SET stage='contracted' WHERE id=COALESCE(v_intake.funnel_item_id,NEW.funnel_item_id) AND stage NOT IN ('contracted','incubating','accelerating','archived','rejected');
    INSERT INTO public.contract_lifecycle_events(contract_id,event_type,event_date,details) VALUES(NEW.id,'signature_synced_signed',current_date,jsonb_build_object('source','trigger:contract_downstream','activation_pending',true));
  ELSIF became_sent THEN
    IF v_intake.id IS NOT NULL AND v_intake.status NOT IN ('signature_sent','signed','activated','cancelled','rejected') THEN
      UPDATE public.contract_intakes SET status='signature_sent' WHERE id=v_intake.id;
      INSERT INTO public.intake_events(intake_id,event_type,from_status,to_status,metadata) VALUES(v_intake.id,'lifecycle_sync_signature_sent',v_intake.status,'signature_sent',jsonb_build_object('source','trigger:contract_downstream','contract_id',NEW.id));
    END IF;
    UPDATE public.funnel_items SET stage='sent_for_signature' WHERE id=COALESCE(v_intake.funnel_item_id,NEW.funnel_item_id) AND stage NOT IN ('sent_for_signature','contracted','incubating','accelerating','archived','rejected');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_contract_signature_downstream() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.guard_intake_activation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'activated' AND OLD.status IS DISTINCT FROM NEW.status AND NOT EXISTS (
    SELECT 1 FROM public.startup_contracts c JOIN public.workspaces w ON w.id=c.workspace_id
    WHERE c.id=NEW.contract_id AND c.status='active' AND c.signed_at IS NOT NULL AND c.signature_status IN ('signed','completed') AND w.status='active' AND w.blocked_at IS NULL
  ) THEN RAISE EXCEPTION 'workspace_activation_not_verified' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_intake_activation() FROM PUBLIC, anon, authenticated;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'guard_intake_activation' AND tgrelid = 'public.contract_intakes'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER guard_intake_activation BEFORE UPDATE ON public.contract_intakes FOR EACH ROW EXECUTE FUNCTION public.guard_intake_activation();
  END IF;
END $rc12$;
CREATE OR REPLACE FUNCTION public.dispatch_contract_activation_recovery() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job_id bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('contract_activation_recovery'));
  IF EXISTS(SELECT 1 FROM public.startup_contracts WHERE activation_sync_pending AND status IN ('draft','pending_signature','active') AND signed_at IS NOT NULL AND signature_status IN ('signed','completed')) THEN
    PERFORM public.cron_invoke_edge('reconcile-contract-activation');
  ELSE
    SELECT jobid INTO job_id FROM cron.job WHERE jobname='reconcile-contract-activation';
    IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_contract_activation_recovery() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_contract_activation_recovery() TO service_role;
CREATE OR REPLACE FUNCTION public.wake_contract_activation_recovery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job_id bigint;
BEGIN
  IF NEW.activation_sync_pending IS DISTINCT FROM OLD.activation_sync_pending THEN
    PERFORM pg_advisory_xact_lock(hashtext('contract_activation_recovery'));
    IF NEW.activation_sync_pending THEN
      PERFORM cron.schedule('reconcile-contract-activation','*/5 * * * *','SELECT public.dispatch_contract_activation_recovery()');
      PERFORM public.cron_invoke_edge('reconcile-contract-activation');
    ELSIF NOT EXISTS(SELECT 1 FROM public.startup_contracts WHERE activation_sync_pending AND status IN ('draft','pending_signature','active')) THEN
      SELECT jobid INTO job_id FROM cron.job WHERE jobname='reconcile-contract-activation';
      IF job_id IS NOT NULL THEN PERFORM cron.unschedule(job_id); END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wake_contract_activation_recovery() FROM PUBLIC,anon,authenticated;
DO $rc12$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'wake_contract_activation_recovery' AND tgrelid = 'public.startup_contracts'::regclass AND NOT tgisinternal) THEN
    CREATE TRIGGER wake_contract_activation_recovery AFTER UPDATE ON public.startup_contracts FOR EACH ROW EXECUTE FUNCTION public.wake_contract_activation_recovery();
  END IF;
END $rc12$;

-- ===== drizzle 0011: guardas de escrita no workspace e de criação de conversas =====
CREATE OR REPLACE FUNCTION public.can_write_workspace(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_account_active(auth.uid()) AND (
   public.is_admin()
   OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=auth.uid() AND ur.role='consultor'::public.app_role)
   OR EXISTS (SELECT 1 FROM public.workspace_users wu JOIN public.workspaces w ON w.id=wu.workspace_id
     WHERE wu.workspace_id=_workspace_id AND wu.user_id=auth.uid() AND wu.active=true
       AND wu.role IN ('founder'::public.app_role,'consultor'::public.app_role) AND w.blocked_at IS NULL)
 );
$$;
ALTER POLICY "Authenticated users can create conversations" ON public.conversations WITH CHECK (false);
CREATE OR REPLACE FUNCTION public.create_conversation(participant_ids uuid[], _title text DEFAULT NULL::text, _workspace_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_conv_id uuid;
  v_is_group boolean;
  v_participant uuid;
  v_other_id uuid;
  v_other_count int;
BEGIN
  v_user_id := auth.uid(); IF NOT public.is_account_active(v_user_id) THEN RAISE EXCEPTION 'account_access_denied' USING ERRCODE = '42501'; END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _workspace_id IS NOT NULL AND NOT public.has_workspace_access(_workspace_id) THEN
    RAISE EXCEPTION 'workspace_access_denied' USING ERRCODE = '42501';
  END IF;

  -- Count distinct non-null non-self participants to decide 1:1 vs group.
  SELECT COUNT(DISTINCT p)::int
    INTO v_other_count
    FROM unnest(COALESCE(participant_ids, ARRAY[]::uuid[])) AS p
   WHERE p IS NOT NULL AND p <> v_user_id;

  v_is_group := v_other_count > 1;

  -- ─── 1:1 get-or-create ───
  -- If exactly one other participant, try to find an existing 1:1
  -- conversation between {caller, other} in the same workspace scope.
  IF v_other_count = 1 THEN
    SELECT DISTINCT p
      INTO v_other_id
      FROM unnest(participant_ids) AS p
     WHERE p IS NOT NULL AND p <> v_user_id
     LIMIT 1;

    SELECT c.id
      INTO v_conv_id
      FROM public.conversations c
     WHERE COALESCE(c.is_group, false) = false
       AND c.workspace_id IS NOT DISTINCT FROM _workspace_id
       AND EXISTS (
         SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = v_user_id
       )
       AND EXISTS (
         SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = v_other_id
       )
       AND (
         SELECT COUNT(*) FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id
       ) = 2
     ORDER BY c.created_at ASC
     LIMIT 1;

    IF v_conv_id IS NOT NULL THEN
      RETURN v_conv_id;
    END IF;
  END IF;

  -- ─── Fresh insert path ───
  INSERT INTO public.conversations (title, workspace_id, is_group)
  VALUES (_title, _workspace_id, v_is_group)
  RETURNING id INTO v_conv_id;

  -- Always add creator.
  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id)
  ON CONFLICT DO NOTHING;

  -- Add other participants (dedupe + exclude creator).
  IF participant_ids IS NOT NULL THEN
    FOREACH v_participant IN ARRAY participant_ids LOOP
      IF v_participant IS NULL OR v_participant = v_user_id THEN
        CONTINUE;
      END IF;
      IF NOT (public.is_staff() OR public.can_notify_user(v_participant)) THEN
        RAISE EXCEPTION 'participant_not_allowed' USING ERRCODE = '42501';
      END IF;
      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_participant)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_conv_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.create_conversation(uuid[],text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation(uuid[],text,uuid) TO authenticated, service_role;
COMMENT ON POLICY "Authenticated users can create conversations" ON public.conversations IS 'Direct INSERT disabled: use authorized create_conversation or get_or_create_workspace_conversation commands.';

-- ===== drizzle 0012: metadados de upload atómicos =====
CREATE OR REPLACE FUNCTION public.merge_contract_document_metadata(_contract_id uuid, _doc_key text, _metadata jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF _doc_key IS NULL OR _doc_key NOT IN ('certidao_comercial','id_representante','comprovativo_morada','comprovativo_iban','pitch_deck','docs_associacoes') OR jsonb_typeof(_metadata) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_document_metadata' USING ERRCODE='22023'; END IF;
 UPDATE public.startup_contracts SET documents_json = coalesce(documents_json,'{}'::jsonb) || jsonb_build_object(_doc_key,_metadata)
 WHERE id=_contract_id AND signed_at IS NULL AND status NOT IN ('active','terminated') AND coalesce(signature_status,'') NOT IN ('completed','signed','partially_signed','declined','voided');
 IF NOT FOUND THEN RAISE EXCEPTION 'contract_document_write_denied' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.merge_contract_document_metadata(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.merge_contract_document_metadata(uuid,text,jsonb) TO service_role;
COMMENT ON FUNCTION public.merge_contract_document_metadata(uuid,text,jsonb) IS 'Atomic one-key metadata merge after token-validated document upload; signed contracts remain closed.';

-- ===== drizzle 0013: helpers privados de pesquisa =====
CREATE OR REPLACE FUNCTION public.get_dataroom_workspace_id(_dataroom_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT workspace_id FROM public.datarooms WHERE id = _dataroom_id AND (auth.role() = 'service_role' OR public.has_workspace_access(workspace_id)); $$;
CREATE OR REPLACE FUNCTION public.get_session_workspace_id(_session_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT workspace_id FROM public.sessions WHERE id = _session_id AND (auth.role() = 'service_role' OR public.has_workspace_access(workspace_id)); $$;
REVOKE ALL ON FUNCTION public.get_dataroom_workspace_id(uuid), public.get_session_workspace_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dataroom_workspace_id(uuid), public.get_session_workspace_id(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.account_not_suspended(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT CASE WHEN auth.role() = 'anon' OR (auth.uid() IS NULL AND auth.role() IS DISTINCT FROM 'service_role') THEN false ELSE _user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.account_status = 'suspended') END; $$;
REVOKE ALL ON FUNCTION public.is_feature_flag_enabled(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_feature_flag_enabled(text) TO authenticated, service_role;
COMMENT ON FUNCTION public.get_dataroom_workspace_id(uuid) IS 'RLS helper: returns parent workspace only when caller can access it; service role retained.';
COMMENT ON FUNCTION public.get_session_workspace_id(uuid) IS 'RLS helper: returns parent workspace only when caller can access it; service role retained.';

-- ===== drizzle 0014: fronteiras de leitura de modelos =====
ALTER POLICY "Authenticated users can read session_templates" ON public.session_templates USING (public.is_staff() OR is_global = true OR created_by = auth.uid());
ALTER POLICY "Authenticated users can read investor_update_templates" ON public.investor_update_templates USING (public.is_staff() OR is_active = true);

-- ===== drizzle 0015: conversão CRM contratado =====
CREATE OR REPLACE FUNCTION public.staff_mark_funnel_item_contracted(p_funnel_item_id uuid, p_program_id uuid, p_stage text DEFAULT 'ideation')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.funnel_items%ROWTYPE;
  v_result jsonb;
  v_workspace uuid;
  v_description text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_staff() OR public.is_backoffice())
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_status = 'approved') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_item FROM public.funnel_items WHERE id = p_funnel_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'funnel_item_not_found' USING ERRCODE = 'P0002'; END IF;
  IF p_program_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.programs WHERE id = p_program_id AND is_active = true) THEN
    RAISE EXCEPTION 'active_program_required' USING ERRCODE = '22023';
  END IF;
  IF p_stage NOT IN ('ideation','validation','mvp','growth','scale') OR p_stage IS NULL THEN
    RAISE EXCEPTION 'invalid_startup_stage' USING ERRCODE = '22023';
  END IF;
  -- An existing contract/workspace is authoritative: do not mint a duplicate.
  IF v_item.linked_workspace_id IS NULL THEN
    SELECT workspace_id INTO v_workspace FROM public.startup_contracts
    WHERE workspace_id IS NOT NULL AND archived_at IS NULL
      AND (id = v_item.linked_contract_id OR funnel_item_id = v_item.id)
    ORDER BY (id IS NOT DISTINCT FROM v_item.linked_contract_id) DESC, created_at DESC LIMIT 1;
    IF v_workspace IS NOT NULL THEN
      UPDATE public.funnel_items SET linked_workspace_id = v_workspace,
        linked_startup_id = (SELECT startup_id FROM public.workspaces WHERE id = v_workspace)
      WHERE id = v_item.id;
    END IF;
  END IF;
  v_description := concat_ws(E'\n\n', NULLIF(v_item.notes, ''),
    CASE WHEN v_item.metadata_json->>'sector' IS NOT NULL THEN 'Sector: ' || (v_item.metadata_json->>'sector') END,
    CASE WHEN v_item.metadata_json->>'vertical' IS NOT NULL THEN 'Vertical: ' || (v_item.metadata_json->>'vertical') END,
    NULLIF(v_item.metadata_json->>'help_expectation',''), NULLIF(v_item.metadata_json->>'personal_intro',''));
  v_result := public.staff_convert_funnel_item_to_startup(
    p_funnel_item_id => p_funnel_item_id, p_program_id => p_program_id, p_stage => p_stage,
    p_project_name => NULLIF(v_item.metadata_json->>'project_name',''),
    p_description => NULLIF(v_description,''),
    p_health_notes => concat_ws(E'\n\n', NULLIF(v_item.source,''), NULLIF(v_description,'')),
    p_inferred_stage => p_stage);
  v_workspace := (v_result->>'workspace_id')::uuid;
  -- Commercial attestation is NOT signature evidence. Do not activate or sign any contract.
  UPDATE public.funnel_items SET stage = 'contracted', type = 'startup_active',
    program_id = (SELECT program_id FROM public.workspaces WHERE id = v_workspace),
    converted_at = COALESCE(converted_at, now()), updated_at = now() WHERE id = v_item.id;
  -- Link, rather than copy, history so the CRM record and workspace see the same records.
  UPDATE public.communication_log SET workspace_id = v_workspace
    WHERE funnel_item_id = v_item.id AND workspace_id IS NULL;
  INSERT INTO public.funnel_events(funnel_item_id,event_type,from_stage,to_stage,performed_by,metadata)
    SELECT v_item.id,'stage_changed',v_item.stage,'contracted',auth.uid(),
      jsonb_build_object('workspace_id',v_workspace,'conversion_source','staff_contracted')
    WHERE v_item.stage IS DISTINCT FROM 'contracted';
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.staff_mark_funnel_item_contracted(uuid,uuid,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.staff_mark_funnel_item_contracted(uuid,uuid,text) TO authenticated;

-- ===== drizzle 0016: staff_assign_or_create_workspace =====
CREATE OR REPLACE FUNCTION public.staff_assign_or_create_workspace(p_user_id uuid, p_mode text, p_workspace_id uuid DEFAULT NULL::uuid, p_startup_name text DEFAULT NULL::text, p_program_id uuid DEFAULT NULL::uuid, p_stage text DEFAULT 'ideation'::text, p_description text DEFAULT NULL::text)
 RETURNS TABLE(workspace_id uuid, startup_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_staff_id uuid;
  v_workspace_id uuid;
  v_startup_id uuid;
BEGIN
  v_staff_id := auth.uid();
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only staff can assign workspaces';
  END IF;

  IF p_mode = 'assign' THEN
    IF p_workspace_id IS NULL THEN
      RAISE EXCEPTION 'workspace_id is required for assign mode';
    END IF;
    v_workspace_id := p_workspace_id;
    SELECT w.startup_id INTO v_startup_id FROM public.workspaces w WHERE w.id = v_workspace_id;
    IF EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = v_workspace_id AND w.status IN ('archived','rejected')) THEN
      RAISE EXCEPTION 'workspace_archived_or_rejected' USING ERRCODE = '22023';
    END IF;
    IF v_startup_id IS NULL THEN
      RAISE EXCEPTION 'Workspace not found';
    END IF;
    INSERT INTO public.workspace_users AS wu (workspace_id, user_id, role, active)
    VALUES (v_workspace_id, p_user_id, 'founder', true)
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET active = true, role = 'founder';
    UPDATE public.workspaces w
    SET needs_onboarding = false, status = 'active', updated_at = now()
    WHERE w.id = v_workspace_id;
  ELSIF p_mode = 'create' THEN
    IF p_startup_name IS NULL OR trim(p_startup_name) = '' THEN
      RAISE EXCEPTION 'startup_name is required for create mode';
    END IF;
    INSERT INTO public.startups (name, description)
    VALUES (trim(p_startup_name), p_description)
    RETURNING id INTO v_startup_id;
    INSERT INTO public.workspaces (startup_id, program_id, stage, status, needs_onboarding)
    VALUES (v_startup_id, p_program_id, p_stage::public.startup_stage, 'active', false)
    RETURNING id INTO v_workspace_id;
    INSERT INTO public.workspace_users (workspace_id, user_id, role, active)
    VALUES (v_workspace_id, p_user_id, 'founder', true);
  ELSE
    RAISE EXCEPTION 'Invalid mode: %. Must be "assign" or "create"', p_mode;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'founder') ON CONFLICT DO NOTHING;
  UPDATE public.profiles p SET account_status = 'approved', updated_at = now()
  WHERE p.id = p_user_id AND p.account_status = 'pending';
  INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, workspace_id, metadata)
  VALUES (v_staff_id, 'workspace', v_workspace_id, 'staff_assigned_workspace', v_workspace_id,
    jsonb_build_object('mode', p_mode, 'founder_id', p_user_id, 'startup_id', v_startup_id));

  RETURN QUERY SELECT v_workspace_id, v_startup_id;
END;
$function$;

-- ===== drizzle 0017 + 0018: portefólio atribuído e ações de marcos arquivados (definições finais) =====
CREATE OR REPLACE FUNCTION public.search_workspaces_paged(_statuses text[] DEFAULT ARRAY['active'::text], _assigned_to uuid DEFAULT NULL::uuid, _search text DEFAULT NULL::text, _program_id uuid DEFAULT NULL::uuid, _stage startup_stage DEFAULT NULL::startup_stage, _health health_score DEFAULT NULL::health_score, _priority workspace_priority DEFAULT NULL::workspace_priority, _sort_by text DEFAULT 'priority'::text, _limit integer DEFAULT 15, _offset integer DEFAULT 0, _missing_kpi_this_month boolean DEFAULT false, _overdue_actions boolean DEFAULT false)
 RETURNS TABLE(id uuid, startup_id uuid, program_id uuid, stage startup_stage, status text, health_score health_score, health_score_override health_score, priority_level workspace_priority, current_week integer, updated_at timestamp with time zone, created_at timestamp with time zone, startup_name text, startup_logo_url text, startup_description text, program_name text, program_type text, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH assigned AS (
    SELECT w.id AS workspace_id
      FROM public.workspaces w
     WHERE _assigned_to IS NOT NULL
       AND (
         w.assigned_consultor_id = _assigned_to
       )
  ),
  base AS (
    SELECT w.id, w.startup_id, w.program_id, w.stage, w.status,
           w.health_score, w.health_score_override, w.priority_level,
           w.current_week, w.updated_at, w.created_at,
           s.name AS startup_name, s.logo_url AS startup_logo_url, s.description AS startup_description,
           p.name AS program_name, p.program_type
      FROM public.workspaces w
      LEFT JOIN public.startups s ON s.id = w.startup_id
      LEFT JOIN public.programs p ON p.id = w.program_id
     WHERE w.status = ANY(_statuses)
       AND (_assigned_to IS NULL OR w.id IN (SELECT workspace_id FROM assigned))
       AND (_search IS NULL OR _search = '' OR s.name ILIKE '%' || _search || '%')
       AND (_program_id IS NULL OR w.program_id = _program_id)
       AND (_stage IS NULL OR w.stage = _stage)
       AND (_health IS NULL OR w.health_score = _health OR w.health_score_override = _health)
       AND (_priority IS NULL OR w.priority_level = _priority)
       AND (
         NOT _missing_kpi_this_month
         OR NOT EXISTS (
           SELECT 1 FROM public.kpi_values kv
            WHERE kv.workspace_id = w.id
              AND date_trunc('month', kv.period_month) = date_trunc('month', CURRENT_DATE)
         )
       )
       AND (
         NOT _overdue_actions
         OR EXISTS (
           SELECT 1 FROM public.action_items ai
            WHERE ai.workspace_id = w.id
              AND (ai.milestone_id IS NULL OR EXISTS (
                SELECT 1 FROM public.milestones m WHERE m.id = ai.milestone_id AND m.archived_at IS NULL
              ))
              AND ai.status IN ('pending','in_progress')
              AND ai.due_date IS NOT NULL
              AND ai.due_date < CURRENT_DATE
         )
       )
  ),
  counted AS (SELECT COUNT(*) AS n FROM base)
  SELECT b.id, b.startup_id, b.program_id, b.stage, b.status,
         b.health_score, b.health_score_override, b.priority_level,
         b.current_week, b.updated_at, b.created_at,
         b.startup_name, b.startup_logo_url, b.startup_description,
         b.program_name, b.program_type,
         (SELECT n FROM counted) AS total_count
    FROM base b
   ORDER BY
     CASE WHEN _sort_by = 'name' THEN b.startup_name END ASC,
     CASE WHEN _sort_by = 'priority' THEN
       CASE b.priority_level WHEN 'star' THEN 0 WHEN 'high' THEN 1 WHEN 'standard' THEN 2 WHEN 'maintenance' THEN 3 ELSE 9 END
     END ASC,
     CASE WHEN _sort_by = 'urgency' THEN
       CASE COALESCE(b.health_score_override::text, b.health_score::text, 'stable')
         WHEN 'critical' THEN 0 WHEN 'at_risk' THEN 1 WHEN 'stable' THEN 2 WHEN 'healthy' THEN 3 WHEN 'thriving' THEN 4 ELSE 9 END
     END ASC,
     CASE WHEN _sort_by IN ('updated','priority','name','urgency') THEN NULL ELSE b.updated_at END DESC,
     b.updated_at DESC
   LIMIT _limit OFFSET _offset;
$function$;
COMMENT ON FUNCTION public.search_workspaces_paged(text[],uuid,text,uuid,public.startup_stage,public.health_score,public.workspace_priority,text,integer,integer,boolean,boolean) IS 'Assigned-only lists use primary consultant assignment; overdue means pending/in_progress before today, separate from awaiting_validation. Existing invoker security and grants preserved.';
CREATE OR REPLACE FUNCTION public.get_workspace_stats(workspace_ids uuid[])
 RETURNS TABLE(workspace_id uuid, pending_actions_count integer, overdue_actions_count integer, has_current_month_kpi boolean, last_kpi_month date, next_meeting_date timestamp with time zone, last_session_id uuid, last_session_title text, last_session_scheduled_at timestamp with time zone, last_session_notes text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month DATE := date_trunc('month', now())::date;
  today DATE := CURRENT_DATE;
  filtered_workspace_ids uuid[];
BEGIN
  -- SECURITY: Filter to only workspaces the user has access to
  SELECT ARRAY_AGG(w.id) INTO filtered_workspace_ids
  FROM unnest(workspace_ids) AS w(id)
  WHERE public.has_workspace_access(auth.uid(), w.id);
  
  -- If no accessible workspaces, return empty
  IF filtered_workspace_ids IS NULL OR array_length(filtered_workspace_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH action_counts AS (
    SELECT 
      ai.workspace_id,
      COUNT(*) FILTER (WHERE ai.status IN ('pending', 'in_progress')) AS pending_count,
      COUNT(*) FILTER (WHERE ai.status IN ('pending', 'in_progress') AND ai.due_date < today) AS overdue_count
    FROM action_items ai
    WHERE ai.workspace_id = ANY(filtered_workspace_ids)
      AND (ai.milestone_id IS NULL OR EXISTS (
        SELECT 1 FROM public.milestones m WHERE m.id = ai.milestone_id AND m.archived_at IS NULL
      ))
    GROUP BY ai.workspace_id
  ),
  kpi_data AS (
    SELECT DISTINCT ON (kv.workspace_id)
      kv.workspace_id,
      EXISTS (
        SELECT 1 FROM kpi_values kv2 
        WHERE kv2.workspace_id = kv.workspace_id 
        AND kv2.period_month = current_month
      ) AS has_current,
      kv.period_month AS last_month
    FROM kpi_values kv
    WHERE kv.workspace_id = ANY(filtered_workspace_ids)
    ORDER BY kv.workspace_id, kv.period_month DESC
  ),
  next_sessions AS (
    SELECT DISTINCT ON (s.workspace_id)
      s.workspace_id,
      s.scheduled_at
    FROM sessions s
    WHERE s.workspace_id = ANY(filtered_workspace_ids)
      AND s.scheduled_at >= now()
    ORDER BY s.workspace_id, s.scheduled_at ASC
  ),
  last_sessions AS (
    SELECT DISTINCT ON (s.workspace_id)
      s.workspace_id,
      s.id,
      s.title,
      s.scheduled_at,
      s.notes
    FROM sessions s
    WHERE s.workspace_id = ANY(filtered_workspace_ids)
      AND s.scheduled_at < now()
    ORDER BY s.workspace_id, s.scheduled_at DESC
  )
  SELECT 
    w.id AS workspace_id,
    COALESCE(ac.pending_count, 0)::INTEGER AS pending_actions_count,
    COALESCE(ac.overdue_count, 0)::INTEGER AS overdue_actions_count,
    COALESCE(kd.has_current, false) AS has_current_month_kpi,
    kd.last_month AS last_kpi_month,
    ns.scheduled_at AS next_meeting_date,
    ls.id AS last_session_id,
    ls.title AS last_session_title,
    ls.scheduled_at AS last_session_scheduled_at,
    ls.notes AS last_session_notes
  FROM unnest(filtered_workspace_ids) AS w(id)
  LEFT JOIN action_counts ac ON ac.workspace_id = w.id
  LEFT JOIN kpi_data kd ON kd.workspace_id = w.id
  LEFT JOIN next_sessions ns ON ns.workspace_id = w.id
  LEFT JOIN last_sessions ls ON ls.workspace_id = w.id;
END;
$function$;
COMMENT ON FUNCTION public.get_workspace_stats(uuid[]) IS 'Operational action counts exclude archived milestones; data preserved, permission filtering unchanged.';
```

**Criar `scripts/ci/check-drizzle-mirrored.mjs`** (conteúdo exato):

```
#!/usr/bin/env node
// RC12 · toda a migração em drizzle/migrations tem de estar espelhada em supabase/migrations.
// Contexto: o caminho de migração da Lovable grava ficheiros em drizzle/migrations e aplica-os à base viva, mas
// `supabase start`, `supabase db push` e o CI só leem supabase/migrations. Sem espelho, a base viva e o repositório divergem.
// Manifesto: scripts/ci/drizzle-mirror.json  { "<tag drizzle>": "<versão do ficheiro em supabase/migrations>" }
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const dz = 'drizzle/migrations';
const sb = 'supabase/migrations';
const mapFile = 'scripts/ci/drizzle-mirror.json';
if (!existsSync(dz)) { console.log('[drizzle-mirror] sem drizzle/migrations: nada a verificar.'); process.exit(0); }
const map = existsSync(mapFile) ? JSON.parse(readFileSync(mapFile, 'utf8')) : {};
const tags = readdirSync(dz).filter((f) => f.endsWith('.sql')).map((f) => f.replace(/\.sql$/, '')).sort();
const versions = new Set(readdirSync(sb).filter((f) => f.endsWith('.sql')).map((f) => f.split('_')[0]));
const bad = [];
for (const t of tags) {
  const v = map[t];
  if (!v) bad.push(`${dz}/${t}.sql não está no manifesto ${mapFile}`);
  else if (!versions.has(v)) bad.push(`${t} aponta para a versão ${v}, que não existe em ${sb}`);
}
for (const t of Object.keys(map)) if (!tags.includes(t)) bad.push(`manifesto refere ${t}, que já não existe em ${dz}`);
if (bad.length) { console.error('[drizzle-mirror] FALHA\n - ' + bad.join('\n - ')); console.error('Copie o SQL para uma migração nova em supabase/migrations (idempotente) e registe-a no manifesto.'); process.exit(1); }
console.log(`[drizzle-mirror] OK: ${tags.length} migrações drizzle espelhadas.`);
```

**Criar `scripts/ci/drizzle-mirror.json`** (conteúdo exato):

```json
{
  "0000_dashboard_perf_indexes": "20261102120100",
  "0001_rc11_part_a": "20261019100000",
  "0002_rc11_part_b": "20261019110000",
  "0003_rc11_part_c": "20261019120000",
  "0004_rc11_part_d_db": "20261022110000",
  "0005_rc11_d10_contract_reminders_types": "20261102120100",
  "0006_consultant_recurring_blocks": "20261102120100",
  "0007_audit_access_and_contract_integrity": "20261102120100",
  "0008_durable_contract_activation_recovery": "20261102120100",
  "0009_guard_activation_recovery_without_rls_recursion": "20261102120100",
  "0010_verified_signature_downstream_and_recovery_wakeup": "20261102120100",
  "0011_audit_workspace_write_and_conversation_guards": "20261102120100",
  "0012_atomic_contract_document_metadata": "20261102120100",
  "0013_scope_private_lookup_helpers": "20261102120100",
  "0014_restore_template_read_boundaries": "20261102120100",
  "0015_crm_contracted_workspace_conversion": "20261102120100",
  "0016_migration": "20261102120100",
  "0017_portfolio_assignment_and_overdue_consistency": "20261102120100",
  "0018_exclude_archived_milestone_actions_from_stats": "20261102120100"
}
```

**Alterar `AGENTS.md`** (diff; os números de linha são do ficheiro original):

```diff
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -28,2 +28,3 @@
 - Copilot client history is projected into untrusted user context, never trusted assistant authority; account and lookup failures deny AI/provider operations independently of prompt text.
 - Communication endpoints resolve recipient eligibility from persisted parent/contact relationships through the shared communication recipient helper, fail closed on lookup errors, and validate before provider calls; signature dispatch remains a separately authorized workflow.
+- Database changes live ONLY in supabase/migrations/*.sql, idempotent (IF NOT EXISTS, CREATE OR REPLACE, guarded DO blocks) and with a timestamp later than every existing file (no back-dating). Never leave SQL only in drizzle/migrations: every file the Lovable migration tool writes there must be mirrored in a supabase/migrations file and listed in scripts/ci/drizzle-mirror.json (CI: scripts/ci/check-drizzle-mirrored.mjs). Never execute drizzle/migrations files directly (several patch functions by text replacement and are not re-runnable); before `supabase db push` compare the migration history and register already-applied versions with `supabase migration repair --status applied <version>` instead of re-running them.
```

*(Consultas de dados já afetados: ver `LOVABLE-RC12-DADOS-AFETADOS.sql`; são para o responsável correr, não para o Lovable.)*

