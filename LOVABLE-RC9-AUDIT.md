# Startup Leiria Ecosystem OS — Auditoria RC9 (versão final)

**Export auditado:** `remix-of-startup-companion-main.zip`, exportado do Lovable e carregado a 30/set/2026 (md5 `26f25e7ab5f6776024ba0c666470df2d`).
**Inventário:** 476 migrações (+9 desde o RC8), 107 edge functions (+2: `public-survey`, `send-survey-invites`), 23 suites pgTAP (+10).
**Base de comparação:** RC8, export de 07/set (467 migrações, 105 funções, 13 suites).
**Fonte de verdade:** o ZIP do Lovable. O repositório GitHub `vgasmo/leiria-launchpad-pro` está 4 meses atrás e não foi usado como código; serve só para guardar estes relatórios.
**Entregáveis:** este relatório, o prompt `LOVABLE-RC9-FIXES.md` (5 partes, para colar no Lovable uma de cada vez) e o anexo `LOVABLE-RC9-I18N-PATCH.json`.

## Veredicto: NO-GO

A app não está pronta para produção. O RC9 aplicou quase tudo o que o RC8 pediu (35 de 37 itens), mas esta ronda percorreu pela primeira vez os fluxos completos de cada papel e encontrou problemas que nenhuma ronda anterior tinha visto:

- **Segurança, 5 HIGH abertos.** Qualquer utilizador reativa a própria conta suspensa (P1.1). As transcrições "só staff" ficam legíveis por founders e mentores, e o sweep automático espalha-as de 20 em 20 minutos (P1.3). O PDF do contrato é entregue, e regravado, a qualquer membro do workspace (P1.4). Em produção, qualquer conta autenticada executa as RPCs internas de DocuSign e forja o estado de assinatura de contratos de outras startups (P1.11). Qualquer founder torna-se "consultor" de uma startup alheia e lê o NIF (P1.12).
- **Fluxos centrais partidos, 8 HIGH.** A assinatura nativa do contrato dá sempre "token inválido" (P2.6). Com DocuSign, o webhook nunca atualiza o contrato: um contrato assinado nunca fica ativo (P2.15). Aprovar um intake para assinatura falha sempre (P2.7). Arrastar uma lead para "Contratado" ativa um contrato por assinar (P1.7). Renovar apaga a data de início da incubação (P1.8). Guardar o perfil apaga o telefone, o LinkedIn e a bio (P2.9). O founder não vê a disponibilidade do mentor que o staff lhe atribuiu (P2.5). Nenhuma campanha de inquérito pode ser lançada, apesar de o ledger do vendor a dar como `FIXED + PASS` (P2.14).
- **CI: 4 de 11 jobs vermelhos.** A causa de três está identificada e a correção foi validada localmente. O quarto (`deno-check-edge`) não é reproduzível fora do GitHub.

**Condição para GO:** aplicar as Partes 1 e 2 do prompt e ficar com o CI verde, o que exige também as três correções de CI da Parte 5 (P5.2, P5.3 e P5.6), e depois um verify-pass rápido sobre o ZIP seguinte. O resto das Partes 3 a 5 é de gravidade média e baixa: deve entrar antes de o backoffice começar a trabalhar contratos e ocupação na app, mas não bloqueia os founders.

## Números

| Parte | HIGH | MED | LOW | Total |
|---|---|---|---|---|
| Parte 1 | 7 | 6 | 3 | 16 |
| Parte 2 | 6 | 13 | 1 | 20 |
| Parte 3 | 0 | 15 | 13 | 28 |
| Parte 4 | 0 | 11 | 18 | 29 |
| Parte 5 | 0 | 8 | 18 | 26 |
| **Total** | **13** | **53** | **53** | **119** |

Verificação dos 119 achados: 57 confirmados por um verificador independente, 19 confirmados pelo lead com prova própria e 43 provados pela lente que os encontrou. Os 13 HIGH foram todos confirmados por um verificador ou pelo lead.

## Método

- Snapshot read-only do ZIP e `diff -qr` contra o snapshot RC8: 114 ficheiros alterados, 22 novos, 9 migrações novas.
- **Harness do vendor executado localmente** (`scripts/rc5/local-pg-harness.sh`, PostgreSQL 18 embutido + pgTAP 1.3.3). Replay das 476 migrações **sem nenhuma falha** (o vendor passou a aplicar `scripts/rc5/legacy-baseline.sql` antes do replay) e **23 suites, 0 falhas**. A base replayada serviu depois para provar cada achado de SQL e RLS, simulando cada papel: admin, consultor, backoffice, founder, team_member, mentor_externo e anon.
- **Dez lentes independentes:** delta SQL e qualidade dos testes; inquéritos e superfície pública nova; autenticação e acesso; edge functions alteradas; frontend alterado; fluxo completo do founder; fluxo completo de staff, backoffice e contratos; i18n; segurança da base; claims da documentação do vendor.
- **Verificação adversarial:** cada achado HIGH e MED foi entregue a um verificador independente com a instrução de o refutar e de rever a correção proposta. Nenhum achado foi retirado. Um HIGH foi refutado como tal e ficou LOW: o assistente de contrato do founder (P2.3), que nenhum founder consegue abrir. Outros mudaram de severidade: quatro HIGH ficaram MED (o token do inquérito, P1.2; as aprovações pelo backoffice, P2.1; o membro de equipa preso em /claim-startup, P2.4; "Marcar como assinado" pelo backoffice, P2.8) e cinco MED ficaram LOW (P3.8, P3.12, P4.14, P4.15 e um dos achados de i18n da P5.1). Os verificadores também apanharam correções do prompt inseguras ou incompletas em mais de trinta itens. Por exemplo: a aprovação de contas deixava o backoffice reativar contas suspensas (P2.1); o PDF do contrato continuava a regravar o documento canónico (P1.4); o trigger das ausências bloqueava sessões com mentores durante as férias do consultor (P4.7); terminar um contrato fechava a sala de outro contrato do mesmo workspace (P3.1). O prompt já inclui as versões corrigidas.
- **Revisão de consistência do prompt inteiro:** um revisor compilou todo o SQL por ordem, verificou cerca de 150 citações `ficheiro:linha` e procurou conflitos entre itens que editam o mesmo ficheiro. As correções dele também estão no prompt, incluindo a regra 7: os números de linha são os do RC9 original.
- **Correções validadas na base.** Todo o SQL do prompt foi executado na base replayada dentro de transações com ROLLBACK, e o SQL de cada parte foi compilado em conjunto. As correções de CI foram validadas no harness:
  - a migração que cria cedo as duas tabelas usadas fora de ordem (P5.3): 477 migrações a partir de uma base vazia, 0 falhas, e a base fica com as FKs de produção que a `legacy-baseline.sql` do vendor omitia;
  - a emulação dos default privileges do Supabase: com ela, a suite nova apanha a P1.11 (falha sem a correção, passa com ela) e as outras 23 continuam verdes;
  - o anexo de i18n: passam os gates do próprio repositório;
  - o `deno check` das 134 edge functions com o `supabase-js` fixado pelo npm: passa.
- **Teste de integração do prompt, na versão final.** O prompt foi aplicado à letra a uma cópia do RC9: a migração e as alterações ao harness da P5.3 e da P1.11, e as 29 migrações das Partes 1 a 4, por ordem. Resultado: 506 migrações com 0 falhas e as 24 suites verdes (as 23 do vendor mais a suite nova de privilégios). Uma suite extra de 26 verificações confirmou o comportamento das correções revistas na ronda final, entre elas o trigger das ausências por participante, o adiamento da fila de trabalho e a proteção do NIF.
- **Código das correções.** As edge functions alteradas pelo prompt passam o `deno check`. Os excertos TypeScript novos que mexem em payloads da base compilam contra o `types.ts` do RC9 com o `supabase-js` 2.89. O anexo de i18n foi aplicado com o script do prompt sobre os catálogos do ZIP, com e sem as chaves que as Partes 3 e 4 mandam acrescentar, e passam os gates do repositório e os dois gates novos da P5.2.

## Verify-pass do RC8

O prompt RC8 tinha 37 itens. **35 foram aplicados no código e 2 ficaram por resolver** (CI `i18n-sync-guard` e `db-tests`/`deno-check-edge`/`e2e`). Taxa: 35/37, a melhor até agora (RC7→RC8 tinha sido 14/38).

| Item RC8 | Estado | Evidência |
|---|---|---|
| P0.1 `serialize_program_tree` fechado a anon | Feito | `20260907174348:2-5`; pgTAP `serialize_program_tree_privileges` |
| P0.2 FK composta `action_items`→`milestones` | Feito | `20260907174348:8-16`; pgTAP `action_items_milestone_scope` |
| P0.3-bis ecrã de erro de perfil com "Tentar novamente" | Feito (com regressão, ver achados de autenticação) | `App.tsx:76,92-102`; `AuthContext.tsx:89,128,141-142` |
| P0.4 re-login com a mesma conta | Feito | `AuthContext.tsx:197,210` |
| P0.5 claim `pending_review`/`already_member` | Feito | `ClaimStartup.tsx:46,108-117`; `App.tsx:142` |
| P1.1 janela do watchdog | Feito | `20260907175945:4-77`; pgTAP `automation_health_window` |
| P1.2 `triggered_by` cron + log duplo do sweep | Feito | `_shared/cronRun.ts:128-130`; `sweep-session-transcripts:25` |
| P1.3 chamadas função→função com service role | Feito (expôs dois defeitos a jusante, ver edge functions) | `_shared/security.ts:159,180,245,308` |
| P1.4 alertas do reconciler e `upsert` | Feito | `reconciler-run:179-201`; `public-*` com `upsert` |
| P1.5 retenção RGPD do Founder Pulse | Feito, mas **nunca agendado** | `20260907175945:82-99`; 0 jobs em `cron.job` |
| P1.6 fecho de lotes CRM | Feito, mas **sem nenhum chamador** | `20260907175945:104-126` |
| P1.7 merge de `metadata_json` no booking | Feito | `public-book-first-contact:547-581` |
| P1.8 kill-switch de notificações | Feito | `20260907175945:131-174`; `useNotifications.ts:219-225` |
| P2.1 credenciais de assinatura | Feito | `SignatureProvidersCard.tsx:102,137,205,242` |
| P2.2 terminar contrato | Feito (falha para o backoffice, ver matriz) | `useTerminateContract.ts:24-31,175,230` |
| P2.3 aplicar playbook | Feito | `CopilotPlaybookActions.tsx:85-89,107` |
| P2.4 invalidações realtime | Feito | `useRealtimeWorkspaces.ts:56,68,87-88` |
| P2.5 erros engolidos | Feito | `AdminBackoffice.tsx:253-272`; `BillingSnapshotCard.tsx:31` |
| P2.6 agenda em erro / duplo clique | Feito | `SessionsTab.tsx:63,137`; `CreateSessionDialog.tsx:292-293` |
| P2.7 deep-links de admin | Feito | zero ocorrências dos separadores inválidos |
| P2.8 PDF de contrato só para membro activo | Feito, mas **incompleto** (qualquer membro activo, ver segurança) | `generate-contract-pdf:628` |
| P2.9 inquéritos só admin + RPC de lançamento | Feito | `Admin.tsx:64`; `useSurveys.ts:303` |
| P2.10 overload antiga de `list_ecosystem_items_v2` | Feito | `20260907195645:38,43-72` |
| P2.11 policy de leitura de programas | Feito | `20260907195645:76-81` |
| P2.12 limite de pedidos no MCP | Feito, mas **ineficaz** (provado: 65/65 chamadas passam) | `src/lib/mcp/rateLimit.ts` |
| P2.13 stage gate → fila de staff | Feito (falha no 2.º pedido, ver achados) | `20260907195645:3-34`; pgTAP `stage_gate_review_queue` |
| P3 i18n (placeholders, valores em inglês) | Feito para os itens listados | `i18n-quality` passa; varrimento completo encontrou mais |
| P4.1 `env-leak-guard` | Feito | verde no CI |
| P4.2 `migration-scan` | Feito | verde no CI |
| P4.3 `i18n-sync-guard` | **Por resolver** | CI vermelho; só reordenação de chaves |
| P4.4 `deno-check-edge`, `db-tests`, `e2e` | **Por resolver** | CI vermelho |
| P4.5 ≥ 18 suites pgTAP | Feito | 23 suites |
| P4.6 funções mortas documentadas | Feito | `docs/rc5/dead-edge-functions.md` |
| P4.7 ledger e documentos | Ver claims do vendor |  |

## Achados, por item do prompt

Legenda da coluna "Verificação":
- **verificador**: confirmado por um verificador independente que tentou refutá-lo;
- **lead**: confirmado pelo lead com prova própria na base ou no código;
- **lente**: provado pela lente que o encontrou (com query ou leitura de código citada), sem segunda verificação.

Nenhum achado foi retirado. Os que os verificadores reclassificaram aparecem com a severidade final e a marca "reclassificado".

### Parte 1 — Segurança e integridade de dados

| Item | Achados | Severidade | Verificação | Problema |
|---|---|---|---|---|
| P1.1 | C1 | HIGH | verificador + lead | Qualquer utilizador aprova ou reativa a própria conta |
| P1.2 | B1, A1 | MED | verificador | Mentores externos leem o token público do inquérito e escrevem dados da startup |
| P1.3 | D1 | HIGH | verificador + lead | Transcrições "só staff" ficam visíveis a founders e mentores |
| P1.4 | D2 | HIGH | verificador | O PDF do contrato é entregue (e regravado) por qualquer membro do workspace |
| P1.5 | B3 | MED | verificador | `send-survey-invites` envia tokens para qualquer email e contorna a lista de registo |
| P1.6 | K1, D10 | MED | lead | O limite de pedidos do MCP não limita nada, e qualquer utilizador esgota a quota de outro |
| P1.7 | G3 | HIGH | verificador + lead | Arrastar uma lead para "Contratado" ativa e marca como assinado um contrato por assinar |
| P1.8 | G4 | HIGH | verificador + lead | Renovar um contrato apaga a data de início da incubação |
| P1.9 | K2, A6 | MED | K2: lead; A6: lente | Higiene de privilégios (fecha o que a migração de 09/set deixou aberto) |
| P1.10 | B9 | LOW | lente | URL `javascript:` gravável no website da startup pelo link público |
| P1.11 | I1, I2 | HIGH | lead | Em produção, qualquer utilizador autenticado executa as RPCs internas de DocuSign, cron e CRM |
| P1.12 | I3 | HIGH | lead | Qualquer founder torna-se "consultor" de uma startup alheia e lê o NIF e escreve os dados financeiros |

### Parte 2 — Fluxos centrais partidos

| Item | Achados | Severidade | Verificação | Problema |
|---|---|---|---|---|
| P2.1 | C2, C3 | MED | verificador | Aprovações: o backoffice não consegue aprovar nada, e aprovar uma candidatura mostra sucesso sem efeito |
| P2.2 | C4, C5, G8, G9, G10 | MED | verificador | Backoffice: botões que a base rejeita ou que dão sucesso sem efeito |
| P2.3 | F1 | LOW | verificador (reclassificado) | Assistente de contrato do founder: página inalcançável que falha em silêncio |
| P2.4 | F2 | MED | verificador + lead | Membro de equipa atribuído pelo admin fica preso em /claim-startup |
| P2.5 | F4 | HIGH | verificador + lead | O founder não vê a disponibilidade do mentor que o staff lhe atribuiu |
| P2.6 | G1 | HIGH | verificador + lead | Assinatura nativa: o link público dá sempre "Invalid or expired token" |
| P2.7 | G2 | HIGH | verificador + lead | Intake: "Aprovar para assinatura" falha sempre |
| P2.8 | G5 | MED | verificador + lead | "Marcar como assinado" pelo backoffice ativa o contrato, mas o workspace fica pendente |
| P2.9 | F3 | HIGH | verificador + lead | Definições → Perfil apaga o telefone, LinkedIn, bio e especialidades |
| P2.10 | C6 | MED | verificador | Voltar ao separador desmonta a app (e pode mostrar o ecrã de erro a quem já tinha permissões) |
| P2.11 | C7 | MED | verificador | Mentor preso num ciclo /mentor-nda ↔ /my-workspaces depois de aceitar o NDA |
| P2.12 | C8 | MED | verificador | Quem se regista a partir de um convite perde o convite |
| P2.13 | L1 | MED | lead | Página pública de marcação: o pitch deck nunca é carregado |
| P2.14 | J2 | HIGH | lead | Inquéritos: nenhuma campanha pode ser lançada |
| P2.15 | G17b | HIGH | lead | DocuSign: o webhook nunca atualiza o contrato |

### Parte 3 — Contratos, ocupação, CRM e automações

| Item | Achados | Severidade | Verificação | Problema |
|---|---|---|---|---|
| P3.1 | G6, G22 | MED | G6: verificador + lead; G22: lente | Ocupação: renovar não prolonga a sala, terminar não a liberta, "Desocupar" só liberta no dia seguinte |
| P3.2 | G15 | MED | verificador + lead | Novo contrato: a "Sala" escolhida nunca gera alocação |
| P3.3 | G17 | MED | verificador + lead | "Repor e reenviar" (contrato recusado ou anulado) falha sempre |
| P3.4 | G18 | MED | verificador + lead | Listagens de contratos vazias: "Contratos a Expirar (30 dias)", `/admin/contracts` e pesquisa global |
| P3.5 | G19 | MED | verificador + lead | CRM, ficha da lead, separador Contexto: a startup associada nunca aparece |
| P3.6 | G20 | MED | verificador + lead | Contrato assinado sem workspace (criado no CRM): a criação automática da startup falha sempre |
| P3.7 | G16 | MED | verificador + lead | Ecossistema, "Eliminar lead": o "Anular" falha sempre e o histórico é apagado |
| P3.8 | G7 | LOW | verificador | Intake, "Pedir correções": a falha do email aparece como sucesso |
| P3.9 | G11 | MED | verificador | Fila de trabalho: "Adiar 1 dia / 1 semana" esconde o item para sempre e o recálculo cria um duplicado |
| P3.10 | G21, L2 | MED | lead | Contra-assinatura nativa: o item da fila nunca é criado |
| P3.11 | G12 | MED | verificador | Avisos (admin): "Enviar para todas" inclui startups arquivadas, a opção Teams não faz nada e falhas de email aparecem como sucesso |
| P3.12 | G13 | LOW | verificador | Qualidade de Dados: "Workspaces sem founder" ignora os workspaces sem membros e conta founders inativos |
| P3.13 | G14 | MED | verificador | Utilizadores & Permissões não permite atribuir nem filtrar o papel backoffice |
| P3.14 | G23 | LOW | lente | Caixas de pedidos do staff sem identificação |
| P3.15 | G24 | LOW | lente | Snapshot de faturação: "Faturas em atraso" nunca conta nada |
| P3.16 | D3 | MED | verificador | `sweep-session-transcripts` conta cada importação bem-sucedida como falha e gera alertas críticos falsos |
| P3.17 | D4 | MED | verificador | Importar transcrição → gerar artefactos: coluna inexistente, ações de transcrições confidenciais e duplicados |
| P3.18 | D5 | MED | verificador | Slack e lembretes de marcos continuam sem funcionar |
| P3.19 | D7 | LOW | lead | O watchdog aceita corridas manuais como prova de que o cron está vivo |
| P3.20 | D9 | LOW | lente | Envios que falham aparecem como sucesso |
| P3.21 | A4 | LOW | lead | A anonimização RGPD do Founder Pulse nunca corre |
| P3.22 | A5 | LOW | lente | Importação de leads: o lote nunca é finalizado |
| P3.23 | C9 | LOW | lente | Atribuir workspace (Aprovações): lista workspaces arquivados e reativa-os |
| P3.24 | D8 | LOW | lente | Definições › Assinaturas: guardar credenciais volta a ligar um fornecedor desligado |
| P3.25 | J1 | MED | lente | Saúde do Sistema: 14 das 21 automações aparecem "sem execuções" com o sistema saudável |
| P3.26 | J8 | LOW | lente | `send-whatsapp-reminder` aceita qualquer utilizador autenticado |

### Parte 4 — Founder, sessões, mentores e inquéritos

| Item | Achados | Severidade | Verificação | Problema |
|---|---|---|---|---|
| P4.1 | F5 | MED | verificador | A regra "só o consultor conclui ações" é contornada pela própria UI do founder |
| P4.2 | F6 | MED | verificador | A aprovação de alterações sensíveis da startup só existe no cliente |
| P4.3 | F7 | MED | verificador | KPIs: "Concluir" o check-in mensal falha sempre para o founder |
| P4.4 | F8 | MED | verificador | Visão geral: o founder muda a fase, vê "Fase atualizada" e nada muda |
| P4.5 | F9 | MED | verificador | Plano financeiro guiado: "Ainda não sei" nunca chega ao consultor |
| P4.6 | F10 | MED | verificador | Barra de ações em massa: sem verificação de escrita e com contagens falsas |
| P4.7 | F11, E1 | MED | verificador | Agendar sessão: horários do mentor sempre vazios e períodos bloqueados ignorados |
| P4.8 | F12 | MED | verificador | O membro de equipa (e o mentor) não consegue ler a própria startup |
| P4.9 | A2, D6 | MED | A2: verificador; D6: lente | Marcação pública: bloqueios desfasados 1 hora no inverno, e o filtro falha aberto |
| P4.10 | E3 | LOW | lente | Página Mentores: dias bloqueados continuam selecionáveis |
| P4.11 | E8 | LOW | lente | Bloqueio de "dia inteiro" soma 24 horas em milissegundos |
| P4.12 | A3 | LOW | lead | Pedido de stage gate falha com erro de chave duplicada |
| P4.13 | B2 | MED | verificador | Inquéritos: a fase do workspace volta atrás sem ninguém a escolher |
| P4.14 | B4 | LOW | verificador | Convites de inquérito: falhas do envio aparecem como sucesso |
| P4.15 | E2 | LOW | verificador | Estatísticas da campanha nunca são atualizadas |
| P4.16 | B5 | LOW | lente | Link público do inquérito: o write-back pode falhar em silêncio |
| P4.17 | B6 | LOW | lente | Convites não idempotentes |
| P4.18 | B7 | LOW | lead | O link público devolve as respostas depois da submissão |
| P4.19 | B8 | LOW | lente | Corrida no envio do inquérito público |
| P4.20 | B10 | LOW | lente | Página pública do inquérito: sem confirmação do rascunho e erros genéricos |
| P4.21 | E4 | LOW | lente | Terminação em massa: placeholders literais e "0 contratos terminados" a verde |
| P4.22 | E5 | LOW | lente | `.limit(5000)` não evita perder registos |
| P4.23 | E6, E7 | LOW | lente | Pequenos defeitos de navegação |
| P4.24 | F13 | LOW | lente | Founder com candidatura pendente cai em /claim-startup |
| P4.25 | F14 | LOW | lente | Defeitos menores no fluxo do founder |
| P4.26 | C10 | LOW | lente | "Terminar sessão" pode não terminar a sessão |

### Parte 5 — i18n, CI, testes e processo

| Item | Achados | Severidade | Verificação | Problema |
|---|---|---|---|---|
| P5.1 | H1, H2, H3, H4, H5, H6, H7, H8, H9, H10, C11 | MED | H1: verificador; H2: verificador; H3: verificador; H4: verificador; H5: lente; H6: lente; H7: lente; H8: lente; H9: lente; H10: lente; C11: lente | Textos da UI: aplicar o anexo `LOVABLE-RC9-I18N-PATCH.json` |
| P5.2 | K4, J6 | MED | K4: lead; J6: lente | CI `i18n-sync-guard`: falha só por ordem de chaves, e o próprio sync gera texto errado |
| P5.3 | K3, J7 | MED | lead | CI `db-tests` e `e2e`: a cadeia de migrações não arranca de uma base vazia |
| P5.4 | — | — | — | Harness com os privilégios de produção (já feito na P1.11) |
| P5.5 | A7, A8, A9, A10, A11, A12 | LOW | lente | Testes do RC9 que não testam o que prometem |
| P5.6 | — | — | — | CI `deno-check-edge` |
| P5.7 | J3 | MED | lead | O caminho de verificação em staging nunca pode dar "pass" |
| P5.8 | J4 | MED | lente | Testes E2E que passam sem testar nada |
| P5.9 | J5, J9, J10 | MED | lente | Documentos de release e guard de segredos |
| P5.10 | — | — | — | Regras de trabalho para as próximas rondas |


## O que está bem

Verificado e correto nesta ronda (amostra dos pontos confirmados pelas lentes):

- **Base de dados.** 203 tabelas em `public`, todas com RLS ativa e com políticas. Todas as views de aplicação são `security_invoker`. Buckets privados, exceto `public-assets` (upload só staff); as políticas de `storage.objects` batem com os papéis. As funções que usam pgcrypto têm `search_path` com `extensions`.
- **Migrações novas do RC9.** `serialize_program_tree` fechada a anon e authenticated sem partir o publish de programas; a FK composta `action_items → milestones` rejeita marcos de outro workspace com o nome do constraint; o watchdog usa a janela `max(48h, 2×cadência + tolerância)`; o kill-switch do Founder Pulse não cria tentativas órfãs; a reescrita de `list_ecosystem_items_v2` alterou de facto a definição viva e só resta uma overload; `handle_new_user` só acrescenta `signup_startup_name`.
- **Inquéritos públicos.** Token de 122 bits com índice único; anon não lê `survey_instances` diretamente; validação do POST no servidor (limites, obrigatórias, 409/410); convites com HTML escapado e Resend verificado; export CSV protegido contra formula injection.
- **Autenticação.** Ordem do `ProtectedRoute` correta; re-login da mesma conta sem spinner eterno; convites comparam com o email de `auth.users` e o trigger `prevent_invitee_field_tampering` impede alterar papel, workspace ou token; versão do NDA idêntica no cliente, na função e na base.
- **Edge functions.** `isServiceRoleBearer` compara em tempo constante nos três guards; aceitar service role não contorna nenhum controlo de staff; todos os encadeamentos função→função enviam o header que o alvo aceita; os 21 jobs de cron têm alvo e expectativa de saúde coerentes; o bundle do MCP está em sincronia com `src/lib/mcp` e o `contact_email` foi removido.
- **Frontend alterado.** Ausências (time-off): RLS correta, o founder recebe as janelas sem o motivo, a reserva é recusada na base; invalidações de cache com leitor; nenhuma chave i18n nova em falta.
- **Founder e staff.** RLS do founder correta em marcos, KPIs, stage gates, chat e pedidos à equipa; o team_member não escreve onde não deve (exceto a barra em massa, P4.6); o CRM impede dupla conversão; a importação CSV de leads é idempotente.
- **i18n.** 9141 chaves em PT e EN, 0 duplicadas, 0 vazias; todas as 6507 chaves literais usadas no código existem nos dois catálogos; as famílias dinâmicas (fases, saúde, estados do pipeline) estão completas.

## CI

| Job | Estado em `main` (`dc68120`) | Causa | Correção |
|---|---|---|---|
| lint-and-build, test, i18n-check, i18n-lint, env-leak-guard, secret-scan, migration-scan | Verde | — | — |
| i18n-sync-guard | Vermelho | Compara bytes depois de o `i18n-sync.cjs` reordenar as chaves. No RC9 o sync não acrescenta nem altera nada. | P5.2: guard semântico (validado) |
| db-tests | Vermelho | O `supabase start` falha na migração `20260103024619`: FK para `investor_readiness_items`, que só é criada em `20260220001543`. O CI não aplica a `legacy-baseline.sql`. | P5.3: migração `20260103024618` que cria cedo as duas tabelas (validado no harness) |
| e2e | Vermelho | Mesmo `supabase start` que o `db-tests`. | P5.3 |
| deno-check-edge | Vermelho | Não reproduzido (esm.sh e deno.land bloqueados no ambiente de auditoria). Com o `supabase-js` resolvido pelo npm, os 134 ficheiros passam. | P5.6: import map determinístico; enviar o log se continuar vermelho |

## Decisões que ficam consigo

1. **Âmbito do backoffice** (Parte 2). O prompt assume que o backoffice é o dono operacional de contratos, espaços, intakes, aprovações, pedidos de alteração de dados legais e fila de trabalho, e que Programas, KPIs, Templates e Materiais ficam para admin e consultor. Se não for assim, diga-o antes de colar a Parte 2.
2. **Aprovações pelo backoffice** (P2.1). Ou o backoffice aprova contas e candidaturas (correção principal), ou o item sai da navegação dele (alternativa descrita no item).
3. **Download do contrato pelo founder** (P1.4). Hoje nenhum ecrã de founder gera o PDF. Se quiser que o founder o descarregue, é preciso um endpoint só de leitura com URL assinado.
4. **Rodar os tokens dos inquéritos** (P1.2, opcional). Só é preciso se houver mentores atribuídos a startups com inquéritos por submeter. Invalida os links já enviados.
5. **Redirect URLs** (P2.12). Em Supabase, Authentication, URL Configuration, confirme que os Redirect URLs aceitam `https://<domínio>/**`. É um passo manual, indispensável só se a app correr num domínio diferente do Site URL.
6. **`CRON_SECRET` em produção.** Vários guards aceitam `x-cron-secret` como alternativa ao token de cron. Confirme que o segredo está definido e é longo. Depois da P4.16, o write-back do link público deixa de depender dele.
7. **Projeto Lovable antigo.** O repositório `vgasmo/leiria-launchpad-pro` e o projeto Lovable de onde veio estão 4 meses atrás. Arquive-os para ninguém publicar a partir da cópia errada.

## O que a documentação do vendor afirma e não se confirma

A lente J comparou cada "FIXED", "PASS" e "READY" da documentação com o código, a base e o CI. Os pontos abaixo contam para o veredicto, porque são os documentos que o vendor usa para pedir GO.

| Documento | Afirmação | Realidade | Item |
|---|---|---|---|
| `docs/rc5/evidence-ledger.md:284` | P2.9 inquéritos `FIXED + PASS` | `launch_survey_campaign` falha sempre com 42702; nenhuma suite a chama | P2.14 |
| `docs/rc5/evidence-ledger.md:292` | P4.3 i18n sync `FIXED + PASS` | Job `i18n-sync-guard` vermelho em `main` | P5.2 |
| `docs/rc5/evidence-ledger.md:295` | P4.6 documentos contraditórios `FIXED + PASS` | `RELEASE_AUDIT.md` e `REGRESSION_CHECKLIST.md` continuam a dizer GO sem aviso | P5.9 |
| `docs/rc5/evidence-ledger.md:304` | Tabelas "sem migração no repositório" `PASS` | As tabelas têm `CREATE` em migrações commitadas, só que fora de ordem; a baseline cria-as sem as FKs de produção | P5.3 |
| `PUBLISH_READY.md:3-4` | "Todos os testes automáticos locais passam, falta a validação em staging" (08/set) | 4 jobs de CI vermelhos em `main`; 6 migrações e 2 funções posteriores a essa verificação | P5.9 |
| `PUBLISH_READY.md:50-51` | GO quando `rc5:verify` escrever `"overall": "pass"` | O caminho de staging não pode passar: seed e cleanup usam colunas inexistentes, o guia usa nomes de variáveis que os scripts não leem | P5.7 |
| `PUBLISH_READY.md:35-36` | Provas E2E de falhas Graph/email e de dupla marcação | O teste de Graph engole a asserção; o de dupla marcação chama uma função que não existe e salta a asserção; o outro spec importa `/src`, que não existe no build | P5.8 |
| `scripts/rc5/i18n-quality.mjs` (P3 do RC8) | Gate de qualidade PT/EN | Lista de 12 palavras; aprova 63 textos ingleses em `pt.json`. O job `i18n-lint` corre o sync antes do lint e valida o catálogo já completado no runner | P5.1, P5.2 |
| `docs/rc5/dead-edge-functions.md:9-11` | As 12 funções "stay registered with verify_jwt = false and validate credentials in code" | Falso para 8 das 12; `send-whatsapp-reminder` aceita qualquer utilizador autenticado | P3.26, P5.9 |
| `docs/rc5/manual-test-runsheet.md:23` | Passo 10: "Founders não recebem email nem aviso" | O interruptor só bloqueia avisos in-app | P5.9 |
| `docs/rc5/manual-test-runsheet.md:25` | Passo 12: "Nenhuma tarefa em never_run" | O painel marca 14 de 21 automações saudáveis como `never_run`; o passo falha sempre | P3.25 |
| `.github/workflows/ci.yml:169-178` (P4.1) | Guard de `.env` só deixa passar chaves públicas | Contorna-se com `export ` ou espaço inicial | P5.9 |

O que o próprio vendor dá como ainda por provar (`PUBLISH_READY.md:33-36`): E2E por perfil em staging e comportamento com falhas de serviços externos (Graph e email). Continua por provar. Com os itens P5.7 e P5.8 aplicados, esse caminho passa a poder ser executado.

## Limites desta auditoria

- Não corri o `supabase start` nem os testes e2e (sem Docker no ambiente). As correções de CI foram validadas no harness do próprio vendor.
- O esm.sh e o deno.land estão bloqueados no ambiente, por isso o `deno check` foi feito com as dependências resolvidas pelo npm e o `std/http` com um stub de tipos.
- Os default privileges do Supabase alojado foram emulados no harness. A P1.11 assenta nessa emulação e na documentação da plataforma, e reproduz exatamente as 17 funções que a lente de segurança encontrou.
- Não houve acesso a dados de produção. Os itens com "dados já afetados" trazem a query para o Vítor ou o Lovable correrem.
- Emails (Resend), Teams/Graph, DocuSign e PandaDoc não foram exercitados ao vivo; os fluxos foram seguidos no código e na base até à chamada externa.
