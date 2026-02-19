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
    id: 'faq-01',
    q_pt: 'Para que serve esta plataforma?',
    a_pt: 'É o "sistema operativo" do ecossistema da Startup Leiria: acompanha progresso, sessões de mentoria, ações, KPIs, documentos, datarooms e programas — com foco em reduzir fricção e aumentar a qualidade do acompanhamento.',
    q_en: 'What is this platform for?',
    a_en: 'It is the Startup Leiria ecosystem "operating system": it tracks progress, mentoring sessions, actions, KPIs, documents, datarooms, and programs — focused on reducing friction and improving support quality.',
    tags: ['onboarding', 'value'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-02',
    q_pt: 'Quem vê o quê? (perfis e permissões)',
    a_pt: 'Founders veem apenas a(s) sua(s) startup(s). Mentores veem as startups onde estão ligados e as sessões associadas. Consultores veem o portefólio que gerem (e, se autorizado, visão do ecossistema). Administrativos têm acesso a operações, programas, utilizadores e configurações.',
    q_en: 'Who can see what? (profiles and permissions)',
    a_en: 'Founders see only their own startup(s). Mentors see startups they are assigned to and related sessions. Consultants see their managed portfolio (and, if authorized, ecosystem view). Admins have access to operations, programs, users, and settings.',
    tags: ['permissions', 'security'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-03',
    q_pt: 'Como peço mentoria e o que acontece a seguir?',
    a_pt: 'Em "Mentores", seleciona temas e descreve o que precisas. O pedido fica com estado "Pendente" até ser atribuído. Assim que houver atribuição, recebes notificação e passa a existir um canal de trabalho (sessões, notas e ações).',
    q_en: 'How do I request mentoring and what happens next?',
    a_en: 'In "Mentors", select topics and describe what you need. The request stays "Pending" until assigned. Once assigned, you receive a notification and a work channel is created (sessions, notes, and actions).',
    tags: ['mentoring', 'process'],
    roles: ['founder'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-04',
    q_pt: 'Como marco uma sessão (e envio convite/Teams)?',
    a_pt: 'Em "Sessões & Mentoria", cria a sessão com data/hora e participantes. Podes gerar link (Teams/online), enviar convite e anexar agenda. Depois da sessão, regista notas e gera resumo/ações com IA.',
    q_en: 'How do I schedule a session (and send a Teams invite)?',
    a_en: 'In "Sessions & Mentoring", create a session with date/time and participants. You can generate a link (Teams/online), send an invite, and attach an agenda. After the session, record notes and generate a summary/actions with AI.',
    tags: ['sessions', 'teams', 'calendar'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-05',
    q_pt: 'O que são Objetivos & KPIs e como devo usar?',
    a_pt: 'Objetivos definem "para onde vamos"; KPIs medem "se estamos a lá chegar". Mantém poucos KPIs por objetivo, atualiza regularmente e usa-os como base para decisões e prioridades nas sessões.',
    q_en: 'What are Objectives & KPIs and how should I use them?',
    a_en: 'Objectives define "where we are going"; KPIs measure "if we are getting there". Keep few KPIs per objective, update regularly, and use them as a basis for decisions and priorities in sessions.',
    tags: ['kpis', 'metrics', 'planning'],
    roles: ['founder', 'staff', 'mentor'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-06',
    q_pt: 'O que são Playbooks e como funcionam?',
    a_pt: 'Playbooks são percursos práticos (marcos + ações) para acelerar temas comuns (ex.: validação, go-to-market, fundraising). Podes aplicar, completar ações e descartar o que não faz sentido para a tua fase.',
    q_en: 'What are Playbooks and how do they work?',
    a_en: 'Playbooks are practical journeys (milestones + actions) to accelerate common topics (e.g., validation, go-to-market, fundraising). You can apply, complete actions, and dismiss what does not apply to your stage.',
    tags: ['playbooks', 'guides'],
    roles: ['founder', 'staff', 'mentor'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-07',
    q_pt: 'Onde estão os documentos e templates? Posso partilhar com investidores?',
    a_pt: 'Em "Documentos" encontras uploads, links e templates num repositório único. Podes organizar por categoria e adicionar itens ao Dataroom para partilha externa controlada (links com validade).',
    q_en: 'Where are documents and templates? Can I share with investors?',
    a_en: 'In "Documents" you will find uploads, links, and templates in a single repository. You can organize by category and add items to the Dataroom for controlled external sharing (time-limited links).',
    tags: ['documents', 'templates', 'dataroom'],
    roles: ['founder', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-08',
    q_pt: 'Para onde vai um ficheiro depois de submetido/aprovado?',
    a_pt: 'Tudo o que carregas fica no repositório "Documentos". Se houver um fluxo de submissão/aprovação, o ficheiro passa a ter um badge de estado (ex.: "Aprovado") e pode ser adicionado ao Dataroom com 1 clique.',
    q_en: 'Where does a file go after submission/approval?',
    a_en: 'Everything you upload stays in the "Documents" repository. If there is a submission/approval flow, the file gets a status badge (e.g., "Approved") and can be added to the Dataroom with 1 click.',
    tags: ['documents', 'workflow', 'approval'],
    roles: ['founder', 'staff'],
    stages: ['pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-09',
    q_pt: 'O que é o Dataroom e quando devo usar?',
    a_pt: 'O Dataroom é a tua "sala de evidências" para investidores e parceiros: deck, modelo financeiro, métricas, contratos, updates. Permite links partilháveis com prazo e revogação.',
    q_en: 'What is the Dataroom and when should I use it?',
    a_en: 'The Dataroom is your "evidence room" for investors and partners: deck, financial model, metrics, contracts, updates. It allows shareable links with expiry and revocation.',
    tags: ['dataroom', 'fundraising', 'investors'],
    roles: ['founder', 'staff'],
    stages: ['pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-10',
    q_pt: 'Como funcionam as integrações (Teams e Outlook)?',
    a_pt: 'Teams pode ser ligado via webhook/integração para notificações e links de reunião. Outlook pode sincronizar eventos e convites. Se não estiver ligado, continuas a poder exportar ICS e enviar convites manualmente.',
    q_en: 'How do integrations (Teams and Outlook) work?',
    a_en: 'Teams can be connected via webhook/integration for notifications and meeting links. Outlook can sync events and invites. If not connected, you can still export ICS and send invites manually.',
    tags: ['integrations', 'teams', 'outlook'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-11',
    q_pt: 'Como usar a IA com segurança?',
    a_pt: 'A IA ajuda a resumir sessões, sugerir ações e analisar documentos (quando ativado). Não altera nada automaticamente: revês sempre antes de aplicar. Evita colar dados sensíveis desnecessários (segredos comerciais, credenciais, dados pessoais).',
    q_en: 'How do I use AI safely?',
    a_en: 'AI helps summarize sessions, suggest actions, and analyze documents (when enabled). It never changes anything automatically: you always review before applying. Avoid pasting unnecessary sensitive data (trade secrets, credentials, personal data).',
    tags: ['ai', 'security', 'tools'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-12',
    q_pt: 'Porque não estou a ver startups / aparecem "0 resultados"?',
    a_pt: 'Normalmente é filtro (programa/estado), permissões ou falta de associação a um workspace. Confirma os filtros no topo e, se necessário, contacta a equipa para te associar à startup/programa.',
    q_en: 'Why am I not seeing startups / "0 results"?',
    a_en: 'Usually it is a filter (program/status), permissions, or missing workspace association. Check the filters at the top and, if needed, contact the team to associate you with the startup/program.',
    tags: ['troubleshooting', 'permissions', 'filters'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-13',
    q_pt: 'Como reporto um problema ou peço ajuda?',
    a_pt: 'Usa "Glossário & FAQ" para respostas rápidas e, se precisares, o botão "Contactar Suporte" para enviar contexto (página, erro e screenshot).',
    q_en: 'How do I report a problem or ask for help?',
    a_en: 'Use "Glossary & FAQ" for quick answers and, if needed, the "Contact Support" button to send context (page, error, and screenshot).',
    tags: ['support', 'help'],
    roles: ['founder', 'mentor', 'staff'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
  {
    id: 'faq-14',
    q_pt: 'Como tirar mais valor da plataforma em 10 minutos por semana?',
    a_pt: 'Atualiza 2–3 KPIs, fecha 1 ação pendente, agenda (ou prepara) a próxima sessão e mantém 1 documento-chave (deck ou modelo financeiro) sempre atualizado no repositório.',
    q_en: 'How to get the most value from the platform in 10 minutes per week?',
    a_en: 'Update 2–3 KPIs, close 1 pending action, schedule (or prepare) the next session, and keep 1 key document (deck or financial model) always up-to-date in the repository.',
    tags: ['productivity', 'tips', 'onboarding'],
    roles: ['founder'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
  },
];
