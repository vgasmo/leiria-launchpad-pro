// Default playbooks data for all startup stages
// Used to seed the database with initial playbooks when a program is created
// All titles and descriptions in Portuguese (PT-PT)

export interface PlaybookSeed {
  stage: 'ideation' | 'validation' | 'mvp' | 'traction' | 'growth' | 'scale';
  title: string;
  description: string;
  is_active: boolean;
  items: {
    item_type: 'milestone' | 'action';
    title: string;
    description: string | null;
    relative_due_days: number | null;
    priority: 'low' | 'medium' | 'high' | 'critical';
    order_index: number;
    metadata_json: Record<string, unknown>;
  }[];
}

export const DEFAULT_PLAYBOOKS: PlaybookSeed[] = [
  // ============ IDEATION STAGE ============
  {
    stage: 'ideation',
    title: 'Descoberta do Problema',
    description: 'Validar que estás a resolver um problema real. Foco em entrevistas com clientes e validação do problema.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Completar 20 Entrevistas de Descoberta', description: 'Falar com 20+ potenciais clientes para validar o problema', relative_due_days: 21, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Criar guião de entrevista com perguntas abertas', description: 'Foco em perceber as dores, não em vender a solução', relative_due_days: 3, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Identificar e listar 50 alvos para entrevista', description: 'Mistura de early adopters e clientes mainstream', relative_due_days: 5, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'action', title: 'Conduzir primeiras 5 entrevistas e documentar', description: 'Iterar o guião com base no feedback inicial', relative_due_days: 10, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_interviews' } },
      { item_type: 'milestone', title: 'Definir Declaração do Problema', description: 'Articular o problema central e para quem o resolvemos', relative_due_days: 28, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_problem' } },
      { item_type: 'action', title: 'Preencher template de Descoberta de Problema', description: 'Documentar dores dos clientes e gravidade', relative_due_days: 25, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_problem' } },
      { item_type: 'action', title: 'Criar Lean Canvas v1', description: 'Primeiro rascunho das hipóteses de modelo de negócio', relative_due_days: 28, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_problem' } },
    ],
  },
  {
    stage: 'ideation',
    title: 'Fundação dos Fundadores',
    description: 'Construir base sólida: visão clara, alinhamento da equipa e recursos iniciais.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Completar Documento de Visão', description: 'Documentar visão, missão e história fundadora', relative_due_days: 14, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_vision' } },
      { item_type: 'action', title: 'Escrever história fundadora e ligação pessoal ao problema', description: 'Porquê tu? Porquê agora?', relative_due_days: 7, priority: 'medium', order_index: 1, metadata_json: { milestone_ref: 'ms_vision' } },
      { item_type: 'action', title: 'Definir 3-5 valores fundamentais da startup', description: 'Princípios que irão guiar a tomada de decisão', relative_due_days: 10, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_vision' } },
      { item_type: 'milestone', title: 'Estabelecer Acordos de Equipa', description: 'Alinhar papéis, equity e acordos de trabalho com co-fundadores', relative_due_days: 21, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_team' } },
      { item_type: 'action', title: 'Completar discussão de alinhamento de co-fundadores', description: 'Papéis, responsabilidades, níveis de compromisso', relative_due_days: 14, priority: 'high', order_index: 4, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'action', title: 'Rascunhar proposta inicial de equity', description: 'Considerar vesting schedules e cliff periods', relative_due_days: 21, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_team' } },
    ],
  },

  // ============ VALIDATION STAGE ============
  {
    stage: 'validation',
    title: 'Validação da Solução',
    description: 'Testar hipóteses de solução com experiências reais. Passar de problema para solution fit.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Completar Experiências de Solução', description: 'Correr 3+ experiências para validar abordagem', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Definir 3 hipóteses mais arriscadas da solução', description: 'O que tem de ser verdade para a solução funcionar?', relative_due_days: 5, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Desenhar experiência para hipótese #1', description: 'Definir critérios de sucesso antes de correr', relative_due_days: 10, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'action', title: 'Correr teste de landing page com proposta de valor', description: 'Medir taxas de conversão de inscrição', relative_due_days: 20, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_experiments' } },
      { item_type: 'milestone', title: 'Sinais de Product-Market Fit', description: 'Obter indicadores iniciais de procura e disposição a pagar', relative_due_days: 45, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Obter 10 cartas de intenção ou pré-encomendas', description: 'Demonstrar procura real, não apenas interesse', relative_due_days: 35, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Conduzir experiências de preço com 5 prospects', description: 'Testar diferentes preços e packages', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_pmf' } },
    ],
  },
  {
    stage: 'validation',
    title: 'Análise de Mercado',
    description: 'Compreender mercado, concorrência e posicionamento. Construir estratégia de mercado defensável.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Completar Análise Competitiva', description: 'Mapear paisagem competitiva e identificar diferenciação', relative_due_days: 21, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_competition' } },
      { item_type: 'action', title: 'Identificar 5-10 concorrentes diretos e indiretos', description: 'Incluir alternativas e substitutos', relative_due_days: 7, priority: 'medium', order_index: 1, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'action', title: 'Criar mapa de posicionamento competitivo', description: 'Posicionar concorrentes em eixos diferenciadores', relative_due_days: 14, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'action', title: 'Definir proposta de valor única vs alternativas', description: '10x melhor em que dimensão?', relative_due_days: 21, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_competition' } },
      { item_type: 'milestone', title: 'Definir Dimensão do Mercado-Alvo', description: 'Calcular TAM, SAM, SOM com validação bottom-up', relative_due_days: 28, priority: 'medium', order_index: 4, metadata_json: { ref: 'ms_market' } },
      { item_type: 'action', title: 'Calcular dimensão de mercado bottom-up', description: 'Usar dados reais, não estimativas top-down', relative_due_days: 25, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_market' } },
    ],
  },

  // ============ MVP STAGE ============
  {
    stage: 'mvp',
    title: 'Desenvolvimento do MVP',
    description: 'Construir e lançar produto mínimo viável. Foco em aprender, não em perfeição.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Definir Escopo do MVP', description: 'Identificar o produto mínimo que testa a hipótese central', relative_due_days: 14, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_scope' } },
      { item_type: 'action', title: 'Listar funcionalidades e priorizar sem piedade', description: 'Foco apenas na proposta de valor central', relative_due_days: 7, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_scope' } },
      { item_type: 'action', title: 'Criar user stories para funcionalidades MVP', description: 'Definir critérios de conclusão para cada story', relative_due_days: 10, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_scope' } },
      { item_type: 'milestone', title: 'Lançar MVP para Utilizadores Beta', description: 'Colocar o produto nas mãos de utilizadores reais', relative_due_days: 60, priority: 'critical', order_index: 3, metadata_json: { ref: 'ms_launch' } },
      { item_type: 'action', title: 'Construir funcionalidade core (sprint 1-2)', description: 'Foco na funcionalidade mais importante', relative_due_days: 30, priority: 'critical', order_index: 4, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'action', title: 'Recrutar 10-20 utilizadores beta do pipeline', description: 'Pessoas que expressaram forte interesse', relative_due_days: 45, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'action', title: 'Configurar analytics e recolha de feedback', description: 'Acompanhar métricas de uso desde o dia 1', relative_due_days: 50, priority: 'high', order_index: 6, metadata_json: { milestone_ref: 'ms_launch' } },
      { item_type: 'milestone', title: 'Validar com Utilizadores Beta', description: 'Recolher feedback e medir engagement', relative_due_days: 75, priority: 'critical', order_index: 7, metadata_json: { ref: 'ms_validate' } },
      { item_type: 'action', title: 'Conduzir sessões de feedback com 5 beta users', description: 'Observar a usar o produto, não apenas perguntar', relative_due_days: 65, priority: 'high', order_index: 8, metadata_json: { milestone_ref: 'ms_validate' } },
      { item_type: 'action', title: 'Medir teste Sean Ellis (40% "muito desiludidos")', description: 'Utilizadores ficariam desiludidos se o produto desaparecesse?', relative_due_days: 75, priority: 'high', order_index: 9, metadata_json: { milestone_ref: 'ms_validate' } },
    ],
  },
  {
    stage: 'mvp',
    title: 'Fundação Técnica',
    description: 'Construir base técnica sólida que escale. Foco nas decisões de arquitetura importantes.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Estabelecer Processo de Desenvolvimento', description: 'Configurar workflow e ferramentas de desenvolvimento', relative_due_days: 14, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_devops' } },
      { item_type: 'action', title: 'Configurar controlo de versões e code review', description: 'Git workflow, revisão de PRs', relative_due_days: 5, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_devops' } },
      { item_type: 'action', title: 'Configurar pipeline CI/CD para testes automáticos', description: 'Testes correm a cada commit', relative_due_days: 10, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_devops' } },
      { item_type: 'milestone', title: 'Implementar Infraestrutura Core', description: 'Infraestrutura production-ready para MVP', relative_due_days: 30, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_infra' } },
      { item_type: 'action', title: 'Configurar ambiente de hosting de produção', description: 'Cloud provider, domínios, SSL', relative_due_days: 20, priority: 'high', order_index: 4, metadata_json: { milestone_ref: 'ms_infra' } },
      { item_type: 'action', title: 'Implementar autenticação e autorização', description: 'Contas de utilizador e segurança básica', relative_due_days: 25, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_infra' } },
      { item_type: 'action', title: 'Configurar monitorização e tracking de erros', description: 'Saber quando algo parte', relative_due_days: 30, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_infra' } },
    ],
  },

  // ============ TRACTION STAGE ============
  {
    stage: 'traction',
    title: 'Validação de Product-Market Fit',
    description: 'Confirmar e reforçar product-market fit com métricas e evidências de clientes.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Atingir PMF Score > 40%', description: 'Teste Sean Ellis — 40%+ utilizadores ficariam "muito desiludidos"', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Inquirir 100+ utilizadores ativos com pergunta PMF', description: 'Quão desiludido ficaria se não pudesse usar o produto?', relative_due_days: 14, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'action', title: 'Entrevistar top 10 utilizadores "muito desiludidos"', description: 'Perceber o que os faz adorar o produto', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_pmf' } },
      { item_type: 'milestone', title: 'Documentar Entrega de Valor Repetível', description: 'Identificar e documentar o loop de valor central', relative_due_days: 45, priority: 'high', order_index: 3, metadata_json: { ref: 'ms_value' } },
      { item_type: 'action', title: 'Mapear jornada do utilizador até momento "aha"', description: 'Quando é que os utilizadores experienciam valor pela primeira vez?', relative_due_days: 35, priority: 'medium', order_index: 4, metadata_json: { milestone_ref: 'ms_value' } },
      { item_type: 'action', title: 'Reduzir tempo até valor em 50%', description: 'Remover fricção no onboarding', relative_due_days: 45, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_value' } },
    ],
  },
  {
    stage: 'traction',
    title: 'Motor de Receita Inicial',
    description: 'Construir receita repetível com primeiros clientes. Foco em aprender o que vende.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Atingir Primeiro €10K MRR', description: 'Provar que clientes pagam e ficam', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Converter 10 clientes pagantes', description: 'Foco em clientes com maior fit de problema', relative_due_days: 30, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Documentar 3 casos de estudo com clientes iniciais', description: 'Capturar histórias de transformação e resultados', relative_due_days: 45, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'action', title: 'Implementar tracking básico de churn', description: 'Perceber porque os clientes saem', relative_due_days: 50, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_revenue' } },
      { item_type: 'milestone', title: 'Validar Modelo de Preços', description: 'Encontrar o preço e packaging certos', relative_due_days: 45, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_pricing' } },
      { item_type: 'action', title: 'Testar 3 price points diferentes com prospects', description: 'A/B test ou descoberta conversacional de preço', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pricing' } },
      { item_type: 'action', title: 'Definir estrutura de tiers baseada em feedback', description: 'Que funcionalidades impulsionam upgrade?', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_pricing' } },
    ],
  },
  {
    stage: 'traction',
    title: 'Retenção e Engagement',
    description: 'Construir uso sticky e reduzir churn antes de escalar aquisição.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Atingir 90%+ Retenção Mensal', description: 'Manter clientes engajados e ativos', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_retention' } },
      { item_type: 'action', title: 'Implementar tracking de engagement semanal', description: 'Definir e medir ações-chave de engagement', relative_due_days: 14, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'action', title: 'Construir sequência de onboarding automatizada', description: 'Guiar utilizadores ao primeiro valor rapidamente', relative_due_days: 30, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'action', title: 'Criar campanha de recuperação para churned users', description: 'Perceber e endereçar razões de churn', relative_due_days: 45, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_retention' } },
      { item_type: 'milestone', title: 'Construir Fundação de Customer Success', description: 'Customer success proativo para contas top', relative_due_days: 45, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_cs' } },
      { item_type: 'action', title: 'Definir health score para contas de clientes', description: 'Prever churn antes de acontecer', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_cs' } },
      { item_type: 'action', title: 'Implementar check-ins regulares com top 10 clientes', description: 'Revisões de sucesso mensais ou trimestrais', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_cs' } },
    ],
  },

  // ============ GROWTH STAGE ============
  {
    stage: 'growth',
    title: 'Motor de Crescimento',
    description: 'Construir loops de crescimento repetíveis. Escalar aquisição de forma sustentável.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Identificar Canal de Crescimento Principal', description: 'Encontrar canal de aquisição mais eficaz', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_channel' } },
      { item_type: 'action', title: 'Analisar fontes de aquisição atuais e taxas de conversão', description: 'De onde vêm os melhores clientes?', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'action', title: 'Correr 3 experiências em canais diferentes', description: 'Testar pago, orgânico, parcerias', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'action', title: 'Duplicar investimento no canal com melhor performance', description: 'Otimizar e escalar o que funciona', relative_due_days: 30, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_channel' } },
      { item_type: 'milestone', title: 'Atingir Unit Economics Positivos', description: 'LTV cliente > CAC com margem saudável', relative_due_days: 60, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_economics' } },
      { item_type: 'action', title: 'Calcular LTV e CAC atuais com precisão', description: 'Usar análise de coorte para LTV', relative_due_days: 40, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_economics' } },
      { item_type: 'action', title: 'Identificar alavancas para melhorar LTV', description: 'O que impulsiona valor do cliente? (retenção, expansão)', relative_due_days: 50, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_economics' } },
      { item_type: 'milestone', title: 'Construir Loop Viral/Referência', description: 'Transformar clientes satisfeitos em canal de aquisição', relative_due_days: 90, priority: 'high', order_index: 7, metadata_json: { ref: 'ms_viral' } },
      { item_type: 'action', title: 'Implementar programa de referência ou mecânica viral', description: 'Tornar a partilha valiosa para utilizadores', relative_due_days: 75, priority: 'medium', order_index: 8, metadata_json: { milestone_ref: 'ms_viral' } },
    ],
  },
  {
    stage: 'growth',
    title: 'Vendas e Receita',
    description: 'Construir processo de vendas repetível. Transição de vendas founder-led para motor escalável.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Documentar Playbook de Vendas', description: 'Codificar o que funciona no processo de vendas', relative_due_days: 30, priority: 'high', order_index: 0, metadata_json: { ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Mapear jornada de compra do cliente', description: 'De awareness a compra a sucesso', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Criar scripts de vendas e guias de objeções', description: 'Baseado no que os fundadores aprenderam', relative_due_days: 20, priority: 'medium', order_index: 2, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'action', title: 'Definir critérios de qualificação (BANT ou similar)', description: 'Saber quando prosseguir vs passar', relative_due_days: 25, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_playbook' } },
      { item_type: 'milestone', title: 'Contratar Primeiro Vendedor', description: 'Transição de vendas founder-led para equipa', relative_due_days: 60, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_hire' } },
      { item_type: 'action', title: 'Definir perfil ideal do primeiro vendedor', description: 'Competências, experiência, fit cultural', relative_due_days: 40, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_hire' } },
      { item_type: 'action', title: 'Criar programa de onboarding e formação', description: 'Como vais formar novos vendedores?', relative_due_days: 55, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_hire' } },
    ],
  },

  // ============ SCALE STAGE ============
  {
    stage: 'scale',
    title: 'Excelência Operacional',
    description: 'Construir sistemas e processos que permitam crescimento sustentável. Foco em repetibilidade e eficiência.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Implementar Operações Escaláveis', description: 'Processos e sistemas que funcionam a 10x escala', relative_due_days: 60, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_ops' } },
      { item_type: 'action', title: 'Documentar todos os processos de negócio críticos', description: 'SOPs para atividades repetíveis', relative_due_days: 20, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'action', title: 'Implementar sistemas de negócio (CRM, ERP, etc.)', description: 'Ferramentas que suportam escala', relative_due_days: 40, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'action', title: 'Criar dashboards KPI para todos os departamentos', description: 'Visibilidade em tempo real da saúde do negócio', relative_due_days: 50, priority: 'medium', order_index: 3, metadata_json: { milestone_ref: 'ms_ops' } },
      { item_type: 'milestone', title: 'Construir Equipa de Gestão', description: 'Contratar líderes funcionais para áreas-chave', relative_due_days: 90, priority: 'critical', order_index: 4, metadata_json: { ref: 'ms_team' } },
      { item_type: 'action', title: 'Identificar lacunas na equipa de liderança', description: 'Que papéis são críticos para o próximo estágio?', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'action', title: 'Definir percursos de carreira e estrutura org', description: 'Como vai crescer a equipa?', relative_due_days: 60, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_team' } },
      { item_type: 'milestone', title: 'Estabelecer Governança do Board', description: 'Governança formal para relações com investidores', relative_due_days: 120, priority: 'high', order_index: 7, metadata_json: { ref: 'ms_governance' } },
      { item_type: 'action', title: 'Criar cadência de reuniões de board e template', description: 'Updates mensais, deep dives trimestrais', relative_due_days: 100, priority: 'medium', order_index: 8, metadata_json: { milestone_ref: 'ms_governance' } },
    ],
  },
  {
    stage: 'scale',
    title: 'Fundraising e Capital de Crescimento',
    description: 'Preparar e executar fundraise com sucesso. Construir relações com investidores estrategicamente.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Completar Preparação para Fundraise', description: 'Materiais e métricas prontos para conversas com investidores', relative_due_days: 45, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_ready' } },
      { item_type: 'action', title: 'Completar template de preparação para investidores', description: 'Avaliar lacunas na narrativa e métricas', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'action', title: 'Criar pitch deck para investidores (10-15 slides)', description: 'Narrativa convincente com dados sólidos', relative_due_days: 25, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'action', title: 'Preparar data room com materiais de due diligence', description: 'Financeiros, legal, equipa, métricas', relative_due_days: 40, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_ready' } },
      { item_type: 'milestone', title: 'Construir Pipeline de Investidores', description: 'Identificar e aquecer investidores-alvo', relative_due_days: 60, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_pipeline' } },
      { item_type: 'action', title: 'Pesquisar e listar 50 investidores-alvo', description: 'Adequados ao estágio, alinhados com tese', relative_due_days: 30, priority: 'high', order_index: 5, metadata_json: { milestone_ref: 'ms_pipeline' } },
      { item_type: 'action', title: 'Obter intros quentes para top 20 alvos', description: 'Trabalhar rede e advisors', relative_due_days: 50, priority: 'high', order_index: 6, metadata_json: { milestone_ref: 'ms_pipeline' } },
      { item_type: 'milestone', title: 'Fechar Ronda de Investimento', description: 'Assinar term sheet e completar fecho', relative_due_days: 120, priority: 'critical', order_index: 7, metadata_json: { ref: 'ms_close' } },
      { item_type: 'action', title: 'Correr processo paralelo com investidores (4-6 semanas)', description: 'Criar urgência com múltiplas conversas', relative_due_days: 90, priority: 'critical', order_index: 8, metadata_json: { milestone_ref: 'ms_close' } },
      { item_type: 'action', title: 'Negociar e assinar term sheet', description: 'Foco nos termos-chave, não apenas na avaliação', relative_due_days: 100, priority: 'critical', order_index: 9, metadata_json: { milestone_ref: 'ms_close' } },
    ],
  },

  // ============ LEGAL & COMPLIANCE (Cross-stage) ============
  {
    stage: 'validation',
    title: 'Legal e Compliance',
    description: 'Garantir fundações legais sólidas. Proteger a startup e os fundadores desde cedo.',
    is_active: true,
    items: [
      { item_type: 'milestone', title: 'Constituir Empresa', description: 'Formalizar a estrutura legal da startup', relative_due_days: 30, priority: 'critical', order_index: 0, metadata_json: { ref: 'ms_legal' } },
      { item_type: 'action', title: 'Escolher forma jurídica (Lda, SA, Unipessoal)', description: 'Considerar implicações fiscais e de investimento', relative_due_days: 10, priority: 'high', order_index: 1, metadata_json: { milestone_ref: 'ms_legal' } },
      { item_type: 'action', title: 'Registar empresa e obter NIF', description: 'Registar na Conservatória e AT', relative_due_days: 20, priority: 'high', order_index: 2, metadata_json: { milestone_ref: 'ms_legal' } },
      { item_type: 'action', title: 'Redigir pacto social com cláusulas de vesting', description: 'Proteger cofundadores com cliff e vesting', relative_due_days: 25, priority: 'high', order_index: 3, metadata_json: { milestone_ref: 'ms_legal' } },
      { item_type: 'milestone', title: 'Proteger Propriedade Intelectual', description: 'Registar marca e proteger IP da startup', relative_due_days: 45, priority: 'high', order_index: 4, metadata_json: { ref: 'ms_ip' } },
      { item_type: 'action', title: 'Registar marca no INPI', description: 'Proteger nome e identidade da marca', relative_due_days: 35, priority: 'medium', order_index: 5, metadata_json: { milestone_ref: 'ms_ip' } },
      { item_type: 'action', title: 'Preparar NDAs e acordos de confidencialidade', description: 'Para parceiros, mentores e potenciais investidores', relative_due_days: 40, priority: 'medium', order_index: 6, metadata_json: { milestone_ref: 'ms_ip' } },
    ],
  },
];
