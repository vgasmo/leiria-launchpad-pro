-- RC12: consultas SÓ DE LEITURA para o responsável correr na base real (SQL Editor do Supabase) ANTES e DEPOIS de aplicar as correções.
-- Cada bloco indica o achado. Nenhuma altera dados.

-- ============ Contas suspensas mantêm poderes de staff (ids: ONB-02) (ONB-02) ============

-- staff suspenso que ainda tem papéis privilegiados
SELECT p.id, p.email, p.account_status, array_agg(ur.role) AS roles FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id WHERE p.account_status = 'suspended' AND ur.role IN ('admin', 'consultor', 'backoffice') GROUP BY 1, 2, 3;
-- convites criados por contas suspensas (verificar se algum foi aceite depois da suspensão)
SELECT wi.id, wi.workspace_id, wi.email, wi.role, wi.accepted_at, wi.created_at, p.email AS criado_por FROM public.workspace_invitations wi JOIN public.profiles p ON p.id = wi.created_by WHERE p.account_status = 'suspended' ORDER BY wi.created_at DESC;


-- ============ Esquemas executáveis em URLs escritos por utilizadores (ids: FEB-01, FEX-01, FES-08) (FEB-01, FES-08, FEX-01) ============

SELECT 'profiles.linkedin_url' AS col, id::text, linkedin_url AS valor FROM public.profiles WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':')
UNION ALL SELECT 'team_members.linkedin_url', id::text, linkedin_url FROM public.team_members WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':')
UNION ALL SELECT 'sessions.join_url', id::text, join_url FROM public.sessions WHERE join_url IS NOT NULL AND NOT (join_url ~* '^\s*https?://' OR join_url !~ ':')
UNION ALL SELECT 'sessions.teams_meeting_url', id::text, teams_meeting_url FROM public.sessions WHERE teams_meeting_url IS NOT NULL AND NOT (teams_meeting_url ~* '^\s*https?://' OR teams_meeting_url !~ ':')
UNION ALL SELECT 'action_deliverables.external_url', id::text, external_url FROM public.action_deliverables WHERE external_url IS NOT NULL AND NOT (external_url ~* '^\s*https?://' OR external_url !~ ':')
UNION ALL SELECT 'documents.external_url', id::text, external_url FROM public.documents WHERE external_url IS NOT NULL AND NOT (external_url ~* '^\s*https?://' OR external_url !~ ':')
UNION ALL SELECT 'program_weeks.meeting_url', id::text, meeting_url FROM public.program_weeks WHERE meeting_url IS NOT NULL AND NOT (meeting_url ~* '^\s*https?://' OR meeting_url !~ ':');


-- ============ Fluxo de onboarding: atribuir/criar workspace, candidaturas, reconcile e claim (ids: ONB-01, ONB-05, ONB-04, ONB-06, ONB-07) (ONB-01, ONB-04, ONB-05, ONB-06, ONB-07) ============

-- ONB-01: claims pendentes e contas founder sem adesão ativa
SELECT r.id, r.user_id, r.user_email, r.match_method, r.created_at FROM public.startup_claim_requests r WHERE r.status = 'pending' ORDER BY r.created_at;
SELECT p.id, p.email, p.account_status, p.signup_startup_name FROM public.profiles p WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'founder') AND NOT EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.user_id = p.id AND wu.active) ORDER BY p.created_at;
-- ONB-05: workspaces ativos sem onboarding e sem NIF, atribuídos ou criados pela equipa (a equipa decide caso a caso se reabre o assistente com UPDATE workspaces SET needs_onboarding = true)
SELECT w.id, s.name, w.status, w.needs_onboarding, s.nif, a.action, a.created_at FROM public.workspaces w JOIN public.startups s ON s.id = w.startup_id JOIN public.activity_log a ON a.entity_id = w.id AND a.action IN ('staff_assigned_workspace', 'created_for_claim') WHERE w.status = 'active' AND NOT w.needs_onboarding AND (s.nif IS NULL OR btrim(s.nif) = '') ORDER BY a.created_at DESC;
-- ONB-04: candidaturas criadas por contas não aprovadas e papéis founder indevidos
SELECT w.id, s.name, w.status, w.created_at, p.email, p.account_status FROM public.workspaces w JOIN public.startups s ON s.id = w.startup_id JOIN public.profiles p ON p.id = w.created_by WHERE p.account_status <> 'approved';
SELECT ur.user_id, p.email, p.account_status FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id WHERE ur.role = 'founder' AND (p.account_status <> 'approved' OR EXISTS (SELECT 1 FROM public.user_roles m WHERE m.user_id = p.id AND m.role = 'mentor_externo'));
-- ONB-06: contas suspensas que voltaram a ficar founder ativo (desativar a adesão só depois de rever a lista)
SELECT p.id, p.email, p.account_status, wu.workspace_id, wu.role, wu.active FROM public.profiles p JOIN public.workspace_users wu ON wu.user_id = p.id AND wu.active JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'founder' WHERE p.account_status = 'suspended';
-- ONB-07: startups com mais de um workspace importado por reclamar
SELECT s.id, s.name, w.id AS workspace_id, w.created_at FROM public.startups s JOIN public.workspaces w ON w.startup_id = s.id WHERE w.status = 'imported_unclaimed' AND EXISTS (SELECT 1 FROM public.workspaces w2 WHERE w2.startup_id = s.id AND w2.id <> w.id AND w2.status = 'imported_unclaimed');


-- ============ Convites de workspace: reativar membros, e-mail primeiro e políticas (ids: HRD-06, ONB-08, ED2-15, ONB-11) (ED2-15, HRD-06, ONB-08, ONB-11) ============

-- convites aceites cuja adesão continua inativa (HRD-06)
SELECT wi.id, wi.email, wi.role AS papel_convite, wi.accepted_at, wu.workspace_id, wu.role AS papel_atual FROM public.workspace_invitations wi JOIN auth.users u ON lower(u.email) = lower(wi.email) JOIN public.workspace_users wu ON wu.user_id = u.id AND wu.workspace_id = wi.workspace_id AND NOT wu.active WHERE wi.accepted_at IS NOT NULL;


-- ============ ensure_contract_workspace duplica a startup importada (ids: E2E-05) (E2E-05) ============

SELECT regexp_replace(nif, '\D', '', 'g') AS nif_normalizado, count(*) AS startups, array_agg(id) AS ids FROM public.startups WHERE nullif(regexp_replace(coalesce(nif, ''), '\D', '', 'g'), '') IS NOT NULL GROUP BY 1 HAVING count(*) > 1;


-- ============ Data room: itens a apontar para documentos de outro workspace (ids: ED3-05) (ED3-05) ============

SELECT i.id, i.dataroom_id, dr.workspace_id AS dataroom_ws, d.workspace_id AS documento_ws, u.workspace_id AS atualizacao_ws FROM public.dataroom_items i JOIN public.datarooms dr ON dr.id = i.dataroom_id LEFT JOIN public.documents d ON d.id = i.document_id LEFT JOIN public.investor_updates u ON u.id = i.investor_update_id WHERE (i.document_id IS NOT NULL AND d.workspace_id IS DISTINCT FROM dr.workspace_id) OR (i.investor_update_id IS NOT NULL AND u.workspace_id IS DISTINCT FROM dr.workspace_id);


-- ============ "Nota rápida" do mentor nunca grava (ids: SCH-03, FES-04) (FES-04, SCH-03) ============


-- ============ Gatilho de notificações a founders não acompanhou o RC11 D.9 (ids: FEF-11) (FEF-11) ============

SELECT wu.user_id, wu.role, count(n.*) AS notificacoes_30d FROM public.workspace_users wu LEFT JOIN public.notifications n ON n.user_id = wu.user_id AND n.created_at > now() - interval '30 days' WHERE wu.active AND wu.role IN ('founder', 'team_member') AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = wu.user_id AND ur.role IN ('founder', 'team_member', 'admin', 'consultor', 'backoffice', 'mentor_externo')) GROUP BY 1, 2;


-- ============ Upserts e publicação de programas falham com 42P10 (índices únicos parciais) (ids: DBP-01, DBP-02, SCH-01, DBP-03, SCH-13) (DBP-01, DBP-02, DBP-03, SCH-01, SCH-13) ============

-- publicações falhadas por este motivo
select id, program_id, status, last_publish_error, last_publish_failed_at from public.program_setup_drafts where last_publish_error ilike '%ON CONFLICT%' or last_publish_error ilike '%no unique or exclusion%' order by last_publish_failed_at desc;
-- se o índice ainda mostra WHERE, está afetado
select indexname, indexdef from pg_indexes where indexname in ('notifications_event_key_user_unique','stages_program_stage_key_unique','idx_communication_log_external_dedupe');
-- tipos que alguma vez gravaram event_key por este caminho (template_request, sessões e playbook devem estar ausentes)
select type, count(*) from public.notifications where event_key is not null group by 1 order by 2 desc;


-- ============ Alertas falsos do monitor de sync-outlook-emails (execução 'partial') (ids: OPS-04) (OPS-04) ============

select status, count(*) from public.cron_job_runs where job_name = 'sync-outlook-emails' and started_at > now() - interval '24 hours' group by 1;
select created_at, severity, payload from public.system_alerts where kind = 'cron_stale' and payload->>'job' = 'sync-outlook-emails' order by created_at desc limit 10;
select mailbox_email, sync_state, consecutive_failures, left(last_sync_error, 100) from public.email_sync_status where consecutive_failures > 0;


-- ============ Lead contratada pela cadeia de intake fica com type='lead' no CRM (ids: E2E-04) (E2E-04) ============

select id, organization_name, stage, type, converted_at from public.funnel_items where type = 'lead' and linked_workspace_id is not null and stage in ('contracted', 'incubating', 'accelerating');


-- ============ Tabela integration_errors em falta e alertas dos monitores que ninguém lê (ids: SCH-02, OPS-02, OPS-01) (OPS-01, OPS-02, SCH-02) ============

select to_regclass('public.integration_errors') as tabela;  -- NULL = em falta, os erros anteriores perderam-se
select count(*) filter (where transcript_import_status = 'gave_up') as transcricoes_desistidas, count(*) filter (where outlook_sync_status = 'error') as outlook_com_erro from public.sessions;
select created_at, severity, kind, payload from public.system_alerts where created_at > now() - interval '7 days' and severity in ('critical', 'high') order by created_at desc limit 50;


-- ============ Sem retenção em tabelas de registos; dados pessoais de anónimos guardados para sempre (ids: DBP-07, OPS-12) (DBP-07, OPS-12) ============

select 'client_error_logs' t, count(*), min(created_at) from public.client_error_logs union all select 'analytics_events', count(*), min(created_at) from public.analytics_events union all select 'cron_job_runs', count(*), min(started_at) from public.cron_job_runs union all select 'system_alerts', count(*), min(created_at) from public.system_alerts union all select 'public_booking_rate_limits', count(*), min(bucket_start) from public.public_booking_rate_limits union all select 'webhook_inbox', count(*), min(received_at) from public.webhook_inbox union all select 'notification_attempts', count(*), min(created_at) from public.notification_attempts union all select 'tool_usage_events', count(*), min(occurred_at) from public.tool_usage_events union all select 'email_sync_runs', count(*), min(started_at) from public.email_sync_runs;
select count(*) from cron.job_run_details;


-- ============ Índices de FK em falta, 44 índices duplicados e btree sobre texto livre (ids: DBP-05, DBP-06, DBP-08) (DBP-05, DBP-06, DBP-08) ============

select relname, n_live_tup, seq_scan, idx_scan from pg_stat_user_tables where relname in ('milestones','sessions','documents','payments','startup_contracts','stage_history','analytics_events','workspace_users') order by seq_scan desc;
select count(*) from public.client_error_logs where octet_length(message) > 2000;


-- ============ Notificações já criadas com links para rotas e separadores que não existem (ids: FEX-05) (FEX-05) ============

select type, link, count(*) from public.notifications where link like '/dashboard%' or link = '/admin?tab=contracts' group by 1, 2 order by 3 desc;


-- ============ RLS: acesso por workspace avaliado por conjunto em vez de uma função por linha (ids: DBP-04) (DBP-04) ============

select relname, n_live_tup from pg_stat_user_tables where relname in ('milestones','sessions','action_items','documents','kpi_values','notifications','messages','communication_log','funnel_items') order by n_live_tup desc;


-- ============ Lembrete de assinatura herda os contadores da fase de preenchimento (ids: CRM-08) (CRM-08) ============

select i.id, i.organization_name, s.created_at as enviado, e.created_at as lembrete from public.contract_intakes i join public.intake_events s on s.intake_id = i.id and s.event_type in ('status_changed_to_signature_sent','lifecycle_sync_signature_sent') join public.intake_events e on e.intake_id = i.id and e.event_type = 'reminder_sent' and e.metadata->>'type' = 'signature' where e.created_at >= s.created_at and e.created_at < s.created_at + interval '3 days';


-- ============ Higiene de integridade: updated_at parado, FKs em falta e trigger duplicado em auth.users (ids: DBP-10, DBP-11, DBP-12) (DBP-10, DBP-11, DBP-12) ============

select count(*) from public.mentor_connections mc where mc.workspace_id is not null and not exists (select 1 from public.workspaces w where w.id = mc.workspace_id);
select count(*) from public.sessions s where s.session_template_id is not null and not exists (select 1 from public.session_templates t where t.id = s.session_template_id);
select count(*) from public.mentor_bookings b where not exists (select 1 from auth.users u where u.id = b.mentor_id) or not exists (select 1 from auth.users u where u.id = b.founder_id);
select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;


-- ============ Fora deste prompt: tabela de backup template_instances_dedup_backup_20260516 (ids: DBP-09) (DBP-09) ============

select count(*), min(created_at), max(created_at), count(distinct workspace_id) from public.template_instances_dedup_backup_20260516;


-- ============ Links de utilizador renderizados sem sanitizar: XSS por clique em `javascript:` (ids: FEB-01, FEX-01) (FEB-01, FEX-01) ============

SELECT 'profiles' AS t, id::text, linkedin_url AS v FROM public.profiles
 WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':');


-- ============ Timeout global de 30 s corta uploads, IA e importações (ids: HRD-01) (HRD-01) ============

SELECT created_at, left(message,120) AS msg, url FROM public.client_error_logs
 WHERE message ILIKE '%timed out%' OR message ILIKE '%Failed to send a request to the Edge Function%'
 ORDER BY created_at DESC LIMIT 200;


-- ============ Notificações do servidor apontam para `/dashboard` que não existe (ids: FEX-05) (FEX-05) ============

SELECT type, link, count(*) FROM public.notifications
 WHERE link LIKE '/dashboard%' OR link = '/admin?tab=contracts' GROUP BY 1,2 ORDER BY 3 DESC;


-- ============ Pedidos de template e notificações de sessão perdem-se em silêncio (ids: DBP-02, SCH-01) (DBP-02, SCH-01) ============

SELECT indexdef FROM pg_indexes WHERE indexname = 'notifications_event_key_user_unique';
SELECT type, count(*) FROM public.notifications WHERE event_key IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;


-- ============ URL completo com tokens gravado em `client_error_logs` e `bug_reports` (ids: FEX-13, HRD-11) (FEX-13, FEX-15, HRD-11) ============

SELECT id, created_at, url FROM public.client_error_logs
 WHERE url ~ '/(share|book|survey|contract-signing|contract-intake|dataroom/shared)/[^/?#]+' OR url ~* '[?&](token|token_hash|code|access_token)=' ORDER BY created_at DESC LIMIT 100;
SELECT id, created_at, url, route FROM public.bug_reports
 WHERE url ~ '/(share|book|survey|contract-signing|contract-intake|dataroom/shared)/[^/?#]+' OR route ~ '/(share|book|survey|contract-signing|contract-intake|dataroom/shared)/[^/?#]+' LIMIT 100;


-- ============ Entregas de webhook que ficam em 'received' são dadas como duplicadas e o evento perde-se (ids: SIGN-02, HRD-03) (HRD-03, SIGN-02) ============

SELECT id, provider, event_id, event_name, contract_id, received_at
FROM public.webhook_inbox
WHERE status = 'received' AND received_at < now() - interval '10 minutes'
ORDER BY received_at;
-- cruzar com contratos cujo signature_status ainda não é 'completed'; os eventos só se recuperam no próximo retry do fornecedor


-- ============ DocuSign "Repor e reenviar" não reenvia e o novo link salta o Regulamento (ids: ED2-01, SIGN-04) (ED2-01, SIGN-04) ============

-- contratos presos em 'dispatching' sem envelope depois de uma reposição (precisam de envelope_command_id=NULL e signature_status='draft' ou 'failed' para voltarem a poder ser reenviados)
SELECT c.id, c.signature_status, c.envelope_command_id, c.updated_at
FROM public.startup_contracts c
WHERE c.signature_status = 'dispatching' AND c.docusign_envelope_id IS NULL
  AND EXISTS (SELECT 1 FROM public.docusign_dispatch_leases l WHERE l.contract_id = c.id AND l.state IN ('sent','completed'));
-- rondas em que o Regulamento aceite é anterior ao último envio
SELECT id, contract_number, signature_provider, signature_status, regulation_accepted_at, signature_requested_at
FROM public.startup_contracts
WHERE signature_provider = 'assinatura_digital' AND signature_status = 'sent_for_signature'
  AND regulation_accepted_at IS NOT NULL AND regulation_accepted_at < signature_requested_at - interval '1 minute';


-- ============ Staff com conta suspensa ou pendente usa DocuSign, PandaDoc e o gerador de PDF (ids: ED2-02, SIGN-03) (ED2-02, ED2-03, ED2-04, SIGN-03) ============

SELECT id, contract_number, signature_status, provider_last_error, provider_last_sync_at
FROM public.startup_contracts
WHERE provider_last_error LIKE 'docusign_%' OR provider_last_error LIKE 'finalize_failed%'
ORDER BY provider_last_sync_at DESC;
SELECT contract_id, command_id, state, attempts, last_error FROM public.docusign_dispatch_leases WHERE attempts > 1;
SELECT id, contract_number, signature_status, envelope_command_id, updated_at
FROM public.startup_contracts WHERE signature_status = 'dispatching' AND updated_at < now() - interval '10 minutes';
-- depois confirmar no DocuSign se existem envelopes duplicados com o customField contractId desses contratos


-- ============ Staff com conta suspensa ou pendente usa DocuSign, PandaDoc e o gerador de PDF (ids: ED2-02, SIGN-03) (ED2-02, ED2-03, ED2-04, SIGN-03) ============

SELECT p.id, p.email, p.account_status, array_agg(ur.role) AS papeis
FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.role IN ('admin','consultor','backoffice') AND p.account_status <> 'approved'
GROUP BY 1,2,3;
SELECT user_id, action, entity_id, created_at FROM public.activity_log
WHERE action IN ('sent_for_signature','sent_for_signature_pandadoc','pdf_generated')
  AND user_id IN (SELECT id FROM public.profiles WHERE account_status <> 'approved')
ORDER BY created_at DESC;


-- ============ Falha ou resposta ambígua do DocuSign/PandaDoc aparece como "enviado"; o founder avança sem Regulamento confirmado; upload com metadados por gravar aparece como carregado (ids: SIGN-01, E2E-11, SIGN-09, SIGN-10, SIGN-06, E2E-09 parcial) (E2E-09, E2E-11, SIGN-01, SIGN-06, SIGN-09, SIGN-10) ============

SELECT id, contract_number, status, signature_provider, signature_status, provider_last_error, envelope_command_id
FROM public.startup_contracts
WHERE signature_status = 'dispatching' AND docusign_envelope_id IS NULL;
SELECT l.command_id, l.contract_id, l.state, l.last_error
FROM public.docusign_dispatch_leases l WHERE l.state IN ('unknown','claimed','in_flight');
SELECT i.id, i.status, c.signature_status
FROM public.contract_intakes i JOIN public.startup_contracts c ON c.id = i.contract_id
WHERE i.status = 'signature_sent' AND c.signature_status IN ('failed','dispatching','ready_to_send')
  AND c.docusign_envelope_id IS NULL AND c.provider_document_id IS NULL;
-- SIGN-09: contratos assinados ficam com o valor reescrito (congelado pelo trigger guard_contract_integrity); não se corrige por UPDATE normal
SELECT regulation_version, count(*) FROM public.startup_contracts GROUP BY 1;
-- SIGN-10: ficheiros carregados sem metadados
SELECT o.name, o.created_at FROM storage.objects o
WHERE o.bucket_id = 'contract-documents' AND o.name LIKE 'onboarding/%'
  AND NOT EXISTS (SELECT 1 FROM public.startup_contracts c WHERE o.name LIKE 'onboarding/' || c.id::text || '/%' AND c.documents_json::text LIKE '%' || o.name || '%');


-- ============ A sincronização de ativação não reativa workspaces arquivados, não cria a conta do founder quando o workspace já está ativo, duplica emails e rebaixa leads (ids: E2E-01, E2E-03, SIGN-07, E2E-09, E2E-10, E2E-08, SIGN-06, SIGN-08, FEX-05 parcial) (E2E-01, E2E-03, E2E-08, E2E-09, E2E-10, FEX-05, SIGN-06, SIGN-07, SIGN-08) ============

-- E2E-01: contratos ativos com workspace arquivado/rejeitado/bloqueado
SELECT c.id, c.contract_number, c.workspace_id, w.status, w.archived_at, w.blocked_at, c.activation_sync_pending
FROM public.startup_contracts c JOIN public.workspaces w ON w.id = c.workspace_id
WHERE c.status = 'active' AND c.signed_at IS NOT NULL AND (w.status IN ('archived','rejected') OR w.blocked_at IS NOT NULL);
SELECT entity_id, count(*) FROM public.notifications
WHERE type = 'lifecycle_sync_failed' AND message LIKE '%workspace_activate: not_active%' GROUP BY 1 ORDER BY 2 DESC;
-- E2E-03: contratos assinados cujo workspace não tem founder ativo
SELECT sc.id, sc.workspace_id, sc.legal_representative_email
FROM public.startup_contracts sc JOIN public.workspaces w ON w.id = sc.workspace_id
WHERE sc.status = 'active' AND sc.signature_status IN ('signed','completed')
  AND NOT EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = sc.workspace_id AND wu.role = 'founder' AND wu.active);
-- E2E-10: leads rebaixadas para 'contracted'
SELECT f.id, f.stage, f.type FROM public.funnel_items f JOIN public.startup_contracts c ON c.funnel_item_id = f.id
WHERE f.stage = 'contracted' AND f.converted_at IS NOT NULL AND f.converted_at < c.signed_at;
-- E2E-08/SIGN-06: registos de assinatura sem workspace
SELECT count(*) FROM public.activity_log WHERE action IN ('digitally_signed','digitally_signed_pandadoc') AND workspace_id IS NULL;
-- SIGN-08: estados crus gravados
SELECT id, contract_number, signature_status, provider_last_event FROM public.startup_contracts
WHERE signature_status IS NOT NULL AND signature_status NOT IN ('pending','draft','ready_to_send','dispatching','sent_for_signature','viewed','pending_manual','partially_signed','completed','signed','declined','voided','failed');


-- ============ Alerta "Sincronização contratual falhou" repetido a todo o staff em cada corrida da recuperação (ids: E2E-06) (E2E-06) ============

SELECT entity_id, count(*) FROM public.notifications WHERE type = 'lifecycle_sync_failed' GROUP BY 1 HAVING count(*) > 3 ORDER BY 2 DESC;
SELECT contract_id, event_type, count(*) FROM public.contract_lifecycle_events
WHERE event_type LIKE 'lifecycle_sync_failed_%' GROUP BY 1,2 HAVING count(*) > 3 ORDER BY 3 DESC;


-- ============ Arquivo SharePoint: contratos presos em 'uploading', execuções paralelas e URL do Graph sem codificação (ids: ED1-05, SIGN-11, ED1-07) (ED1-05, ED1-07, FEX-05, SIGN-11) ============

SELECT type, link, count(*) FROM public.notifications WHERE link LIKE '/dashboard%' OR link = '/admin?tab=contracts' GROUP BY 1,2 ORDER BY 3 DESC;


-- ============ Arquivo SharePoint: contratos presos em 'uploading', execuções paralelas e URL do Graph sem codificação (ids: ED1-05, SIGN-11, ED1-07) (ED1-05, ED1-07, FEX-05, SIGN-11) ============

SELECT id, contract_number, archive_status, archive_attempt_count, updated_at, last_archive_error
FROM public.startup_contracts WHERE archive_status = 'uploading' AND updated_at < now() - interval '30 minutes';
SELECT id, contract_number, archive_attempt_count, last_archive_error FROM public.startup_contracts
WHERE signed_at IS NOT NULL AND archive_status IS DISTINCT FROM 'completed' AND archive_attempt_count >= 5;
SELECT id, contract_number, organization_name, archive_attempt_count, last_archive_error FROM public.startup_contracts
WHERE signed_at IS NOT NULL AND (organization_name ~ '[#%]' OR contract_number ~ '[#%/\\]') AND archive_status IS DISTINCT FROM 'completed';
SELECT id, document_url FROM public.startup_contracts WHERE document_url ~* '^http' AND document_url !~* '^https://';


-- ============ A triagem "Convidar founder" só fecha se o motivo for 'missing_auth_user' (ids: E2E-07) (E2E-07, RV-07) ============

SELECT q.id, q.workspace_id, q.evidence_json->>'reason' AS reason
FROM public.staff_work_queue_items q
WHERE q.type = 'triage' AND q.status IN ('open','in_progress') AND q.evidence_json->>'purpose' = 'invite_founder'
  AND coalesce(q.evidence_json->>'reason','') <> 'access_email_failed'
  AND EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = q.workspace_id AND wu.role = 'founder' AND wu.active);


-- ============ Marcação pública de Primeiro Contacto: horário não validado, falha parcial do calendário, leads duplicadas e textos com escape HTML (ids: CRM-02, CRM-03, CRM-04, CRM-05, FEX-05, FEX-16) (CRM-02, CRM-03, CRM-04, CRM-05, FEX-05, FEX-16) ============

-- marcações fora da grelha / passado / fim de semana
SELECT id, contact_email, metadata_json->>'slot_date' AS d, metadata_json->>'slot_time' AS t, owner_consultant_id, created_at
FROM funnel_items
WHERE metadata_json->>'booking_source'='public_form'
  AND ((metadata_json->>'slot_date')::date < created_at::date
       OR extract(isodow FROM (metadata_json->>'slot_date')::date) IN (6,7)
       OR (metadata_json->>'slot_time') NOT IN ('09:00','10:00','11:00','14:00','15:00','16:00')
       OR (metadata_json->>'slot_date')::date > created_at::date + 15)
ORDER BY created_at DESC;
-- convites do calendário que falharam
SELECT id, contact_email, first_contact_at, metadata_json->>'calendar_status' AS cal, metadata_json->>'calendar_error' AS erro
FROM funnel_items WHERE source='public_booking' AND metadata_json->>'calendar_status'='failed' ORDER BY created_at DESC;
-- leads duplicadas por maiúsculas no email
SELECT lower(btrim(contact_email)) AS email, count(*) AS n, array_agg(id ORDER BY created_at) AS ids, array_agg(stage)
FROM funnel_items WHERE contact_email IS NOT NULL AND stage <> 'archived' GROUP BY 1 HAVING count(*) > 1 ORDER BY n DESC;
-- notificações com entidades HTML e links mortos
SELECT id, created_at, title FROM notifications WHERE type IN ('first_contact_booked','first_contact_reassigned') AND title ~ '&(amp|lt|gt|quot|#39);' ORDER BY created_at DESC;
SELECT type, link, count(*) FROM notifications WHERE link = '/dashboard' OR link LIKE '/dashboard?%' GROUP BY 1,2;


-- ============ Mudança de fase em massa para «Contratado», «Incubação» ou «Aceleração» cria leads sem startup nem workspace (ids: CRM-01) (CRM-01) ============

SELECT id, organization_name, stage, updated_at FROM funnel_items
WHERE stage IN ('contracted','incubating','accelerating') AND linked_workspace_id IS NULL;


-- ============ Validação de slot do consultor: sessões de 90 e 120 min dão sempre «ocupado», dia todo ocupado dá «disponível» e erro do Graph dá tudo livre (ids: ED4-05, ED4-06) (ED4-05, ED4-06) ============


-- ============ Falha ou resposta ambígua do DocuSign/PandaDoc aparece como «Contrato enviado» no painel do intake (ids: SIGN-01, parte do cliente) (SIGN-01) ============

SELECT i.id, i.status, c.signature_status FROM contract_intakes i JOIN startup_contracts c ON c.id=i.contract_id
WHERE i.status='signature_sent' AND c.signature_status IN ('failed','dispatching','ready_to_send')
  AND c.docusign_envelope_id IS NULL AND c.provider_document_id IS NULL;


-- ============ Emails de intake: assunto com escape HTML e `email_log.recipients` gravado como texto (ids: CRM-06) (CRM-06) ============

SELECT id, email_type, subject, recipients FROM email_log
WHERE subject ~ '&(amp|lt|gt|quot|#39);' OR jsonb_typeof(recipients)='string' ORDER BY created_at DESC LIMIT 200;
-- opcional, corrige as linhas antigas: UPDATE email_log SET recipients = (recipients #>> '{}')::jsonb WHERE jsonb_typeof(recipients)='string';


-- ============ O lembrete de «Correções pedidas» não leva as notas das correções (ids: CRM-09) (CRM-09) ============


-- ============ Criar tarefa com data apaga a próxima ação mais próxima da lead (ids: CRM-11) (CRM-11) ============

SELECT f.id, f.organization_name, f.next_action_at, min(c.due_at) AS tarefa_mais_proxima
FROM funnel_items f JOIN communication_log c ON c.funnel_item_id=f.id AND c.activity_type='task' AND c.status='open' AND c.due_at IS NOT NULL
GROUP BY f.id HAVING min(c.due_at) < f.next_action_at;


-- ============ Conversão pelo backoffice perde o pitch deck do formulário público em silêncio (ids: CRM-13) (CRM-13) ============

SELECT f.id, f.organization_name, f.metadata_json->>'pitch_deck_path' AS deck FROM funnel_items f
WHERE f.linked_workspace_id IS NOT NULL AND f.metadata_json ? 'pitch_deck_path'
  AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.workspace_id=f.linked_workspace_id AND d.category='pitch_deck');


-- ============ O importador em massa de contratos nunca importa nada, e quando importa duplica ou deixa órfãos (ids: ED3-01, ED3-02, ED3-03, RV-01, HRD-09, RV-04) (ED3-01, ED3-02, ED3-03, HRD-09, RV-01, RV-04) ============

-- linhas queimadas pelo gate (têm de voltar à fila; will_create/will_update original não foi guardado, confirme caso a caso)
SELECT batch_id, count(*) FROM bulk_import_rows WHERE status='error' AND error_message LIKE 'commit_authorized=false%' GROUP BY 1;
-- recuperação opcional:
-- UPDATE bulk_import_rows SET status = CASE WHEN matched_startup_id IS NULL THEN 'will_create' ELSE 'will_update' END, error_message = NULL
--  WHERE status='error' AND error_message LIKE 'commit_authorized=false%';

-- startups/workspaces órfãos (sem contrato) e linhas com erro de contrato
SELECT s.id, s.name, s.created_at FROM startups s JOIN workspaces w ON w.startup_id = s.id AND w.status = 'imported_unclaimed'
WHERE NOT EXISTS (SELECT 1 FROM startup_contracts c WHERE c.workspace_id = w.id);
SELECT id, pdf_filename, error_message FROM bulk_import_rows
WHERE status = 'error' AND (error_message LIKE 'Contract create failed%' OR error_message LIKE '%contract_signature_required%');

-- duplicados por pedidos concorrentes
SELECT s.name, count(*) FROM startups s JOIN workspaces w ON w.startup_id=s.id WHERE w.status='imported_unclaimed' GROUP BY s.name HAVING count(*)>1;
SELECT c.contract_number, count(*) FROM startup_contracts c WHERE c.notes LIKE '%Bulk imported from PDF:%' AND c.contract_number IS NOT NULL GROUP BY c.contract_number HAVING count(*)>1;

-- linhas presas em 'applying' (função expirada a meio)
SELECT id, batch_id, pdf_filename, updated_at, matched_startup_id, created_contract_id FROM bulk_import_rows WHERE status='applying' AND updated_at < now() - interval '15 minutes';


-- ============ A importação CSV de leads falha com ficheiros do Excel em português e lê "5.000" como 5 (ids: CRM-07, ED4-13) (CRM-07, ED4-13) ============

-- valores de deal lidos mal (nulos ou demasiado baixos) em importações anteriores
SELECT r.id, r.row_index, b.source_filename, r.deal_value, f.deal_value AS no_crm
FROM crm_lead_import_rows r JOIN crm_lead_import_batches b ON b.id = r.batch_id
LEFT JOIN funnel_items f ON f.id = r.committed_funnel_item_id
WHERE r.deal_value IS NULL OR r.deal_value < 100
ORDER BY b.created_at DESC LIMIT 100;
-- lotes possivelmente truncados nas 5000 linhas
SELECT id, source_filename, total_rows, valid_rows, created_at FROM crm_lead_import_batches WHERE total_rows = 5000 ORDER BY created_at DESC;


-- ============ bulk-create-workspaces contorna o RPC atómico e ignora o estado da conta (ids: ED1-04, ED1-03) (ED1-03, ED1-04) ============

SELECT s.id, s.name, s.created_at FROM startups s WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.startup_id = s.id) AND s.created_at > now() - interval '180 days';
SELECT name, count(*) FROM startups GROUP BY 1 HAVING count(*) > 1;
SELECT w.id, w.status, w.created_at FROM workspaces w WHERE w.status = 'active' AND NOT EXISTS (SELECT 1 FROM workspace_users u WHERE u.workspace_id = w.id AND u.active);
SELECT id, organization_name, stage FROM funnel_items WHERE stage = 'contracted' AND linked_workspace_id IS NULL;


-- ============ bulk-import-extract: conta suspensa, linhas já aplicadas e nome comparado com curingas (ids: ED4-09, ED4-16) (ED4-09, ED4-16) ============

SELECT p.id, p.email, p.account_status, array_agg(ur.role) FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.account_status <> 'approved' AND ur.role IN ('admin','consultor','backoffice') GROUP BY 1,2,3;
SELECT status, count(*) FROM public.bulk_import_rows WHERE committed_at IS NOT NULL OR status IN ('committed','applying') GROUP BY 1;
SELECT id, status, updated_at FROM public.bulk_import_rows WHERE status = 'extracting' AND updated_at < now() - interval '30 minutes';


-- ============ send-workspace-invite não verifica a conta de quem convida (ids: ONB-03) (ONB-03) ============

SELECT wi.id, wi.workspace_id, wi.email, wi.role, wi.accepted_at, wi.created_at, p.email AS criado_por, p.account_status
FROM public.workspace_invitations wi JOIN public.profiles p ON p.id = wi.created_by
WHERE p.account_status <> 'approved' ORDER BY wi.created_at DESC;


-- ============ commit-hubspot-history-import liga o histórico à lead errada e o 1.º critério nunca funciona (ids: ED4-07, SCH-12) (ED4-07, SCH-12) ============

SELECT count(*) FROM public.communication_log WHERE external_source = 'hubspot' AND external_id IS NULL;
SELECT lower(contact_email) AS email, count(*) FROM public.funnel_items WHERE contact_email IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
SELECT cl.id, cl.funnel_item_id, cl.matched_contact_email, f.contact_email
FROM public.communication_log cl JOIN public.funnel_items f ON f.id = cl.funnel_item_id
WHERE cl.metadata_json->>'provenance' = 'hubspot_history' AND lower(f.contact_email) IS DISTINCT FROM lower(cl.matched_contact_email) LIMIT 100;


-- ============ commit-crm-import: sem reclamação do job, `row_ids` vazio comita tudo e corpo inválido dá 500 (ids: ED1-10) (ED1-10) ============

SELECT id, source, status, updated_at, counts_json->'commit' FROM data_import_jobs
WHERE status = 'committing' OR (status = 'committed' AND (counts_json->'commit'->>'failed')::int > 0);
SELECT job_id, count(*) FROM data_import_rows WHERE approval_state = 'approved' GROUP BY 1;


-- ============ accept-mentor-nda reescreve a data e o IP do 1.º aceite e usa um sal fixo (ids: ED2-13) (ED2-13) ============

SELECT user_id, nda_version, accepted_at, ip_hash FROM mentor_nda_acceptances ORDER BY accepted_at DESC;
-- as datas originais já reescritas não se podem recuperar


-- ============ commit-hubspot-import: dupla invocação duplica funnel_items e aceita jobs que não são HubSpot (ids: ED2-14) (ED2-14) ============

SELECT organization_name, count(*) FROM funnel_items WHERE source = 'hubspot_import' GROUP BY 1 HAVING count(*) > 1;
SELECT id, source, status, updated_at FROM data_import_jobs WHERE status = 'committing';


-- ============ Contas suspensas ou pendentes continuam a operar com service role (ids: HRD-02, ED4-09, ED1-03, HRD-15) (ED1-03, ED4-09, HRD-02, HRD-15) ============

-- contas privilegiadas que hoje estão suspensas/pendentes mas ainda têm papel
select p.id, p.email, p.account_status, array_agg(r.role) as roles
from public.profiles p join public.user_roles r on r.user_id = p.id
where p.account_status <> 'approved' and r.role in ('admin','consultor','backoffice')
group by 1,2,3;


-- ============ census-run devolve sempre 500, CSV com fórmulas e leituras truncadas (ids: SCH-05, ED4-12, ED4-09, HRD-02) (ED4-09, ED4-12, HRD-02, SCH-05) ============

-- esperado: 0 (nenhuma execução chegou a gravar um snapshot)
select count(*) from public.census_reports;
-- o que a exceção 'multiple_active_contracts' nunca apanhou
select workspace_id, count(*) from public.startup_contracts
where status in ('active','pending_signature') and workspace_id is not null
group by 1 having count(*) > 1;


-- ============ automation-engine: leads, avisos de contrato, escape HTML, intake e estado das execuções (ids: ED4-01, ED4-02, ED4-03, HRD-04, SCH-04, ED4-14, ED4-15) (ED4-01, ED4-02, ED4-03, ED4-14, ED4-15, HRD-04, SCH-04) ============

-- membros inativos e mentores externos ligados a workspaces ativos (receberam avisos comerciais)
select wu.workspace_id, wu.user_id, wu.role from public.workspace_users wu
join public.workspaces w on w.id = wu.workspace_id
where w.status = 'active' and (wu.active = false or wu.role = 'mentor_externo');
-- volume previsto da automação de intake (1 notificação + 1 email por dia por intake)
select status, count(*) from public.contract_intakes
where status in ('draft_internal','intake_requested','intake_in_progress','changes_requested')
  and created_at < now() - interval '7 days' and assigned_to is not null group by 1;
-- nomes com HTML (já enviados por email)
select id, email, full_name from public.profiles where full_name ~ '[<>"]';
select id, name from public.startups where name ~ '[<>"]';


-- ============ check-mentor-nda-expiry avisa de uma expiração que não existe (ids: ED4-04, HRD-04) (ED4-04, HRD-04) ============

-- mentores que receberam (ou iam receber) o aviso falso
select user_id, accepted_at, nda_version from public.mentor_nda_acceptances
where accepted_at between now() - interval '365 days' and now() - interval '335 days';
-- reclamações órfãs no ledger (apagar só se vier a reativar os avisos)
select business_key, created_at from public.notification_ledger
where subject_kind = 'mentor_nda_warning' and provider_message_id is null;


-- ============ withCronRunLogging grava uma linha por cada pedido anónimo (ids: ED4-08, ED3-11, OPS-09) (ED3-11, ED4-08, OPS-09) ============

-- linhas de pedidos rejeitados; confirme o intervalo started_at antes de apagar (cron legítimo com segredo errado também aparece)
select job_name, triggered_by, count(*) from public.cron_job_runs
where status = 'skipped' and details->>'http_status' in ('401','403') group by 1,2 order by 3 desc;


-- ============ apply-survey-responses: autenticar antes de ler, auditoria preservada e marco duplicado (ids: ED2-10, ED2-11, ED2-12) (ED2-10, ED2-11, ED2-12) ============

-- auditorias degradadas por reexecuções
select count(*) from public.survey_writebacks where status = 'skipped' and detail ilike '%preenchido%';


-- ============ Copilot: respostas cortadas, histórico bloqueado por uma resposta longa e papéis lidos de texto controlável (ids: HRD-07, ED3-12, ED3-13, ED3-14, FES-15, FES-14 e FEX-15 só na parte de GlobalEcosystemCopilot.tsx) (ED3-12, ED3-13, ED3-14, FES-14, FES-15, FEX-15, HRD-07) ============


-- ============ Staff suspenso ou pendente continua a usar o service role nas funções de IA e relatórios (ids: ED1-03 e ED4-09 na parte de analyze-contract/analyze-contract-document, ED1-11 na parte de analyze-contract, ED2-09 e ED3-06 na parte da conta) (ED1-03, ED1-11, ED2-09, ED3-06, ED4-09) ============


-- ============ generate-investor-update: delta dos KPIs sempre null e regeneração que apaga o texto escrito à mão (ids: ED2-05, ED2-06) (ED2-05, ED2-06) ============


-- ============ generate-progress-report-pdf: totais cortados a 50/20 linhas, sessões do último dia omitidas e valores sem escape (ids: ED2-07, ED2-08) (ED2-07, ED2-08) ============


-- ============ Data room: contador de acessos que nunca grava e itens a apontar para documentos de outro workspace (ids: ED3-04, ED3-05) (ED3-04, ED3-05) ============


-- ============ generate-board-pack: admin suspenso gera o relatório e erros de leitura viram zeros (ids: ED3-06, ED3-07) (ED3-06, ED3-07) ============


-- ============ compute-cohort-benchmarks: leitura truncada a 1000 linhas e substituição não atómica (id: ED3-08) (ED3-08) ============


-- ============ analyze-pitch-deck: a "análise" nunca lê o ficheiro e as notas inventadas ficam gravadas (ids: ED3-09, ED3-10) (ED3-09, ED3-10) ============


-- ============ generate-template-coach e analyze-template pedem uma coluna que não existe (id: SCH-08) (ED4-10, SCH-08) ============


-- ============ generate-template-coach e analyze-template pedem uma coluna que não existe (id: SCH-08) (ED4-10, SCH-08) ============



-- ============ copilot-apply-playbook: o preflight não reflete o RLS e reaplicar o playbook devolve 500 (id: ED1-09) (ED1-09) ============


-- ============ export-cohort-health-pdf: histórico truncado a 1000 linhas e erros de consulta ignorados (id: ED2-09) (ED2-09) ============


-- ============ generate-financial-prefill pede colunas que não existem em workspaces (id: SCH-09) (SCH-09) ============


-- ============ Hrefs e `window.open` com URLs escritas por utilizadores (ids: FEB-01, FEX-01, FES-08, FEF-09) (FEB-01, FEF-02, FEF-09, FES-05, FES-08, FEX-01, SCH-06) ============

SELECT 'profiles' AS t, id::text, linkedin_url AS v FROM public.profiles WHERE linkedin_url IS NOT NULL AND linkedin_url ~ ':' AND linkedin_url !~* '^[[:space:]]*https?://'
UNION ALL SELECT 'team_members', id::text, linkedin_url FROM public.team_members WHERE linkedin_url IS NOT NULL AND linkedin_url ~ ':' AND linkedin_url !~* '^[[:space:]]*https?://'
UNION ALL SELECT 'sessions.join_url', id::text, join_url FROM public.sessions WHERE join_url IS NOT NULL AND join_url ~ ':' AND join_url !~* '^[[:space:]]*https?://'
UNION ALL SELECT 'action_deliverables', id::text, external_url FROM public.action_deliverables WHERE external_url IS NOT NULL AND external_url ~ ':' AND external_url !~* '^[[:space:]]*https?://'
UNION ALL SELECT 'documents', id::text, external_url FROM public.documents WHERE external_url IS NOT NULL AND external_url ~ ':' AND external_url !~* '^[[:space:]]*https?://';


-- ============ Check-in mensal mostrado a team_member: "Saltar" finge sucesso e "Concluir" dá Access denied (ids: FEF-01) (FEF-01) ============

SELECT ci.id, ci.workspace_id, ci.due_date FROM public.checkin_instances ci
WHERE ci.status = 'pending' AND ci.due_date < current_date - 14
  AND EXISTS (SELECT 1 FROM public.workspace_users wu WHERE wu.workspace_id = ci.workspace_id AND wu.active AND wu.role = 'team_member');


-- ============ "Ações desta sessão" e exportação de ações usam um embed PostgREST inexistente (ids: FEF-02, SCH-06, FES-05) (FEF-02, FES-05, SCH-06) ============

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.action_items'::regclass AND contype = 'f';
SELECT s.id, count(*) AS acoes_invisiveis FROM public.action_items a JOIN public.sessions s ON s.id = a.session_id GROUP BY 1 ORDER BY 2 DESC;


-- ============ Founder e team_member veem as notas internas do staff como "Insight IA" (ids: FEF-04) (DBP-02, FEF-04) ============

SELECT indexdef FROM pg_indexes WHERE indexname = 'notifications_event_key_user_unique';
SELECT count(*) FROM public.sessions s WHERE s.created_at > now() - interval '120 days'
  AND NOT EXISTS (SELECT 1 FROM public.notifications n WHERE n.entity_type = 'session' AND n.entity_id = s.id);


-- ============ Founder e team_member veem as notas internas do staff como "Insight IA" (ids: FEF-04) (DBP-02, FEF-04) ============

SELECT count(*) FILTER (WHERE health_notes IS NOT NULL) AS com_health_notes,
       count(*) FILTER (WHERE priority_notes IS NOT NULL) AS com_priority_notes,
       count(*) FILTER (WHERE health_notes LIKE 'Workspace criado a partir de lead CRM%') AS notas_de_conversao
FROM public.workspaces;


-- ============ URLs escritos por utilizadores abertos sem validar o esquema, no perfil do mentor e nos Documentos do staff (ids: FEB-01, FEX-01, FES-08) (FEB-01, FES-08, FEX-01) ============

SELECT id, email, linkedin_url FROM public.profiles
 WHERE linkedin_url IS NOT NULL AND NOT (linkedin_url ~* '^\s*https?://' OR linkedin_url !~ ':');
SELECT id, workspace_id, name, external_url, uploaded_by, created_at FROM public.documents
 WHERE external_url IS NOT NULL
   AND regexp_replace(external_url, '[[:space:][:cntrl:]]', '', 'g') ~* '^(javascript|data|vbscript|file|blob):';


-- ============ Fila de trabalho: "Concluídos" sem limite e "Todos" que não é todos (ids: FES-07) (FES-07) ============

SELECT status, count(*), min(updated_at), max(updated_at) FROM public.staff_work_queue_items GROUP BY status ORDER BY 2 DESC;


-- ============ "Nota rápida" do mentor nunca grava (ids: FES-04, SCH-03) (FES-04, SCH-03) ============


-- ============ URLs escritas por utilizadores renderizadas como href sem sanitizar: XSS por clique no separador Mentores do admin (ids: FEB-01, FEX-01) (FEB-01, FEX-01) ============

SELECT id, email, linkedin_url FROM public.profiles
 WHERE linkedin_url ~ ':' AND linkedin_url !~* '^[[:space:]]*https?://';  -- perfis já com esquemas perigosos (investigar antes de limpar)
SELECT id, meeting_url FROM public.program_weeks
 WHERE meeting_url ~ ':' AND meeting_url !~* '^[[:space:]]*https?://';


-- ============ Leituras falhadas apresentadas como zeros, "tudo bem" ou lista vazia nos ecrãs de admin/backoffice (ids: FEB-06, HRD-05, FEX-09, FEB-10; inclui os links do FEB-02 e as invalidações do FEB-16) (FEB-02, FEB-06, FEB-10, FEB-16, FEX-09, HRD-05) ============

SELECT value FROM public.system_settings WHERE key = 'notifications.founders_disabled';  -- estado real do interruptor de notificações
SELECT count(*) FROM public.profiles WHERE account_status = 'pending';                    -- contas que o ecrã de Aprovações pode ter escondido
SELECT count(*) FROM public.startup_contracts;                                           -- se > 500, a lista antiga cortava


-- ============ O sub-separador do Backoffice não segue o URL (ids: FEB-02) (FEB-02) ============


-- ============ Separador Relatórios mostra zeros ao backoffice; relatório CSV trunca a 1000 linhas e usa serializador próprio (ids: FEB-03, FEB-04, HRD-09) (FEB-03, FEB-04, FEB-05, HRD-09) ============

SELECT (SELECT count(*) FROM public.action_items) AS action_items, (SELECT count(*) FROM public.milestones) AS milestones,
       (SELECT count(*) FROM public.kpi_values) AS kpi_values, (SELECT count(*) FROM public.sessions) AS sessions;  -- qualquer valor > 1000: CSV antigos têm totais errados
SELECT id, name FROM public.startups WHERE name ~ '^[[:space:][:cntrl:]]+[=+@-]';  -- nomes que o sanitizador antigo não neutralizava
SELECT user_id FROM public.user_roles WHERE role = 'backoffice';                     -- quem pode ter descarregado relatórios a zeros


-- ============ Gestão de utilizadores depende do limite implícito de 1000 linhas (ids: FEB-07; inclui FEB-13 e FEB-14 em AdminUsersManager) (FEB-07, FEB-13, FEB-14) ============

SELECT (SELECT count(*) FROM public.profiles) AS profiles, (SELECT count(*) FROM public.user_roles) AS user_roles;  -- > 1000: a lista antiga estava truncada


-- ============ A tabela integration_errors não existia e o painel de erros de integração mostrava "tudo a funcionar" (ids: OPS-02, SCH-02; parte de cliente) (OPS-02, SCH-02) ============

SELECT to_regclass('public.integration_errors') AS tabela;  -- NULL antes da migração: os erros anteriores perderam-se (ver logs das edge functions)
SELECT count(*) FILTER (WHERE transcript_import_status = 'gave_up') AS transcricoes_desistidas,
       count(*) FILTER (WHERE outlook_sync_status = 'error') AS outlook_com_erro FROM public.sessions;


-- ============ Os alertas dos monitores (system_alerts) não eram lidos por ninguém (ids: OPS-01; parte de cliente) (OPS-01) ============

SELECT severity, kind, count(*), min(created_at), max(created_at) FROM public.system_alerts GROUP BY 1,2 ORDER BY 3 DESC;
SELECT created_at, severity, kind, payload FROM public.system_alerts
 WHERE created_at > now() - interval '7 days' AND severity IN ('critical','high') ORDER BY created_at DESC LIMIT 50;


-- ============ Mission Control mostra entradas que a página ignora (ids: FEB-05) (FEB-05) ============


-- ============ AppDiagnostics: as sondas de "RLS" escrevem em dados reais e passam sempre (ids: FEB-11, OPS-10) (FEB-11, FEB-12, FEB-13, FEB-14, OPS-10) ============

SELECT sc.id, sc.contract_number FROM public.startup_contracts sc JOIN public.funnel_items f ON f.id = sc.funnel_item_id WHERE f.linked_contract_id IS DISTINCT FROM sc.id;
SELECT ci.id FROM public.contract_intakes ci JOIN public.startup_contracts sc ON sc.funnel_item_id = ci.funnel_item_id WHERE ci.contract_id IS NULL;
SELECT sc.id FROM public.startup_contracts sc WHERE coalesce(sc.discount_percentage,0) > 0 AND NOT EXISTS (SELECT 1 FROM public.contract_discounts d WHERE d.contract_id = sc.id);


-- ============ AppDiagnostics: as sondas de "RLS" escrevem em dados reais e passam sempre (ids: FEB-11, OPS-10) (FEB-11, FEB-12, FEB-13, FEB-14, OPS-10) ============

SELECT count(*), min(created_at), max(created_at) FROM public.contract_field_conflicts
 WHERE field_name = '_direct_update' AND resolution = 'unattributed';  -- inclui ruído deste diagnóstico e de outros UPDATEs diretos da UI


-- ============ AdminDatarooms ignora erros: NDA lido mal vira "NDA pendente" e a remoção de mentor deixa-o ligado às startups (ids: FEB-15) (FEB-08, FEB-15, FEB-16, FEF-08, FES-09, FEX-07, OPS-08) ============

SELECT wu.user_id, wu.workspace_id FROM public.workspace_users wu
 WHERE wu.role = 'mentor_externo'
   AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = wu.user_id AND ur.role = 'mentor_externo');  -- mentores ligados a startups sem o papel


-- ============ Aviso com 0 emails enviados mostra "emails entregues a todos os membros" (ids: RV-06) (RV-06) ============


-- ============ Links do painel de administração abrem a Visão Geral do Backoffice em vez de Contratos/Espaços (ids: FEB-02, parte AdminDashboard) (FEB-02) ============


-- ============ Convite da sessão falha em silêncio no diálogo "Agendar sessão" (ids: HRD-13, parte cliente) (ED2-06, HRD-13) ============


-- ============ Convite da sessão falha em silêncio no diálogo "Agendar sessão" (ids: HRD-13, parte cliente) (ED2-06, HRD-13) ============



-- ============ Buckets de storage usados pelo código sem criação em migração (ids: SCH-16) (SCH-16) ============

-- em produção deve devolver 7 linhas; compare a coluna public com as flags acima
SELECT id, public FROM storage.buckets WHERE id IN ('workspace-documents','bug-report-screenshots','template_assets','phc-extracts','admin-exports','profile-avatars','startup-logos') ORDER BY id;


-- ============ Teste de privilégios não cobria purge_operational_logs (ids: DBP-07, OPS-12, parte de testes) (DBP-07, OPS-12) ============

-- em produção: a função deve ser executável só por service_role (anon e authenticated = false)
SELECT has_function_privilege('anon','public.purge_operational_logs()','EXECUTE') AS anon, has_function_privilege('authenticated','public.purge_operational_logs()','EXECUTE') AS authenticated, has_function_privilege('service_role','public.purge_operational_logs()','EXECUTE') AS service_role;


-- ============ .env.example sem as variáveis lidas pelas funções edge (ids: OPS-14, parte .env.example) (OPS-14) ============

-- ============ Segurança e guardas da base viva só existem em `drizzle/migrations`: repô-los em `supabase/migrations` (ids: DRF-01, DRF-02, DRF-04, DRF-06) (DRF-01, DRF-02, DRF-04, DRF-06) ============

-- 1) o DDL drizzle está mesmo lá? (esperado: guard_activation_recovery, guard_contract_integrity, queue_signed_contract_activation, wake_contract_activation_recovery)
select tgname from pg_trigger where tgrelid = 'public.startup_contracts'::regclass and not tgisinternal order by 1;
select policyname, qual from pg_policies where tablename in ('buildings','financial_cell_map','financial_model_metric_map','quality_checks_config','session_templates','investor_update_templates') order by 1;
select position('anon' in pg_get_functiondef('public.account_not_suspended(uuid)'::regprocedure)) > 0 as falha_fechado_para_anon;
-- 2) histórico: versões do repositório que a base nunca registou (resolver com `supabase migration repair --status applied <versão>`, nunca re-executando)
select version from supabase_migrations.schema_migrations where version in ('20260103024618','20261019100000','20261019110000','20261019120000','20261022110000') order by 1;
select to_regclass('drizzle.__drizzle_migrations') as tem_historico_drizzle, to_regclass('supabase_migrations.schema_migrations') as tem_historico_supabase;
-- 3) objetos só-produção que as migrações novas só criam se faltarem
select (select count(*) from public.playbook_template_assignments) as n_assign, (select count(*) from public.workspace_template_tasks) as n_wtt;
select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name in ('workspace_readiness_status','workflow_rules','workflow_executions') order by table_name, ordinal_position;

