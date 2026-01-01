import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle,
  Clock,
  Plus,
} from 'lucide-react';
import { isToday } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewMode } from '@/components/ui/ViewToggle';
import { QuickFilterChips, QuickFilter } from '@/components/ui/QuickFilterChips';
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard';
import { ConsultorDashboard } from '@/components/dashboard/ConsultorDashboard';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { FounderDashboard } from '@/components/dashboard/FounderDashboard';
import { CreateStartupDialog } from '@/components/founder/CreateStartupDialog';
import { WorkspaceFilters } from '@/components/workspace/WorkspaceFilters';
import { WorkspaceTable } from '@/components/workspace/WorkspaceTable';
import { WorkspacePagination } from '@/components/workspace/WorkspacePagination';
import { WorkspaceEmptyState } from '@/components/workspace/WorkspaceEmptyState';
import { OnboardingTour } from '@/components/ui/OnboardingTour';
import { SavedFiltersDropdown } from '@/components/workspace/SavedFiltersDropdown';
import { useWorkspaces, usePrograms, useMyPendingWorkspaces, WorkspaceWithDetails, SortOption, WorkspaceFilters as WorkspaceFiltersType } from '@/hooks/useWorkspaces';
import { useRealtimeWorkspaces } from '@/hooks/useRealtimeWorkspaces';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { StartupStage, HealthScore } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 15;

export default function MyWorkspaces() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConsultor, isMentor, isAdmin, roles } = useAuth();
  const isFounder = roles.includes('founder');
  const isExternalMentor = roles.includes('mentor_externo') && !isConsultor && !isAdmin;
  
  // Filter state
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<StartupStage | 'all'>('all');
  const [healthFilter, setHealthFilter] = useState<HealthScore | 'all'>('all');
  const [missingKpi, setMissingKpi] = useState(false);
  const [overdueActions, setOverdueActions] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('urgency');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [quickFilters, setQuickFilters] = useState<Record<string, boolean>>({});
  const [showCreateStartup, setShowCreateStartup] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Handle URL filter parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'attention') {
      setQuickFilters({ critical: true, at_risk: true, overdue: true });
      setShowDetailedView(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Enable realtime updates
  useRealtimeWorkspaces();

  // Load saved filters
  const { data: savedFilters } = useSavedFilters();
  
  // Apply default saved filter on load
  useEffect(() => {
    const defaultFilter = savedFilters?.find(f => f.is_default);
    if (defaultFilter && !search && programFilter === 'all' && stageFilter === 'all' && healthFilter === 'all') {
      applyFilters(defaultFilter.filters);
    }
  }, [savedFilters]);

  const applyFilters = useCallback((filters: WorkspaceFiltersType) => {
    setSearch(filters.search || '');
    setProgramFilter(filters.programId || 'all');
    setStageFilter(filters.stage || 'all');
    setHealthFilter(filters.health || 'all');
    setMissingKpi(filters.missingKpi || false);
    setOverdueActions(filters.overdueActions || false);
    if (filters.sortBy) setSortBy(filters.sortBy);
    setCurrentPage(1);
  }, []);

  // Determine which dashboard to show
  const showConsultorDashboard = (isConsultor || isAdmin) && !showDetailedView;
  const showMentorDashboard = isExternalMentor && !showDetailedView;
  const showFounderDashboard = isFounder && !isConsultor && !isAdmin && !isExternalMentor && !showDetailedView;
  const showListView = showDetailedView || (!showConsultorDashboard && !showMentorDashboard && !showFounderDashboard);

  const { data: programs } = usePrograms();
  const { data: workspaces, isLoading, error } = useWorkspaces({
    search,
    programId: programFilter,
    stage: stageFilter,
    health: healthFilter,
    missingKpi,
    overdueActions,
    sortBy,
  });
  
  const { data: pendingWorkspaces } = useMyPendingWorkspaces();

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!workspaces) return null;
    
    const healthCounts = { critical: 0, at_risk: 0, stable: 0, healthy: 0, thriving: 0 };
    let meetingsTodayCount = 0;
    let overdueCount = 0;
    
    workspaces.forEach(w => {
      const health = w.health_score_override || w.health_score || 'stable';
      if (health in healthCounts) {
        healthCounts[health as keyof typeof healthCounts]++;
      }
      if (w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))) {
        meetingsTodayCount++;
      }
      if (w.overdueActionsCount > 0) {
        overdueCount++;
      }
    });
    
    return { healthCounts, meetingsTodayCount, overdueCount };
  }, [workspaces]);

  // Quick filter chips data
  const quickFilterChips: QuickFilter[] = useMemo(() => {
    if (!dashboardStats) return [];
    return [
      { id: 'critical', label: 'Critical', icon: <AlertCircle className="h-3.5 w-3.5" />, count: dashboardStats.healthCounts.critical, variant: 'destructive' as const, active: quickFilters.critical || false },
      { id: 'at_risk', label: 'At Risk', icon: <AlertTriangle className="h-3.5 w-3.5" />, count: dashboardStats.healthCounts.at_risk, variant: 'warning' as const, active: quickFilters.at_risk || false },
      { id: 'overdue', label: 'Overdue Actions', icon: <Clock className="h-3.5 w-3.5" />, count: dashboardStats.overdueCount, variant: 'destructive' as const, active: quickFilters.overdue || false },
      { id: 'meetings_today', label: 'Meetings Today', icon: <Calendar className="h-3.5 w-3.5" />, count: dashboardStats.meetingsTodayCount, variant: 'default' as const, active: quickFilters.meetings_today || false },
    ];
  }, [dashboardStats, quickFilters]);

  // Apply quick filters to workspaces
  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    let filtered = [...workspaces];

    if (quickFilters.critical) {
      filtered = filtered.filter(w => (w.health_score_override || w.health_score) === 'critical');
    }
    if (quickFilters.at_risk) {
      filtered = filtered.filter(w => (w.health_score_override || w.health_score) === 'at_risk');
    }
    if (quickFilters.overdue) {
      filtered = filtered.filter(w => w.overdueActionsCount > 0);
    }
    if (quickFilters.meetings_today) {
      filtered = filtered.filter(w => w.nextMeetingDate && isToday(new Date(w.nextMeetingDate)));
    }

    return filtered;
  }, [workspaces, quickFilters]);

  // Pagination
  const totalItems = filteredWorkspaces.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedWorkspaces = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWorkspaces.slice(start, start + PAGE_SIZE);
  }, [filteredWorkspaces, currentPage]);

  // Callbacks
  const handleFilterChange = useCallback(() => setCurrentPage(1), []);
  
  const handleQuickFilterToggle = useCallback((id: string) => {
    setQuickFilters(prev => ({ ...prev, [id]: !prev[id] }));
    handleFilterChange();
  }, [handleFilterChange]);

  const activeFiltersCount = [
    programFilter !== 'all',
    stageFilter !== 'all',
    healthFilter !== 'all',
    missingKpi,
    overdueActions,
  ].filter(Boolean).length;

  const activeQuickFiltersCount = Object.values(quickFilters).filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setProgramFilter('all');
    setStageFilter('all');
    setHealthFilter('all');
    setMissingKpi(false);
    setOverdueActions(false);
    setQuickFilters({});
    handleFilterChange();
  }, [handleFilterChange]);

  const handleRowClick = useCallback((workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  }, [navigate]);

  // Page title/subtitle
  const getPageTitle = () => {
    if (showDetailedView) return "All Startups";
    if (showConsultorDashboard) return "Portfolio Overview";
    if (showMentorDashboard) return "My Mentorships";
    if (showFounderDashboard) return "My Startup";
    return "My Workspaces";
  };

  const getPageSubtitle = () => {
    if (showDetailedView) return `${totalItems} startup${totalItems !== 1 ? 's' : ''}`;
    if (showConsultorDashboard) return `Managing ${workspaces?.length || 0} startups`;
    if (showMentorDashboard) return `${workspaces?.length || 0} active mentorship${(workspaces?.length || 0) !== 1 ? 's' : ''}`;
    return undefined;
  };

  return (
    <AppLayout 
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
      actions={
        <div className="flex items-center gap-2">
          {(showConsultorDashboard || showMentorDashboard) && (
            <Button variant="outline" size="sm" onClick={() => setShowDetailedView(true)}>
              <FileText className="h-4 w-4 mr-2" />
              View All
            </Button>
          )}
          {showDetailedView && (
            <Button variant="outline" size="sm" onClick={() => setShowDetailedView(false)}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          )}
          {isFounder && !showConsultorDashboard && !showMentorDashboard && (
            <Button onClick={() => setShowCreateStartup(true)} className="gap-2" data-tour="create-workspace">
              <Plus className="h-4 w-4" />
              Create Startup
            </Button>
          )}
        </div>
      }
    >
      <OnboardingTour />
      <CreateStartupDialog open={showCreateStartup} onOpenChange={setShowCreateStartup} />

      {/* Role-Specific Dashboards */}
      {showConsultorDashboard && (
        <ConsultorDashboard workspaces={workspaces || []} isLoading={isLoading} programsCount={programs?.length || 0} />
      )}
      {showMentorDashboard && (
        <MentorDashboard workspaces={workspaces || []} isLoading={isLoading} />
      )}
      {showFounderDashboard && (
        <FounderDashboard 
          workspaces={workspaces || []} 
          pendingWorkspaces={pendingWorkspaces || []} 
          isLoading={isLoading} 
          onCreateStartup={() => setShowCreateStartup(true)} 
        />
      )}

      {/* Detailed List View */}
      {showListView && (
        <>
          {/* Quick Filter Chips */}
          {dashboardStats && !isLoading && (
            <div className="mb-4 animate-fade-in">
              <QuickFilterChips filters={quickFilterChips} onToggle={handleQuickFilterToggle} />
            </div>
          )}

          {/* Filters */}
          <div data-tour="filters">
            <WorkspaceFilters
              search={search}
              onSearchChange={(v) => { setSearch(v); handleFilterChange(); }}
              programFilter={programFilter}
              onProgramFilterChange={(v) => { setProgramFilter(v); handleFilterChange(); }}
              stageFilter={stageFilter}
              onStageFilterChange={(v) => { setStageFilter(v); handleFilterChange(); }}
              healthFilter={healthFilter}
              onHealthFilterChange={(v) => { setHealthFilter(v); handleFilterChange(); }}
              missingKpi={missingKpi}
              onMissingKpiChange={(v) => { setMissingKpi(v); handleFilterChange(); }}
              overdueActions={overdueActions}
              onOverdueActionsChange={(v) => { setOverdueActions(v); handleFilterChange(); }}
              sortBy={sortBy}
              onSortByChange={(v) => { setSortBy(v); handleFilterChange(); }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              programs={programs || []}
              activeFiltersCount={activeFiltersCount}
              activeQuickFiltersCount={activeQuickFiltersCount}
              onClearFilters={clearFilters}
            />
            <div className="mt-2 flex justify-end">
              <SavedFiltersDropdown 
                currentFilters={{ search, programId: programFilter, stage: stageFilter, health: healthFilter, missingKpi, overdueActions, sortBy }}
                onApplyFilter={applyFilters}
              />
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 p-6">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <p className="text-destructive">Failed to load workspaces. Please try again.</p>
              </CardContent>
            </Card>
          ) : filteredWorkspaces.length === 0 ? (
            <WorkspaceEmptyState
              hasFilters={search !== '' || activeFiltersCount > 0 || activeQuickFiltersCount > 0}
              onClearFilters={clearFilters}
              isFounder={isFounder}
              onCreateStartup={() => setShowCreateStartup(true)}
            />
          ) : viewMode === 'card' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {paginatedWorkspaces.map((workspace) => (
                  <WorkspaceCard
                    key={workspace.id}
                    workspace={workspace}
                    onClick={() => handleRowClick(workspace.id)}
                  />
                ))}
              </div>
              <WorkspacePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                variant="compact"
              />
            </>
          ) : (
            <Card>
              <CardContent className="p-0">
                <WorkspaceTable workspaces={paginatedWorkspaces} onRowClick={handleRowClick} />
                <WorkspacePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
