import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, UserPlus, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { StageBadge } from '@/components/ui/StageBadge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { StartupStage, HealthScore } from '@/types/database';

export function AdminWorkspacesManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [workspaceToBlock, setWorkspaceToBlock] = useState<{ id: string; name: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [selectedStartup, setSelectedStartup] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStage, setSelectedStage] = useState<StartupStage>('ideation');
  const [selectedFounder, setSelectedFounder] = useState('');
  const [founderSearch, setFounderSearch] = useState('');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          startup:startups(id, name, logo_url),
          program:programs(id, name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: startups } = useQuery({
    queryKey: ['admin-startups-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('startups').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['admin-programs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['admin-profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, email, full_name, avatar_url').order('email');
      if (error) throw error;
      return data;
    },
  });

  const filteredProfiles = profiles?.filter(p => 
    !founderSearch || 
    p.email.toLowerCase().includes(founderSearch.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(founderSearch.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (data: { startup_id: string; program_id: string; stage: StartupStage; founder_id?: string }) => {
      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ startup_id: data.startup_id, program_id: data.program_id, stage: data.stage })
        .select('id')
        .single();
      if (wsError) throw wsError;

      // If founder selected, assign them
      if (data.founder_id && workspace) {
        const { error: userError } = await supabase
          .from('workspace_users')
          .insert({ workspace_id: workspace.id, user_id: data.founder_id, role: 'founder', active: true });
        if (userError) throw userError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      toast.success('Workspace created');
      resetForm();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workspaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      toast.success(t('admin.workspacesManager.deleted'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ workspaceId, reason }: { workspaceId: string; reason?: string }) => {
      const { error } = await supabase.rpc('block_workspace', {
        _workspace_id: workspaceId,
        _reason: reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      toast.success(t('admin.workspacesManager.blocked'));
      setBlockDialogOpen(false);
      setWorkspaceToBlock(null);
      setBlockReason('');
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const unblockMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase.rpc('unblock_workspace', {
        _workspace_id: workspaceId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      toast.success(t('admin.workspacesManager.unblocked'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const resetForm = () => {
    setSelectedStartup('');
    setSelectedProgram('');
    setSelectedStage('ideation');
    setSelectedFounder('');
    setFounderSearch('');
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStartup || !selectedProgram) {
      toast.error('Please select a startup and program');
      return;
    }
    createMutation.mutate({
      startup_id: selectedStartup,
      program_id: selectedProgram,
      stage: selectedStage,
      founder_id: selectedFounder || undefined,
    });
  };

  const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];

  const selectedFounderProfile = profiles?.find(p => p.id === selectedFounder);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Workspaces</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Workspace</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Startup *</Label>
                <Select value={selectedStartup} onValueChange={setSelectedStartup}>
                  <SelectTrigger><SelectValue placeholder="Select startup" /></SelectTrigger>
                  <SelectContent>
                    {startups?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program *</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                  <SelectContent>
                    {programs?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Initial Stage</Label>
                <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as StartupStage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Founder Assignment */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Assign Founder (optional)
                </Label>
                {selectedFounder ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedFounderProfile?.avatar_url || undefined} />
                      <AvatarFallback>{selectedFounderProfile?.email?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFounderProfile?.full_name || selectedFounderProfile?.email}</p>
                      {selectedFounderProfile?.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{selectedFounderProfile?.email}</p>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFounder('')}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input 
                      placeholder="Search by email or name..." 
                      value={founderSearch}
                      onChange={(e) => setFounderSearch(e.target.value)}
                    />
                    {founderSearch && (
                      <div className="max-h-32 overflow-y-auto border rounded-md">
                        {filteredProfiles?.slice(0, 5).map(profile => (
                          <button
                            key={profile.id}
                            type="button"
                            className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                            onClick={() => { setSelectedFounder(profile.id); setFounderSearch(''); }}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{profile.email.slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm truncate">{profile.full_name || profile.email}</p>
                              {profile.full_name && <p className="text-xs text-muted-foreground truncate">{profile.email}</p>}
                            </div>
                          </button>
                        ))}
                        {filteredProfiles?.length === 0 && (
                          <p className="p-2 text-sm text-muted-foreground">No users found</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.workspacesManager.startup')}</TableHead>
                <TableHead>{t('admin.workspacesManager.program')}</TableHead>
                <TableHead>{t('admin.workspacesManager.stage')}</TableHead>
                <TableHead>{t('admin.workspacesManager.health')}</TableHead>
                <TableHead>{t('admin.workspacesManager.status')}</TableHead>
                <TableHead className="w-32">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces?.map((ws) => {
                const isBlocked = !!(ws as any).blocked_at;
                const startupName = (ws.startup as { name: string } | null)?.name || '-';
                return (
                  <TableRow key={ws.id} className={isBlocked ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 rounded">
                          <AvatarImage src={(ws.startup as { logo_url: string | null } | null)?.logo_url || undefined} />
                          <AvatarFallback className="rounded text-xs">
                            {startupName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {startupName}
                      </div>
                    </TableCell>
                    <TableCell>{(ws.program as { name: string } | null)?.name || '-'}</TableCell>
                    <TableCell><StageBadge stage={ws.stage} /></TableCell>
                    <TableCell><HealthBadge score={(ws.health_score_override || ws.health_score) as HealthScore | null} /></TableCell>
                    <TableCell>
                      {isBlocked ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          {t('admin.workspacesManager.blockedStatus')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t('admin.workspacesManager.activeStatus')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isBlocked ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => unblockMutation.mutate(ws.id)}
                            disabled={unblockMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('admin.workspacesManager.unblock')}
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setWorkspaceToBlock({ id: ws.id, name: startupName });
                              setBlockDialogOpen(true);
                            }}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            {t('admin.workspacesManager.block')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ws.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {workspaces?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t('admin.workspacesManager.noWorkspaces')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Block Workspace Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.workspacesManager.blockTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.workspacesManager.blockDescription', { name: workspaceToBlock?.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.workspacesManager.blockReason')}</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder={t('admin.workspacesManager.blockReasonPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => workspaceToBlock && blockMutation.mutate({ workspaceId: workspaceToBlock.id, reason: blockReason })}
              disabled={blockMutation.isPending}
            >
              <Ban className="h-4 w-4 mr-2" />
              {blockMutation.isPending ? t('common.loading') : t('admin.workspacesManager.confirmBlock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
