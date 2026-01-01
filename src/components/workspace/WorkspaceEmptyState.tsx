import { memo } from 'react';
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
  if (hasFilters) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            No matching workspaces
          </h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
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
          Welcome to your workspace
        </h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {isFounder
            ? "You don't have any startups yet. Create your first startup to get started with tracking KPIs, managing milestones, and growing your business."
            : "You don't have access to any workspaces yet. Contact an administrator to get assigned to a startup."}
        </p>
        {isFounder && onCreateStartup && (
          <Button onClick={onCreateStartup} className="gap-2">
            <Rocket className="h-4 w-4" />
            Create Your First Startup
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
