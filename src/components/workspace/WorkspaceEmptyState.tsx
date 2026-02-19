import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Rocket, Search, Filter, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WorkspaceEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  isFounder?: boolean;
  onCreateStartup?: () => void;
}

export const WorkspaceEmptyState = memo(function WorkspaceEmptyState({
  hasFilters,
  onClearFilters,
  isFounder,
  onCreateStartup,
}: WorkspaceEmptyStateProps) {
  const { t } = useTranslation();
  
  if (hasFilters) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
            {t('emptyState.noMatchingWorkspaces', { defaultValue: 'Sem resultados correspondentes' })}
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-6">
            {t('emptyState.adjustFilters', { defaultValue: 'Tenta ajustar os filtros ou termos de pesquisa.' })}
          </p>
          <Button variant="outline" onClick={onClearFilters} className="gap-2">
            <Filter className="h-4 w-4" />
            {t('emptyState.clearFilters', { defaultValue: 'Limpar Todos os Filtros' })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative flex flex-col items-center justify-center py-16 md:py-20">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          {isFounder ? (
            <Rocket className="h-10 w-10 text-primary-foreground" />
          ) : (
            <Building2 className="h-10 w-10 text-primary-foreground" />
          )}
        </div>
        
        <h3 className="font-heading text-2xl font-bold text-foreground mb-3 text-center">
          {isFounder 
            ? t('emptyState.welcomeFounder', { defaultValue: 'Começa a Tua Jornada' })
            : t('emptyState.welcomeToWorkspace', { defaultValue: 'Bem-vindo aos Espaços de Trabalho' })}
        </h3>
        
        <p className="text-muted-foreground text-center max-w-md mb-4">
          {isFounder
            ? t('emptyState.founderNoStartups', { defaultValue: 'Regista a tua startup para acompanhar o progresso, conectar com mentores e preparar para investimento.' })
            : t('emptyState.noAccess', { defaultValue: 'Ainda não tens acesso a nenhum espaço de trabalho. Contacta um administrador ou junta-te a um programa.' })}
        </p>
        
        {isFounder && (
          <p className="text-sm text-primary/80 font-medium text-center max-w-sm mb-6 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('emptyState.founderValue', { defaultValue: 'Obtém orientação de mentores e acompanha os teus KPIs num único lugar.' })}
          </p>
        )}
        
        {isFounder && onCreateStartup && (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button onClick={onCreateStartup} size="lg" className="gap-2 shadow-lg">
              <Rocket className="h-5 w-5" />
              {t('emptyState.createFirstStartup', { defaultValue: 'Criar a Tua Startup' })}
            </Button>
            <Button variant="ghost" size="lg" className="gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {t('emptyState.explorePrograms', { defaultValue: 'Explorar Programas' })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
