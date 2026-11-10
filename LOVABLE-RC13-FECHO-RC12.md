# RC13 · Fecho da RC12 no snapshot de 10 nov 2026

**Veredicto.** Tinha razão: quase todos ficaram fechados. Dos 236 achados da RC12, **215 estão fechados (91%)**, verificados um a um no código novo e, onde toca à base, numa réplica PostgreSQL 16 reconstruída a partir do snapshot. **Os 4 HIGH estão corrigidos no que a RC12 prescrevia**, com prova de comportamento na réplica; dois deles têm superfícies que a RC12 deixou de fora e que continuam abertas: um staff suspenso ainda passa em 5 Edge Functions e no Storage (ONB-02), e há um link que aceita `javascript:` (FEB-01). **Ficam 21 por fechar**: esses 2 HIGH com resíduos, 7 MED e 12 LOW. Oito dos 21 fecham com o prompt `LOVABLE-RC13-P00-RESIDUOS-RC12.md`, já validado; os outros 13 são decisões suas, CI ou documentação. Há ainda um ponto que não é defeito mas pesa: **segundo o registo do próprio Lovable, o frontend não foi publicado**, ou seja, as correções de cliente da RC12 podem ainda não estar em produção.

### O que fazer, por ordem
1. **Hoje, sem alterar nada:** correr `LOVABLE-RC13-VERIFICACAO-BASE-VIVA.sql` na base real. São 13 blocos só de leitura; cada um diz o resultado esperado. Confirma o que o snapshot não mostra: se as reparações de dados correram, se os hashes das funções batem com a réplica e se há contas de staff por aprovar.
2. **Confirmar se o frontend já foi publicado** depois de 9 nov. `docs/RC12-APPLIED.md` diz cinco vezes que não, a última na linha 144. Sem publicação, o que os utilizadores usam ainda é o cliente anterior à RC12.
3. **Colar `LOVABLE-RC13-P00-RESIDUOS-RC12.md` no Lovable.** Sete secções, 12 ficheiros, 2 migrações. Fecha o link `javascript:` que sobrou, o staff suspenso em 5 funções e no Storage, as reparações de dados sem migração e o gate i18n vermelho.
4. **Decidir os 5 pontos da secção 8.** O mais importante é o das contas de staff pendentes.
5. **Só depois abrir a RC13.** Os achados novos da secção 7 já são matéria-prima para ela.

## 1. Como verifiquei

- **Fonte de verdade:** o ZIP de 10 nov 2026, 14:59, extraído em modo só de leitura. O scratchpad da sessão anterior perdeu-se com o contentor; reconstruí tudo de raiz e recuperei os entregáveis RC12 do commit `ae62e8f`.
- **Réplica PG16:** as 495 migrações de `supabase/migrations` mais as 37 de `drizzle/migrations`, com o harness do próprio snapshot. **Zero erros de replay.** O md5 de `has_role` na réplica (`ef25422c…`) é igual ao que o Lovable leu no catálogo alojado, o que dá confiança de que a réplica é fiel à base viva nas funções centrais.
- **Verificação por secção:** as 18 partes RC12 foram partidas em 53 tarefas com 316 pares secção e achado. Cada par foi verificado no código novo por um agente independente, com evidência ficheiro, linha e excerto literal. **As 887 evidências foram validadas mecanicamente** contra os ficheiros do snapshot: todas existem tal como citadas.
- **Revisão cética:** todos os pares dados como não fechados, todas as regressões apontadas e os 4 HIGH passaram por um segundo agente com instrução para refutar. Em 44 pares revistos, cinco mudaram de estado, todos de fechado para parcial: o FEB-01 em três partes, por um link novo que três revisores encontraram de forma independente; o ONB-02, por superfícies fora das tabelas; e o OPS-14, por documentação incompleta. Nenhum par dado como não fechado foi refutado.
- **Validação minha na réplica:** os 4 HIGH, o link novo do FEB-01, o Storage do ONB-02, o FEF-04, a matriz de contas suspensas e pendentes e todo o SQL do P00, sempre dentro de `BEGIN` e `ROLLBACK`.

## 2. Gates no snapshot

| Gate | Resultado | Nota |
|---|---|---|
| `tsc --noEmit` | 0 erros | |
| `eslint .` | 0 problemas | |
| `vitest` | 51 ficheiros, 331 testes, 0 falhas | A RC12 previa 67 ficheiros e 368 testes com o Anexo T; 30 dos 50 ficheiros desse anexo não foram criados |
| `i18n:lint` | **falha, 2 problemas** | Falta a chave base `admin.userManagement.resultCount` em pt e en. Corrigido no P00 |
| `i18n:check` | passa, 9386 chaves | |
| `deno check` à árvore toda | 164 ficheiros limpos | Exclui `mcp/index.ts`, gerado pelo Lovable, como faz o script do CI |
| `deno test` | 202 passam, 0 falham, 5 ignorados | |
| `vite build` | passa | |
| Replay em PG16 de `supabase/migrations` mais `drizzle` | 0 ficheiros com erro em 532 | |
| pgTAP do snapshot | 38 suites, 391 asserções, 0 falhas | Bate com o que o Lovable declarou |
| pgTAP do Anexo T que o Lovable não incluiu | 107 de 108 asserções | 6 suites escritas na RC12 contra o comportamento esperado. A que falha é o monitor da purga, corrigido no P00 |

Com o P00 aplicado numa cópia: `tsc`, `eslint`, `vitest`, `i18n:lint`, `i18n:check` e `deno check` passam todos, e a asserção em falta do Anexo T passa.

## 3. Os 4 HIGH

| Achado | Estado | Prova |
|---|---|---|
| **ONB-02** staff suspenso com poderes | Fechado nas tabelas, **com duas superfícies por fechar** | Na réplica, admin e backoffice suspensos: `is_staff`, `is_admin` e `can_access_backoffice` devolvem falso; leem 0 linhas de startups, perfis e contratos; não alteram perfis, papéis, workspaces nem contratos; não conseguem reaprovar-se nem criar convites. A política `rc12_suspended_block` está em 204 das 206 tabelas com RLS; as 2 de fora são `profiles` e `user_roles`, como desenhado. Sobram 5 Edge Functions e o Storage, que a RC12 deixou de fora. Ver secção 4 |
| **DBP-01** `publish_program_setup` com 42P10 | Fechado | Chamei a função na réplica com um rascunho de 2 etapas: `success: true, stages_count: 2`. O índice `stages_program_stage_key_unique` é completo. Uma pesquisa a todas as funções não encontra nenhum `ON CONFLICT` sem índice único completo |
| **ED3-01** importador em massa sem efeito | Fechado | O ecrã marca `commit_authorized = true` e confirma a contagem antes de chamar a função (`BulkContractImport.tsx:294-300`); a política permite ao admin; a função separa as linhas não autorizadas sem as queimar |
| **FEB-01** `javascript:` em links clicados pelo staff | Fechado no que a RC12 prescrevia, **com um link novo por fechar** | As 7 constraints existem e os 38 `href` dinâmicos do `src` foram varridos. Sobra `StartupSettingsTab.tsx:437`. Ver secção 4 |

## 4. O que não ficou fechado

| Achado | Grav. | O que falta | Onde se fecha |
|---|---|---|---|
| **FEB-01** (link novo) | HIGH | `src/components/workspace/StartupSettingsTab.tsx:437` desenha o link "Ver documento" com o valor cru de `startups.startup_portugal_document_path`. Provei na réplica que um founder grava lá `javascript:alert(document.domain)`. Quem clica é o admin ou o consultor | P00, secções 1 e 3 |
| **ONB-02** (Storage e funções) | HIGH | Sete políticas de `storage.objects` leem `user_roles` diretamente. Provei na réplica que um backoffice suspenso lê e apaga um ficheiro do bucket `contract-documents`. As 5 Edge Functions são as do HRD-02, na linha seguinte | P00, secções 2 e 7 |
| **HRD-02** | MED | `get-global-integrations` e mais 4 funções autorizam pelo papel sem olhar ao estado da conta. Um staff suspenso com sessão válida ainda publica nos canais do Teams, lê integrações, gera resumos do CRM, dispara sincronizações e grava em `programs` antes de a RPC recusar | P00, secção 2 |
| **E2E-04** | MED | O trigger novo trata as leads novas; a reparação das leads já contratadas não está em nenhuma migração | P00, secção 3; bloco 7 das consultas |
| **FEX-05** | MED | Os dois UPDATE aos links antigos das notificações não estão em nenhuma migração. Por confirmar na base viva | P00, secção 3; bloco 8 |
| **DBP-07** | MED | A purga corre e está agendada, mas o monitor de saúde não a conhece: se parar, ninguém é avisado | P00, secção 3; bloco 6 |
| **FEF-04** | MED | O bloco "Insight IA" foi escondido na UI, mas `workspaces.health_notes` e `priority_notes` continuam legíveis pelo founder por API. Provei na réplica: um founder lê as notas internas do staff sobre o seu próprio workspace. O servidor MCP também as devolve (`src/lib/mcp/tools/get-workspace-overview.ts:27`) | RC13, módulo próprio. Decisão 3 |
| **OPS-06** | MED | O job `db-tests` do CI, que corre no main, só aplica `supabase/migrations` e tem suites que dependem de objetos que só existem no drizzle. Fica vermelho | Decisão 2 |
| **DRF-01** | MED | O Lovable não espelhou o drizzle em `supabase/migrations`. Mitigou com o job `db-pgtap-local`, que reconstrói a cadeia completa. `supabase start` continua a nascer sem as proteções | Decisão 2 |
| **OPS-12** | LOW | Mesma lacuna única do DBP-07 | P00, secção 3 |
| **FEX-16** | LOW | `PublicContractSigning.tsx:184` e `PublicSurvey.tsx:224` ainda mudam de idioma sem carregar a tradução primeiro | P00, secção 5 |
| **FEX-08** | LOW | O anexo i18n foi aplicado a 100%, mas o `en.json` ainda tem cerca de 150 valores em português fora desse anexo | Anexo i18n na RC13 |
| **FEB-09** | LOW | Seis chaves de `admin.userManagement` em português no `en.json`, no diálogo de suspensão | Anexo i18n na RC13 |
| **FES-12** | LOW | As datas foram corrigidas. A rota `/staff/impact` continua sem nenhuma ligação na aplicação | Decisão 4 |
| **OPS-14** | LOW | `docs/rc5/release-checklist.md:19` ainda manda correr um script que não existe; falta inventário de segredos e interruptores de emergência na lista de arranque | Documentação |
| **DRF-03** | LOW | `supabase/config.toml` não fixa `major_version = 17`. O Lovable trata o ficheiro como configuração gerida | Decisão 2 |
| **SCH-16** | LOW | Os sete buckets não são criados por nenhuma migração. A ferramenta do Lovable recusa SQL sobre `storage.buckets` | Passo manual de restauro |
| **DRF-02** | LOW | `workspace_template_tasks`, `get_kpi_percentiles` e `workspace_readiness_status.status` continuam sem migração | Extrair da produção com o `LOVABLE-RC12-DRIFT-CHECKS.sql` |
| **DRF-04, DRF-06** | LOW | Sem alteração. Só se materializam se alguém correr `supabase db push` contra a base viva | Regra: nunca o fazer |
| **DBP-09** | LOW | A tabela `template_instances_dedup_backup_20260516` continua a existir, com conteúdo de founders | Decisão 5 |

**Duas regressões pequenas**, ambas vindas dos diffs que eu próprio prescrevi na RC12 e não de adaptações do Lovable: a paginação da gestão de utilizadores não recua quando a lista encolhe (FEB-14) e dois cartões de acesso rápido ficaram com a mesma chave React (FES-11). Corrigidas no P00, secção 6.

## 5. O que só a base viva confirma

O Lovable aplicou o SQL pela ferramenta de migrações em `drizzle/migrations` 0019 a 0036 e diz ter corrido três reparações de dados à mão. O snapshot prova as migrações, não prova as reparações. O ficheiro `LOVABLE-RC13-VERIFICACAO-BASE-VIVA.sql` tem as consultas. Corri-as todas contra a réplica para apanhar erros de sintaxe e de colunas; as exceções são o bloco 1, testado com uma tabela de histórico simulada, e o bloco 11, que lê `cron.job_run_details`, tabela que só existe na base real:

- Blocos 1 a 3: as 37 migrações estão registadas, os hashes de 9 funções batem com a réplica, e só `profiles` e `user_roles` estão fora da política de suspensão.
- Bloco 4: contas de staff que não estão aprovadas. É a base da decisão 1.
- Blocos 5 a 8: constraints de URL e linhas antigas que as violam, purga agendada e vigiada, leads contratadas por reparar, notificações com links mortos.
- Blocos 9 a 11: linhas do importador presas, ativações de contrato pendentes há mais de uma hora, e a saúde dos jobs nas últimas 24 horas, que serve de ponto de partida para o dead-man switch da RC13.
- Blocos 12 e 13: a política de suspensão no Storage e o campo do documento Startup Portugal, para ver antes e depois do P00.

Se os hashes do bloco 2 divergirem, envie-me a linha. Os guardas md5 dos patches futuros passam a partir do valor real, como combinado.

## 6. Adaptações do Lovable que conferi

O Lovable declarou várias diferenças face ao que a RC12 prescrevia. Conferi-as; 77 pares têm alguma adaptação declarada. Tirando as omissões já listadas na secção 4, nenhuma muda o comportamento:

- **SQL em `drizzle/migrations` em vez de `supabase/migrations`.** É o mecanismo do projeto. A lógica é idêntica; só a formatação foi compactada. Consequência prática: os hashes de `claim_startup`, `ensure_contract_workspace` e `check_automation_health` não são os que a RC12 previa. Os valores da réplica estão no bloco 2.
- **Chaves estrangeiras para `public.profiles` em vez de `auth.users`** em `integration_errors.resolved_by` e `survey_writebacks.applied_by`. Regra da plataforma; equivalente.
- **Copilot passou a usar o SDK do gateway** em vez de `fetch` direto. Mantém modelo, cancelamento e ausência de repetição automática.
- **Dois endurecimentos além do pedido:** sem segredo HMAC a prova de NDA devolve erro em vez de usar um segredo previsível; sem leitura da prova não inventa data.
- **Testes escritos a partir da descrição** quando o anexo não trazia o conteúdo. Passam e cobrem o descrito, mas são 30 ficheiros a menos do que o Anexo T previa.
- **O que o Lovable não aplicou e declarou:** buckets (SCH-16), `config.toml` (DRF-03), espelho do drizzle (DRF-01).
- **O que o registo afirma e o snapshot contradiz:** diz que a expectativa da purga foi inserida (linha 52) e, mais abaixo, que a purga não tem expectativa (linha 119). Diz que o `i18n:lint` passa com zero problemas; no snapshot falha. Diz que `LOVABLE-RC12-DADOS-AFETADOS.sql` não lhe foi entregue.

## 7. Achados novos, fora da RC12

Apareceram ao validar os HIGH. Entram na RC13.

1. **Uma conta de staff pendente tem os mesmos poderes de uma aprovada.** Na réplica, um admin com `account_status = 'pending'` lê tudo, altera perfis de outros, **aprova-se a si próprio**, dá o papel admin a um founder, retira o papel a um admin ativo, altera contratos e cria convites. Consultor e backoffice pendentes têm os poderes dos respetivos papéis. Não é acidente: `is_account_active()` tem um "staff bypass" explícito, `account_not_suspended` só exclui suspensos, e o cliente faz o mesmo em `ProtectedRoute.tsx:56` (`isAccountPending && !isStaff`). Contradiz a invariante que definiu, de que uma conta pendente não opera. O caminho para lá chegar é banal: `useAddUserRole` (`src/hooks/useAdminData.ts:179`) deixa um admin dar papel de staff a uma conta ainda pendente, sem a aprovar.
2. **As três camadas não concordam sobre pendentes.** A base e o cliente deixam passar staff pendente; as Edge Functions corrigidas na RC12 respondem 403, porque `is_account_active(_user_id)` exige aprovado. Se existir hoje algum staff pendente em produção, vê a aplicação mas falha em tudo o que passa por essas funções. O bloco 4 diz se existe.
3. **Atribuir um utilizador a um workspace faz 4 escritas sem transação** (`src/hooks/useAdminData.ts:221-246`): insere em `workspace_users`, faz upsert em `user_roles` sem ler o erro, aprova a conta e ativa o workspace sem ler erro nem contagem. Viola a regra 3 do projeto. Uma falha a meio deixa papel sem aprovação, que é exatamente o estado do ponto 1.
4. **A página da métrica Norte está escondida.** `/staff/impact` (`src/pages/StaffImpact.tsx`) mostra sessões concluídas, agendadas, canceladas e faltas, horas, startups apoiadas e startups sem contacto há 30 dias, via `get_impact_aggregates`. Só se lá chega escrevendo o endereço. É o candidato mais óbvio a ganho rápido da RC13.
5. **Colunas de URL sem regra na base.** As 7 constraints da RC12 cobrem as colunas onde havia `href` por sanitizar. Ficam sem regra, entre outras, `contract_intakes.website` (escrita por anónimos no formulário público), `startups.website`, `investors.website`, `dataroom_items.url`, `resources.url` e `notifications.link`. Hoje todos os pontos onde são desenhadas passam pelo sanitizador, por isso é defesa em profundidade e não um defeito ativo.
6. **Sessão de conta suspensa continua válida.** Já estava na sua lista da RC13. O P00 tapa as 5 funções e o Storage; a revogação imediata do refresh token é o que fecha a raiz.

## 8. Decisões que são suas

1. **Staff pendente.** Recomendo fechar o bypass: papel de staff só vale com conta aprovada, na base, no cliente e nas funções. É a leitura mais simples da sua invariante e elimina a divergência entre camadas. Pré-condição: o bloco 4 devolver zero pendentes, ou aprovar primeiro quem lá aparecer. O risco de o fazer às cegas é bloquear pessoas reais da equipa. A alternativa é manter o bypass e alinhar as Edge Functions com ele; não a recomendo.
2. **CI.** Os jobs `db-tests` e `e2e` usam `supabase start`, que só conhece `supabase/migrations`. Recomendo aplicar a fixture e `drizzle/migrations/*.sql` logo a seguir ao `supabase start` nesses dois jobs. Não consigo correr um workflow do GitHub aqui, por isso só entrego esse diff se quiser e com a nota de que precisa de uma corrida real para validar. A alternativa de menor esforço é retirar o `supabase test db` desses jobs, porque o `db-pgtap-local` já cobre as 38 suites sobre a cadeia completa.
3. **Notas internas do staff (FEF-04).** Recomendo tirá-las de `workspaces` para uma tabela só de staff, com RLS por `is_staff()`. Revogar a leitura por coluna parte os `select *` do cliente. Mexe em `PrioritySelector`, `useHealthScore`, na RPC de conversão e na ferramenta MCP. É um módulo da RC13.
4. **`/staff/impact`.** Recomendo ligá-la na barra lateral de admin e consultor em vez de retirar a rota. É a página que mede a estrela-guia.
5. **Tabela de backup `template_instances_dedup_backup_20260516`.** Tem conteúdo de founders e já cumpriu a função. Recomendo apagá-la depois de confirmar que ninguém a consulta.

## 9. Limites desta verificação

- Não tenho acesso à base viva nem ao projeto Lovable. Tudo o que digo sobre produção vem do snapshot, do registo do Lovable e da réplica.
- A verificação do cliente e das Edge Functions é estática mais gates. Não exercitei fornecedores externos: Microsoft Graph, DocuSign, PandaDoc, Resend e o gateway de IA.
- O `deno check` e o `deno test` correram com os 4 imports de `deno.land/std` remapeados para o `jsr`, porque este ambiente não chega a `deno.land`. As dependências npm foram instaladas do registo público com os mesmos hashes de integridade do `bun.lock`.
- A execução real de um URL `javascript:` com `target="_blank"` depende do browser e não foi testada. O que provei foi a gravação do valor e o `href` sem sanitização.
- A réplica usa o shim de Supabase do próprio repositório: `auth`, `storage`, `cron` e `net` são simulados. O shim deixa a RLS de `storage.objects` desligada; liguei-a dentro da transação do teste do Storage. Na base real, o bloco 12 confirma que está ligada.
- A meio do trabalho apliquei por engano uma migração de teste na réplica com `COMMIT`. Reconstruí-a de imediato a partir do snapshot e repeti essa prova dentro de uma transação desfeita. Nenhum resultado deste relatório foi obtido com a réplica nesse estado.

## 10. Ficheiros entregues

| Ficheiro | Para quê |
|---|---|
| `LOVABLE-RC13-FECHO-RC12.md` | Este relatório |
| `LOVABLE-RC13-P00-RESIDUOS-RC12.md` | Prompt pronto a colar no Lovable: 7 secções, 12 diffs, 2 migrações |
| `LOVABLE-RC13-VERIFICACAO-BASE-VIVA.sql` | 13 blocos só de leitura para correr na base real |
| `LOVABLE-RC13-FECHO-RC12-EVIDENCIAS.csv` | Uma linha por evidência: achado, parte, estado, ficheiro, linha, excerto, o que falta e adaptação |

## Anexo · Os 215 achados fechados, pela parte que os resolveu

Os HIGH estão a negrito. Um achado tratado em várias partes aparece na primeira. O FEF-03, cuja metade de cliente vinha na Parte 12 mas não entrava na contagem dos 236, também está fechado.

| Parte | N.º | Achados |
|---|---|---|
| P01 | 18 | **DBP-01**, DBP-02, FES-03, FES-08, FEX-01, HRD-05, SCH-01, CRM-13, DBP-03, FEX-09, FEX-10, FEX-11, FEX-13, FEX-14, FEX-15, HRD-11, SCH-13, SCH-15 |
| P02 | 9 | ED1-03, ED4-09, HRD-07, ED3-12, ED3-13, ED3-14, FES-14, FES-15, HRD-15 |
| P03 | 6 | FEB-02, FEB-06, FEB-10, FEB-16, FEX-02, FEX-17 |
| P04 | 8 | FEB-07, FEF-02, FES-05, SCH-06, FEB-13, FEB-14, FEF-07, FEF-09 |
| P05 | 19 | **ED3-01**, E2E-05, ED3-02, ED3-03, ED3-05, FES-04, HRD-06, ONB-01, ONB-04, ONB-05, ONB-06, RV-01, SCH-03, ED2-15, HRD-09, ONB-07, ONB-08, ONB-11, RV-04 |
| P06 | 9 | DBP-05, FEX-03, HRD-01, OPS-01, OPS-02, OPS-04, SCH-02, DBP-06, DBP-08 |
| P07 | 18 | E2E-06, ED2-01, ED2-02, ED2-03, FEX-06, HRD-03, RV-02, SIGN-02, SIGN-03, SIGN-04, E2E-07, ED2-04, FEF-05, FEX-18, FEX-19, ONB-09, ONB-10, RV-07 |
| P08 | 18 | CRM-02, CRM-03, CRM-04, E2E-01, E2E-03, ED4-05, ED4-06, SIGN-01, CRM-05, E2E-08, E2E-09, E2E-10, E2E-11, SIGN-06, SIGN-07, SIGN-08, SIGN-09, SIGN-10 |
| P09 | 12 | CRM-07, ED1-04, ED4-07, ONB-03, SCH-05, CRM-10, CRM-11, ED4-12, ED4-13, ED4-16, HRD-08, SCH-12 |
| P10 | 17 | ED1-02, ED1-05, ED4-01, ED4-02, ED4-03, ED4-04, ED4-08, HRD-04, SCH-04, ED1-06, ED1-07, ED3-11, ED4-14, ED4-15, OPS-09, SCH-17, SIGN-11 |
| P11 | 14 | ED2-05, ED2-06, ED2-07, ED3-04, ED3-06, ED3-07, ED3-08, ED3-09, SCH-08, ED1-11, ED2-08, ED2-09, ED3-10, ED4-10 |
| P12 | 9 | FES-01, FES-02, FES-06, FES-07, FEX-04, SCH-07, FES-10, FES-11, FES-16 |
| P13 | 14 | FEF-01, FEB-08, FEB-11, FEB-12, FEB-15, FEF-08, FEF-10, FES-09, FES-13, FEX-07, FEX-12, OPS-08, OPS-10, RV-06 |
| P14 | 5 | CRM-01, FEB-03, FEB-04, CRM-12, FEB-05 |
| P15 | 7 | DRF-05, RV-03, HRD-14, OPS-05, OPS-15, RV-05, RV-08 |
| OPC01 | 16 | CRM-08, CRM-09, DBP-04, DBP-10, DBP-11, DBP-12, E2E-13, ED1-10, ED2-13, ED2-14, FEF-06, FEF-11, FEX-20, FEX-21, OPS-13, SIGN-12 |
| OPC02 | 15 | CRM-06, ED1-08, ED1-09, ED2-10, ED2-11, ED2-12, ED3-15, ED4-11, HRD-10, HRD-13, OPS-11, SCH-09, SCH-10, SCH-11, SCH-14 |
| OPC03 | 1 | OPS-07 |
