import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Target, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Network,
  Briefcase,
  BarChart3,
  Contact,
  GraduationCap,
  Home,
  UserCircle,
  NotebookPen,
  Shield,
  Cog,
  Lightbulb,
  ArrowRight,
  Rocket,
  Users,
  TrendingUp,
  Clock,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface GuideSection {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface RoleGuide {
  id: string;
  title: string;
  tagline: string;
  color: string;
  icon: React.ElementType;
  mission: string;
  quickStart: string[];
  navigation: GuideSection[];
  tips: string[];
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    id: 'founder',
    title: 'Founder OS',
    tagline: 'Para Empreendedores',
    color: 'text-emerald-600',
    icon: Rocket,
    mission: 'O teu centro de comando diário. Foca-te no que importa hoje para crescer amanhã.',
    quickStart: [
      'Completa o perfil da tua startup',
      'Define os teus primeiros KPIs',
      'Agenda uma sessão com o consultor',
      'Cria as tuas primeiras ações',
    ],
    navigation: [
      { icon: Home, title: 'Início', description: 'O teu painel diário com foco no "Hoje" - ações prioritárias e próximos passos' },
      { icon: Building2, title: 'A Minha Startup', description: 'Visão geral da tua startup, equipa, saúde e progresso' },
      { icon: Target, title: 'Objetivos & KPIs', description: 'Acompanha métricas chave: MRR, utilizadores, runway, etc.' },
      { icon: Calendar, title: 'Sessões & Mentoria', description: 'Agenda e histórico de sessões com consultores e mentores' },
      { icon: CheckSquare, title: 'Ações & Plano', description: 'Lista de tarefas e milestones com prazos' },
      { icon: FileText, title: 'Documentos', description: 'Pitch decks, contratos e ficheiros importantes' },
      { icon: Network, title: 'Rede & Recursos', description: 'Conecta com mentores e acede a recursos' },
    ],
    tips: [
      '🎯 Foca-te em 1-3 ações por dia, não mais',
      '📊 Atualiza KPIs semanalmente para ver tendências',
      '📅 Agenda sessões regularmente - consistência é chave',
      '📝 Documenta aprendizagens após cada sessão',
    ],
  },
  {
    id: 'consultor',
    title: 'Portfolio OS',
    tagline: 'Para Consultores',
    color: 'text-blue-600',
    icon: Briefcase,
    mission: 'Gere o teu portefólio de startups. Identifica riscos, prioriza atenção, maximiza impacto.',
    quickStart: [
      'Revê startups que precisam de atenção',
      'Prepara as sessões da semana',
      'Valida dados e KPIs pendentes',
      'Monitoriza pipeline de novos leads',
    ],
    navigation: [
      { icon: Briefcase, title: 'Portefólio', description: 'Dashboard com startups priorizadas por risco e necessidade de atenção' },
      { icon: Building2, title: 'Startups', description: 'Lista completa de startups atribuídas' },
      { icon: Calendar, title: 'Sessões', description: 'Agenda semanal e preparação de sessões' },
      { icon: CheckSquare, title: 'Ações & Follow-ups', description: 'Ações pendentes e follow-ups por startup' },
      { icon: Contact, title: 'CRM & Pipeline', description: 'Gestão de leads e pipeline de entrada' },
      { icon: GraduationCap, title: 'Programas', description: 'Configuração de programas e cohorts' },
      { icon: BarChart3, title: 'Relatórios', description: 'Analytics e métricas agregadas' },
    ],
    tips: [
      '🔴 Prioriza startups "at-risk" no início do dia',
      '📞 Marca follow-up no fim de cada sessão',
      '📊 Usa frameworks de sessão para consistência',
      '🎯 Define KPIs específicos por fase da startup',
    ],
  },
  {
    id: 'mentor',
    title: 'Mentor Companion',
    tagline: 'Para Mentores Externos',
    color: 'text-purple-600',
    icon: Star,
    mission: 'Partilha a tua expertise. Acompanha startups atribuídas e maximiza o teu impacto.',
    quickStart: [
      'Configura a tua disponibilidade',
      'Aceita pedidos de mentoria',
      'Prepara-te para próximas sessões',
      'Regista notas após cada sessão',
    ],
    navigation: [
      { icon: Home, title: 'Início', description: 'Resumo de sessões e startups atribuídas' },
      { icon: Calendar, title: 'Próximas Sessões', description: 'Agenda de sessões confirmadas' },
      { icon: Building2, title: 'Startups Atribuídas', description: 'Startups onde tens mentoria ativa' },
      { icon: NotebookPen, title: 'Notas & Ações', description: 'Registo de notas e ações por sessão' },
      { icon: Network, title: 'Recursos', description: 'Biblioteca de recursos e frameworks' },
      { icon: UserCircle, title: 'Perfil', description: 'O teu perfil e áreas de expertise' },
    ],
    tips: [
      '🕐 Define horários fixos de disponibilidade',
      '📝 Regista notas imediatamente após sessões',
      '🎯 Foca em 2-3 takeaways por sessão',
      '🤝 Sê específico nas ações que defines',
    ],
  },
  {
    id: 'admin',
    title: 'Ops & Compliance',
    tagline: 'Para Administradores',
    color: 'text-amber-600',
    icon: Shield,
    mission: 'Garante a operação do ecossistema. Gere utilizadores, programas e configurações.',
    quickStart: [
      'Configura integrações (Microsoft Graph)',
      'Cria programas e cohorts',
      'Gere permissões de utilizadores',
      'Monitoriza qualidade de dados',
    ],
    navigation: [
      { icon: Briefcase, title: 'Operações', description: 'Dashboard operacional com métricas chave' },
      { icon: Contact, title: 'CRM', description: 'Pipeline de entrada e gestão de leads' },
      { icon: GraduationCap, title: 'Programas & Cohorts', description: 'Configuração de programas de incubação' },
      { icon: BarChart3, title: 'Relatórios', description: 'Analytics e exportação de dados' },
      { icon: Users, title: 'Utilizadores & Permissões', description: 'Gestão de roles e acessos' },
      { icon: Cog, title: 'Configuração', description: 'Integrações, feature flags e sistema' },
    ],
    tips: [
      '🔒 Revê permissões regularmente',
      '📊 Monitoriza qualidade de dados semanalmente',
      '⚙️ Testa integrações antes de ativar',
      '📋 Documenta processos para a equipa',
    ],
  },
];

export default function QuickGuide() {
  const { t } = useTranslation();
  const { roles, isAdmin, isConsultor, isMentor } = useAuth();
  const isFounder = roles.includes('founder');

  // Determine default tab based on user's role
  const getDefaultTab = () => {
    if (isAdmin) return 'admin';
    if (isConsultor) return 'consultor';
    if (isMentor) return 'mentor';
    if (isFounder) return 'founder';
    return 'founder';
  };

  return (
    <AppLayout 
      title={t('guide.title', 'Guia Rápido')} 
      subtitle={t('guide.subtitle', 'Tudo o que precisas de saber para começar')}
    >
      <div className="p-6 max-w-5xl mx-auto">
        {/* Hero */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {t('guide.welcome', 'Bem-vindo ao FoundersBook')}
                </h2>
                <p className="text-muted-foreground">
                  {t('guide.intro', 'Esta plataforma adapta-se ao teu perfil. Explora o guia abaixo para entenderes como tirar o máximo partido.')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role Tabs */}
        <Tabs defaultValue={getDefaultTab()} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
            {ROLE_GUIDES.map((guide) => (
              <TabsTrigger
                key={guide.id}
                value={guide.id}
                className="flex flex-col items-center gap-1 py-3 px-4 data-[state=active]:bg-card data-[state=active]:shadow-md border border-transparent data-[state=active]:border-border rounded-lg"
              >
                <guide.icon className={cn("h-5 w-5", guide.color)} />
                <span className="text-sm font-medium">{guide.title}</span>
                <span className="text-xs text-muted-foreground">{guide.tagline}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLE_GUIDES.map((guide) => (
            <TabsContent key={guide.id} value={guide.id} className="space-y-6">
              {/* Mission */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", guide.color.replace('text-', 'bg-').replace('600', '100'))}>
                      <guide.icon className={cn("h-6 w-6", guide.color)} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{guide.title}</CardTitle>
                      <CardDescription>{guide.mission}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    {t('guide.quickStart', 'Para Começar')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {guide.quickStart.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">
                          {i + 1}
                        </Badge>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Navigation Guide */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRight className="h-4 w-4" />
                    {t('guide.navigation', 'Navegação')}
                  </CardTitle>
                  <CardDescription>
                    {t('guide.navigationDesc', 'O que encontras em cada secção')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {guide.navigation.map((nav, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <nav.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{nav.title}</p>
                          <p className="text-sm text-muted-foreground">{nav.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card className="bg-warning/10 border-warning/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-warning-foreground">
                    <TrendingUp className="h-4 w-4" />
                    {t('guide.proTips', 'Dicas Pro')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {guide.tips.map((tip, i) => (
                      <div key={i} className="text-sm text-foreground/80">
                        {tip}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer CTA */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>{t('guide.helpLink', 'Precisas de mais ajuda? Consulta o')} <a href="/help" className="text-primary hover:underline">{t('guide.glossary', 'Glossário de Conceitos')}</a></p>
        </div>
      </div>
    </AppLayout>
  );
}