# Regression Checklist — Startup Leiria Ecosystem OS (Release Candidate)

## Per-Profile Journeys

### Founder
- [ ] Login → Dashboard com "Próxima melhor ação" visível
- [ ] Sidebar: "A Minha Startup" expande com sub-itens (Objetivos, Sessões, Ações)
- [ ] Criar startup via formulário → candidatura pendente
- [ ] Workspace aprovado → aceder Objetivos & KPIs, atualizar valores
- [ ] Sessões & Mentoria → criar sessão, gerar resumo IA, criar ações
- [ ] Ações & Plano → criar ação, marcar como concluída
- [ ] Documentos → carregar ficheiro, adicionar link, ver templates
- [ ] Playbooks → aplicar playbook, descartar playbook (sem erro RLS)
- [ ] Rede & Recursos → pesquisar, ver recomendações
- [ ] Glossário & FAQ → pesquisar perguntas, ver glossário
- [ ] Pedir mentor → pedido visível e rastreável
- [ ] Dataroom → adicionar item, criar link de partilha

### Mentor Externo
- [ ] Login → NDA gate se necessário
- [ ] Dashboard com startups atribuídas
- [ ] Ver detalhes da startup (KPIs, ações, última sessão)
- [ ] Agenda e pedidos de mentoria
- [ ] Preparação de sessão + notas
- [ ] Sem itens de CRM/Admin visíveis no menu

### Consultor Interno
- [ ] Login → Portefólio com alertas/risco
- [ ] CRM Pipeline → clicar lead → drawer abre como overlay (sem empurrar conteúdo)
- [ ] CRM → criar lead, mover entre stages
- [ ] Sessões → agendar, preparar, registar notas
- [ ] Ações & Follow-ups → ver ações atrasadas
- [ ] Documentos (repositório global) → pesquisar, filtrar
- [ ] Programas → configurar, gerir coortes
- [ ] Relatórios → visualizar analytics
- [ ] Templates e playbooks → aplicar a workspace

### Administrativo
- [ ] Login → Admin dashboard
- [ ] Utilizadores & Permissões → aprovar conta, atribuir roles
- [ ] Programas & Coortes → criar programa, configurar módulos
- [ ] Configuração do Sistema → integrações, feature flags
- [ ] Contratos / Lifecycle Hub → ver alertas, converter leads
- [ ] Datarooms → gerir partilhas
- [ ] Importação de dados → funcional

## Per-Module Checks

### CRM Pipeline
- [ ] Board view renderiza corretamente
- [ ] Drawer abre como Sheet overlay (não empurra layout)
- [ ] Tabs (Overview, Timeline, Tasks) funcionam
- [ ] Empty states com mensagem clara
- [ ] Stages traduzidas PT-PT

### Workspaces / Startups
- [ ] Imagem de startup carrega corretamente
- [ ] Tabs da workspace não duplicam menu lateral
- [ ] Workspace bloqueado mostra mensagem adequada
- [ ] Workspace pendente restringe acesso

### Programas / Coortes
- [ ] Criar programa com wizard
- [ ] Clonar programa existente
- [ ] Atribuir startups a coortes

### Documentos & Templates
- [ ] Repositório com 2 tabs (Documentos, Templates)
- [ ] Pesquisa e filtro por categoria funcionam
- [ ] Datas formatadas no locale correto (PT)
- [ ] Upload funcional, download funcional
- [ ] Links externos abrem em nova tab

### Sessões & Mentoria
- [ ] Criar sessão com data/hora
- [ ] Enviar convite (email/ICS)
- [ ] Notas e decisões editáveis
- [ ] Análise IA gera resumo e ações
- [ ] Link Teams/Meet quando disponível

### KPIs & Objetivos
- [ ] Definir KPIs para workspace
- [ ] Atualizar valores mensais
- [ ] Visualizar gráficos de tendência
- [ ] Benchmarks / percentis visíveis

### Playbooks
- [ ] Aplicar playbook → cria marcos e ações
- [ ] Descartar playbook → sem erro RLS
- [ ] Playbook descartado não reaparece

### Dataroom
- [ ] Criar dataroom para workspace
- [ ] Adicionar itens (docs, updates, links)
- [ ] Criar link de partilha com expiração
- [ ] Revogar link funcional

### Integrações (Teams/Outlook)
- [ ] UI "Conectar" clara + estado
- [ ] Fallback útil quando não ligado (exportar ICS)
- [ ] Sync Outlook funcional se configurado

### IA
- [ ] Resumo de sessão gera sem erro
- [ ] Coach de template funcional
- [ ] Rate limiting funciona
- [ ] Erros de IA mostram mensagem clara

### Localização (i18n)
- [ ] Zero strings EN visíveis em modo PT
- [ ] Datas formatadas em PT (date-fns locale)
- [ ] Categorias de documentos traduzidas
- [ ] Stages do CRM traduzidas

### Segurança
- [ ] Sem service role no frontend
- [ ] Edge functions falham de forma clara se env vars faltarem
- [ ] RLS suporta todas as operações (playbooks dismiss, docs upload, etc.)
- [ ] Workspace pendente não acede a tabelas sensíveis
- [ ] Public booking com token inválido retorna erro seguro

## Build Acceptance
- [ ] `npm run build` PASS
- [ ] `npm run lint` PASS
- [ ] `npm run typecheck` PASS
- [ ] Zero erros na consola nas rotas principais
- [ ] Sem mistura de idiomas no UI (PT-PT first)
- [ ] Empty states sempre com explicação + CTA

## GO / NO-GO

| Área | Estado | Notas |
|------|--------|-------|
| Build & Types | ⬜ | |
| i18n Parity | ⬜ | |
| Segurança / RLS | ⬜ | |
| CRM | ⬜ | |
| Documentos | ⬜ | |
| Playbooks | ⬜ | |
| Sessões | ⬜ | |
| Integrações | ⬜ | |
| Empty States | ⬜ | |

**Decisão**: ⬜ GO / ⬜ NO-GO  
**Data**: _______________
