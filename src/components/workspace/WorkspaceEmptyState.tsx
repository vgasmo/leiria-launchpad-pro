import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Rocket, Search, Filter } from 'lucide-react';
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
      <Card className="bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            {t('emptyState.noMatchingWorkspaces')}
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            {t('emptyState.adjustFilters')}
          </p>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            {t('emptyState.clearFilters')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
          {t('emptyState.welcomeToWorkspace')}
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {isFounder
            ? t('emptyState.founderNoStartups')
            : t('emptyState.noAccess')}
        </p>
        {isFounder && onCreateStartup && (
          <Button onClick={onCreateStartup} className="gap-2">
            <Rocket className="h-4 w-4" />
            {t('emptyState.createFirstStartup')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
