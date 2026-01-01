import { FileText, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { usePendingTemplateReviews } from '@/hooks/useTemplates';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export function PendingTemplateReviews() {
  const navigate = useNavigate();
  const { data: pendingReviews, isLoading } = usePendingTemplateReviews();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingReviews?.length) {
    return null;
  }

  const handleNavigate = (workspaceId: string) => {
    navigate(`/workspace/${workspaceId}?tab=templates`);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          Templates Pending Review
          <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
            {pendingReviews.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pendingReviews.slice(0, 5).map((review) => (
          <div
            key={review.id}
            className="flex items-center justify-between p-3 bg-background rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
            onClick={() => handleNavigate(review.workspace_id)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {(review.template as any)?.name || 'Template'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {(review.workspace as any)?.startup?.name || 'Unknown Startup'} • 
                  <span className="ml-1">
                    {formatDistanceToNow(new Date(review.updated_at), { 
                      addSuffix: true, 
                      locale: pt 
                    })}
                  </span>
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {pendingReviews.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{pendingReviews.length - 5} more pending reviews
          </p>
        )}
      </CardContent>
    </Card>
  );
}
