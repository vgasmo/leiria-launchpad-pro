import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, Download, Building2, Calendar, User, X, Plus, 
  ChevronDown, Ban, CheckCircle, ExternalLink, Trash2, AlertTriangle 
} from 'lucide-react';
import { StageBadge } from '@/components/ui/StageBadge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { StartupStage } from '@/types/database';

const STAGES: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];

interface BackofficeItem {
  workspace_id: string;
  startup_id: string | null;
  startup_name: string;
  startup_nif: string | null;
  startup_contact_email: string | null;
  program_id: string | null;
  program_name: string | null;
  stage: string;
  status: string;
  health_score: number | null;
  assigned_consultant_id: string | null;
  assigned_consultant_name: string | null;
  next_session_date: string | null;
  last_checkin_date: string | null;
  created_at: string;
}

export function AdminBackoffice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [consultantFilter, setConsultantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openConsultorPopover, setOpenConsultorPopover] = useState<string | null>(null);
  const [consultorSearch, setConsultorSearch] = useState('');
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [workspaceToBlock, setWorkspaceToBlock] = useState<{ id: string; name: string } | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Fetch unified backoffice data
  const { data: backofficeData, isLoading } = useQuery({
    queryKey: ['backoffice-unified'],
    queryFn: async (): Promise<BackofficeItem[]> => {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('id, stage, status, health_score, assigned_consultor_id, created_at, startup_id, program_id')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!workspaces || workspaces.length === 0) return [];

      const workspaceIds = workspaces.map(w => w.id);
      const startupIds = workspaces.map(w => w.startup_id).filter(Boolean) as string[];
      const programIds = [...new Set(workspaces.map(w => w.program_id).filter(Boolean))] as string[];
      const consultantIds = [...new Set(workspaces.map(w => w.assigned_consultor_id).filter(Boolean))] as string[];

      const [startupsRes, programsRes, consultantsRes, sessionsRes, checkinsRes] = await Promise.all([
        startupIds.length > 0
          ? supabase.from('startups').select('id, name, nif, main_contact_email').in('id', startupIds)
          : Promise.resolve({ data: [] }),
        programIds.length > 0
          ? supabase.from('programs').select('id, name').in('id', programIds)
          : Promise.resolve({ data: [] }),
        consultantIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', consultantIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('sessions')
          .select('workspace_id, scheduled_at')
          .in('workspace_id', workspaceIds)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true }),
        supabase
          .from('checkin_instances')
          .select('workspace_id, submitted_at')
          .in('workspace_id', workspaceIds)
          .eq('status', 'submitted')
          .order('submitted_at', { ascending: false }),
      ]);

      const startupMap = new Map((startupsRes.data || []).map(s => [s.id, s]));
      const programMap = new Map((programsRes.data || []).map(p => [p.id, p.name]));
      const consultantMap = new Map((consultantsRes.data || []).map(c => [c.id, c.full_name]));

      const sessionMap: Record<string, string> = {};
      (sessionsRes.data || []).forEach(s => {
        if (!sessionMap[s.workspace_id]) {
          sessionMap[s.workspace_id] = s.scheduled_at;
        }
      });

      const checkinMap: Record<string, string> = {};
      (checkinsRes.data || []).forEach(c => {
        if (c.submitted_at && !checkinMap[c.workspace_id]) {
          checkinMap[c.workspace_id] = c.submitted_at;
        }
      });

      return workspaces.map(w => {
        const startup = startupMap.get(w.startup_id);
        return {
          workspace_id: w.id,
          startup_id: w.startup_id,
          startup_name: startup?.name || t('common.unknown', 'Unknown'),
          startup_nif: startup?.nif || null,
          startup_contact_email: startup?.main_contact_email || null,
          program_id: w.program_id,
          program_name: w.program_id ? programMap.get(w.program_id) || null : null,
          stage: w.stage as string,
          status: w.status,
          health_score: typeof w.health_score === 'number' ? w.health_score : null,
          assigned_consultant_id: w.assigned_consultor_id,
          assigned_consultant_name: w.assigned_consultor_id ? consultantMap.get(w.assigned_consultor_id) || null : null,
          next_session_date: sessionMap[w.id] || null,
          last_checkin_date: checkinMap[w.id] || null,
          created_at: w.created_at,
        };
      });
    },
  });

  // Fetch programs and consultants for filters
  const { data: programs } = useQuery({
    queryKey: ['programs-list'],
    queryFn: async () => {
      const { data } = await supabase.from('programs').select('id, name').order('name');
      return data || [];
    },
  });

  const { data: consultants } = useQuery({
    queryKey: ['consultants-list'],
    queryFn: async () => {
      const { data: roleData } = await supabase.from('user_roles').select('user_id').eq('role', 'consultor');
      if (!roleData?.length) return [];
      const userIds = roleData.map(r => r.user_id);
      const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds);
      return data || [];
    },
  });

  // Mutations
  const changeStageMutation = useMutation({
    mutationFn: async ({ workspaceId, stage }: { workspaceId: string; stage: StartupStage }) => {
      const { error } = await supabase.from('workspaces').update({ stage }).eq('id', workspaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-unified'] });
      toast.success(t('admin.backoffice.stageUpdated', 'Stage updated'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const assignConsultorMutation = useMutation({
    mutationFn: async ({ workspaceId, consultorId }: { workspaceId: string; consultorId: string }) => {
      // Update assigned_consultor_id on workspace
      const { error } = await supabase.from('workspaces').update({ assigned_consultor_id: consultorId }).eq('id', workspaceId);
      if (error) throw error;
      // Also ensure workspace_users entry
      await supabase.from('workspace_users').delete().eq('workspace_id', workspaceId).eq('role', 'consultor');
      await supabase.from('workspace_users').insert({ workspace_id: workspaceId, user_id: consultorId, role: 'consultor', active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-unified'] });
      toast.success(t('admin.backoffice.consultantAssigned', 'Consultant assigned'));
      setOpenConsultorPopover(null);
      setConsultorSearch('');
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const removeConsultorMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      await supabase.from('workspaces').update({ assigned_consultor_id: null }).eq('id', workspaceId);
      await supabase.from('workspace_users').delete().eq('workspace_id', workspaceId).eq('role', 'consultor');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-unified'] });
      toast.success(t('admin.backoffice.consultantRemoved', 'Consultant removed'));
      setOpenConsultorPopover(null);
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const blockMutation = useMutation({
    mutationFn: async ({ workspaceId, reason }: { workspaceId: string; reason?: string }) => {
      const { error } = await supabase.rpc('block_workspace', { _workspace_id: workspaceId, _reason: reason || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-unified'] });
      toast.success(t('admin.backoffice.workspaceBlocked', 'Workspace blocked'));
      setBlockDialogOpen(false);
      setWorkspaceToBlock(null);
      setBlockReason('');
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const unblockMutation = useMutation({
    mutationFn: async (workspaceId: string) => {
      const { error } = await supabase.rpc('unblock_workspace', { _workspace_id: workspaceId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backoffice-unified'] });
      toast.success(t('admin.backoffice.workspaceUnblocked', 'Workspace unblocked'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  // Apply filters
  const filteredData = useMemo(() => {
    if (!backofficeData) return [];
    
    return backofficeData.filter(item => {
      const matchesSearch = search.trim() === '' ||
        item.startup_name.toLowerCase().includes(search.toLowerCase()) ||
        item.program_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.startup_nif?.toLowerCase().includes(search.toLowerCase()) ||
        item.startup_contact_email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStage = stageFilter === 'all' || item.stage === stageFilter;
      const matchesProgram = programFilter === 'all' || item.program_id === programFilter;
      const matchesConsultant = consultantFilter === 'all' || item.assigned_consultant_id === consultantFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStage && matchesProgram && matchesConsultant && matchesStatus;
    });
  }, [backofficeData, search, stageFilter, programFilter, consultantFilter, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setStageFilter('all');
    setProgramFilter('all');
    setConsultantFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = search || stageFilter !== 'all' || programFilter !== 'all' || consultantFilter !== 'all' || statusFilter !== 'all';

  const handleExport = () => {
    const csvContent = [
      [t('admin.backoffice.startup'), t('admin.backoffice.nif'), t('admin.backoffice.program'), t('admin.backoffice.stage'), t('admin.backoffice.status'), t('admin.backoffice.health'), t('admin.backoffice.consultant'), t('admin.backoffice.nextSession'), t('admin.backoffice.lastCheckin')].join(','),
      ...filteredData.map(item => [
        `"${item.startup_name}"`,
        `"${item.startup_nif || ''}"`,
        `"${item.program_name || ''}"`,
        item.stage,
        item.status,
        item.health_score?.toString() || '',
        `"${item.assigned_consultant_name || ''}"`,
        item.next_session_date ? format(new Date(item.next_session_date), 'yyyy-MM-dd') : '',
        item.last_checkin_date ? format(new Date(item.last_checkin_date), 'yyyy-MM-dd') : '',
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backoffice-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const filteredConsultors = consultants?.filter(c =>
    !consultorSearch ||
    c.email?.toLowerCase().includes(consultorSearch.toLowerCase()) ||
    c.full_name?.toLowerCase().includes(consultorSearch.toLowerCase())
  );

  const getHealthColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('admin.backoffice.title', 'Backoffice')}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.backoffice.searchPlaceholder', 'Search by name, NIF, email...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('admin.backoffice.stage', 'Stage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.backoffice.allStages', 'All Stages')}</SelectItem>
              {STAGES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('admin.backoffice.program', 'Program')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.backoffice.allPrograms', 'All Programs')}</SelectItem>
              {programs?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={consultantFilter} onValueChange={setConsultantFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('admin.backoffice.consultant', 'Consultant')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.backoffice.allConsultants', 'All Consultants')}</SelectItem>
              {consultants?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.full_name || c.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t('admin.backoffice.status', 'Status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.backoffice.allStatuses', 'All')}</SelectItem>
              <SelectItem value="active">{t('admin.backoffice.active', 'Active')}</SelectItem>
              <SelectItem value="blocked">{t('admin.backoffice.blocked', 'Blocked')}</SelectItem>
              <SelectItem value="archived">{t('admin.backoffice.archived', 'Archived')}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t('common.clear', 'Clear')}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredData.length} {t('admin.backoffice.startups', 'startups')}</span>
          <span>•</span>
          <span>{filteredData.filter(d => d.status === 'active').length} {t('admin.backoffice.active', 'active')}</span>
          <span>•</span>
          <span>{filteredData.filter(d => d.health_score !== null && d.health_score < 50).length} {t('admin.backoffice.needAttention', 'need attention')}</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.backoffice.startup', 'Startup')}</TableHead>
                  <TableHead>{t('admin.backoffice.program', 'Program')}</TableHead>
                  <TableHead>{t('admin.backoffice.stage', 'Stage')}</TableHead>
                  <TableHead>{t('admin.backoffice.health', 'Health')}</TableHead>
                  <TableHead>{t('admin.backoffice.consultant', 'Consultant')}</TableHead>
                  <TableHead>{t('admin.backoffice.nextSession', 'Next Session')}</TableHead>
                  <TableHead>{t('admin.backoffice.status', 'Status')}</TableHead>
                  <TableHead>{t('admin.backoffice.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('admin.backoffice.noStartups', 'No startups found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map(item => (
                    <TableRow key={item.workspace_id} className="hover:bg-muted/50">
                      {/* Startup Name - clickable */}
                      <TableCell>
                        <button 
                          onClick={() => navigate(`/workspace/${item.workspace_id}`)}
                          className="font-medium text-left hover:text-primary flex items-center gap-1"
                        >
                          {item.startup_name}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </button>
                        {item.startup_nif && (
                          <span className="text-xs text-muted-foreground block">{item.startup_nif}</span>
                        )}
                      </TableCell>
                      
                      {/* Program */}
                      <TableCell>
                        {item.program_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      
                      {/* Stage - inline editable */}
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 hover:bg-muted rounded px-1 -ml-1">
                              <StageBadge stage={item.stage as any} />
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1">
                            {STAGES.map(s => (
                              <button
                                key={s}
                                onClick={() => changeStageMutation.mutate({ workspaceId: item.workspace_id, stage: s })}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded capitalize"
                              >
                                {s}
                              </button>
                            ))}
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      
                      {/* Health */}
                      <TableCell>
                        <span className={`font-medium ${getHealthColor(item.health_score)}`}>
                          {item.health_score ?? '—'}
                        </span>
                      </TableCell>
                      
                      {/* Consultant - inline editable */}
                      <TableCell>
                        <Popover 
                          open={openConsultorPopover === item.workspace_id} 
                          onOpenChange={(open) => {
                            setOpenConsultorPopover(open ? item.workspace_id : null);
                            if (!open) setConsultorSearch('');
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 hover:bg-muted rounded px-1 -ml-1 text-sm">
                              {item.assigned_consultant_name ? (
                                <>
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {item.assigned_consultant_name}
                                </>
                              ) : (
                                <span className="text-muted-foreground">{t('admin.backoffice.unassigned', 'Unassigned')}</span>
                              )}
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2">
                            <Input
                              placeholder={t('admin.backoffice.searchConsultant', 'Search consultant...')}
                              value={consultorSearch}
                              onChange={(e) => setConsultorSearch(e.target.value)}
                              className="mb-2"
                            />
                            <div className="max-h-40 overflow-y-auto space-y-1">
                              {filteredConsultors?.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => assignConsultorMutation.mutate({ workspaceId: item.workspace_id, consultorId: c.id })}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded text-left"
                                >
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={c.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs">{c.full_name?.slice(0, 2) || c.email?.slice(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate">{c.full_name || c.email}</span>
                                </button>
                              ))}
                            </div>
                            {item.assigned_consultant_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-destructive"
                                onClick={() => removeConsultorMutation.mutate(item.workspace_id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {t('admin.backoffice.removeConsultant', 'Remove consultant')}
                              </Button>
                            )}
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      
                      {/* Next Session */}
                      <TableCell>
                        {item.next_session_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(item.next_session_date), 'MMM d')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      
                      {/* Status */}
                      <TableCell>
                        <Badge variant={item.status === 'active' ? 'secondary' : item.status === 'blocked' ? 'destructive' : 'outline'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      
                      {/* Actions */}
                      <TableCell>
                        {item.status === 'blocked' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unblockMutation.mutate(item.workspace_id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {t('admin.backoffice.unblock', 'Unblock')}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWorkspaceToBlock({ id: item.workspace_id, name: item.startup_name });
                              setBlockDialogOpen(true);
                            }}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            {t('admin.backoffice.block', 'Block')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Block Dialog */}
        <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t('admin.backoffice.blockWorkspace', 'Block Workspace')}
              </DialogTitle>
              <DialogDescription>
                {t('admin.backoffice.blockDescription', 'This will prevent access to {{name}}. Are you sure?', { name: workspaceToBlock?.name })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin.backoffice.reason', 'Reason (optional)')}</Label>
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder={t('admin.backoffice.reasonPlaceholder', 'Enter reason for blocking...')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => workspaceToBlock && blockMutation.mutate({ workspaceId: workspaceToBlock.id, reason: blockReason })}
              >
                {t('admin.backoffice.confirmBlock', 'Block Workspace')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}