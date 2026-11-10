-- RC13 · Fecho da RC12: consultas SÓ DE LEITURA para correr na base real (SQL Editor do Supabase ou ferramenta de dados do Lovable).
-- Nenhuma altera dados. São 13 blocos e cada um diz o resultado esperado. Servem para confirmar o que o snapshot do código não consegue mostrar:
-- reparações de dados que o Lovable diz ter corrido "pela ferramenta de dados", hashes de funções e contas de staff por aprovar.
-- Snapshot de referência: remix-of-startup-companion-main de 10 nov 2026 (drizzle 0000 a 0036).

-- ============ 1. As 18 migrações RC12 estão registadas na base? ============
-- Esperado: uma linha com 37 registos (drizzle 0000 a 0036). A consulta descobre sozinha o nome da tabela de histórico.
-- Se vier vazia, o histórico drizzle tem outro nome: nesse caso valem os blocos 2 e 3, que provam o mesmo pelo catálogo.
SELECT n.nspname AS esquema, c.relname AS tabela,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::int AS registos
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE c.relkind = 'r' AND c.relname ILIKE '%drizzle%migration%';

-- ============ 2. Hashes das funções centrais (comparar com a réplica construída a partir do snapshot) ============
-- Esperado (réplica PG16 = supabase/migrations + drizzle 0000 a 0036):
--   has_role(_user_id uuid, _role app_role)      ef25422c4c8524dba6f9cfeb797b5b51   (igual ao que o Lovable leu no catálogo alojado)
--   account_not_suspended(_user_id uuid)         323d060dd1ca1c4c0c7ccf01d637e46d
--   is_account_active()                          ce406d5946bdd3a6e7c5a6875575cd6b
--   is_account_active(_user_id uuid)             a5d7a21723d2e213432adb8b229311c5
--   claim_startup()                              09ed8916a7b336e091f994984d9cac5b
--   ensure_contract_workspace(p_contract_id uuid) c34796136f21fee6bb6f642e41d95f22
--   check_automation_health()                    34f82a7b2e8a92d231e0f35ded0674ec
--   publish_program_setup(...)                   c1007a86a56f67d460c01408a24ff4d6
--   purge_operational_logs()                     e05d67a338617411b15ae9cb10aed54f
-- Se algum divergir, envie-me a linha: os guardas md5 de qualquer patch futuro passam a partir do valor real.
SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS funcao,
       md5(pg_get_functiondef(p.oid)) AS md5
  FROM pg_proc p
 WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('has_role','account_not_suspended','is_account_active','claim_startup',
                     'ensure_contract_workspace','check_automation_health','publish_program_setup','purge_operational_logs')
 ORDER BY 1;

-- ============ 3. ONB-02 · política restritiva de suspensão em todas as tabelas com RLS ============
-- Esperado: exatamente 2 linhas, profiles e user_roles (ficam de fora de propósito, para o ecrã /suspended).
-- Qualquer outra tabela listada foi criada depois da migração e precisa da política rc12_suspended_block.
SELECT c.relname AS tabela_sem_politica
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relrowsecurity
   AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid AND p.polname = 'rc12_suspended_block')
 ORDER BY 1;
-- Esperado: 0 linhas (tabelas do esquema public sem RLS ligada).
SELECT c.relname AS tabela_sem_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
 ORDER BY 1;

-- ============ 4. DECISÃO SUA · contas de staff que não estão aprovadas ============
-- Na base, uma conta PENDENTE com papel admin, consultor ou backoffice tem hoje os mesmos poderes de uma aprovada
-- (is_staff, is_admin e can_access_backoffice só excluem contas suspensas; is_account_active tem um "staff bypass" explícito).
-- Esperado para poder fechar esse bypass sem bloquear ninguém: 0 linhas com account_status = 'pending'.
-- Se aparecerem pessoas reais da equipa, aprove-as primeiro; se aparecerem contas que não reconhece, retire-lhes o papel.
SELECT p.id, p.email, p.full_name, p.account_status, p.created_at, array_agg(ur.role ORDER BY ur.role) AS papeis
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
 WHERE ur.role IN ('admin','consultor','backoffice')
   AND p.account_status <> 'approved'
 GROUP BY p.id, p.email, p.full_name, p.account_status, p.created_at
 ORDER BY p.account_status, p.created_at;

-- ============ 5. FEB-01 · proteções de esquema de URL ============
-- Esperado: 7 linhas (as constraints *_safe_scheme_chk). convalidated = false é o previsto no pacote (NOT VALID).
SELECT conrelid::regclass AS tabela, conname, convalidated
  FROM pg_constraint
 WHERE connamespace = 'public'::regnamespace AND contype = 'c' AND conname LIKE '%\_safe\_scheme\_chk'
 ORDER BY 1, 2;
-- Esperado: 0 linhas. Como as constraints são NOT VALID, linhas antigas com esquemas perigosos continuam lá até serem limpas.
SELECT 'profiles.linkedin_url' AS coluna, id::text, linkedin_url AS valor FROM public.profiles WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':')
UNION ALL SELECT 'team_members.linkedin_url', id::text, linkedin_url FROM public.team_members WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':')
UNION ALL SELECT 'sessions.join_url', id::text, join_url FROM public.sessions WHERE join_url IS NOT NULL AND NOT (join_url ~* '^\s*https?://' OR join_url !~ ':')
UNION ALL SELECT 'sessions.teams_meeting_url', id::text, teams_meeting_url FROM public.sessions WHERE teams_meeting_url IS NOT NULL AND NOT (teams_meeting_url ~* '^\s*https?://' OR teams_meeting_url !~ ':')
UNION ALL SELECT 'action_deliverables.external_url', id::text, external_url FROM public.action_deliverables WHERE external_url IS NOT NULL AND NOT (external_url ~* '^\s*https?://' OR external_url !~ ':')
UNION ALL SELECT 'documents.external_url', id::text, external_url FROM public.documents WHERE external_url IS NOT NULL AND NOT (external_url ~* '^\s*https?://' OR external_url !~ ':')
UNION ALL SELECT 'program_weeks.meeting_url', id::text, meeting_url FROM public.program_weeks WHERE meeting_url IS NOT NULL AND NOT (meeting_url ~* '^\s*https?://' OR meeting_url !~ ':');

-- ============ 6. DBP-07 e OPS-12 · purga de logs agendada e vigiada ============
-- Esperado: 1 linha, purge-operational-logs-daily às 47 3 * * *, active = true.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'purge-operational-logs-daily';
-- Esperado: 1 linha. Se vier vazio, o monitor de saúde NÃO avisa quando a purga deixa de correr
-- (esta linha não está em nenhuma migração do snapshot; o Lovable diz tê-la inserido pela ferramenta de dados).
SELECT job_name, enabled, expected_cadence_seconds, grace_seconds, severity
  FROM public.automation_health_expectations
 WHERE job_name = 'purge_operational_logs';
-- Esperado: pelo menos uma corrida com sucesso nas últimas 48 horas.
SELECT job_name, status, started_at, finished_at
  FROM public.cron_job_runs
 WHERE job_name ILIKE '%purge%'
 ORDER BY started_at DESC
 LIMIT 5;

-- ============ 7. E2E-04 · leads contratadas que ficaram com type = 'lead' ============
-- Esperado: 0. Se for maior que 0, a reparação de dados da Parte 6 não correu e essas startups continuam nos baldes comerciais da Inbox do CRM.
SELECT count(*) AS leads_contratadas_por_reparar
  FROM public.funnel_items
 WHERE type = 'lead' AND linked_workspace_id IS NOT NULL AND stage IN ('contracted','incubating','accelerating');

-- ============ 8. FEX-05 · notificações com links para rotas que não existem ============
-- Esperado: 0. Se for maior que 0, quem clica nessas notificações cai numa página inexistente.
SELECT count(*) FILTER (WHERE link = '/dashboard' OR link LIKE '/dashboard?%') AS links_dashboard,
       count(*) FILTER (WHERE link = '/admin?tab=contracts') AS links_admin_contracts
  FROM public.notifications;

-- ============ 9. Importador em massa · linhas presas a meio ============
-- Esperado: 0 linhas. Uma linha em 'applying' há mais de 30 minutos ficou presa por a função ter expirado.
SELECT id, batch_id, status, updated_at
  FROM public.bulk_import_rows
 WHERE status = 'applying' AND updated_at < now() - interval '30 minutes'
 ORDER BY updated_at;

-- ============ 10. Ativação de contratos · sincronizações pendentes há mais de uma hora ============
-- Esperado: 0 linhas. Cada linha é um contrato assinado cujo workspace ou conta do founder ainda não ficou ativo.
SELECT id, organization_name, signature_status, signed_at, updated_at
  FROM public.startup_contracts
 WHERE activation_sync_pending = true AND updated_at < now() - interval '1 hour'
 ORDER BY updated_at;

-- ============ 11. Saúde dos jobs nas últimas 24 horas (contexto para a RC13) ============
-- Não há valor esperado fixo. Jobs sem nenhuma corrida, ou só com falhas, são candidatos ao dead-man switch da RC13.
SELECT j.jobname, j.schedule, j.active,
       (SELECT count(*) FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.start_time > now() - interval '24 hours') AS corridas_24h,
       (SELECT count(*) FROM cron.job_run_details d WHERE d.jobid = j.jobid AND d.start_time > now() - interval '24 hours' AND d.status <> 'succeeded') AS falhadas_24h,
       (SELECT max(d.start_time) FROM cron.job_run_details d WHERE d.jobid = j.jobid) AS ultima_corrida
  FROM cron.job j
 ORDER BY j.jobname;

-- ============ 12. ONB-02 (resíduo) · Storage ============
-- Antes do P00: 0 na 1.ª coluna. Depois do P00, secção 7: 1.
-- A 2.ª coluna tem de ser true: confirma que a RLS de storage.objects está ligada na base real.
SELECT (SELECT count(*) FROM pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname = 'rc12_suspended_block') AS politica_de_suspensao,
       (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass) AS rls_ligada;
-- As políticas de Storage que decidem quem é staff lendo user_roles diretamente (esperado: 7, em 4 buckets).
SELECT polname
  FROM pg_policy
 WHERE polrelid = 'storage.objects'::regclass
   AND (coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '')) ~* 'user_roles'
 ORDER BY 1;

-- ============ 13. FEB-01 (link novo) · documento do estatuto Startup Portugal ============
-- Esperado: 0 linhas. Cada linha é um valor que o P00, secção 3, vai pôr a NULL por não ser http(s).
SELECT id, name, startup_portugal_document_path
  FROM public.startups
 WHERE startup_portugal_document_path IS NOT NULL
   AND NOT (startup_portugal_document_path ~* '^\s*https?://' OR startup_portugal_document_path !~ ':');
-- Antes do P00: 0. Depois do P00, secção 3: 1.
SELECT count(*) AS constraint_do_documento
  FROM pg_constraint
 WHERE conname = 'startups_startup_portugal_document_path_safe_scheme_chk';
