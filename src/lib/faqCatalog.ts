export type AppRole = 'founder' | 'mentor' | 'staff';

export type StartupStage = 'ideation' | 'pre_seed' | 'seed' | 'scale';

export type FaqItem = {
  id: string;
  q_pt: string;
  a_pt: string;
  q_en: string;
  a_en: string;
  tags: string[];
  roles: AppRole[];
  stages: StartupStage[];
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-this',
    q_pt: 'Para que serve esta plataforma?',
    a_pt: 'É o "sistema operativo" do ecossistema: organiza objetivos, ações, sessões e documentos num único sítio, e liga a tua startup à equipa e à rede de mentores. O foco é ajudar-te a avançar com rigor — e com menos fricção.',
    q_en: 'What is this platform for?',
    a_en: 'It is the ecosystem "operating system": it centralizes goals, actions, sessions, and documents in one place, and connects your startup to the team and mentor network. The goal is to help you move faster with rigor and less friction.',
    tags: ['onboarding', 'value'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'roles-and-visibility',
    q_pt: 'Quem vê o quê? (fundador, mentor, consultor, administrativo)',
    a_pt: 'Por regra, só vês o que te diz respeito: founders veem a sua startup, mentores veem apenas startups/sessões atribuídas, e a equipa interna (consultor/admin) vê o portefólio conforme permissões. Se vires "Sem acesso", é um tema de permissões/atribuição.',
    q_en: 'Who can see what? (founder, mentor, staff, admin)',
    a_en: 'As a rule, you only see what you need: founders see their own startup, mentors see only assigned startups/sessions, and staff see the portfolio according to permissions. If you see "Access denied", it is a permissions/allocation issue.',
    tags: ['permissions', 'security'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'my-startup-entry',
    q_pt: 'Como chego rapidamente à minha startup?',
    a_pt: 'No menu, entra em "A Minha Startup". Aí tens o essencial (visão geral) e navegação por separadores: Milestones, Ações, Sessões, KPIs e Documentos. Se tiveres mais do que uma startup, escolhe no ecrã inicial.',
    q_en: 'How do I quickly access my startup?',
    a_en: 'Use "My Startup" in the sidebar. You will find the essentials (overview) and the main tabs: Milestones, Actions, Sessions, KPIs, and Documents. If you have more than one startup, select it on the home screen.',
    tags: ['navigation'],
    roles: ['founder'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'milestones-vs-actions',
    q_pt: 'Qual é a diferença entre Milestones e Ações?',
    a_pt: 'Milestones são marcos de progresso (resultados). Ações são tarefas concretas (o trabalho). Um bom fluxo é: definir 3–5 milestones e depois criar ações semanais que empurrem cada milestone.',
    q_en: 'What is the difference between Milestones and Actions?',
    a_en: 'Milestones are progress outcomes. Actions are concrete tasks (the work). A good flow is: define 3–5 milestones and then create weekly actions that push each milestone forward.',
    tags: ['execution', 'planning'],
    roles: ['founder', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'mentor-request',
    q_pt: 'Como peço mentoria — e o que acontece a seguir?',
    a_pt: 'Vai a "Mentoria" e submete um pedido com contexto e objetivo (o que queres desbloquear). O pedido entra em triagem e a equipa atribui o mentor mais adequado. Vais ver o estado do pedido e ser notificado quando houver atribuição.',
    q_en: 'How do I request mentoring — and what happens next?',
    a_en: 'Go to "Mentoring" and submit a request with context and a clear goal (what you want to unblock). The request is triaged and the team assigns the best-fit mentor. You can track status and you will be notified when assigned.',
    tags: ['mentoring', 'process'],
    roles: ['founder'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'sessions',
    q_pt: 'Como funcionam as Sessões & Mentoria?',
    a_pt: 'As sessões registam interações com mentores/consultores: objetivo, notas e próximos passos. Idealmente, cada sessão termina com 1–3 ações claras para a semana seguinte.',
    q_en: 'How do Sessions & Mentoring work?',
    a_en: 'Sessions log interactions with mentors/staff: objective, notes, and next steps. Ideally, each session ends with 1–3 clear actions for the following week.',
    tags: ['sessions', 'coaching'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'playbooks',
    q_pt: 'O que são Playbooks e quando devo usá-los?',
    a_pt: 'Playbooks são guias práticos (passo-a-passo) para resolver temas comuns: pricing, ICP, métricas, fundraising, etc. Usa-os quando estás bloqueado, ou quando queres estruturar um tópico com método.',
    q_en: 'What are Playbooks and when should I use them?',
    a_en: 'Playbooks are practical step-by-step guides for common topics: pricing, ICP, metrics, fundraising, etc. Use them when you are stuck or when you want a structured approach.',
    tags: ['playbooks', 'guides'],
    roles: ['founder', 'staff', 'mentor'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'templates',
    q_pt: 'O que são Templates e como os uso sem "encher a plataforma de ficheiros"?',
    a_pt: 'Templates são modelos reutilizáveis (pitch, plano financeiro, checklist, etc.). O ideal é usar o template para criar uma versão "viva" e submeter apenas as versões relevantes (ex.: v1, v2) com títulos claros.',
    q_en: 'What are Templates and how do I use them without clutter?',
    a_en: 'Templates are reusable models (pitch, financial plan, checklists, etc.). Use them to build a "living" version and submit only meaningful versions (e.g., v1, v2) with clear titles.',
    tags: ['templates', 'docs'],
    roles: ['founder', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'documents-submit',
    q_pt: 'Como submeto documentos e o que significa "Aprovado"?',
    a_pt: 'Em "Documentos", faz upload e dá um título claro (ex.: "Pitch Deck — v2"). "Aprovado" significa que a equipa validou a versão atual como pronta para o objetivo (investidores, candidatura, etc.).',
    q_en: 'How do I submit documents and what does "Approved" mean?',
    a_en: 'In "Documents", upload and provide a clear title (e.g., "Pitch Deck — v2"). "Approved" means the team validated that version as ready for its intended purpose (investors, applications, etc.).',
    tags: ['documents', 'workflow'],
    roles: ['founder', 'staff'],
    stages: ['pre_seed', 'seed', 'scale', 'ideation'],
  },
  {
    id: 'document-feedback',
    q_pt: 'Pedi feedback a um documento — o que acontece agora?',
    a_pt: 'O pedido de feedback notifica as pessoas certas (consultor/mentor atribuídos) e fica registado com estado. Quando houver comentário, vê-o no detalhe do documento e transforma-o em ações concretas.',
    q_en: 'I requested feedback on a document — what happens now?',
    a_en: 'The request notifies the right people (assigned staff/mentor) and is tracked with a status. When feedback arrives, review it in the document detail and turn it into concrete actions.',
    tags: ['documents', 'feedback'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['pre_seed', 'seed', 'scale'],
  },
  {
    id: 'kpis',
    q_pt: 'Que KPIs devo acompanhar no início?',
    a_pt: 'Depende do modelo. Regra simples: 1–2 KPIs de aquisição/ativação, 1 de retenção, e 1 de "saúde financeira" (runway/burn). Começa pequeno e melhora à medida que aprendes.',
    q_en: 'Which KPIs should I track early on?',
    a_en: 'It depends on your model. Simple rule: 1–2 acquisition/activation KPIs, 1 retention KPI, and 1 financial health KPI (runway/burn). Start small and refine as you learn.',
    tags: ['kpis', 'metrics'],
    roles: ['founder', 'staff', 'mentor'],
    stages: ['ideation', 'pre_seed', 'seed'],
  },
  {
    id: 'language',
    q_pt: 'Como mudo o idioma (PT/EN)?',
    a_pt: 'No menu de utilizador (canto superior), escolhe o idioma. Se vires textos misturados, é provável que falte uma tradução — reporta e nós corrigimos.',
    q_en: 'How do I change language (PT/EN)?',
    a_en: 'Use the user menu (top corner) to select language. If you see mixed strings, a translation key may be missing — report it and we\'ll fix it.',
    tags: ['i18n', 'settings'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'no-access',
    q_pt: 'Vejo "Sem acesso" ou "0 resultados". O que faço?',
    a_pt: 'Primeiro, confirma que estás no perfil certo (conta/role). Depois, valida se a startup/mentor está atribuída. Se não estiver, pede à equipa para te associar ao workspace correto.',
    q_en: 'I see "Access denied" or "0 results". What should I do?',
    a_en: 'First, confirm you are on the right account/role. Then check if the startup/mentor assignment exists. If not, ask staff to associate you with the correct workspace.',
    tags: ['troubleshooting', 'permissions'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'best-next-step',
    q_pt: 'Qual é o "próximo passo" mais comum para founders?',
    a_pt: 'Escolhe 1 prioridade por semana: (1) falar com utilizadores, (2) ajustar proposta de valor, (3) fechar pricing, (4) preparar pitch e métricas base. A plataforma ajuda-te a transformar isso em milestones + ações.',
    q_en: 'What is the most common "next step" for founders?',
    a_en: 'Pick 1 weekly priority: (1) talk to users, (2) refine value proposition, (3) finalize pricing, (4) prep pitch & baseline metrics. The platform helps you convert this into milestones + actions.',
    tags: ['execution', 'onboarding'],
    roles: ['founder'],
    stages: ['ideation', 'pre_seed', 'seed'],
  },
];
