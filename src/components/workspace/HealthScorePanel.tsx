import { useState } from 'react';
import { RefreshCw, MessageSquare, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRecomputeHealth, useUpdateHealthNotes, type HealthComputationResult } from '@/hooks/useHealthScore';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type HealthScore = Database['public']['Enums']['health_score'];

interface HealthScorePanelProps {
  workspaceId: string;
  healthScore: HealthScore | null;
  healthStatus: string | null;
  healthNotes: string | null;
  canWrite: boolean;
}

export function HealthScorePanel({
  workspaceId,
  healthScore,
  healthStatus,
  healthNotes,
  canWrite,
}: HealthScorePanelProps) {
  const recomputeHealth = useRecomputeHealth(workspaceId);
  const updateHealthNotes = useUpdateHealthNotes(workspaceId);
  
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [editedNotes, setEditedNotes] = useState(healthNotes || '');
  const [lastComputation, setLastComputation] = useState<HealthComputationResult | null>(null);

  const handleRecompute = async () => {
    try {
      const result = await recomputeHealth.mutateAsync();
      setLastComputation(result.computation);
      toast.success('Health score recomputed');
    } catch {
      toast.error('Failed to recompute health score');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await updateHealthNotes.mutateAsync(editedNotes || null);
      toast.success('Health notes saved');
      setShowNotesEditor(false);
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleCancelNotes = () => {
    setEditedNotes(healthNotes || '');
    setShowNotesEditor(false);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'green': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'red': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Health Score</CardTitle>
          {canWrite && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRecompute}
              disabled={recomputeHealth.isPending}
              className="h-7 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${recomputeHealth.isPending ? 'animate-spin' : ''}`} />
              Recompute
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Display */}
        <div className="flex items-center gap-3">
          <HealthBadge score={healthScore} size="lg" />
          {healthStatus && (
            <Badge className={`${getStatusColor(healthStatus)} border-0`}>
              {healthStatus.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Last Computation Results */}
        {lastComputation && (
          <div className="text-xs space-y-1 p-2 bg-muted/50 rounded-lg">
            <div className="font-medium">Latest computation ({lastComputation.score}/100 points):</div>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              {lastComputation.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Health Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Health Notes</span>
            {canWrite && !showNotesEditor && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowNotesEditor(true)}
                className="h-6 text-xs"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {healthNotes ? 'Edit' : 'Add note'}
              </Button>
            )}
          </div>

          {showNotesEditor ? (
            <div className="space-y-2">
              <Textarea
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
                placeholder="Add context about the health score (e.g., reasons for override, action plan)..."
                rows={3}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleSaveNotes}
                  disabled={updateHealthNotes.isPending}
                  className="h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancelNotes}
                  className="h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : healthNotes ? (
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
              {healthNotes}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              No notes added
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
