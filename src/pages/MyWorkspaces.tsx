import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Building2, 
  AlertTriangle, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  FileText,
  Users,
  AlertCircle,
  Clock,
  Plus,
  Rocket
} from 'lucide-react';
import { format, isPast, isThisWeek, isToday } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { Sparkline } from '@/components/ui/Sparkline';
import { ViewToggle, ViewMode } from '@/components/ui/ViewToggle';
import { QuickFilterChips, QuickFilter } from '@/components/ui/QuickFilterChips';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { WorkspaceCard } from '@/components/dashboard/WorkspaceCard';
import { ConsultorDashboard } from '@/components/dashboard/ConsultorDashboard';
import { MentorDashboard } from '@/components/dashboard/MentorDashboard';
import { FounderDashboard } from '@/components/dashboard/FounderDashboard';
import { CreateStartupDialog } from '@/components/founder/CreateStartupDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspaces, usePrograms, useMyPendingWorkspaces, WorkspaceWithDetails, SortOption } from '@/hooks/useWorkspaces';
import { useRealtimeWorkspaces } from '@/hooks/useRealtimeWorkspaces';
import { StartupStage, HealthScore } from '@/types/database';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];
const healthScores: HealthScore[] = ['critical', 'at_risk', 'stable', 'healthy', 'thriving'];
const PAGE_SIZE = 15;

export default function MyWorkspaces() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isConsultor, isMentor, isAdmin, roles } = useAuth();
  const isFounder = roles.includes('founder');
  const isExternalMentor = roles.includes('mentor_externo') && !isConsultor && !isAdmin;
  
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

  // Handle URL filter parameter (e.g., ?filter=attention)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'attention') {
      // Set filters for items needing attention (critical, at_risk, or overdue)
      setQuickFilters({ critical: true, at_risk: true, overdue: true });
      setShowDetailedView(true); // Switch to detailed view when filtering
      // Clear the URL param after applying
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Enable realtime updates
  useRealtimeWorkspaces();

  // Legacy flag for backward compatibility
  const showDashboard = isConsultor || isMentor || isAdmin;

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
  
  // For founders: fetch pending workspaces
  const { data: pendingWorkspaces } = useMyPendingWorkspaces();

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    if (!workspaces) return null;
    
    const healthCounts = {
      critical: 0,
      at_risk: 0,
      stable: 0,
      healthy: 0,
      thriving: 0,
    };
    
    let upcomingMeetingsCount = 0;
    let meetingsTodayCount = 0;
    let needsAttentionCount = 0;
    let overdueCount = 0;
    let missingKpiCount = 0;
    
    workspaces.forEach(w => {
      // Count health scores
      const health = w.health_score_override || w.health_score || 'stable';
      if (health in healthCounts) {
        healthCounts[health as keyof typeof healthCounts]++;
      }
      
      // Count upcoming meetings this week
      if (w.nextMeetingDate && isThisWeek(new Date(w.nextMeetingDate))) {
        upcomingMeetingsCount++;
      }
      
      // Count meetings today
      if (w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))) {
        meetingsTodayCount++;
      }
      
      // Count startups needing attention (critical or at_risk)
      if (health === 'critical' || health === 'at_risk') {
        needsAttentionCount++;
      }

      // Count overdue
      if (w.overdueActionsCount > 0) {
        overdueCount++;
      }

      // Count missing KPI
      if (!w.hasCurrentMonthKpi) {
        missingKpiCount++;
      }
    });
    
    return {
      total: workspaces.length,
      healthCounts,
      upcomingMeetingsCount,
      meetingsTodayCount,
      needsAttentionCount,
      overdueCount,
      missingKpiCount,
    };
  }, [workspaces]);

  // Quick filter chips data
  const quickFilterChips: QuickFilter[] = useMemo(() => {
    if (!dashboardStats) return [];
    return [
      {
        id: 'critical',
        label: 'Critical',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        count: dashboardStats.healthCounts.critical,
        variant: 'destructive' as const,
        active: quickFilters.critical || false,
      },
      {
        id: 'at_risk',
        label: 'At Risk',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        count: dashboardStats.healthCounts.at_risk,
        variant: 'warning' as const,
        active: quickFilters.at_risk || false,
      },
      {
        id: 'overdue',
        label: 'Overdue Actions',
        icon: <Clock className="h-3.5 w-3.5" />,
        count: dashboardStats.overdueCount,
        variant: 'destructive' as const,
        active: quickFilters.overdue || false,
      },
      {
        id: 'meetings_today',
        label: 'Meetings Today',
        icon: <Calendar className="h-3.5 w-3.5" />,
        count: dashboardStats.meetingsTodayCount,
        variant: 'default' as const,
        active: quickFilters.meetings_today || false,
      },
    ];
  }, [dashboardStats, quickFilters]);

  // Apply quick filters to workspaces
  const filteredWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    
    let filtered = [...workspaces];

    if (quickFilters.critical) {
      filtered = filtered.filter(w => 
        (w.health_score_override || w.health_score) === 'critical'
      );
    }
    if (quickFilters.at_risk) {
      filtered = filtered.filter(w => 
        (w.health_score_override || w.health_score) === 'at_risk'
      );
    }
    if (quickFilters.overdue) {
      filtered = filtered.filter(w => w.overdueActionsCount > 0);
    }
    if (quickFilters.meetings_today) {
      filtered = filtered.filter(w => 
        w.nextMeetingDate && isToday(new Date(w.nextMeetingDate))
      );
    }

    return filtered;
  }, [workspaces, quickFilters]);

  // Pagination
  const totalItems = filteredWorkspaces?.length || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedWorkspaces = useMemo(() => {
    if (!filteredWorkspaces) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWorkspaces.slice(start, start + PAGE_SIZE);
  }, [filteredWorkspaces, currentPage]);

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const handleQuickFilterToggle = (id: string) => {
    setQuickFilters(prev => ({ ...prev, [id]: !prev[id] }));
    handleFilterChange();
  };

  const activeFiltersCount = [
    programFilter !== 'all',
    stageFilter !== 'all',
    healthFilter !== 'all',
    missingKpi,
    overdueActions,
  ].filter(Boolean).length;

  const activeQuickFiltersCount = Object.values(quickFilters).filter(Boolean).length;

  const clearFilters = () => {
    setProgramFilter('all');
    setStageFilter('all');
    setHealthFilter('all');
    setMissingKpi(false);
    setOverdueActions(false);
    setQuickFilters({});
    handleFilterChange();
  };

  const handleRowClick = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  };

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">None scheduled</span>;
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return <span className="text-primary font-medium">Today</span>;
      }
      return format(date, 'MMM d, yyyy');
    } catch {
      return <span className="text-muted-foreground">-</span>;
    }
  };

  // Get appropriate title based on role
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
          {/* Toggle between dashboard and list view */}
          {(showConsultorDashboard || showMentorDashboard) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetailedView(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View All
            </Button>
          )}
          {showDetailedView && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetailedView(false)}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          )}
          {isFounder && !showConsultorDashboard && !showMentorDashboard && (
            <Button onClick={() => setShowCreateStartup(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Startup
            </Button>
          )}
        </div>
      }
    >
      {/* Create Startup Dialog */}
      <CreateStartupDialog open={showCreateStartup} onOpenChange={setShowCreateStartup} />

      {/* Role-Specific Dashboards */}
      {showConsultorDashboard && (
        <ConsultorDashboard 
          workspaces={workspaces || []}
          isLoading={isLoading}
          programsCount={programs?.length || 0}
        />
      )}

      {showMentorDashboard && (
        <MentorDashboard 
          workspaces={workspaces || []}
          isLoading={isLoading}
        />
      )}

      {showFounderDashboard && (
        <FounderDashboard 
          workspaces={workspaces || []}
          pendingWorkspaces={pendingWorkspaces || []}
          isLoading={isLoading}
          onCreateStartup={() => setShowCreateStartup(true)}
        />
      )}

      {/* Detailed List View (for filtering/searching) */}
      {showDetailedView && (
        <>
          {/* Quick Filter Chips */}
          {dashboardStats && !isLoading && (
            <div className="mb-4 animate-fade-in">
              <QuickFilterChips 
                filters={quickFilterChips} 
                onToggle={handleQuickFilterToggle}
              />
            </div>
          )}

      {/* Filters */}
      <div className="mb-6 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search startups..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <ViewToggle view={viewMode} onChange={setViewMode} />

          <Select 
            value={sortBy} 
            onValueChange={(v) => { setSortBy(v as SortOption); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[150px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">By Urgency</SelectItem>
              <SelectItem value="meeting">By Next Meeting</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="updated">Last Updated</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={programFilter} 
            onValueChange={(v) => { setProgramFilter(v); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs?.map(program => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={stageFilter} 
            onValueChange={(v) => { setStageFilter(v as StartupStage | 'all'); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map(stage => (
                <SelectItem key={stage} value={stage} className="capitalize">
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={healthFilter} 
            onValueChange={(v) => { setHealthFilter(v as HealthScore | 'all'); handleFilterChange(); }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              {healthScores.map(health => (
                <SelectItem key={health} value={health} className="capitalize">
                  {health.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                More
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="missing-kpi" 
                    checked={missingKpi}
                    onCheckedChange={(v) => { setMissingKpi(!!v); handleFilterChange(); }}
                  />
                  <Label htmlFor="missing-kpi" className="text-sm cursor-pointer">
                    Missing KPI this month
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overdue-actions" 
                    checked={overdueActions}
                    onCheckedChange={(v) => { setOverdueActions(!!v); handleFilterChange(); }}
                  />
                  <Label htmlFor="overdue-actions" className="text-sm cursor-pointer">
                    Overdue action items
                  </Label>
                </div>
                {(activeFiltersCount > 0 || activeQuickFiltersCount > 0) && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={clearFilters}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Workspace Display */}
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
      ) : filteredWorkspaces?.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              No workspaces found
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {search || activeFiltersCount > 0 || activeQuickFiltersCount > 0
                ? "Try adjusting your search or filters"
                : "You don't have access to any workspaces yet"}
            </p>
            {(activeFiltersCount > 0 || activeQuickFiltersCount > 0) && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedWorkspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => handleRowClick(workspace.id)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[200px]">Startup</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-center">Overdue</TableHead>
                  <TableHead>Next Meeting</TableHead>
                  <TableHead className="w-[200px]">Last Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWorkspaces.map((workspace) => (
                  <WorkspaceRow 
                    key={workspace.id} 
                    workspace={workspace} 
                    onClick={() => handleRowClick(workspace.id)}
                    formatMeetingDate={formatMeetingDate}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} workspaces
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card view pagination */}
      {viewMode === 'card' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
        </>
      )}
    </AppLayout>
  );
}

interface WorkspaceRowProps {
  workspace: WorkspaceWithDetails;
  onClick: () => void;
  formatMeetingDate: (date: string | null) => React.ReactNode;
}

function WorkspaceRow({ workspace, onClick, formatMeetingDate }: WorkspaceRowProps) {
  const effectiveHealth = workspace.health_score_override || workspace.health_score;

  const truncateNotes = (notes: string | null, maxLength = 60) => {
    if (!notes) return null;
    return notes.length > maxLength ? notes.slice(0, maxLength) + '...' : notes;
  };

  return (
    <TableRow 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={workspace.startup?.logo_url || undefined} className="object-cover" />
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
              {workspace.startup?.name?.slice(0, 2).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{workspace.startup?.name || 'Unnamed'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-normal">
          {workspace.program?.name || '-'}
        </Badge>
      </TableCell>
      <TableCell>
        <HealthBadge score={effectiveHealth} />
      </TableCell>
      <TableCell className="text-center">
        {workspace.overdueActionsCount > 0 ? (
          <Badge variant="destructive" className="min-w-[2rem]">
            {workspace.overdueActionsCount}
          </Badge>
        ) : (
          <span className="text-muted-foreground">0</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          {formatMeetingDate(workspace.nextMeetingDate)}
        </div>
      </TableCell>
      <TableCell>
        {workspace.lastSession ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 max-w-[180px]">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate text-sm">{workspace.lastSession.title}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[300px]">
              <p className="font-medium">{workspace.lastSession.title}</p>
              <p className="text-xs text-muted-foreground mb-1">
                {format(new Date(workspace.lastSession.scheduled_at), 'MMM d, yyyy')}
              </p>
              {workspace.lastSession.notes && (
                <p className="text-xs">{truncateNotes(workspace.lastSession.notes, 150)}</p>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground text-sm">No sessions</span>
        )}
      </TableCell>
    </TableRow>
  );
}
