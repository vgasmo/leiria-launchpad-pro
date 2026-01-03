import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Users2, Shield, ShieldCheck, Building2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExternalMentor {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  ndaAccepted: boolean;
  ndaAcceptedAt: string | null;
  workspaces: Array<{
    id: string;
    startup_name: string;
  }>;
}

function useExternalMentors() {
  return useQuery({
    queryKey: ['admin-external-mentors'],
    queryFn: async (): Promise<ExternalMentor[]> => {
      // Get all users with mentor_externo role
      const { data: mentorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mentor_externo');

      if (rolesError) throw rolesError;
      if (!mentorRoles?.length) return [];

      const mentorIds = mentorRoles.map(r => r.user_id);

      // Get mentor profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', mentorIds);

      if (profilesError) throw profilesError;

      // Get NDA acceptances
      const { data: ndaAcceptances } = await supabase
        .from('mentor_nda_acceptances')
        .select('user_id, accepted_at')
        .in('user_id', mentorIds);

      const ndaMap = new Map(ndaAcceptances?.map(n => [n.user_id, n.accepted_at]) || []);

      // Get workspace assignments
      const { data: assignments } = await supabase
        .from('workspace_users')
        .select(`
          user_id,
          workspace:workspaces!inner(
            id,
            startup:startups(name)
          )
        `)
        .in('user_id', mentorIds)
        .eq('role', 'mentor_externo')
        .eq('active', true);

      const workspaceMap = new Map<string, ExternalMentor['workspaces']>();
      assignments?.forEach(a => {
        const list = workspaceMap.get(a.user_id) || [];
        if (a.workspace) {
          const ws = a.workspace as { id: string; startup: { name: string } | null };
          list.push({
            id: ws.id,
            startup_name: ws.startup?.name || 'Unknown',
          });
        }
        workspaceMap.set(a.user_id, list);
      });

      return (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        ndaAccepted: ndaMap.has(p.id),
        ndaAcceptedAt: ndaMap.get(p.id) || null,
        workspaces: workspaceMap.get(p.id) || [],
      }));
    },
  });
}

function useNonMentorUsers() {
  return useQuery({
    queryKey: ['non-mentor-users'],
    queryFn: async () => {
      // Get all users who are NOT external mentors
      const { data: mentorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mentor_externo');

      const mentorIds = mentorRoles?.map(r => r.user_id) || [];

      const query = supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      const { data, error } = mentorIds.length > 0
        ? await query.not('id', 'in', `(${mentorIds.join(',')})`)
        : await query;

      if (error) throw error;
      return data || [];
    },
  });
}

function useAddMentorRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'mentor_externo' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-external-mentors'] });
      queryClient.invalidateQueries({ queryKey: ['non-mentor-users'] });
    },
  });
}

function useRemoveMentorRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      // Remove role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'mentor_externo');
      if (roleError) throw roleError;

      // Remove from all workspaces where they were an external mentor
      const { error: wsError } = await supabase
        .from('workspace_users')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'mentor_externo');
      if (wsError) throw wsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-external-mentors'] });
      queryClient.invalidateQueries({ queryKey: ['non-mentor-users'] });
    },
  });
}

export function AdminExternalMentorsManager() {
  const { t } = useTranslation();
  const { data: mentors, isLoading } = useExternalMentors();
  const { data: availableUsers } = useNonMentorUsers();
  const addMentorRole = useAddMentorRole();
  const removeMentorRole = useRemoveMentorRole();

  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [removeTarget, setRemoveTarget] = useState<ExternalMentor | null>(null);

  const filteredMentors = mentors?.filter(m => 
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAddMentor = () => {
    if (!selectedUserId) return;
    addMentorRole.mutate(selectedUserId, {
      onSuccess: () => {
        toast.success(t('admin.mentors.mentorAdded'));
        setAddDialogOpen(false);
        setSelectedUserId('');
      },
      onError: () => toast.error(t('admin.mentors.failedToAddMentor')),
    });
  };

  const handleRemoveMentor = () => {
    if (!removeTarget) return;
    removeMentorRole.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success(t('admin.mentors.mentorRemoved'));
        setRemoveTarget(null);
      },
      onError: () => toast.error(t('admin.mentors.failedToRemoveMentor')),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                {t('admin.mentors.title')}
              </CardTitle>
              <CardDescription>{t('admin.mentors.description')}</CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('admin.mentors.addMentor')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.mentors.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredMentors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('admin.mentors.noMentors')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMentors.map((mentor) => (
                <Card key={mentor.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={mentor.avatar_url || undefined} />
                      <AvatarFallback>
                        {mentor.full_name?.charAt(0) || mentor.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">
                          {mentor.full_name || mentor.email}
                        </h3>
                        {mentor.ndaAccepted ? (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                            <ShieldCheck className="h-3 w-3" />
                            {t('admin.mentors.ndaAccepted')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
                            <Shield className="h-3 w-3" />
                            {t('admin.mentors.ndaPending')}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{mentor.email}</p>
                      
                      {mentor.ndaAcceptedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('admin.mentors.ndaAcceptedOn', { date: format(new Date(mentor.ndaAcceptedAt), 'PP') })}
                        </p>
                      )}

                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          {t('admin.mentors.assignedWorkspaces')}:
                        </p>
                        {mentor.workspaces.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {mentor.workspaces.map((ws) => (
                              <Badge key={ws.id} variant="secondary" className="text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {ws.startup_name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {t('admin.mentors.noWorkspaces')}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRemoveTarget(mentor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Mentor Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.mentors.addMentor')}</DialogTitle>
            <DialogDescription>{t('admin.mentors.addMentorDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin.mentors.selectUser')} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMentor} disabled={!selectedUserId || addMentorRole.isPending}>
              {t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Mentor Confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.userManagement.removeRole')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.mentors.confirmRemoveMentor')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMentor}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}