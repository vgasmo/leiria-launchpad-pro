import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

export function PlaybookAnalyticsTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Empty state — honest about data availability */}
      <Card className="border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">
            {t('consultorTools.playbooks.noDataTitle', 'Dados de playbooks ainda não disponíveis')}
          </CardTitle>
          <CardDescription className="max-w-md mx-auto">
            {t('consultorTools.playbooks.noDataDesc', 'As analytics de playbooks serão apresentadas aqui quando existirem deployments ativos. Crie e atribua playbooks a startups para começar a recolher dados.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <Badge variant="outline" className="gap-1">
            <BarChart3 className="h-3 w-3" />
            {t('consultorTools.playbooks.comingSoon', 'Em construção')}
          </Badge>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-muted/30 border-muted">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">
                {t('consultorTools.playbooks.futureFeatureTitle', 'Funcionalidade em desenvolvimento')}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('consultorTools.playbooks.futureFeatureDesc', 
                  'Quando disponível, esta secção mostrará métricas reais de utilização: taxas de conclusão, duração média, e cobertura por fase de startup. Os dados serão derivados das ações e milestones associados a cada playbook.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}