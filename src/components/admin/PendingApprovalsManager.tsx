import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Clock, Building2, User, Calendar, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StageBadge } from '@/components/ui/StageBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { StartupStage } from '@/types/database';

interface PendingWorkspace {
  id: string;
  status: string;
  stage: StartupStage;
  created_at: string;
  startup: {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
  } | null;
  program: {
    id: string;
    name: string;
  } | null;
  founder: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function usePendingWorkspaces() {
  return useQuery({
    queryKey: ['pending-workspaces'],
    queryFn: async (): Promise<PendingWorkspace[]> => {
      // First get pending workspaces
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          status,
          stage,
          created_at,
          startup:startups(id, name, description, website),
          program:programs(id, name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!workspaces?.length) return [];

      // Get founders for each workspace
      const workspaceIds = workspaces.map(w => w.id);
      const { data: members } = await supabase
        .from('workspace_users')
        .select(`
          workspace_id,
          profile:profiles(id, email, full_name, avatar_url)
        `)
        .in('workspace_id', workspaceIds)
        .eq('role', 'founder');

      const founderMap = new Map();
      members?.forEach(m => {
        if (m.profile) {
          founderMap.set(m.workspace_id, m.profile);
        }
      });

      return workspaces.map(w => ({
        ...w,
        startup: w.startup as PendingWorkspace['startup'],
        program: w.program as PendingWorkspace['program'],
        founder: founderMap.get(w.id) || null,
      }));
    },
  });
}

function useApproveWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ status: 'active' })
        .eq('id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Startup approved and activated!');
    },
    onError: (e) => toast.error(`Failed to approve: ${e.message}`),
  });
}

function useRejectWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase
        .from('workspaces')
        .update({ status: 'rejected' })
        .eq('id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-workspaces'] });
      toast.success('Application rejected');
    },
    onError: (e) => toast.error(`Failed to reject: ${e.message}`),
  });
}

export function PendingApprovalsManager() {
  const { data: pending, isLoading } = usePendingWorkspaces();
  const approveWorkspace = useApproveWorkspace();
  const rejectWorkspace = useRejectWorkspace();
  
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!pending?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Pending Applications</h3>
          <p className="text-sm text-muted-foreground mt-1">
            All startup applications have been reviewed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
          <p className="text-sm text-muted-foreground">
            {pending.length} startup{pending.length !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {pending.length} pending
        </Badge>
      </div>

      <div className="space-y-3">
        {pending.map((workspace) => (
          <Card key={workspace.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Startup Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-lg truncate">
                      {workspace.startup?.name || 'Unnamed Startup'}
                    </h3>
                    <StageBadge stage={workspace.stage} size="sm" />
                  </div>
                  
                  {workspace.startup?.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {workspace.startup.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {/* Program */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {workspace.program?.name || 'No program'}
                      </Badge>
                    </div>

                    {/* Website */}
                    {workspace.startup?.website && (
                      <a 
                        href={workspace.startup.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Applied {format(new Date(workspace.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>

                  {/* Founder */}
                  {workspace.founder && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={workspace.founder.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {workspace.founder.full_name?.charAt(0) || workspace.founder.email.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-sm">
                        <span className="font-medium">{workspace.founder.full_name || 'No name'}</span>
                        <span className="text-muted-foreground ml-1">({workspace.founder.email})</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => approveWorkspace.mutate(workspace.id)}
                    disabled={approveWorkspace.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectTarget(workspace.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Confirmation */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this startup application? 
              The founder will need to submit a new application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (rejectTarget) {
                  rejectWorkspace.mutate(rejectTarget);
                  setRejectTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}