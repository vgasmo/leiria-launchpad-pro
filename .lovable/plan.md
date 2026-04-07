## Fluxo: Atribuição de Workspace pelo Admin + Onboarding Wizard

### 1. UI no Admin - Aprovação de Conta com Sugestão de Workspace
- Na lista de "Pending Approvals" (ativação de contas), ao aprovar um founder:
  - Sistema deteta o domínio do email (ex: `@acme.pt`)
  - Procura startups existentes com `main_contact_email` do mesmo domínio ou match direto
  - Mostra sugestão com botão "Associar" ou opção "Criar novo workspace"
  - Se admin escolhe associar → liga o founder ao workspace existente
  - Se admin escolhe criar → cria startup + workspace com dados mínimos (nome da empresa sugerido pelo domínio)

### 2. Backend - Novo RPC ou extensão do existente
- Criar/estender RPC `staff_assign_workspace_to_user` que:
  - Associa founder a workspace existente OU cria novo
  - Marca workspace com flag `needs_onboarding: true` (novo campo)
  - Garante `user_roles` com `founder`
  - Ativa a conta (`account_status: approved`)

### 3. Migration - Adicionar campo `needs_onboarding` ao workspaces
- `ALTER TABLE workspaces ADD COLUMN needs_onboarding boolean DEFAULT true`
- Workspaces criados por admin ficam com `needs_onboarding = true`
- Quando founder completa wizard, atualiza para `false`

### 4. Frontend - Onboarding Wizard Gate
- Quando founder faz login e tem workspace com `needs_onboarding = true`:
  - Redireciona para onboarding wizard completo (NDA, dados empresa, programa)
  - Wizard pré-carrega dados existentes mas founder preenche tudo
  - Ao completar → `needs_onboarding = false`, workspace fica `active`

### 5. Componente de Sugestão no Admin
- `WorkspaceAssignmentDialog` com:
  - Lista de startups sugeridas (match por domínio de email)
  - Campo de pesquisa para busca manual
  - Botão "Criar nova startup" com nome pré-preenchido
  - Confirmação antes de executar

### Ordem de implementação:
1. Migration (campo `needs_onboarding`)
2. RPC backend
3. UI do admin (dialog de sugestão)
4. Gate no onboarding do founder
