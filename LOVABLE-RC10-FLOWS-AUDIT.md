# Auditoria RC10 — Fluxos de CRM, onboarding e assinatura de contratos

**Código auditado:** `vgasmo/remix-of-startup-companion`, commit `a9e8d3d` (2026-10-01 09:16, "Publicou 26 melhorias CRM"), o repositório sincronizado pelo Lovable. Snapshot só de leitura; a app não foi alterada. As correções vão no prompt `LOVABLE-RC10-FIXES.md` (4 partes) e no anexo `LOVABLE-RC10-I18N-PATCH.json`.

**Pedido:** validar todo o fluxo de CRM, de onboarding e de assinatura de contratos.

## Veredicto

**NO-GO para receber startups novas por contrato, até aplicar as Partes 1 e 2 do RC10.** Os três fluxos funcionam para quem já está dentro (admin, consultor, founders com conta e workspace ativo), mas a cadeia de entrada de um founder novo está partida em três pontos, ligados entre si (quatro achados HIGH: o primeiro foi encontrado por duas lentes, CRM-01 e E2E-01):

1. **CRM → contrato:** o caminho que a própria UI anuncia (lead nova → intake → contrato "sem workspace, será criado ao assinar" → assinatura) termina com o contrato ativo **sem startup, sem workspace e sem conta do founder**, sem tarefa nem alerta, em todas as rotas de assinatura.
2. **Onboarding:** quando a conta do founder é criada, **ele nunca recebe forma de entrar** (o link de recuperação é gerado e deitado fora, e o cliente PKCE não o aceitaria).
3. **Assinatura:** o **link público** continua a aceitar escritas depois de assinado ou terminado: reescreve contratos assinados, torna founder qualquer conta existente e reativa contratos terminados.

Por fluxo, no RC10:

| Fluxo | Estado | Resumo |
|---|---|---|
| CRM | **Degradado, partido na passagem para contrato** | Captação, pipeline, intake e aprovação funcionam para admin e consultor; a P1.7 está correta. Partidos: contrato sem workspace na assinatura, contrato do CRM sem fornecedor, separador Contexto (P3.5) e "Eliminar lead" (P3.7). O backoffice converte leads mas não regista atividade nem convida. |
| Onboarding | **Partido para o founder criado por contrato** | Registo, aprovação, claim, candidatura e convites funcionam. O founder do contrato não tem acesso; o assistente de onboarding nunca abre (e com isso a proteção de NIF da P4.2 fica desligada); suspensos ainda reativados por três funções; não há UI de convite de equipa e reenviar um convite falha sempre. |
| Assinatura | **Partido na rota nativa** | Funcionam a criação com sala, a aprovação do intake, a rota nativa num workspace com membros, o PandaDoc manual, o webhook DocuSign, a renovação e a terminação. Partidos: link público sem guarda de estado, rota "manual" sem "Marcar como assinado", 502 sem membros, intake que nunca fecha em recusa ou terminação, PDF com dados errados. |

**Depois do RC10:** todas as correções foram aplicadas a uma cópia do RC10 e validadas (ver "Como validámos"). Com as 4 partes e a Parte 5 do RC9 aplicadas e os testes manuais do fim da Parte 4 a passar, a cadeia fica fechada de ponta a ponta.

## Números

- **Conformidade RC9 (Partes 1 a 4):** 79 itens. 71 aplicados, 4 aplicados com desvio (P2.7, P2.8, P3.4, P3.10) e 4 por aplicar (P3.5, código da P3.7, P3.8, cliente da P3.11). O SQL das quatro migrações está linha a linha igual ao prompt e as 26 verificações do RC9 passam. A **Parte 5 do RC9 continua por aplicar** e o anexo foi revalidado sobre o RC10.
- **Achados:** 76 (4 HIGH, 37 MED, 35 LOW): 53 novos, 15 de itens RC9 por aplicar e 8 de itens RC9 aplicados em parte. **Os 41 HIGH e MED foram confirmados por um verificador independente**, que tentou refutar cada um e reproduziu o efeito; nenhum foi refutado nem mudou de gravidade. Os 35 LOW foram provados pela lente que os encontrou.
- **Itens no prompt:** os 76 achados juntam-se em 42 itens (A1 a A11, B1 a B12 e C1 a C19); a A0 trata a migração duplicada, já conhecida. Um achado ficou de fora de propósito (ONB-13, ver "Fora do prompt").

## Como validámos

1. **Base:** replay de todas as migrações do RC10 num Postgres local com o shim do Supabase (auth, storage, cron) e os default privileges do Supabase emulados; PostgREST 12.2.3 (a versão do Supabase alojado) com JWT por papel; personas admin, consultor, backoffice, founder, team_member, mentor e anónimo.
2. **Cinco lentes** em paralelo, cada uma com verificador independente: CRM; assinatura de contratos; onboarding; passagens entre fluxos (lead → intake → contrato → assinatura → workspace → founder → onboarding); conformidade das correções RC9.
3. **Correções** aplicadas a uma cópia do RC10 (48 ficheiros mais 3 migrações):
   - replay limpo de todas as migrações (0 ficheiros a falhar, depois da A0) e **25/25 suites pgTAP** do repositório;
   - **cenário ponta a ponta com 68 verificações** em SQL, com os papéis reais: contrato → workspace → founder → ativação; conversão pelo backoffice → "Marcar como assinado"; conversão com contrato; contas suspensas; arquivo; convites; CRM do backoffice; outbox; ACLs; correções de dados; segunda aplicação das três migrações sem erro;
   - **33 pedidos no PostgREST 12.2.3** (os pedidos novos do cliente e das edge functions): 200/204 onde devem, 403 onde devem. O reenvio de convite foi reproduzido antes e depois: no RC10, 403 `Invitees can only accept invitations`; com a correção, 200;
   - `tsc --noEmit -p tsconfig.typecheck.json` sem erros, `eslint` sem avisos nos 36 ficheiros de interface alterados, **`vitest run` 206/206**, `deno check` em todas as edge functions alteradas;
   - textos: os dois anexos (RC9 e RC10) em qualquer ordem dão catálogos idênticos e passam `i18n-check`, `i18n-lint`, `i18n-quality`, `i18n-quality-ext` e o guard semântico do `i18n-sync`.

## Fluxo de CRM, passo a passo

| Passo | O quê | Estado | Evidência |
|---|---|---|---|
| 1a | Marcação pública (/book): horários, marcação, lead e convite Teams | Degradado | P4.9 correta (horas de Lisboa). Com round-robin, o calendário mostrado é de um consultor e a reunião fica noutro (CRM-02); upload_url aceita qualquer token (CRM-10); efeitos falhados sem alerta (CRM-17) |
| 1b | Lead manual (NewLeadDialog) | Degradado | Admin e consultor OK. Backoffice cria, mas fica dono da lead e sem lista de consultores (CRM-08, CRM-07) |
| 1c | Importação CSV | Degradado | P3.22 aplicada. Uma linha repetida faz falhar tudo com "403" (CRM-09); botão visível ao backoffice, que recebe 403 |
| 2a | Pipeline: arrastar, desfazer, mudança em massa (P1.7) | OK | Arrastar para "contracted" nunca assina nem ativa um contrato por assinar |
| 2b | Ficha da lead (timeline, notas, tarefas, dono) | Degradado | Admin e consultor OK; backoffice com timeline vazia e inserts recusados (CRM-07) |
| 2c | Separador Contexto (P3.5) | Partido | As duas queries pedem startups.sector: 42703 (CONF-01) |
| 2d | Ecossistema: arquivar e "Eliminar lead" (P3.7) | Partido | DELETE em cascata do histórico e "Anular" sempre a falhar (CONF-02) |
| 2e | Emails de transição de fase | OK | Idempotente, erros da Resend lidos |
| 2f | Volume e pesquisa do quadro e da Inbox | Degradado | Sem paginação (corte a 1000) e pesquisa com vírgula esvazia o quadro (CRM-12, CRM-18) |
| 3a | Pedido de intake e rotação do token | OK | Admin, consultor e backoffice; founder e anónimo recusados |
| 3b | Página pública do intake | Degradado | Formulário editável depois de aprovado; a lead não acompanha a submissão; backoffice sem aviso (CRM-15, E2E-13) |
| 3c | Pedir correções (P3.8) e lembretes | Degradado | Falha do email aparece como sucesso (CRM-11); 3 lembretes em 3 dias (CRM-14) |
| 3d | Aprovar para assinatura (P2.7) | OK | Cópia dos dados para o contrato sem ativar |
| 4a | Enviar para assinatura a partir do intake | OK | staff_submit_signing e sincronização intake/lead |
| 4b | "Criar contrato e enviar" / "Enviar Contrato" | Partido | Contrato sem fornecedor: 422 e "Assinatura manual em curso" (CRM-06) |
| 4c | Assinatura → lead contratada, workspace e founder | Partido | Com intake e contrato sem workspace: nada é criado (CRM-01 = E2E-01) |
| 5a | Conversão em workspace (P2.2) | Degradado | Desliga o contrato da lead e marca-a como ganha (CRM-05); workspace sem membros pelo backoffice (CONF-03) |
| 5b | Pós-conversão: convite ao founder | Degradado | Backoffice recebe 403 em silêncio (CRM-08) |
| — | Negações de acesso (founder, team_member, anónimo) | OK | 0 linhas e inserts recusados em todas as tabelas e RPCs do CRM |

## Fluxo de assinatura de contratos, passo a passo

| Passo | O quê | Estado | Evidência |
|---|---|---|---|
| 1 | Criação do contrato (sala, intake aprovado, atribuir workspace) | Degradado | "Criar workspace" sem programa falha e deixa startup órfã (SIGN-14) |
| 2 | PDF do contrato (P1.4) | Degradado | Guard aplicado; identifica mal o Segundo Outorgante e regrava o PDF de assinados (SIGN-02, SIGN-03) |
| 3 | Escolha da rota no drawer | Degradado | "Assinatura manual" sem botão "Marcar como assinado" (SIGN-06) |
| 4 | Rota nativa (link, dados, documentos, submissão, assinatura) | Partido | Link continua válido depois de assinar ou terminar; nenhuma ação verifica o estado (SIGN-01); salto direto para a assinatura sem Regulamento (SIGN-05) |
| 5 | DocuSign (envio e webhook, P2.15) | Degradado | Envio e webhook OK; recusa/anulação não fecha o intake (SIGN-07) |
| 6 | PandaDoc e "Marcar como assinado" (P2.8) | Degradado | PandaDoc manual OK; workspace sem membros rebenta (CONF-03); invalidações em falta (CONF-10) |
| 7 | Pós-assinatura: workspace, conta do founder, notificações | Partido | Sem workspace no fluxo de intake (E2E-01); 502 sem membros (SIGN-04); conta sem acesso (SIGN-09) |
| 8 | Ciclo de vida: repor e reenviar, renovar, terminar | Degradado | "Repor" mantém o contra-assinante (SIGN-08); terminar com arquivo aborta (CONF-05); auto-renovação não prolonga a sala (SIGN-11) |

## Fluxo de onboarding, passo a passo

| Passo | O quê | Estado | Evidência |
|---|---|---|---|
| 1 | Registo, confirmação de email, papéis iniciais (P1.1, P2.12) | OK | Estados e papéis corretos; check_signup_allowed com convites |
| 2 | Aprovação de conta e gating de pendentes/suspensos | OK | approve_user_account e gating corretos |
| 2b | Reativação de suspensos | Degradado | claim_startup e duas RPCs de staff ainda reativam (ONB-3) |
| 2c | Aviso de aprovação/rejeição | Degradado | A UI promete notificação que ninguém envia (ONB-10) |
| 3 | Claim automático e manual | OK | auto_claimed, approve_startup_claim só aprova pendentes |
| 3b | Atribuir workspace a conta pendente | Degradado | "Associar" reativa workspaces arquivados (ONB-7) |
| 4 | Candidatura e estado pendente (P4.24) | Degradado | Navegação com estado em cache acaba em /claim-startup (ONB-11) |
| 4b | Assistente de onboarding depois da aprovação ou do contrato | Partido | Nunca abre; needs_onboarding fica true e desliga a P4.2 (ONB-2) |
| 5 | Convites (envio e aceitação) | Partido | Sem UI de convite de equipa; reenvio falha sempre (ONB-5); erros como "403" (ONB-9) |
| 5b | team_member e mentor (NDA) | OK | Permissões e NDA corretos |
| 6 | Founder criado por contrato: conta, acesso, 1.º login | Partido | Conta criada sem email de acesso (ONB-1); sem membros falha antes de criar a conta (ONB-4) |
| 6b | Reconciliação horária de founders | Degradado | Conta pendente fica pendente (ONB-8) |
| 7 | Máquina de estados do onboarding do founder | Degradado | Lê 5 memberships sem filtro (ONB-12); /my-workspaces sem fim (ONB-14) |

## Passagens entre fluxos (lead até founder com onboarding)

| Passo | O quê | Estado | Evidência |
|---|---|---|---|
| 1–2 | Lead → pedido de intake e token | OK | Consultor e backoffice |
| 3 | Intake público: rascunho e submissão | Degradado | Lead não muda de fase (E2E-13) |
| 4–5 | Contrato criado sem workspace e intake aprovado | OK | Como a UI anuncia ("será criado ao assinar") |
| 6 | Link de assinatura (ROTA 1, CRM) | Degradado | Contrato do CRM sem fornecedor (E2E-05) |
| 7 | Founder assina pela rota nativa | OK | Grant e apply corretos |
| 8 | Contra-assinatura | Partido | Não existe ação de staff (E2E-09) |
| 9 | Contrato ativo → workspace | Partido | Sem startup, sem workspace, sem alerta (E2E-01) |
| 10 | Conta e membership do founder | Partido | Nada criado; tarefa "Convidar founder" fica aberta (E2E-12) |
| 11–12 | Estado de onboarding e assistente | Degradado | Assistente nunca oferecido (E2E-08); claimed apaga needs_onboarding (E2E-06) |
| 13 | Lead contratada, intake ativado, notificações | Degradado | Founder sem aviso de acesso (E2E-03) |
| 14 | Rota manual: "Marcar como assinado" | Partido | Sem botão para "manual"; atalho Editar→Ativo incoerente (E2E-04) |
| 15 | Lead convertida pelo backoffice | Degradado | 0 membros e convite 403 (E2E-02) |

O fluxo só fecha hoje de ponta a ponta quando a lead já foi convertida por um consultor ou admin **antes** de o contrato ser criado e se usa a rota nativa.

## Itens do prompt RC10

| Item | Problema | Achados | Onde |
|---|---|---|---|
| A0 | Migração duplicada parte o replay | K-a (já conhecido) | Parte 1 |
| A1 | Contrato assinado sem workspace; workspace sem membros | E2E-01, CRM-01, CONF-03, SIGN-04, ONB-4, E2E-15 | Partes 1 e 2 |
| A2 | Founder criado pelo contrato sem acesso; suspensos reativados; triagem aberta | ONB-1, SIGN-09, E2E-03, SIGN-13, E2E-11, E2E-12, ONB-8, E2E-10 | Partes 1 e 2 |
| A3 | Link público de assinatura sem guarda de estado; página salta para a assinatura | SIGN-01, SIGN-05 | Partes 1 e 2 |
| A4 | Rota manual sem "Marcar como assinado"; invalidações da P2.8 | SIGN-06, E2E-04, CONF-10 | Parte 2 |
| A5 | Contrato do CRM sem fornecedor de assinatura | CRM-06, E2E-05 | Partes 1 e 2 |
| A6 | Conversão desliga o contrato da lead e marca-a como ganha | CRM-05, E2E-07 | Parte 1 |
| A7 | Backoffice converte mas não convida; dono da lead | E2E-02, CRM-08 | Partes 1 e 2 |
| A8 | Assistente de onboarding nunca abre; needs_onboarding apagado no claimed | ONB-2, E2E-08, E2E-06 | Partes 1 e 2 |
| A9 | Contra-assinatura e "Repor e reenviar"; tipos da fila (P3.10) | SIGN-08, E2E-09, SIGN-16, CONF-09 | Partes 1 e 2 |
| A10 | Intake nunca fecha em recusa, anulação ou terminação | CONF-04, SIGN-07 | Partes 1 e 2 |
| A11 | invokeWithAuth transforma qualquer erro em 403 | CRM-13 | Parte 2 |
| B1 | Terminar com "Arquivar workspace" aborta ou arquiva workspace sob contrato | CONF-05 | Parte 3 |
| B2 | Sem convites de equipa; reenviar um convite falha sempre | ONB-5 | Parte 3 |
| B3 | Contas suspensas reativadas pelo claim e pelas RPCs de staff | ONB-3 | Parte 3 |
| B4 | Backoffice na ficha da lead sem timeline, notas nem consultores | CRM-07 | Parte 3 |
| B5 | PDF com o Segundo Outorgante errado; PDF de assinados regravado | SIGN-02, SIGN-03 | Parte 3 |
| B6 | Separador Contexto vazio (P3.5) | CONF-01, CRM-03 | Parte 3 |
| B7 | "Eliminar lead" apaga o histórico; "Anular" falha (P3.7) | CONF-02, CRM-04 | Parte 3 |
| B8 | Pesquisa global sem contratos (P3.4) | CONF-06, SIGN-10 | Parte 3 |
| B9 | Avisos: destinatários, Teams e falhas de email (P3.11) | CONF-07 | Parte 3 |
| B10 | Renovações que não prolongam a sala | SIGN-11 | Parte 3 |
| B11 | Round-robin desalinhado; upload_url para qualquer token | CRM-02, CRM-10 | Parte 3 |
| B12 | Importação CSV falha com uma linha repetida | CRM-09 | Parte 3 |
| C1–C19 | Defeitos LOW (alertas da marcação, HubSpot v2, ACL, backoffice nas candidaturas, sugestões arquivadas, P3.8, paginação do CRM, lembretes, intake público, erros da marcação, categoria, escape HTML, workspace sem programa, documentos restaurados, convites inválidos, textos de notificação, navegação do founder) | CRM-11, CONF-08, E2E-14, CRM-12, CRM-18, CRM-14, CRM-15, E2E-13, CRM-16, CRM-17, CRM-19, CRM-20, CRM-21, SIGN-12, SIGN-14, SIGN-15, ONB-6, ONB-7, ONB-9, ONB-10, ONB-11, ONB-12, ONB-14 | Parte 4 |

Ordem de aplicação: Parte 1 → Parte 2 → Parte 3 → Parte 4 → Parte 5 do RC9. As Partes 1 e 2 fecham os quatro HIGH e devem sair juntas: o servidor passa a exigir o Regulamento aceite antes da assinatura nativa, e a página pública da Parte 2 deixa de saltar esse passo.

## Todos os achados

| Achado | Grav. | Tipo | Descrição | Confirmação | Item RC10 |
|---|---|---|---|---|---|
| CRM-01 | HIGH | RC9 por aplicar | Caminho principal do CRM (intake → contrato sem workspace → assinatura) termina sem startup, workspace nem conta do founder | verificador independente | A1 |
| E2E-01 | HIGH | novo | Contrato do fluxo intake sem workspace: depois de assinado fica ativo sem startup, sem workspace e sem conta do founder, e ninguém é avisado | verificador independente | A1 |
| ONB-1 | HIGH | novo | O founder criado a partir de um contrato assinado nunca recebe acesso à plataforma | verificador independente | A2 |
| SIGN-01 | HIGH | novo | O link público de assinatura nativa continua válido depois de assinar ou terminar, e nenhuma ação verifica o estado ou a rota do contrato | verificador independente | A3 |
| CONF-03 | MED | novo | Lead convertida pelo backoffice sem consultor: 'Marcar como assinado' falha ao ativar o workspace, porque este não tem membros | verificador independente | A1 |
| ONB-4 | MED | novo | Lead convertida pelo backoffice sem consultor fica sem membros, e a assinatura nativa falha (502) antes de criar o founder | verificador independente | A1 |
| SIGN-04 | MED | novo | Assinatura nativa num workspace sem membros ativos: o signatário recebe 502 e a conta do founder nunca é criada | verificador independente | A1 |
| CONF-04 | MED | novo | Contrato recusado, anulado ou terminado: o intake nunca fecha (o enum não tem esses valores) e o founder continua a receber lembretes semanais de assinatura | verificador independente | A10 |
| SIGN-07 | MED | novo | O enum intake_status não tem declined/voided/terminated: cada recusa ou anulação gera um alarme 'sincronização falhou' e terminar não fecha o intake | verificador independente | A10 |
| E2E-03 | MED | novo | A conta criada automaticamente para o founder nunca recebe email de acesso | verificador independente | A2 |
| SIGN-09 | MED | novo | A conta de founder criada depois da assinatura nunca recebe acesso: generateLink só gera o link, não envia nenhum email | verificador independente | A2 |
| SIGN-05 | MED | novo | ROTA 1 ('Gerar e enviar link'): o founder abre o link diretamente no passo de assinatura e assina sem preencher dados, sem carregar documentos e sem aceitar o Regulamento | verificador independente | A3 |
| E2E-04 | MED | novo | Rota manual: com o fornecedor 'manual' o botão 'Marcar como assinado' nunca aparece; o único atalho (Editar → Ativo) ativa o contrato sem assinatura e deixa o workspace pendente | verificador independente | A4 |
| SIGN-06 | MED | novo | Rota 'manual': o contrato fica sempre em 'pending_manual' e o botão 'Marcar como assinado' nunca aparece | verificador independente | A4 |
| CRM-06 | MED | novo | 'Criar contrato e enviar' / 'Enviar Contrato' do CRM mandam ao founder o link de um contrato sem fornecedor de assinatura: o submit falha com 422 e a página diz 'Assinatura manual em curso' | verificador independente | A5 |
| E2E-05 | MED | novo | CRM 'Criar contrato e enviar': o contrato nasce sem fornecedor de assinatura; o founder submete, recebe erro e vê 'Assinatura manual em curso' | verificador independente | A5 |
| CRM-05 | MED | novo | Conversão em workspace desliga o contrato já ligado à lead e marca-a como ganha sem assinatura | verificador independente | A6 |
| E2E-07 | MED | novo | Converter uma lead que já tem contrato perde a ligação ao contrato (ou cria um duplicado) e o contrato nunca ganha workspace | verificador independente | A6 |
| CRM-08 | MED | novo | Conversão pelo backoffice: o convite ao founder é recusado (403) e o workspace pode ficar sem membros com um 'consultor' do backoffice | verificador independente | A7 |
| E2E-02 | MED | novo | Lead convertida pelo backoffice: workspace sem membros e convite recusado; a assinatura nativa devolve 502 sem criar a conta e 'Marcar como assinado' não ativa o workspace | verificador independente | A7 |
| E2E-06 | MED | novo | Workspaces 'claimed' (auto-mint da P3.6, staff-assign) passam a ativos com needs_onboarding=false: o founder salta o onboarding e fica com o NIF bloqueado | verificador independente | A8 |
| E2E-08 | MED | novo | O assistente de onboarding nunca é oferecido ao founder cujo workspace já está ativo com needs_onboarding=true | verificador independente | A8 |
| ONB-2 | MED | novo | O assistente de onboarding nunca abre depois da aprovação ou do contrato; needs_onboarding fica true para sempre e desliga a proteção da P4.2 | verificador independente | A8 |
| SIGN-08 | MED | novo | 'Repor e reenviar' mantém o contra-assinante do DocuSign/PandaDoc: reenviado pela rota nativa, o contrato fica para sempre em 'partially_signed' | verificador independente | A9 |
| CONF-05 | MED | novo | Terminar contrato com 'Arquivar workspace' (ligado por omissão) num workspace com outro contrato em vigor: no backoffice a terminação aborta a meio; o admin arquiva um workspace ainda sob contrato | verificador independente | B1 |
| SIGN-11 | MED | novo | Renovações que não prolongam a sala: a auto-renovação do cron e a renovação a partir do ContractLifecycleEventsCard (mesma raiz da P3.1) | verificador independente | B10 |
| CRM-02 | MED | novo | Marcação pública com round-robin: o calendário mostrado é de um consultor e a reunião fica marcada noutro | verificador independente | B11 |
| CRM-10 | MED | RC9 aplicado em parte | upload_url (P2.13) emite URLs de upload assinados para qualquer token, sem limite efetivo | verificador independente | B11 |
| CRM-09 | MED | novo | Importação CSV: uma linha repetida faz falhar a importação inteira, com a mensagem '403: Access denied' | verificador independente | B12 |
| ONB-5 | MED | novo | Não há forma de convidar membros de equipa ou cofundadores; o separador Equipa manda usar um botão que não existe | verificador independente | B2 |
| ONB-3 | MED | RC9 por aplicar | Contas suspensas continuam a ser reativadas sem o admin: pelo claim_startup (o próprio) e pelas RPCs de staff do claim e da atribuição | verificador independente | B3 |
| CRM-07 | MED | novo | Backoffice na ficha da lead: timeline vazia, notas/chamadas/tarefas falham com RLS e não há lista de consultores | verificador independente | B4 |
| SIGN-02 | MED | novo | O PDF do contrato identifica o Segundo Outorgante pelos dados da startup e pela morada do edifício, e ignora os dados legais do contrato | verificador independente | B5 |
| SIGN-03 | MED | RC9 por aplicar | P1.4 incompleta: 'Gerar PDF' (staff) e as chamadas internas continuam a regravar o PDF canónico e o pricing_snapshot_json de contratos assinados | verificador independente | B5 |
| CONF-01 | MED | RC9 por aplicar | CRM › ficha da lead › Contexto: a startup e o workspace ligados nunca aparecem (P3.5 não aplicada) | verificador independente | B6 |
| CRM-03 | MED | RC9 por aplicar | Ficha da lead › Contexto: a startup/workspace ligada nunca aparece (P3.5 não aplicada) | verificador independente | B6 |
| CONF-02 | MED | RC9 por aplicar | Ecossistema › Eliminar lead: continua a apagar a lead e todo o histórico, e o 'Anular' falha sempre (código da P3.7 não aplicado) | verificador independente | B7 |
| CRM-04 | MED | RC9 aplicado em parte | Ecossistema › 'Eliminar lead' continua a apagar a lead e o histórico, e o 'Anular' falha sempre (P3.7 aplicada só na parte SQL) | verificador independente | B7 |
| CONF-06 | MED | RC9 aplicado em parte | A pesquisa global nunca devolve contratos (P3.4 aplicada só no StaffCockpit e no AdminContracts) | verificador independente | B8 |
| SIGN-10 | MED | RC9 por aplicar | P3.4 por aplicar na pesquisa global: os contratos nunca aparecem (PGRST200) e o link usa ?contract= em vez de ?open= | verificador independente | B8 |
| CONF-07 | MED | RC9 por aplicar | Avisos (admin): 'Enviar para todas' continua a incluir startups arquivadas, rejeitadas e pendentes; a opção Teams não faz nada; falhas de email aparecem como sucesso (cliente da P3.11 não aplicado) | verificador independente | B9 |
| E2E-15 | LOW | novo | Remediação 'Atribuir/criar workspace' (staff-assign-workspace-to-contract) não liga a lead do CRM ao workspace | lente | A1 |
| CRM-13 | LOW | novo | invokeWithAuth transforma qualquer erro de uma edge function em '403: Access denied' | lente | A11 |
| E2E-10 | LOW | novo | Rota manual: o founder que já se tinha registado fica com a conta 'pending' e sem acesso ao workspace depois de assinar | lente | A2 |
| E2E-11 | LOW | novo | autoCreateFounderAccount reativa contas suspensas e reescreve o nome do perfil | lente | A2 |
| E2E-12 | LOW | novo | A tarefa 'Convidar founder' fica aberta depois de a conta do founder ser criada | lente | A2 |
| ONB-8 | LOW | novo | Um founder que já se tinha registado (pendente) continua pendente depois de o contrato ficar ativo pelos caminhos só-BD | lente | A2 |
| SIGN-13 | LOW | novo | autoCreateFounderAccount reaprova contas suspensas e sobrescreve o nome de contas existentes | lente | A2 |
| CONF-10 | LOW | RC9 aplicado em parte | 'Marcar como assinado' não atualiza o painel 'Pronto para ativação manual' nem as Aprovações (P2.8 sem as invalidações) | lente | A4 |
| CONF-09 | LOW | RC9 aplicado em parte | Fila de trabalho: os itens de contra-assinatura, marco falhado e pressuposto financeiro aparecem com o rótulo cru e não podem ser filtrados (P3.10 sem a parte de interface) | lente | A9 |
| E2E-09 | LOW | RC9 por aplicar | Contra-assinatura: não existe nenhuma ação de staff; com counter_signer_email preenchido o contrato fica 'partially_signed' para sempre | lente | A9 |
| SIGN-16 | LOW | RC9 aplicado em parte | P3.10 (frontend): WorkQueuePanel não inclui counter_sign_contract, financial_assumption_skipped nem milestone_missed | lente | A9 |
| CRM-17 | LOW | novo | first_contact_outbox não tem consumidor: falhas do convite Teams e do email ao consultor nunca são repetidas nem alertadas | lente | C1 |
| CRM-16 | LOW | novo | Marcação pública: as respostas de erro do servidor (503 fail-closed, 409 hora bloqueada) nunca chegam ao visitante | lente | C10 |
| CRM-19 | LOW | novo | Ficha da lead › Categoria (A/B/C): o backoffice vê 'Categoria atualizada' sem nada mudar | lente | C11 |
| CRM-21 | LOW | novo | Marcação pública: nome e mensagem do visitante entram sem escape no HTML do evento Teams | lente | C12 |
| SIGN-14 | LOW | novo | 'Atribuir workspace' → 'Criar workspace' sem programa (o valor por defeito) falha e deixa uma startup órfã | lente | C13 |
| SIGN-15 | LOW | RC9 aplicado em parte | P2.6 (parte opcional): os documentos restaurados na página pública aparecem sem nome e com 'NaN KB' | lente | C14 |
| ONB-9 | LOW | novo | Aceitar um convite expirado, de outra conta ou inválido mostra '403: Access denied (accept-workspace-invite)' | lente | C15 |
| ONB-10 | LOW | novo | Nenhuma notificação ao aprovar ou rejeitar conta, candidatura ou claim, apesar de a UI a prometer | lente | C16 |
| ONB-11 | LOW | RC9 aplicado em parte | P4.24 incompleta: depois de criar a candidatura (ou aceitar um convite) a navegação usa o estado de onboarding em cache e acaba em /claim-startup | lente | C17 |
| ONB-12 | LOW | novo | O hook de onboarding lê só 5 memberships, sem ordem nem filtro: com ≥5 memberships mortas o founder fica num ciclo e não abre a workspace ativa | lente | C18 |
| ONB-14 | LOW | novo | /my-workspaces mostra um carregamento infinito a founders sem workspace, e 'Tentar novamente' no /claim-startup em erro não faz nada | lente | C19 |
| CRM-20 | LOW | novo | Importador HubSpot v2 (flag desligada): o commit falha sempre ('forbidden' e tipo 'startup' inválido) | lente | C2 |
| SIGN-12 | LOW | novo | apply_contract_patch é SECURITY DEFINER, executável por qualquer authenticated e sem verificação de papel (hoje falha sempre por uma coluna inexistente) | lente | C3 |
| ONB-6 | LOW | RC9 por aplicar | O backoffice aprova candidaturas sem ver quem as submeteu (a P3.14 não chega ao backoffice) | lente | C4 |
| ONB-7 | LOW | RC9 por aplicar | No separador de sugestões de 'Atribuir Workspace', 'Associar' continua a reativar workspaces arquivadas ou rejeitadas (P3.23) | lente | C5 |
| CONF-08 | LOW | RC9 por aplicar | Intake › 'Pedir correções': se o email falhar, aparece sucesso (P3.8 não aplicada) | lente | C6 |
| CRM-11 | LOW | RC9 por aplicar | Intake › 'Pedir correções': a falha do email continua a aparecer como sucesso (P3.8 não aplicada) | lente | C6 |
| E2E-14 | LOW | RC9 por aplicar | P3.8 não aplicada: no 'Pedir correções' a falha do email continua a aparecer como sucesso | lente | C6 |
| CRM-12 | LOW | RC9 por aplicar | Quadro e Inbox do CRM continuam sem paginação: com mais de 1000 leads perdem registos em silêncio | lente | C7 |
| CRM-18 | LOW | novo | Pesquisa do CRM com vírgula (ex.: 'Silva, Lda') parte a query e o quadro fica vazio sem erro | lente | C7 |
| CRM-14 | LOW | novo | Lembretes de intake: depois de 'Pedir correções' saem três lembretes em três dias e cada um invalida o link anterior | lente | C8 |
| CRM-15 | LOW | novo | Intake público: depois de aprovado ou cancelado mostra o formulário editável, e a fase da lead não acompanha a submissão do founder | lente | C9 |
| E2E-13 | LOW | novo | Submissão pública do intake: a lead não muda de fase e o backoffice, que aprova, não é avisado | lente | C9 |
| ONB-13 | LOW | novo | (Latente) Um convite mentor_externo aceite por uma conta founder dá acesso sem NDA e cai no claim-gate | lente | — |

## O que está correto (confirmado na base e na API)

- **RLS e RPCs do CRM:** founder, team_member e anónimo veem 0 linhas e são recusados em funnel_items, contract_intakes, first_contact_outbox, importações, links de marcação, routing, eventos e comunicações.
- **P1.7:** mover a lead para "contracted" (arrastar, desfazer, em massa) nunca assina nem ativa um contrato por assinar.
- **P1.11:** as RPCs de commit, de lease do DocuSign e de rate limit só correm com service role; todos os chamadores usam o cliente certo.
- **P2.2, P2.7, P2.8, P3.22:** o backoffice opera conversões, aprovação de intake, "Marcar como assinado" e finalização de importações; a cópia intake → contrato não ativa o contrato.
- **P4.9:** horas de Lisboa corretas nas mudanças de hora; `get_slots` falha fechado (503).
- **Assinatura:** grants só para staff, `apply_contract_signature_atomic` só com service role, deduplicação do webhook DocuSign, renovação mantém a data de início e prolonga a sala, terminação liberta a sala.
- **Onboarding:** P1.1 (ninguém se reativa), estados iniciais e papéis do registo, `check_signup_allowed` com convites, `approve_user_account` e `approve_startup_claim` só aprovam pendentes, `accept_workspace_invitation` idempotente e sem reativar suspensos, NDA do mentor, `team_member` sem escrita.
- **Caminho feliz que já funciona:** lead convertida por consultor antes do contrato + rota nativa → contrato ativo, workspace ativo com consultor e founder, onboarding pendente.

## Fora do prompt

- **ONB-13 (latente, LOW):** uma restrição `CHECK (role IN ('founder','team_member'))` em `workspace_invitations` partia a suite `invitation_acceptance.test.sql`, que usa de propósito um convite `mentor_externo` para testar que não dá o papel founder. A função de envio já só aceita founder e team_member, por isso nenhum ecrã chega lá.
- **Decisões de produto, não defeitos:** deixar o próprio founder convidar a equipa (hoje admin e consultor; exige abrir `send-workspace-invite` e contorna a allowlist); emails reais de aprovação de conta, candidatura e claim (o prompt torna os textos honestos; o envio é trabalho novo); ligar o importador HubSpot v2.
- **Já conhecidos e não repetidos:** K-a (tratado na A0), K-b e K-c.

## Limites desta validação

- As edge functions não correram contra serviços reais (GoTrue admin, Resend, DocuSign, PandaDoc, Microsoft Graph, Storage). Os efeitos na base foram reproduzidos em SQL pela ordem do código, com o papel que cada função usa; o código passou `deno check`.
- A interface não foi renderizada num browser: saltos de passo, botões e toasts foram verificados no código, no `tsc` e no `vitest`.
- Configuração do Supabase Auth do projeto não verificável daqui (URLs de redirect, SMTP, expiração do OTP). A Parte 1 pede para subir a expiração do OTP para 24 h.
- Sem dados de produção: o número de contratos ativos sem workspace, de founders auto-criados que nunca entraram e de workspaces com o onboarding por fazer tem de ser medido com as consultas incluídas no prompt.
- O PostgREST local não tem `max-rows`; o corte a 1000 linhas do CRM (C7) assenta no default do Supabase alojado e no código.
