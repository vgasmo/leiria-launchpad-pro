import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  X
} from 'lucide-react';
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
import { useWorkspaces, WorkspaceWithDetails } from '@/hooks/useWorkspaces';
import { StartupStage, HealthScore } from '@/types/database';

const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];
const healthScores: HealthScore[] = ['critical', 'at_risk', 'stable', 'healthy', 'thriving'];

export default function MyWorkspaces() {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StartupStage | 'all'>('all');
  const [healthFilter, setHealthFilter] = useState<HealthScore | 'all'>('all');
  const [missingKpi, setMissingKpi] = useState(false);
  const [overdueActions, setOverdueActions] = useState(false);

  const { data: workspaces, isLoading, error } = useWorkspaces({
    search,
    stage: stageFilter,
    health: healthFilter,
    missingKpi,
    overdueActions,
  });

  const activeFiltersCount = [
    stageFilter !== 'all',
    healthFilter !== 'all',
    missingKpi,
    overdueActions,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStageFilter('all');
    setHealthFilter('all');
    setMissingKpi(false);
    setOverdueActions(false);
  };

  return (
    <AppLayout 
      title="My Workspaces"
      subtitle={`${workspaces?.length || 0} startups across your programs`}
    >
      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search startups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select 
            value={stageFilter} 
            onValueChange={(v) => setStageFilter(v as StartupStage | 'all')}
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
            onValueChange={(v) => setHealthFilter(v as HealthScore | 'all')}
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
                Filters
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
                    onCheckedChange={(v) => setMissingKpi(!!v)}
                  />
                  <Label htmlFor="missing-kpi" className="text-sm cursor-pointer">
                    Missing KPI this month
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overdue-actions" 
                    checked={overdueActions}
                    onCheckedChange={(v) => setOverdueActions(!!v)}
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
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Workspace List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workspaces?.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function WorkspaceCard({ workspace }: { workspace: WorkspaceWithDetails }) {
  const effectiveHealth = workspace.health_score_override || workspace.health_score;

  return (
    <Link to={`/workspace/${workspace.id}`}>
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 cursor-pointer animate-fade-in">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {workspace.startup?.name || 'Unnamed Startup'}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {workspace.program?.name}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <StageBadge stage={workspace.stage} />
            <HealthBadge score={effectiveHealth} />
          </div>

          <div className="flex items-center gap-4 text-sm">
            {workspace.overdueActionsCount > 0 ? (
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{workspace.overdueActionsCount} overdue</span>
              </div>
            ) : workspace.pendingActionsCount > 0 ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{workspace.pendingActionsCount} pending</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-health-healthy">
                <CheckCircle2 className="h-4 w-4" />
                <span>All caught up</span>
              </div>
            )}

            {!workspace.hasCurrentMonthKpi && (
              <div className="flex items-center gap-1.5 text-health-at-risk">
                <AlertTriangle className="h-4 w-4" />
                <span>Missing KPI</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
