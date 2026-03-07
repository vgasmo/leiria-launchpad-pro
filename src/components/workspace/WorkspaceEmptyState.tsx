import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Rocket, Search, Filter, Shield, Clock } from 'lucide-react';
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
}: WorkspaceEmptyStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
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

  // Founder empty state — claim-first messaging (route gate should prevent reaching here, 
  // but this serves as a fallback safety net)
  if (isFounder) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <CardContent className="relative flex flex-col items-center justify-center py-16 md:py-20">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <Rocket className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <h3 className="font-heading text-2xl font-bold text-foreground mb-3 text-center">
            {t('founder.claimFirst.title', { defaultValue: 'Bem-vindo à plataforma' })}
          </h3>
          
          <p className="text-muted-foreground text-center max-w-md mb-4">
            {t('founder.claimFirst.desc', { defaultValue: 'Esta plataforma é apenas por convite. A sua startup pode já estar preparada no sistema. Vamos verificar e associá-la à sua conta.' })}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-primary/80 font-medium text-center max-w-sm mb-6">
            <Shield className="h-4 w-4 shrink-0" />
            {t('claimStartup.inviteOnlyNote', { defaultValue: 'Plataforma apenas por convite. A verificação é rápida e segura.' })}
          </div>
          
          <Button onClick={() => navigate('/claim-startup')} size="lg" className="gap-2 shadow-lg">
            <Rocket className="h-5 w-5" />
            {t('founder.claimFirst.cta', { defaultValue: 'Verificar a Minha Startup' })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Non-founder empty state
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="relative flex flex-col items-center justify-center py-16 md:py-20">
        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
          <Building2 className="h-10 w-10 text-primary-foreground" />
        </div>
        
        <h3 className="font-heading text-2xl font-bold text-foreground mb-3 text-center">
          {t('emptyState.welcomeToWorkspace', { defaultValue: 'Bem-vindo aos Espaços de Trabalho' })}
        </h3>
        
        <p className="text-muted-foreground text-center max-w-md mb-4">
          {t('emptyState.noAccess', { defaultValue: 'Ainda não tens acesso a nenhum espaço de trabalho. Contacta um administrador ou junta-te a um programa.' })}
        </p>
      </CardContent>
    </Card>
  );
});
