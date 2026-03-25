import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Clock, ShieldCheck, Building2, Bell, Database, Users, Users2,
  BarChart3, FileText, BookOpen, Heart, Filter, GitBranch, 
  ClipboardList, Tag, UserPlus, Settings, MapPin, Rocket
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DirectoryItem {
  tab: string;
  label: string;
  icon: React.ElementType;
  description: string;
  group: string;
}

export function AdminMissionControlDirectory() {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();

  const items: DirectoryItem[] = [
    { tab: 'approvals', label: t('admin.approvals'), icon: Clock, description: t('admin.directory.approvalsDesc', { defaultValue: 'Pedidos pendentes de aprovação' }), group: 'operations' },
    { tab: 'compliance', label: t('admin.compliance'), icon: ShieldCheck, description: t('admin.directory.complianceDesc', { defaultValue: 'Check-ins e conformidade' }), group: 'operations' },
    { tab: 'lifecycle', label: t('admin.lifecycle'), icon: GitBranch, description: t('admin.directory.lifecycleDesc', { defaultValue: 'Contratos e ciclo de vida' }), group: 'operations' },
    { tab: 'backoffice', label: t('admin.backoffice.tab'), icon: Building2, description: t('admin.directory.backofficeDesc', { defaultValue: 'Espaços, edifícios e ocupação' }), group: 'operations' },
    { tab: 'data-quality', label: t('dataQuality.title'), icon: Database, description: t('admin.directory.dataQualityDesc', { defaultValue: 'Integridade e qualidade dos dados' }), group: 'operations' },
    { tab: 'funnel', label: t('admin.funnel.tab'), icon: Filter, description: t('admin.directory.funnelDesc', { defaultValue: 'Pipeline CRM e leads' }), group: 'crm' },
    { tab: 'programs-setup', label: t('admin.programsSetup'), icon: Building2, description: t('admin.directory.programsDesc', { defaultValue: 'Programas de aceleração' }), group: 'programs' },
    { tab: 'templates', label: t('admin.templates'), icon: FileText, description: t('admin.directory.templatesDesc', { defaultValue: 'Templates de sessão e documentos' }), group: 'programs' },
    { tab: 'support-materials', label: t('admin.supportMaterials.title'), icon: BookOpen, description: t('admin.directory.supportDesc', { defaultValue: 'Materiais de apoio partilhados' }), group: 'programs' },
    { tab: 'kpis', label: t('admin.kpis'), icon: BarChart3, description: t('admin.directory.kpisDesc', { defaultValue: 'Definições de KPI e métricas' }), group: 'programs' },
    { tab: 'users', label: t('admin.users'), icon: Users, description: t('admin.directory.usersDesc', { defaultValue: 'Gestão de utilizadores' }), group: 'users' },
    { tab: 'mentors', label: t('admin.externalMentors'), icon: Users2, description: t('admin.directory.mentorsDesc', { defaultValue: 'Mentores externos e atribuição' }), group: 'users' },
    { tab: 'analytics', label: t('admin.analytics'), icon: BarChart3, description: t('admin.directory.analyticsDesc', { defaultValue: 'Análises de cohort e relatórios' }), group: 'reports' },
    { tab: 'health', label: t('admin.healthModels'), icon: Heart, description: t('admin.directory.healthDesc', { defaultValue: 'Modelos de saúde do ecossistema' }), group: 'reports' },
  ];

  const handleNavigate = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <Card className="rounded-2xl border-border/60 mb-6">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-medium">
          {t('admin.directory.title', { defaultValue: 'Diretório de Secções' })}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => handleNavigate(item.tab)}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-xl border border-border/40 text-left',
                  'hover:bg-muted/60 hover:border-border/80 transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20'
                )}
              >
                <Icon className="h-4 w-4 text-primary/70 mb-0.5" />
                <span className="text-xs font-medium leading-tight">{item.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{item.description}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
