## Plano de implementação — 4 Features

### 1. Chat Direto (Founder ↔ Consultor/Mentor)
- Já temos tabelas `conversations` e `conversation_participants` 
- Criar componente de messaging inline no workspace
- Realtime via Supabase channels (scoped ao workspace)
- UI: sidebar de chat ou drawer no workspace

### 2. Playbook Evidence Upload
- Adicionar tabela `playbook_step_evidence` (step_id, file_path, notes, submitted_by)
- Storage bucket para evidências
- UI: botão "Submeter Evidência" em cada step do playbook
- Consultor pode aprovar/rejeitar

### 3. Benchmark Dashboard
- Criar view agregada anónima por programa/fase
- Métricas: KPIs médios, milestones concluídos, tempo por fase
- UI: dashboard comparativo no workspace do founder
- Dados 100% anonimizados

### 4. Twilio/WhatsApp Reminders
- Conectar Twilio connector
- Edge function para enviar lembretes (sessões, check-ins, deadlines)
- Configuração por workspace (opt-in do founder)
- Templates de mensagem em PT/EN

### Ordem de implementação
1. Chat Direto (usa infra existente)
2. Playbook Evidence Upload (migration + storage + UI)
3. Benchmark Dashboard (view + UI)
4. Twilio/WhatsApp (connector + edge function)
