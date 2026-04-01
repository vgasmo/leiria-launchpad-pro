import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, X, Clock, Building2, User, Calendar, ExternalLink, UserCheck, Mail } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StageBadge } from '@/components/ui/StageBadge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabaseClient';
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

interface PendingUser {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

function usePendingWorkspaces() {
  return useQuery({
    queryKey: ['pending-workspaces'],
    queryFn: async (): Promise<PendingWorkspace[]> => {
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

function usePendingUsers() {
  return useQuery({
    queryKey: ['pending-user-accounts'],
    queryFn: async (): Promise<PendingUser[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at, account_status')
        .eq('account_status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!profiles?.length) return [];

      const userIds = profiles.map(p => p.id);
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesMap = new Map<string, string[]>();
      rolesData?.forEach(r => {
        if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
        rolesMap.get(r.user_id)!.push(r.role);
      });

      return profiles.map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        roles: rolesMap.get(p.id) || [],
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
    },
    onError: (e) => toast.error(`Failed to reject: ${e.message}`),
  });
}

export function PendingApprovalsManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: pendingWorkspaces, isLoading: loadingWs } = usePendingWorkspaces();
  const { data: pendingUsers, isLoading: loadingUsers } = usePendingUsers();
  const approveWorkspace = useApproveWorkspace();
  const rejectWorkspace = useRejectWorkspace();
  
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const handleApprove = (workspaceId: string) => {
    approveWorkspace.mutate(workspaceId, {
      onSuccess: () => toast.success(t('admin.startupApproved')),
    });
  };

  const handleReject = (workspaceId: string) => {
    rejectWorkspace.mutate(workspaceId, {
      onSuccess: () => toast.success(t('admin.applicationRejected')),
    });
    setRejectTarget(null);
  };

  const handleApproveUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: 'approved' })
      .eq('id', userId);
    if (error) {
      toast.error('Erro ao aprovar conta');
    } else {
      toast.success('Conta aprovada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['pending-user-accounts'] });
    }
  };

  const handleSuspendUser = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ account_status: 'suspended' })
      .eq('id', userId);
    if (error) {
      toast.error('Erro ao suspender conta');
    } else {
      toast.success('Conta suspensa');
      queryClient.invalidateQueries({ queryKey: ['pending-user-accounts'] });
    }
  };

  const isLoading = loadingWs || loadingUsers;
  const hasWorkspaces = !!pendingWorkspaces?.length;
  const hasUsers = !!pendingUsers?.length;
  const totalPending = (pendingWorkspaces?.length || 0) + (pendingUsers?.length || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasWorkspaces && !hasUsers) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{t('admin.noPendingApprovals', { defaultValue: 'Sem Candidaturas Pendentes' })}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.allReviewed', { defaultValue: 'Todas as candidaturas foram revistas.' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('admin.pendingApprovals', { defaultValue: 'Aprovações Pendentes' })}</h2>
          <p className="text-sm text-muted-foreground">
            {totalPending} {totalPending === 1 ? 'item pendente' : 'itens pendentes'}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Clock className="h-3.5 w-3.5 mr-1" />
          {totalPending}
        </Badge>
      </div>

      {/* Pending User Accounts */}
      {hasUsers && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Contas de Utilizador Pendentes ({pendingUsers!.length})
          </h3>
          {pendingUsers!.map((user) => {
            const initials = user.full_name
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{user.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {user.roles.map(role => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {t(`roles.${role}`, role)}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendUser(user.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('admin.reject', { defaultValue: 'Rejeitar' })}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveUser(user.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t('admin.approve', { defaultValue: 'Aprovar' })}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Startup Applications */}
      {hasWorkspaces && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Candidaturas de Startups Pendentes ({pendingWorkspaces!.length})
          </h3>
          {pendingWorkspaces!.map((workspace) => (
            <Card key={workspace.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
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
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {workspace.program?.name || 'No program'}
                        </Badge>
                      </div>
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
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(workspace.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>

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

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(workspace.id)}
                      disabled={approveWorkspace.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('admin.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectTarget(workspace.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('admin.reject')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Confirmation */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.rejectApplication')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.rejectConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (rejectTarget) {
                  handleReject(rejectTarget);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}