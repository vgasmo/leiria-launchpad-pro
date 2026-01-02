-- =====================================================
-- PLAYBOOKS POR FASE + PESQUISA GLOBAL + TAGGING
-- =====================================================

-- =====================================================
-- PARTE 1: PLAYBOOKS
-- =====================================================

-- 1.1 playbooks (biblioteca de playbooks por stage)
CREATE TABLE public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  stage public.startup_stage NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 playbook_items (milestones e actions template)
CREATE TABLE public.playbook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('milestone', 'action')),
  title TEXT NOT NULL,
  description TEXT,
  relative_due_days INTEGER,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  order_index INTEGER NOT NULL DEFAULT 0,
  default_owner_role TEXT CHECK (default_owner_role IN ('founder', 'mentor', 'staff')),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 workspace_playbook_instances (instâncias de playbook por workspace)
CREATE TABLE public.workspace_playbook_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  playbook_id UUID NOT NULL REFERENCES public.playbooks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'instantiated', 'dismissed')),
  instantiated_by UUID,
  instantiated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, playbook_id)
);

-- 1.4 workspace_playbook_links (links entre instância e milestones/actions criados)
CREATE TABLE public.workspace_playbook_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_playbook_instance_id UUID NOT NULL REFERENCES public.workspace_playbook_instances(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  action_item_id UUID REFERENCES public.action_items(id) ON DELETE SET NULL,
  playbook_item_id UUID REFERENCES public.playbook_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes para playbooks
CREATE INDEX idx_playbooks_program_stage ON public.playbooks(program_id, stage);
CREATE INDEX idx_playbooks_stage ON public.playbooks(stage);
CREATE INDEX idx_playbook_items_playbook ON public.playbook_items(playbook_id);
CREATE INDEX idx_playbook_items_order ON public.playbook_items(playbook_id, order_index);
CREATE INDEX idx_workspace_playbook_instances_workspace ON public.workspace_playbook_instances(workspace_id);
CREATE INDEX idx_workspace_playbook_links_instance ON public.workspace_playbook_links(workspace_playbook_instance_id);

-- RLS para playbooks
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_playbook_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_playbook_links ENABLE ROW LEVEL SECURITY;

-- Playbooks: admin/staff podem gerir, todos podem ver activos
CREATE POLICY "Anyone can view active playbooks"
  ON public.playbooks FOR SELECT
  USING (is_active = true OR public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

CREATE POLICY "Admin and consultors can manage playbooks"
  ON public.playbooks FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

-- Playbook items: seguem o parent
CREATE POLICY "Anyone can view playbook items of active playbooks"
  ON public.playbook_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.playbooks p 
    WHERE p.id = playbook_items.playbook_id 
    AND (p.is_active = true OR public.is_admin())
  ));

CREATE POLICY "Admin and consultors can manage playbook items"
  ON public.playbook_items FOR ALL
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'consultor'
  ));

-- Workspace playbook instances: por workspace
CREATE POLICY "Users can view instances for their workspaces"
  ON public.workspace_playbook_instances FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can manage instances"
  ON public.workspace_playbook_instances FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- Workspace playbook links: por instance → workspace
CREATE POLICY "Users can view links for their workspaces"
  ON public.workspace_playbook_links FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workspace_playbook_instances wpi
    WHERE wpi.id = workspace_playbook_links.workspace_playbook_instance_id
    AND public.has_workspace_access(wpi.workspace_id)
  ));

CREATE POLICY "Users with write access can manage links"
  ON public.workspace_playbook_links FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workspace_playbook_instances wpi
    WHERE wpi.id = workspace_playbook_links.workspace_playbook_instance_id
    AND public.can_write_workspace(wpi.workspace_id)
  ));

-- Triggers
CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PARTE 2: TAGS
-- =====================================================

-- 2.1 tags (biblioteca global)
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- 2.2 workspace_tags (tags por workspace)
CREATE TABLE public.workspace_tags (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, tag_id)
);

-- 2.3 session_tags (tags por sessão)
CREATE TABLE public.session_tags (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, tag_id)
);

-- 2.4 action_tags (tags por action item)
CREATE TABLE public.action_tags (
  action_id UUID NOT NULL REFERENCES public.action_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, tag_id)
);

-- Indexes para tags
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_workspace_tags_workspace ON public.workspace_tags(workspace_id);
CREATE INDEX idx_workspace_tags_tag ON public.workspace_tags(tag_id);
CREATE INDEX idx_session_tags_session ON public.session_tags(session_id);
CREATE INDEX idx_session_tags_tag ON public.session_tags(tag_id);
CREATE INDEX idx_action_tags_action ON public.action_tags(action_id);
CREATE INDEX idx_action_tags_tag ON public.action_tags(tag_id);

-- RLS para tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_tags ENABLE ROW LEVEL SECURITY;

-- Tags: todos podem ver e criar
CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace tags: por workspace
CREATE POLICY "Users can view workspace tags for their workspaces"
  ON public.workspace_tags FOR SELECT
  USING (public.has_workspace_access(workspace_id));

CREATE POLICY "Users with write access can manage workspace tags"
  ON public.workspace_tags FOR ALL
  USING (public.can_write_workspace(workspace_id));

-- Session tags: via session → workspace
CREATE POLICY "Users can view session tags for their sessions"
  ON public.session_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tags.session_id
    AND public.has_workspace_access(s.workspace_id)
  ));

CREATE POLICY "Users with write access can manage session tags"
  ON public.session_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tags.session_id
    AND public.can_write_workspace(s.workspace_id)
  ));

-- Action tags: via action → workspace
CREATE POLICY "Users can view action tags for their actions"
  ON public.action_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.action_items a
    WHERE a.id = action_tags.action_id
    AND public.has_workspace_access(a.workspace_id)
  ));

CREATE POLICY "Users with write access can manage action tags"
  ON public.action_tags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.action_items a
    WHERE a.id = action_tags.action_id
    AND public.can_write_workspace(a.workspace_id)
  ));

-- =====================================================
-- PARTE 3: FULL-TEXT SEARCH (GIN indexes)
-- =====================================================

-- Add tsvector columns for FTS
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(notes, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(agenda, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(decisions, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(ai_summary, '')), 'D')
  ) STORED;

ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
  ) STORED;

ALTER TABLE public.consultant_notes ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(content, ''))
  ) STORED;

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
  ) STORED;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(content, ''))
  ) STORED;

ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
  ) STORED;

-- GIN indexes for FTS
CREATE INDEX IF NOT EXISTS idx_sessions_search ON public.sessions USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_action_items_search ON public.action_items USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_consultant_notes_search ON public.consultant_notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_search ON public.documents USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_messages_search ON public.messages USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_milestones_search ON public.milestones USING GIN(search_vector);

-- =====================================================
-- PARTE 4: UPDATE saved_filters para suportar search
-- =====================================================

-- saved_filters já existe, só garantir que filters pode guardar query_text
-- A estrutura JSONB já suporta campos adicionais

-- =====================================================
-- PARTE 5: SEED playbooks de exemplo
-- =====================================================

-- Inserir playbooks de exemplo para cada stage
INSERT INTO public.playbooks (stage, title, description, is_active) VALUES
  ('ideation', 'Ideation Kickstart', 'Validar problema e definir proposta de valor inicial', true),
  ('validation', 'Customer Validation Sprint', 'Validar hipóteses com clientes reais', true),
  ('mvp', 'MVP Launch Checklist', 'Construir e lançar MVP funcional', true),
  ('growth', 'Growth Engine Setup', 'Escalar aquisição e retenção', true),
  ('scale', 'Scale Operations', 'Otimizar operações para escala', true)
ON CONFLICT DO NOTHING;

-- Inserir items para o playbook de Ideation
INSERT INTO public.playbook_items (playbook_id, item_type, title, description, relative_due_days, priority, order_index, metadata_json)
SELECT 
  p.id,
  items.item_type,
  items.title,
  items.description,
  items.relative_due_days,
  items.priority,
  items.order_index,
  items.metadata_json::jsonb
FROM public.playbooks p
CROSS JOIN (VALUES
  ('milestone', 'Definir Problema', 'Identificar e documentar o problema a resolver', NULL, NULL, 1, '{"ref":"M1"}'),
  ('action', 'Conduzir 5 entrevistas exploratórias', 'Entrevistar potenciais clientes para validar problema', 7, 'high', 2, '{"milestone_ref":"M1"}'),
  ('action', 'Documentar painpoints principais', 'Sintetizar feedback das entrevistas', 10, 'high', 3, '{"milestone_ref":"M1"}'),
  ('milestone', 'Definir Proposta de Valor', 'Criar primeira versão do value proposition canvas', NULL, NULL, 4, '{"ref":"M2"}'),
  ('action', 'Criar Value Proposition Canvas', 'Preencher canvas com hipóteses', 14, 'medium', 5, '{"milestone_ref":"M2"}'),
  ('action', 'Validar proposta com 3 clientes', 'Apresentar proposta e recolher feedback', 21, 'high', 6, '{"milestone_ref":"M2"}')
) AS items(item_type, title, description, relative_due_days, priority, order_index, metadata_json)
WHERE p.stage = 'ideation'
ON CONFLICT DO NOTHING;

-- Inserir items para o playbook de Validation
INSERT INTO public.playbook_items (playbook_id, item_type, title, description, relative_due_days, priority, order_index, metadata_json)
SELECT 
  p.id,
  items.item_type,
  items.title,
  items.description,
  items.relative_due_days,
  items.priority,
  items.order_index,
  items.metadata_json::jsonb
FROM public.playbooks p
CROSS JOIN (VALUES
  ('milestone', 'Hipóteses Validadas', 'Validar hipóteses críticas do negócio', NULL, NULL, 1, '{"ref":"M1"}'),
  ('action', 'Definir 3 hipóteses críticas', 'Identificar hipóteses que têm de ser verdade', 3, 'urgent', 2, '{"milestone_ref":"M1"}'),
  ('action', 'Criar experimentos de validação', 'Desenhar testes para cada hipótese', 7, 'high', 3, '{"milestone_ref":"M1"}'),
  ('action', 'Executar experimentos', 'Correr testes e recolher dados', 14, 'high', 4, '{"milestone_ref":"M1"}'),
  ('milestone', 'Early Adopters Identificados', 'Identificar primeiros clientes pagantes', NULL, NULL, 5, '{"ref":"M2"}'),
  ('action', 'Criar lista de 20 potenciais early adopters', 'Identificar e contactar early adopters', 10, 'high', 6, '{"milestone_ref":"M2"}'),
  ('action', 'Converter 3 early adopters', 'Fechar primeiras vendas/compromissos', 21, 'urgent', 7, '{"milestone_ref":"M2"}')
) AS items(item_type, title, description, relative_due_days, priority, order_index, metadata_json)
WHERE p.stage = 'validation'
ON CONFLICT DO NOTHING;

-- Inserir items para o playbook de MVP
INSERT INTO public.playbook_items (playbook_id, item_type, title, description, relative_due_days, priority, order_index, metadata_json)
SELECT 
  p.id,
  items.item_type,
  items.title,
  items.description,
  items.relative_due_days,
  items.priority,
  items.order_index,
  items.metadata_json::jsonb
FROM public.playbooks p
CROSS JOIN (VALUES
  ('milestone', 'MVP Definido', 'Definir scope mínimo do MVP', NULL, NULL, 1, '{"ref":"M1"}'),
  ('action', 'Priorizar features (MoSCoW)', 'Classificar features por prioridade', 5, 'urgent', 2, '{"milestone_ref":"M1"}'),
  ('action', 'Criar roadmap MVP', 'Planear desenvolvimento do MVP', 7, 'high', 3, '{"milestone_ref":"M1"}'),
  ('milestone', 'MVP Desenvolvido', 'Construir MVP funcional', NULL, NULL, 4, '{"ref":"M2"}'),
  ('action', 'Sprint 1: Core features', 'Desenvolver funcionalidades essenciais', 14, 'urgent', 5, '{"milestone_ref":"M2"}'),
  ('action', 'Sprint 2: Polish & Deploy', 'Refinar e fazer deploy', 21, 'high', 6, '{"milestone_ref":"M2"}'),
  ('milestone', 'MVP Lançado', 'Lançar MVP para early adopters', NULL, NULL, 7, '{"ref":"M3"}'),
  ('action', 'Preparar onboarding', 'Criar materiais de onboarding', 25, 'medium', 8, '{"milestone_ref":"M3"}'),
  ('action', 'Lançar para 10 early adopters', 'Convidar early adopters para testar', 28, 'urgent', 9, '{"milestone_ref":"M3"}'),
  ('action', 'Recolher feedback inicial', 'Entrevistar primeiros utilizadores', 35, 'high', 10, '{"milestone_ref":"M3"}')
) AS items(item_type, title, description, relative_due_days, priority, order_index, metadata_json)
WHERE p.stage = 'mvp'
ON CONFLICT DO NOTHING;