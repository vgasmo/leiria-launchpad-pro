import { memo } from 'react';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { ViewToggle, ViewMode } from '@/components/ui/ViewToggle';
import { StartupStage, HealthScore } from '@/types/database';
import { SortOption } from '@/hooks/useWorkspaces';

const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];
const healthScores: HealthScore[] = ['critical', 'at_risk', 'stable', 'healthy', 'thriving'];

interface Program {
  id: string;
  name: string;
}

interface WorkspaceFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  programFilter: string;
  onProgramFilterChange: (value: string) => void;
  stageFilter: StartupStage | 'all';
  onStageFilterChange: (value: StartupStage | 'all') => void;
  healthFilter: HealthScore | 'all';
  onHealthFilterChange: (value: HealthScore | 'all') => void;
  missingKpi: boolean;
  onMissingKpiChange: (value: boolean) => void;
  overdueActions: boolean;
  onOverdueActionsChange: (value: boolean) => void;
  sortBy: SortOption;
  onSortByChange: (value: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
  programs: Program[];
  activeFiltersCount: number;
  activeQuickFiltersCount: number;
  onClearFilters: () => void;
}

export const WorkspaceFilters = memo(function WorkspaceFilters({
  search,
  onSearchChange,
  programFilter,
  onProgramFilterChange,
  stageFilter,
  onStageFilterChange,
  healthFilter,
  onHealthFilterChange,
  missingKpi,
  onMissingKpiChange,
  overdueActions,
  onOverdueActionsChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  programs,
  activeFiltersCount,
  activeQuickFiltersCount,
  onClearFilters,
}: WorkspaceFiltersProps) {
  return (
    <div className="mb-6 flex flex-col lg:flex-row gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search startups..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <ViewToggle view={viewMode} onChange={onViewModeChange} />

        <Select value={sortBy} onValueChange={(v) => onSortByChange(v as SortOption)}>
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

        <Select value={programFilter} onValueChange={onProgramFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={stageFilter}
          onValueChange={(v) => onStageFilterChange(v as StartupStage | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage} value={stage} className="capitalize">
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={healthFilter}
          onValueChange={(v) => onHealthFilterChange(v as HealthScore | 'all')}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            {healthScores.map((health) => (
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
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 p-0 flex items-center justify-center"
                >
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
                  onCheckedChange={(v) => onMissingKpiChange(!!v)}
                />
                <Label htmlFor="missing-kpi" className="text-sm cursor-pointer">
                  Missing KPI this month
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue-actions"
                  checked={overdueActions}
                  onCheckedChange={(v) => onOverdueActionsChange(!!v)}
                />
                <Label htmlFor="overdue-actions" className="text-sm cursor-pointer">
                  Overdue action items
                </Label>
              </div>
              {(activeFiltersCount > 0 || activeQuickFiltersCount > 0) && (
                <Button variant="ghost" size="sm" className="w-full" onClick={onClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
});
