import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { StageBadge } from '@/components/ui/StageBadge';
import { HealthBadge } from '@/components/ui/HealthBadge';
import type { StartupStage, HealthScore } from '@/types/database';

export function AdminWorkspacesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStartup, setSelectedStartup] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedStage, setSelectedStage] = useState<StartupStage>('ideation');

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['admin-workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          startup:startups(id, name),
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

  const createMutation = useMutation({
    mutationFn: async (data: { startup_id: string; program_id: string; stage: StartupStage }) => {
      const { error } = await supabase.from('workspaces').insert(data);
      if (error) throw error;
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
      toast.success('Workspace deleted');
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const resetForm = () => {
    setSelectedStartup('');
    setSelectedProgram('');
    setSelectedStage('ideation');
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
    });
  };

  const stages: StartupStage[] = ['ideation', 'validation', 'mvp', 'growth', 'scale'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Workspaces</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Workspace</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Startup</Label>
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
                <Label>Program</Label>
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
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Workspace</Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Startup</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces?.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{(ws.startup as { name: string } | null)?.name || '-'}</TableCell>
                  <TableCell>{(ws.program as { name: string } | null)?.name || '-'}</TableCell>
                  <TableCell><StageBadge stage={ws.stage} /></TableCell>
                  <TableCell><HealthBadge score={(ws.health_score_override || ws.health_score) as HealthScore | null} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ws.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workspaces?.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No workspaces yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
