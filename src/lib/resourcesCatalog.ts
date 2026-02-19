export type ResourceType = 'external' | 'internal';

export type ResourceRole = 'founder' | 'mentor' | 'staff';

export type ResourceStage = 'ideation' | 'pre_seed' | 'seed' | 'scale';

export type ResourceCategory =
  | 'product'
  | 'market'
  | 'gtm'
  | 'finance'
  | 'fundraising'
  | 'legal'
  | 'ops'
  | 'team'
  | 'privacy'
  | 'metrics';

export type ResourceItem = {
  id: string;
  type: ResourceType;
  title_pt: string;
  title_en: string;
  desc_pt: string;
  desc_en: string;
  url: string;
  category: ResourceCategory;
  tags: string[];
  stages: ResourceStage[];
  roles: ResourceRole[];
};

export const RESOURCES_CATALOG: ResourceItem[] = [
  // --- INTERNAL (3) ---
  {
    id: 'internal-help',
    type: 'internal',
    title_pt: 'Glossário & FAQ',
    title_en: 'Glossary & FAQ',
    desc_pt: 'Conceitos essenciais, respostas rápidas e troubleshooting.',
    desc_en: 'Essential concepts, quick answers, and troubleshooting.',
    url: '/help',
    category: 'ops',
    tags: ['help', 'faq', 'glossary'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'internal-mentors',
    type: 'internal',
    title_pt: 'Mentoria',
    title_en: 'Mentoring',
    desc_pt: 'Pedir mentoria, acompanhar pedidos e gerir sessões atribuídas.',
    desc_en: 'Request mentoring, track requests, and manage assigned sessions.',
    url: '/mentors',
    category: 'ops',
    tags: ['mentoring', 'sessions'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'internal-documents',
    type: 'internal',
    title_pt: 'Repositório de Documentos',
    title_en: 'Documents Repository',
    desc_pt: 'Uploads, versões e estado (submetido/aprovado) num só sítio.',
    desc_en: 'Uploads, versions, and status (submitted/approved) in one place.',
    url: '/documents',
    category: 'ops',
    tags: ['documents', 'versions'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff'],
  },
  // --- EXTERNAL (17) ---
  {
    id: 'yc-talk-to-users',
    type: 'external',
    title_pt: 'YC — Como falar com utilizadores',
    title_en: 'YC — How to Talk to Users',
    desc_pt: 'Guia prático para entrevistas: o que perguntar, como interpretar e como evitar "viés de confirmação".',
    desc_en: 'Practical interview guide: what to ask, how to interpret, and how to avoid confirmation bias.',
    url: 'https://www.ycombinator.com/library/Iq-how-to-talk-to-users',
    category: 'market',
    tags: ['discovery', 'interviews', 'validation'],
    stages: ['ideation', 'pre_seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'yc-real-pmf',
    type: 'external',
    title_pt: 'YC — O verdadeiro Product-Market Fit',
    title_en: 'YC — The Real Product-Market Fit',
    desc_pt: 'Como escolher mercado/problema, lançar cedo e usar feedback real para encontrar PMF.',
    desc_en: 'How to pick a market/problem, launch early, and use real feedback to find PMF.',
    url: 'https://www.ycombinator.com/library/5z-the-real-product-market-fit',
    category: 'product',
    tags: ['pmf', 'iteration'],
    stages: ['ideation', 'pre_seed', 'seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'yc-first-customers',
    type: 'external',
    title_pt: 'YC — Como conseguir os primeiros clientes',
    title_en: 'YC — How to Get Your First Customers',
    desc_pt: 'Passo-a-passo da transição "falar com utilizadores" -> "vender", sem atalhos mágicos.',
    desc_en: 'Step-by-step transition from "talking to users" to "selling", without magic shortcuts.',
    url: 'https://www.ycombinator.com/library/Ip-how-to-get-your-first-customers',
    category: 'gtm',
    tags: ['sales', 'gtm', 'early-customers'],
    stages: ['pre_seed', 'seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'yc-seed-deck',
    type: 'external',
    title_pt: 'YC — Como construir um pitch deck de Seed',
    title_en: 'YC — How to Build Your Seed Round Pitch Deck',
    desc_pt: 'Estrutura recomendada para contar a história e mostrar clareza de execução na fase seed.',
    desc_en: 'Recommended structure to tell the story and show execution clarity at seed stage.',
    url: 'https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck',
    category: 'fundraising',
    tags: ['pitch', 'deck', 'seed'],
    stages: ['pre_seed', 'seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'yc-design-deck',
    type: 'external',
    title_pt: 'YC — Como desenhar um pitch deck melhor',
    title_en: 'YC — How to Design a Better Pitch Deck',
    desc_pt: 'Boas práticas de design e narrativa para tornar o deck legível e convincente.',
    desc_en: 'Design and storytelling practices to make the deck readable and compelling.',
    url: 'https://www.ycombinator.com/library/4T-how-to-design-a-better-pitch-deck',
    category: 'fundraising',
    tags: ['pitch', 'storytelling', 'design'],
    stages: ['pre_seed', 'seed'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'sequoia-pitch-guide',
    type: 'external',
    title_pt: 'Sequoia — Guia de pitching ("Writing a Business Plan")',
    title_en: 'Sequoia — Pitching Guide ("Writing a Business Plan")',
    desc_pt: 'Framework clássico para estruturar propósito, problema, solução, mercado, concorrência e finanças.',
    desc_en: 'Classic framework for purpose, problem, solution, market, competition, and financials.',
    url: 'https://sequoiacap.com/article/writing-a-business-plan/',
    category: 'fundraising',
    tags: ['pitch', 'narrative', 'market-size'],
    stages: ['pre_seed', 'seed'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'stripe-saas-metrics',
    type: 'external',
    title_pt: 'Stripe — Métricas essenciais de SaaS',
    title_en: 'Stripe — Essential SaaS Metrics',
    desc_pt: 'Visão prática de métricas de crescimento (MRR, churn, CAC/LTV) e como usar na gestão.',
    desc_en: 'Practical overview of growth metrics (MRR, churn, CAC/LTV) and how to use them.',
    url: 'https://stripe.com/resources/more/essential-saas-metrics',
    category: 'metrics',
    tags: ['metrics', 'saas', 'growth'],
    stages: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'stripe-cac',
    type: 'external',
    title_pt: 'Stripe — CAC em SaaS (o que é e como interpretar)',
    title_en: 'Stripe — CAC in SaaS (what it is and how to use it)',
    desc_pt: 'Explica CAC e como se relaciona com LTV e sustentabilidade do crescimento.',
    desc_en: 'Explains CAC and how it relates to LTV and sustainable growth.',
    url: 'https://stripe.com/resources/more/cac-in-saas',
    category: 'metrics',
    tags: ['cac', 'ltv', 'unit-economics'],
    stages: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'stripe-cac-payback',
    type: 'external',
    title_pt: 'Stripe — CAC Payback Period',
    title_en: 'Stripe — CAC Payback Period',
    desc_pt: 'Como medir quanto tempo demoras a recuperar o custo de aquisição — útil para decidir "acelerar ou travar".',
    desc_en: 'How to measure time to recover acquisition cost — useful to decide when to scale or slow down.',
    url: 'https://stripe.com/resources/more/what-is-the-cac-payback-period',
    category: 'finance',
    tags: ['payback', 'unit-economics', 'scaling'],
    stages: ['seed', 'scale', 'pre_seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'stripe-pricing-models',
    type: 'external',
    title_pt: 'Stripe — Modelos de pricing em SaaS (101)',
    title_en: 'Stripe — SaaS Pricing Models (101)',
    desc_pt: 'Panorama de modelos (por utilizador, por uso, tiered) e critérios para escolher sem complicar.',
    desc_en: 'Overview of models (per-seat, usage-based, tiered) and how to choose without overcomplicating.',
    url: 'https://stripe.com/resources/more/saas-pricing-models-101',
    category: 'gtm',
    tags: ['pricing', 'packaging'],
    stages: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'openview-plg-playbook',
    type: 'external',
    title_pt: 'OpenView — Product-Led Growth Playbook (PDF)',
    title_en: 'OpenView — Product-Led Growth Playbook (PDF)',
    desc_pt: 'Manual completo de PLG: aquisição via produto, ativação, retenção e expansão.',
    desc_en: 'Full PLG playbook: product-driven acquisition, activation, retention, and expansion.',
    url: 'https://openviewpartners.com/wp-content/uploads/2018/07/OpenView-Product-Led-Growth-Playbook.pdf',
    category: 'gtm',
    tags: ['plg', 'onboarding', 'growth'],
    stages: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'google-okr-guide',
    type: 'external',
    title_pt: 'Google re:Work — OKRs (definir objetivos e KRs)',
    title_en: 'Google re:Work — OKRs (set objectives and key results)',
    desc_pt: 'Guia direto para desenhar objetivos e resultados-chave com foco e alinhamento.',
    desc_en: 'Straight guide to design OKRs with focus and alignment.',
    url: 'https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs',
    category: 'ops',
    tags: ['okrs', 'execution', 'focus'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'nvca-model-docs',
    type: 'external',
    title_pt: 'NVCA — Model Legal Documents (VC)',
    title_en: 'NVCA — Model Legal Documents (VC)',
    desc_pt: 'Modelos de documentos para rondas de investimento: base para entender estrutura e termos típicos.',
    desc_en: 'Model documents for venture rounds: a baseline to understand typical structure and terms.',
    url: 'https://nvca.org/model-legal-documents/',
    category: 'legal',
    tags: ['term-sheet', 'financing', 'legal'],
    stages: ['seed', 'scale', 'pre_seed'],
    roles: ['founder', 'staff', 'mentor'],
  },
  {
    id: 'cooley-term-sheet-guide',
    type: 'external',
    title_pt: 'Cooley — Guia para founders: navegar um Term Sheet',
    title_en: 'Cooley — Founder Guide: Navigating a Term Sheet',
    desc_pt: 'Checklist mental para ler um term sheet, perceber trade-offs e evitar armadilhas comuns.',
    desc_en: 'Mental checklist to read a term sheet, understand trade-offs, and avoid common pitfalls.',
    url: 'https://www.cooley.com/news/coverage/2020/2020-01-10-the-first-time-founders-ultimate-guide-to-navigating-a-term-sheet',
    category: 'fundraising',
    tags: ['term-sheet', 'negotiation', 'legal'],
    stages: ['seed', 'scale', 'pre_seed'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'edpb-sme-privacy',
    type: 'external',
    title_pt: 'EDPB — Recursos práticos de proteção de dados para PME',
    title_en: 'EDPB — Practical data protection resources for SMEs',
    desc_pt: 'Materiais práticos para GDPR (inclui recursos e exemplos para PME).',
    desc_en: 'Practical GDPR materials (including resources and examples for SMEs).',
    url: 'https://www.edpb.europa.eu/sme-data-protection-guide/practical-resources-for-smes_en',
    category: 'privacy',
    tags: ['gdpr', 'privacy', 'compliance'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff'],
  },
  {
    id: 'enisa-sme-data-security',
    type: 'external',
    title_pt: 'ENISA — Segurança no tratamento de dados pessoais (PME)',
    title_en: 'ENISA — Security of personal data processing (SMEs)',
    desc_pt: 'Guia para PME adotarem medidas de segurança com abordagem baseada em risco.',
    desc_en: 'Guide for SMEs to adopt security measures with a risk-based approach.',
    url: 'https://www.enisa.europa.eu/publications/guidelines-for-smes-on-the-security-of-personal-data-processing',
    category: 'privacy',
    tags: ['security', 'gdpr', 'risk'],
    stages: ['ideation', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff'],
  },
  {
    id: 'firstround-hiring',
    type: 'external',
    title_pt: 'First Round Review — Hiring Engineers (o que procurar e como entrevistar)',
    title_en: 'First Round Review — Hiring Engineers (what to look for & how to interview)',
    desc_pt: 'Qualidades subvalorizadas e perguntas de entrevista úteis para equipas early-stage.',
    desc_en: 'Underrated qualities and practical interview questions for early-stage teams.',
    url: 'https://review.firstround.com/articles/hiring-engineers/',
    category: 'team',
    tags: ['hiring', 'interviews', 'team'],
    stages: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff', 'mentor'],
  },
];

// ── Category labels (i18n) ──
export const CATEGORY_LABELS: Record<string, { pt: string; en: string }> = {
  product: { pt: 'Produto', en: 'Product' },
  market: { pt: 'Mercado', en: 'Market' },
  gtm: { pt: 'Vendas & GTM', en: 'Sales & GTM' },
  finance: { pt: 'Finanças', en: 'Finance' },
  fundraising: { pt: 'Investimento', en: 'Fundraising' },
  legal: { pt: 'Legal', en: 'Legal' },
  ops: { pt: 'Operações', en: 'Operations' },
  team: { pt: 'Equipa', en: 'Team' },
  privacy: { pt: 'Privacidade', en: 'Privacy' },
  metrics: { pt: 'Métricas', en: 'Metrics' },
};

export const STAGE_LABELS: Record<string, { pt: string; en: string }> = {
  ideation: { pt: 'Ideação', en: 'Ideation' },
  pre_seed: { pt: 'Pré-seed', en: 'Pre-seed' },
  seed: { pt: 'Seed', en: 'Seed' },
  scale: { pt: 'Scale', en: 'Scale' },
};

export const ROLE_LABELS: Record<string, { pt: string; en: string }> = {
  founder: { pt: 'Founder', en: 'Founder' },
  mentor: { pt: 'Mentor', en: 'Mentor' },
  staff: { pt: 'Staff', en: 'Staff' },
};

// ── localStorage helpers ──
const FAVS_KEY = 'sl_resources_favs';
const RECENTS_KEY = 'sl_resources_recents';
const MAX_RECENTS = 10;

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]');
  } catch { return []; }
}

export function toggleFavorite(id: string): string[] {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  return favs;
}

export function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch { return []; }
}

export function addRecent(id: string): void {
  const recents = getRecents().filter(r => r !== id);
  recents.unshift(id);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}
