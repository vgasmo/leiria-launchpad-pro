import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Download, Search, Phone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { startupSchema } from '@/lib/validations';

interface FormState {
  name: string;
  description: string;
  website: string;
  nif: string;
  main_contact_name: string;
  main_contact_email: string;
  main_contact_phone: string;
  is_legally_recognized: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  website: '',
  nif: '',
  main_contact_name: '',
  main_contact_email: '',
  main_contact_phone: '',
  is_legally_recognized: false,
};

export function AdminStartupsManager() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStartup, setEditingStartup] = useState<{ id: string } | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const { data: startups, isLoading } = useQuery({
    queryKey: ['admin-startups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('startups')
        .select(`
          *,
          workspaces!workspaces_startup_id_fkey(
            id,
            stage,
            status,
            program:programs(name)
          )
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<FormState> & { name: string }) => {
      const { error } = await supabase.from('startups').insert([{
        name: data.name,
        description: data.description || null,
        website: data.website || null,
        nif: data.nif || null,
        main_contact_name: data.main_contact_name || null,
        main_contact_email: data.main_contact_email || null,
        main_contact_phone: data.main_contact_phone || null,
        is_legally_recognized: data.is_legally_recognized || false,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-startups'] });
      toast.success(t('admin.startupsManager.startupCreated'));
      resetForm();
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<FormState>) => {
      const { error } = await supabase.from('startups').update({
        name: data.name,
        description: data.description || null,
        website: data.website || null,
        nif: data.nif || null,
        main_contact_name: data.main_contact_name || null,
        main_contact_email: data.main_contact_email || null,
        main_contact_phone: data.main_contact_phone || null,
        is_legally_recognized: data.is_legally_recognized || false,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-startups'] });
      toast.success(t('admin.startupsManager.startupUpdated'));
      resetForm();
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('startups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-startups'] });
      toast.success(t('admin.startupsManager.startupDeleted'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingStartup(null);
    setValidationErrors({});
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const parseResult = startupSchema.safeParse({ name: formData.name, description: formData.description, website: formData.website });
    
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setValidationErrors(errors);
      toast.error(parseResult.error.errors[0]?.message || 'Validation error');
      return;
    }

    if (editingStartup) {
      updateMutation.mutate({ id: editingStartup.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEdit = (startup: any) => {
    setEditingStartup({ id: startup.id });
    setFormData({
      name: startup.name || '',
      description: startup.description || '',
      website: startup.website || '',
      nif: startup.nif || '',
      main_contact_name: startup.main_contact_name || '',
      main_contact_email: startup.main_contact_email || '',
      main_contact_phone: startup.main_contact_phone || '',
      is_legally_recognized: startup.is_legally_recognized || false,
    });
    setIsDialogOpen(true);
  };

  // Filter startups
  const filteredStartups = startups?.filter(startup => {
    const matchesSearch = !search || 
      startup.name.toLowerCase().includes(search.toLowerCase()) ||
      startup.nif?.toLowerCase().includes(search.toLowerCase()) ||
      startup.main_contact_name?.toLowerCase().includes(search.toLowerCase());
    
    const workspaceStage = startup.workspaces?.[0]?.stage;
    const matchesStage = stageFilter === 'all' || !stageFilter || workspaceStage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  // Export to CSV
  const handleExport = () => {
    if (!filteredStartups?.length) {
      toast.error(t('admin.startupsManager.noDataToExport'));
      return;
    }

    const headers = [t('admin.startupsManager.name'), t('admin.startupsManager.nif'), t('admin.startupsManager.mainContact'), t('admin.startupsManager.contactEmail'), t('admin.startupsManager.contactPhone'), t('admin.startupsManager.stage'), 'Program', t('admin.startupsManager.website'), t('admin.startupsManager.legallyRecognized'), t('admin.startupsManager.description')];
    const rows = filteredStartups.map(s => {
      const workspace = s.workspaces?.[0];
      return [
        s.name,
        s.nif || '',
        s.main_contact_name || '',
        s.main_contact_email || '',
        s.main_contact_phone || '',
        workspace?.stage || '',
        (workspace?.program as any)?.name || '',
        s.website || '',
        s.is_legally_recognized ? 'Yes' : 'No',
        s.description?.replace(/"/g, '""') || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `startups-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(t('admin.startupsManager.exported', { count: filteredStartups.length }));
  };

  const uniqueStages = [...new Set(startups?.flatMap(s => s.workspaces?.map(w => w.stage) || []).filter(Boolean))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle>{t('admin.startupsManager.title')}</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('admin.startupsManager.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('admin.startupsManager.allStages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.startupsManager.allStages')}</SelectItem>
              {uniqueStages.map(stage => (
                <SelectItem key={stage} value={stage}>{stage}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('admin.startupsManager.exportCsv')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />{t('admin.startupsManager.addStartup')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingStartup ? t('admin.startupsManager.editStartup') : t('admin.startupsManager.createStartup')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">{t('admin.startupsManager.name')} *</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      maxLength={100}
                      required 
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="nif">{t('admin.startupsManager.taxId')}</Label>
                    <Input 
                      id="nif" 
                      value={formData.nif} 
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })} 
                      placeholder="PT123456789"
                      maxLength={20}
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_legally_recognized" 
                        checked={formData.is_legally_recognized} 
                        onCheckedChange={(checked) => setFormData({ ...formData, is_legally_recognized: !!checked })} 
                      />
                      <Label htmlFor="is_legally_recognized" className="cursor-pointer">
                        {t('admin.startupsManager.legallyRecognized')}
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t('admin.startupsManager.mainContact')}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="main_contact_name">{t('admin.startupsManager.contactName')}</Label>
                      <Input 
                        id="main_contact_name" 
                        value={formData.main_contact_name} 
                        onChange={(e) => setFormData({ ...formData, main_contact_name: e.target.value })} 
                        placeholder="João Silva"
                      />
                    </div>
                    <div>
                      <Label htmlFor="main_contact_email">{t('admin.startupsManager.contactEmail')}</Label>
                      <Input 
                        id="main_contact_email" 
                        type="email"
                        value={formData.main_contact_email} 
                        onChange={(e) => setFormData({ ...formData, main_contact_email: e.target.value })} 
                        placeholder="joao@startup.pt"
                      />
                    </div>
                    <div>
                      <Label htmlFor="main_contact_phone">{t('admin.startupsManager.contactPhone')}</Label>
                      <Input 
                        id="main_contact_phone" 
                        value={formData.main_contact_phone} 
                        onChange={(e) => setFormData({ ...formData, main_contact_phone: e.target.value })} 
                        placeholder="+351 912 345 678"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label htmlFor="website">{t('admin.startupsManager.website')}</Label>
                  <Input 
                    id="website" 
                    value={formData.website} 
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })} 
                    placeholder="https://..." 
                  />
                  {validationErrors.website && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.website}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">{t('admin.startupsManager.description')}</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    maxLength={2000}
                    rows={3}
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.description}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">{editingStartup ? t('admin.startupsManager.update') : t('admin.startupsManager.create')}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">{t('admin.startupsManager.loading')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.startupsManager.name')}</TableHead>
                <TableHead>{t('admin.startupsManager.nif')}</TableHead>
                <TableHead>{t('admin.startupsManager.mainContact')}</TableHead>
                <TableHead>{t('admin.startupsManager.stage')}</TableHead>
                <TableHead>{t('admin.startupsManager.status')}</TableHead>
                <TableHead className="w-24">{t('admin.startupsManager.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStartups?.map((startup) => {
                const workspace = startup.workspaces?.[0];
                return (
                  <TableRow key={startup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{startup.name}</span>
                        {startup.is_legally_recognized && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                            {t('admin.startupsManager.legal')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{startup.nif || '-'}</TableCell>
                    <TableCell>
                      {startup.main_contact_name ? (
                        <div className="text-sm">
                          <div>{startup.main_contact_name}</div>
                          {startup.main_contact_email && (
                            <div className="text-muted-foreground text-xs">{startup.main_contact_email}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {workspace?.stage ? (
                        <Badge variant="secondary">{workspace.stage}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {workspace?.status ? (
                        <Badge variant={workspace.status === 'active' ? 'default' : 'outline'}>
                          {workspace.status}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(startup)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(startup.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStartups?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t('admin.startupsManager.noStartups')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
