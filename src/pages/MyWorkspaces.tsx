import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
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
import { useWorkspaces, usePrograms, WorkspaceWithDetails, SortOption } from '@/hooks/useWorkspaces';
import { StartupStage, HealthScore } from '@/types/database';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];
const healthScores: HealthScore[] = ['critical', 'at_risk', 'stable', 'healthy', 'thriving'];
const PAGE_SIZE = 15;

export default function MyWorkspaces() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<StartupStage | 'all'>('all');
  const [healthFilter, setHealthFilter] = useState<HealthScore | 'all'>('all');
  const [missingKpi, setMissingKpi] = useState(false);
  const [overdueActions, setOverdueActions] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('urgency');
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination
  const totalItems = workspaces?.length || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedWorkspaces = useMemo(() => {
    if (!workspaces) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return workspaces.slice(start, start + PAGE_SIZE);
  }, [workspaces, currentPage]);

  // Reset to first page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    programFilter !== 'all',
    stageFilter !== 'all',
    healthFilter !== 'all',
    missingKpi,
    overdueActions,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setProgramFilter('all');
    setStageFilter('all');
    setHealthFilter('all');
    setMissingKpi(false);
    setOverdueActions(false);
    handleFilterChange();
  };

  const handleRowClick = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}`);
  };

  const formatKpiMonth = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">Never</span>;
    try {
      return format(new Date(dateStr), 'MMM yyyy');
    } catch {
      return <span className="text-muted-foreground">-</span>;
    }
  };

  const formatMeetingDate = (dateStr: string | null) => {
    if (!dateStr) return <span className="text-muted-foreground">None scheduled</span>;
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return <span className="text-muted-foreground">-</span>;
    }
  };

  return (
    <AppLayout 
      title="My Workspaces"
      subtitle={`${totalItems} startups across your programs`}
    >
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

        <div className="flex gap-2 flex-wrap">
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
                {activeFiltersCount > 0 && (
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

      {/* Workspace Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
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
      ) : workspaces?.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
              No workspaces found
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {search || activeFiltersCount > 0
                ? "Try adjusting your search or filters"
                : "You don't have access to any workspaces yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
