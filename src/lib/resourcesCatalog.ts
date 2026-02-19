export interface CatalogResource {
  id: string;
  title_pt: string;
  title_en: string;
  desc_pt: string;
  desc_en: string;
  url: string;
  type: 'external' | 'internal';
  category: 'produto' | 'mercado' | 'vendas' | 'financas' | 'investimento' | 'legal' | 'operacoes' | 'equipa';
  tags: string[];
  stage: ('ideacao' | 'pre_seed' | 'seed' | 'scale')[];
  roles: ('founder' | 'mentor' | 'staff')[];
}

export const RESOURCES_CATALOG: CatalogResource[] = [
  // ── Internal ──
  {
    id: 'int-glossary',
    title_pt: 'Glossário & FAQ',
    title_en: 'Glossary & FAQ',
    desc_pt: 'Termos-chave do ecossistema e perguntas frequentes.',
    desc_en: 'Key ecosystem terms and frequently asked questions.',
    url: '/help',
    type: 'internal',
    category: 'operacoes',
    tags: ['glossário', 'faq', 'ajuda'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'int-guide',
    title_pt: 'Guia Rápido da Plataforma',
    title_en: 'Platform Quick Guide',
    desc_pt: 'Aprenda a usar a plataforma passo a passo.',
    desc_en: 'Learn how to use the platform step by step.',
    url: '/guide',
    type: 'internal',
    category: 'operacoes',
    tags: ['guia', 'onboarding'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'int-documents',
    title_pt: 'Repositório de Documentos',
    title_en: 'Document Repository',
    desc_pt: 'Ficheiros, templates e submissões num só local.',
    desc_en: 'Files, templates and submissions in one place.',
    url: '/documents',
    type: 'internal',
    category: 'operacoes',
    tags: ['documentos', 'templates'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  {
    id: 'int-mentors',
    title_pt: 'Mentoria & Rede',
    title_en: 'Mentoring & Network',
    desc_pt: 'Encontre mentores e peça orientação especializada.',
    desc_en: 'Find mentors and request expert guidance.',
    url: '/mentors',
    type: 'internal',
    category: 'equipa',
    tags: ['mentoria', 'rede'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'int-workspace',
    title_pt: 'A Minha Startup',
    title_en: 'My Startup',
    desc_pt: 'Objetivos, KPIs, sessões e ações do seu workspace.',
    desc_en: 'Goals, KPIs, sessions and actions in your workspace.',
    url: '/my-workspaces',
    type: 'internal',
    category: 'operacoes',
    tags: ['workspace', 'startup'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'int-settings',
    title_pt: 'Definições do Perfil',
    title_en: 'Profile Settings',
    desc_pt: 'Atualize os seus dados pessoais e preferências.',
    desc_en: 'Update your personal data and preferences.',
    url: '/settings',
    type: 'internal',
    category: 'operacoes',
    tags: ['perfil', 'definições'],
    stage: ['ideacao', 'pre_seed', 'seed', 'scale'],
    roles: ['founder', 'mentor', 'staff'],
  },
  // ── External ──
  {
    id: 'ext-yc-library',
    title_pt: 'YC Startup Library',
    title_en: 'YC Startup Library',
    desc_pt: 'Biblioteca completa de conteúdo da Y Combinator sobre como construir startups.',
    desc_en: 'Comprehensive Y Combinator library on building startups.',
    url: 'https://www.ycombinator.com/library',
    type: 'external',
    category: 'produto',
    tags: ['mvp', 'validação', 'produto'],
    stage: ['ideacao', 'pre_seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-startup-school',
    title_pt: 'Startup School (YC)',
    title_en: 'Startup School (YC)',
    desc_pt: 'Curso gratuito com vídeos e exercícios para founders em fase inicial.',
    desc_en: 'Free course with videos and exercises for early-stage founders.',
    url: 'https://www.startupschool.org/',
    type: 'external',
    category: 'produto',
    tags: ['curso', 'aprendizagem'],
    stage: ['ideacao', 'pre_seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-stripe-atlas',
    title_pt: 'Guias Stripe Atlas',
    title_en: 'Stripe Atlas Guides',
    desc_pt: 'Guias práticos de incorporação, finanças e crescimento para startups.',
    desc_en: 'Practical guides on incorporation, finance, and growth for startups.',
    url: 'https://stripe.com/atlas/guides',
    type: 'external',
    category: 'financas',
    tags: ['finanças', 'incorporação'],
    stage: ['pre_seed', 'seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-lean-canvas',
    title_pt: 'Lean Canvas — Como Criar',
    title_en: 'Lean Canvas — How to Create',
    desc_pt: 'Framework de uma página para validar o modelo de negócio.',
    desc_en: 'One-page framework to validate your business model.',
    url: 'https://leanstack.com/lean-canvas',
    type: 'external',
    category: 'produto',
    tags: ['canvas', 'modelo de negócio'],
    stage: ['ideacao', 'pre_seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-tam-sam-som',
    title_pt: 'TAM / SAM / SOM Explicado',
    title_en: 'TAM / SAM / SOM Explained',
    desc_pt: 'Como dimensionar o mercado e justificar a oportunidade.',
    desc_en: 'How to size your market and justify the opportunity.',
    url: 'https://www.investopedia.com/terms/t/total-addressable-market-tam.asp',
    type: 'external',
    category: 'mercado',
    tags: ['mercado', 'TAM'],
    stage: ['ideacao', 'pre_seed', 'seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-icp',
    title_pt: 'Como Definir o ICP',
    title_en: 'How to Define Your ICP',
    desc_pt: 'Perfil de cliente ideal: passo a passo para B2B e B2C.',
    desc_en: 'Ideal customer profile: step-by-step for B2B and B2C.',
    url: 'https://www.hubspot.com/make-my-persona',
    type: 'external',
    category: 'vendas',
    tags: ['ICP', 'vendas', 'persona'],
    stage: ['ideacao', 'pre_seed', 'seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-unit-economics',
    title_pt: 'Unit Economics para Startups',
    title_en: 'Unit Economics for Startups',
    desc_pt: 'CAC, LTV, payback e como calcular para a sua startup.',
    desc_en: 'CAC, LTV, payback, and how to calculate them for your startup.',
    url: 'https://www.bvp.com/atlas/unit-economics',
    type: 'external',
    category: 'financas',
    tags: ['unit economics', 'CAC', 'LTV'],
    stage: ['pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-pitch-deck',
    title_pt: 'Estrutura de Pitch Deck',
    title_en: 'Pitch Deck Framework',
    desc_pt: 'Estrutura testada para montar um pitch deck convincente.',
    desc_en: 'Proven framework to build a compelling pitch deck.',
    url: 'https://guykawasaki.com/the-only-10-slides-you-need-in-your-pitch/',
    type: 'external',
    category: 'investimento',
    tags: ['pitch', 'investidores'],
    stage: ['pre_seed', 'seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-term-sheet',
    title_pt: 'Term Sheet Básico',
    title_en: 'Term Sheet Basics',
    desc_pt: 'O que esperar e negociar numa term sheet de investimento.',
    desc_en: 'What to expect and negotiate in an investment term sheet.',
    url: 'https://www.ycombinator.com/library/6z-a-guide-to-seed-fundraising',
    type: 'external',
    category: 'investimento',
    tags: ['term sheet', 'fundraising'],
    stage: ['seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-gdpr',
    title_pt: 'RGPD para Startups',
    title_en: 'GDPR for Startups',
    desc_pt: 'Guia prático de conformidade RGPD para empresas em fase inicial.',
    desc_en: 'Practical GDPR compliance guide for early-stage companies.',
    url: 'https://gdpr.eu/checklist/',
    type: 'external',
    category: 'legal',
    tags: ['RGPD', 'legal', 'compliance'],
    stage: ['pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-okrs',
    title_pt: 'OKRs para Startups',
    title_en: 'OKRs for Startups',
    desc_pt: 'Framework de definição e acompanhamento de objetivos.',
    desc_en: 'Framework for setting and tracking objectives.',
    url: 'https://www.whatmatters.com/get-started',
    type: 'external',
    category: 'operacoes',
    tags: ['OKRs', 'objetivos'],
    stage: ['pre_seed', 'seed', 'scale'],
    roles: ['founder', 'staff'],
  },
  {
    id: 'ext-hiring',
    title_pt: 'Contratar os Primeiros Colaboradores',
    title_en: 'Hiring Your First Team',
    desc_pt: 'Estratégias para recrutar cedo sem arruinar a cultura.',
    desc_en: 'Strategies for early hiring without ruining culture.',
    url: 'https://www.ycombinator.com/library/8k-how-to-hire',
    type: 'external',
    category: 'equipa',
    tags: ['equipa', 'recrutamento'],
    stage: ['seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-runway',
    title_pt: 'Gerir Runway e Burn Rate',
    title_en: 'Managing Runway & Burn Rate',
    desc_pt: 'Como calcular e estender o runway da sua startup.',
    desc_en: 'How to calculate and extend your startup runway.',
    url: 'https://www.ycombinator.com/library/Ds-startup-survival',
    type: 'external',
    category: 'financas',
    tags: ['runway', 'burn rate', 'sobrevivência'],
    stage: ['pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-pricing',
    title_pt: 'Estratégias de Pricing',
    title_en: 'Pricing Strategies',
    desc_pt: 'Como definir preços e testar modelos de monetização.',
    desc_en: 'How to set prices and test monetization models.',
    url: 'https://stripe.com/atlas/guides/saas-pricing',
    type: 'external',
    category: 'vendas',
    tags: ['pricing', 'monetização'],
    stage: ['ideacao', 'pre_seed', 'seed'],
    roles: ['founder'],
  },
  {
    id: 'ext-cap-table',
    title_pt: 'Cap Table — O Básico',
    title_en: 'Cap Table — The Basics',
    desc_pt: 'Entenda a estrutura de capital e diluição da sua startup.',
    desc_en: 'Understand your startup capital structure and dilution.',
    url: 'https://carta.com/learn/cap-tables/',
    type: 'external',
    category: 'investimento',
    tags: ['cap table', 'diluição'],
    stage: ['pre_seed', 'seed', 'scale'],
    roles: ['founder'],
  },
  {
    id: 'ext-gtm',
    title_pt: 'Go-to-Market para Startups',
    title_en: 'Go-to-Market for Startups',
    desc_pt: 'Como estruturar a estratégia de entrada no mercado.',
    desc_en: 'How to structure your market entry strategy.',
    url: 'https://www.ycombinator.com/library/6g-how-to-get-your-first-customers',
    type: 'external',
    category: 'vendas',
    tags: ['GTM', 'clientes', 'vendas'],
    stage: ['ideacao', 'pre_seed', 'seed'],
    roles: ['founder'],
  },
];

// ── Category labels (i18n keys) ──
export const CATEGORY_LABELS: Record<string, { pt: string; en: string }> = {
  produto: { pt: 'Produto', en: 'Product' },
  mercado: { pt: 'Mercado', en: 'Market' },
  vendas: { pt: 'Vendas & GTM', en: 'Sales & GTM' },
  financas: { pt: 'Finanças', en: 'Finance' },
  investimento: { pt: 'Investimento', en: 'Investment' },
  legal: { pt: 'Legal', en: 'Legal' },
  operacoes: { pt: 'Operações', en: 'Operations' },
  equipa: { pt: 'Equipa', en: 'Team' },
};

export const STAGE_LABELS: Record<string, { pt: string; en: string }> = {
  ideacao: { pt: 'Ideação', en: 'Ideation' },
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
