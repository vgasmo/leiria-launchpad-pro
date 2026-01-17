import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { EcosystemTable } from '@/components/ecosystem/EcosystemTable';
import { EcosystemFilters, type EcosystemFiltersState } from '@/components/ecosystem/EcosystemFilters';
import { useEcosystemItems } from '@/hooks/useEcosystemItems';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { ContentSkeleton } from '@/components/ui/ContentSkeleton';
import { Globe2 } from 'lucide-react';

export default function Ecosystem() {
  const { t } = useTranslation();
  const { isAdmin, isConsultor, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<EcosystemFiltersState>({
    search: '',
    programId: 'all',
    stage: 'all',
    healthScore: 'all',
    ownerId: 'all',
    buildingId: 'all',
    incubationTypeId: 'all',
    categoryId: 'all',
    tagId: 'all',
    needsAttention: false,
  });

  const { data: items, isLoading } = useEcosystemItems(filters);

  // Only staff can access
  if (!authLoading && !isAdmin && !isConsultor) {
    return (
      <AppLayout>
        <AccessDenied />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title={t('ecosystem.title', 'Ecosystem Command Center')}
          subtitle={t('ecosystem.description', 'Unified view of all workspaces and leads')}
          icon={<Globe2 className="h-6 w-6" />}
        />

        <EcosystemFilters filters={filters} onChange={setFilters} />

        {isLoading ? (
          <ContentSkeleton type="list" count={10} />
        ) : (
          <EcosystemTable 
            items={items || []} 
            onOpenItem={(item) => {
              if (item.item_type === 'workspace' && item.workspace_id) {
                navigate(`/workspace/${item.workspace_id}`);
              }
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
