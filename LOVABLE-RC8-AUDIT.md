# Startup Leiria Ecosystem OS — Auditoria RC8

**Export auditado:** `remix-of-startup-companion-main (1).zip`, Lovable, 2026-09-07 09:06 (md5 `bb74e90f573e2e52c5f9c6b13c76bb86`).
**Inventário:** 467 migrações (+6 desde o RC7: `20260902135738`, `20260902141353`, `20260903135424`, `20260904101216`, `20260904101253`, `20260907085050`), 105 edge functions (=), 13 suites pgTAP (0 novas).
**Base de comparação:** RC7 = export de 2026-08-31 (461 migrações / 105 funções). O checkout git `vgasmo/leiria-launchpad-pro` continua parado em 27/abr (226 migrações) e não foi usado.

## Veredito: **NO-GO**

1. Os dois P0 de segurança do RC7 continuam abertos e foram **provados** numa base replayada: `serialize_program_tree` executável por `anon`; FK simples em `action_items.milestone_id` (corrupção cross-tenant de marcos via trigger SECURITY DEFINER).
2. Três bugs novos de acesso/onboarding de alcance geral: o `authError` do P0.3 não é consumido (mesma degradação silenciosa de antes); re-login do mesmo utilizador após expirar a sessão deixa um spinner infinito; founder sem correspondência automática fica preso em "A verificar…" porque o cliente espera estados que o RPC nunca devolve.
3. Taxa de aplicação do RC7: **14 de 38 itens** (RC6→RC7 tinha sido 22/23). Duas funcionalidades continuam mortas à chegada (anonimização RGPD do pulse; fecho de lotes CRM — ambas provadas com a mensagem de erro real), e o `main` do GitHub falha 6 de 11 gates de CI em todas as corridas desde 2/set.

## Método

- Snapshot read-only em scratchpad; `diff -qr` não foi possível (o export anterior não estava disponível no container) → delta isolado por prefixo de migração (`≥ 20260902`) e por anotações `P0.x–P3.x` no código (13 ficheiros tocados pelo vendor para o RC7).
- **Harness do vendor executado localmente** (`scripts/rc5/local-pg-harness.sh`, PostgreSQL 18.4 embutido + pgTAP 1.3.3 puro-SQL): replay das 467 migrações com 3 falhas = artefactos conhecidos do harness (`20260103024619` investor_readiness_items, `20260115005921` investor_update_templates, `20260404150656` realtime.messages — listados no evidence-ledger); as 6 migrações novas aplicam limpas; **13 suites pgTAP / 168 asserções / 0 falhas**. A base replayada foi depois usada para provar cada achado SQL (privilégios, constraints, chamadas de RPC com JWT simulado, watchdog, kill-switch).
- Gates de CI reproduzidos localmente: `migration-scan` (falha), `i18n-sync-guard` (só reordenação), `env-leak-guard` (`.env` presente), `i18n-check` (passa). `deno-check-edge`, `db-tests`, `e2e` não reproduzíveis (esm.sh/deno.land bloqueados pelo proxy; sem docker).
- 4 agentes (lentes A delta+surveys, B fluxos frontend+i18n, C edge+cron+MCP, D acesso+RLS) foram mortos pelo limite de sessão a meio; os relatórios parciais foram lidos e **cada HIGH foi cite-checkado pelo lead** no código antes de entrar aqui. Lentes parcialmente cobertas: B (fluxos c/d), C (funções fora do config, RPCs inexistentes, gateway IA), D (§3 revisão adversarial do bundle 0902 — feita pelo lead, §5 backoffice vs is_staff, §6 SECURITY DEFINER ≥ 07/20 — parcialmente coberto pela listagem de privilégios abaixo).

## Verify-pass do RC7 (resumo; tabela completa no fim de `LOVABLE-RC8-FIXES.md`)

Aplicados (14): P0.3 (parcial), P1.1, P1.2, P1.3-SQL (inútil, ver abaixo), P2.3, P2.4, P3.8 (6/6 Resend), buildings policy, `open_monthly_founder_pulse_cycles` archived_at, MCP ToolError + search-before-limit, `bulkImport.upload.uploading`, MomentumBadge, higiene do config, `'consultant'` = zero.
Não aplicados (24): P0.1, P0.2 (BD), P1.3 (edge), P2.1, P2.2, P3.1, P3.2 (parcial), P3.3, P3.4, P3.5, P3.6, P3.7, e em P3.9: contract-pdf `active`, `p_founder_link`, SessionsTab/CreateSessionDialog, deep-links, cronRun, watchdog, placeholders i18n, FounderPulseCard, MCP rate-limit, pgTAP por RPC.

## Provas empíricas (base replayada)

| Achado | Prova |
|---|---|
| P0.1 | `has_function_privilege('anon','public.serialize_program_tree(uuid)','EXECUTE') = true`; `publish_program_atomic` = false |
| P0.2 | `pg_constraint` em `action_items`: só `action_items_milestone_id_fkey (milestone_id)→milestones(id)`; `milestones` só PK |
| P2.1 | `SELECT anonymize_stale_founder_pulse_responses()` → `ERROR: column "metadata" does not exist` |
| P2.2 | com claims JWT de admin: `SELECT finalize_crm_import_batch(uuid)` → `ERROR: column "status" does not exist` |
| Watchdog | expectation 604800 s + run OK há 3 dias → `cron_stale` com `never_run=true` |
| Kill-switch | `notifications.founders_disabled=true` → `INSERT … RETURNING id` para founder devolve 0 linhas |
| P3.1 | índice `uniq_funnel_items_link_email_slot_utc` vivo sobre `metadata_json->>link_id/submitter_email_normalized/booking_slot_utc` |
| P2.10 | duas overloads de `list_ecosystem_items_v2` (13 e 16 args) |
| P2.9 | `pg_policies`: todas as escritas em `survey_*` = `is_admin()`; SELECT staff = `is_staff()` |
| Programs | policies SELECT: `is_active OR is_admin()` e `is_staff() OR has_program_access(id)` |
| Privilégios | 32 funções SECURITY DEFINER executáveis por `anon`; fora helpers/trigger functions: `serialize_program_tree` (P0.1), `founder_notifications_blocked` (oráculo), `approve_user_account` (corpo verifica admin — OK), `check_signup_allowed`, `get_canonical_booking_url`, `resolve_canonical_booking_token` (públicas por desenho) |

## Achados novos desta ronda

| # | Sev. | Onde | Efeito |
|---|---|---|---|
| N1 | HIGH | `src/contexts/AuthContext.tsx:63-90,121-126,150-153`; `src/App.tsx:74-81` | `authError` sem consumidores → após 3 tentativas falhadas `roles=[]` e `isAuthReady=true`: staff redirecionado sem menus, founder sem gate, sem retry |
| N2 | HIGH | `AuthContext.tsx:157,167-171,182-184,240-245`; `Login.tsx:63-76` | re-login do mesmo utilizador após `SIGNED_OUT` sem reload → `isAuthReady=false` para sempre (spinner) |
| N3 | HIGH | `src/pages/ClaimStartup.tsx:82-107` vs `20260710230740:41,53,81,110,125` | cliente espera `already_claimed`/`pending`; RPC devolve `already_member`/`pending_review` → spinner "A verificar…" no caminho normal |
| N4 | HIGH/MED | `_shared/security.ts:220-252`; `send-notification-email/index.ts:225-245`; `send-slack-notification/index.ts:31` | Bearer service_role não passa nos guards (sem `sub`); push Slack morto sempre; restantes cadeias edge→edge dependem de `CRON_SECRET` |
| N5 | MED | `20260902141353:224-230` | alerta `reconciler_invariant_failed` inserido e revertido pelo `RAISE` seguinte — nunca persiste |
| N6 | MED | `20260904101216:30-31`, `20260727120545:60-70`, `useNotifications.ts:219-225` | kill-switch descarta linhas em silêncio → attempts órfãos / PGRST116 quando ligado |
| N7 | MED | `src/App.tsx:113-118`; `useFounderOnboardingState.ts:148-151`; `ClaimStartup.tsx:39` | estado `error` do onboarding não excluído → founder com workspace vai parar a `/claim-startup` numa falha de rede |
| N8 | MED | `src/pages/Admin.tsx:53-63`; policies `survey_*` | separador Inquéritos visível a consultor/backoffice; todas as escritas exigem admin (42501 / separador vazio) |
| N9 | MED | `src/hooks/useSurveys.ts:296-372` | lançamento ignora o RPC `launch_survey_campaign` (sem snapshot, não atómico, 23505 ao relançar) |
| N10 | MED | `20260902135738` | overload de 13 args viva (PGRST203 para chamadores parciais); filtro com estados inexistentes |
| N11 | MED | `src/components/staff/CockpitQuickActions.tsx:85-100,119-134` | sessão/ação rápida sem invalidações do separador, sem Outlook, sem notificação |
| N12 | MED | `src/i18n/locales/pt.json` (≥ 6 verificados, ~28 reportados) | valores em inglês em toasts/estados vazios da UI PT; gate de paridade não deteta idioma |
| N13 | LOW | `20260907085050:34` | `founder_notifications_blocked(uuid)` executável por anon (oráculo de papel) |
| N14 | LOW | `sweep-session-transcripts/index.ts:24,39-53` | duas linhas em `cron_job_runs` por corrida |
| N15 | LOW | `20260903135424` | seed com UUID fixo → `migration-scan` vermelho; allowlist "baseline-frozen" |
| N16 | LOW | `WorkQueueBulkActions.tsx:78` vs `pt.json:10026` | `{{ok}}`/`{{failed}}` literais |

## Verificado e OK

- **Cron:** 17 jobs edge + 4 RPC (`20260811141628`, `20260811141827`); todos os alvos com `verify_jwt=false` em `config.toml`; todos os handlers aceitam `x-cron-token`; nenhuma expectation órfã. Sem entradas órfãs no config; todas as entradas têm pasta.
- **Policies com `has_workspace_access(workspace_id, auth.uid())`** (argumentos trocados): todas substituídas por versões com o overload de 1 argumento (`20260630114309`, `20260714075259`, `20260719145244`, `20260812091124`); nenhuma viva.
- **Resend:** os 6 remetentes destruturam `{ error }`.
- **Bundle RC7 (`20260902141353`):** `save_financial_scenario_atomic` mantém assinatura (8 args, sem overload); `publish_program_atomic` mantém `RETURNS uuid` e grants; `open_monthly_founder_pulse_cycles` correto; buildings `USING(true)` (mais lato que pedido, dados não sensíveis).
- **Surveys (`20260903135424`):** `survey_instances` tem `UNIQUE(campaign_id, workspace_id)` (o `ON CONFLICT` do trigger é válido); ids de `kpi_definitions` d479/d480/d481/d482/d487 existem no seed inicial; CHECK antigo de `kpi_values.source_type` ⊆ novo; colunas `startups.founded_date/description/website/main_contact_*` existem; `apply-survey-responses` valida `has_workspace_access` com argumentos nomeados e está no config.
- **`startup_contracts.status`** é `text` com CHECK vivo (draft, pending_signature, active, suspended, terminated, expired); `'signed'` só é escrito em `contract_intakes`.
- `approve_user_account` verifica admin no corpo; `has_program_access` dá acesso aos founders dos programas dos seus workspaces.
- `'consultant'` como role: zero. `staff_work_queue_items.status = 'pending'`, `startup_stage = 'product_development'`, `action_status = 'todo'`: não encontrados nas migrações novas.
- i18n: paridade PT/EN 9053 chaves (gate do vendor passa); famílias `inbox.tab.*`, `story.kind.*`, `privateDocs.source.*` já não são usadas; `contracts.risk.*` e `oauthConsent.*` presentes.

## CI em `main` (`vgasmo/remix-of-startup-companion`)

| Job | Estado | Causa | Reproduzido |
|---|---|---|---|
| lint-and-build, test, i18n-check, i18n-lint, secret-scan | verde | — | i18n-check sim |
| env-leak-guard | vermelho | `.env` no export (3 `VITE_*` públicas; Lovable regrava-o) | sim |
| migration-scan | vermelho | `20260903135424` seed UUID fixo | sim |
| i18n-sync-guard | vermelho | catálogos por ordenar (0 chaves alteradas) | sim |
| deno-check-edge | vermelho | desconhecida (passava localmente em 02/set em `docs/rc5/results.md`; `apply-survey-responses` é posterior) | não (rede) |
| db-tests | vermelho | replay + pgTAP verdes localmente → provavelmente `supabase db lint` (P2.1/P2.2) | parcial |
| e2e | vermelho | desconhecida (`E2E_VERIFICATION_BLOCKER.md` admite que nunca correu) | não |

## Processo do vendor

- O harness e o pgTAP existem e funcionam — mas nenhuma RPC de julho/agosto/setembro ganhou suite (pedido no RC7). É por isso que o replay passa e o runtime rebenta (P2.1, P2.2 provados).
- `docs/rc5/evidence-ledger.md` termina em 2026-08-06; a ronda RC7 não foi registada. `docs/rc5/results.md` (02/set) marca `rc5:verify` local verde e "overall fail" por falta de gates de staging. `PUBLISH_READY.md`/`PRODUCTION_READINESS.md` continuam a dizer "READY" contra o NO-GO do ledger.
- Anotações `P0.x`/`P3.x` no código mostram que o vendor leu o RC7 e aplicou seletivamente; não há lista do que ficou por fazer.

## Decisões / ações do utilizador

1. **GitHub:** o push desta sessão falhou (403). Instalar a app GitHub do Claude para `vgasmo/leiria-launchpad-pro` **e** `vgasmo/remix-of-startup-companion` (https://github.com/apps/claude/installations/select_target). Com o repo remix acessível, as próximas rondas usam histórico real de commits em vez de ZIP (elimina o problema dos mtimes e dá o delta exato).
2. **Lovable antigo:** arquivar o projeto original para não haver dois históricos de migrações a empurrar para `apxzuslwhjujgrcsfzqw`.
3. **`CRON_SECRET`:** confirmar no dashboard das edge functions que está definido (as cadeias função→função dependem dele até ao fix N4).
4. **MCP:** decisão pendente sobre expor `contact_email` do CRM a assistentes externos; até lá, remover a coluna do `select`.
5. **`.env`:** `git rm --cached .env` uma vez, localmente, conforme `RELEASE_WRAPPER_MANUAL_STEPS.md`.

## Próxima ronda (o que confirmar)

P0.1/P0.2 na base de produção (queries em "Verificação final" do prompt); N1–N3 com testes manuais; contagem de `cron_stale` a cair; `db-tests` verde ou o log; ≥ 18 suites pgTAP; ledger atualizado; e o delta novo com as mesmas lentes (fluxos c/d de B, itens 2–8 de C e §5–6 de D ficaram por cobrir nesta ronda).
