import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Mail, Package, AlertTriangle, Bell, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type AnnouncementCategory = 'mail' | 'package' | 'general' | 'urgent';

interface FormState {
  workspace_id: string;
  category: AnnouncementCategory;
  title: string;
  message: string;
}

const EMPTY_FORM: FormState = {
  workspace_id: '',
  category: 'general',
  title: '',
  message: '',
};

const CATEGORY_CONFIG: Record<AnnouncementCategory, { icon: typeof Mail; label: string; color: string }> = {
  mail: { icon: Mail, label: 'Correio', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  package: { icon: Package, label: 'Encomenda', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  general: { icon: Bell, label: 'Geral', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  urgent: { icon: AlertTriangle, label: 'Urgente', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export function AdminAnnouncementsManager() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const { data: workspaces } = useQuery({
    queryKey: ['admin-workspaces-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, startup:startups(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_announcements')
        .select(`
          *,
          workspace:workspaces(id, startup:startups(name))
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const { error } = await supabase.from('admin_announcements').insert({
        workspace_id: data.workspace_id,
        category: data.category,
        title: data.title,
        message: data.message || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success(t('admin.announcements.sent'));
      setFormData(EMPTY_FORM);
      setIsDialogOpen(false);
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success(t('admin.announcements.deleted'));
    },
    onError: (error) => toast.error(`${t('common.error')}: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workspace_id || !formData.title) {
      toast.error(t('admin.announcements.requiredFields'));
      return;
    }
    createMutation.mutate(formData);
  };

  const unreadCount = announcements?.filter(a => !a.is_read).length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('admin.announcements.title')}
          </CardTitle>
          <CardDescription>
            {t('admin.announcements.description')}
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.announcements.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('admin.announcements.newTitle')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>{t('admin.announcements.startup')} *</Label>
                <Select value={formData.workspace_id} onValueChange={(v) => setFormData({ ...formData, workspace_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('admin.announcements.selectStartup')} />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                      {workspaces?.map((ws) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {(ws.startup as { name: string } | null)?.name || 'Unknown'}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('admin.announcements.category')} *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as AnnouncementCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('admin.announcements.titleLabel')} *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t('admin.announcements.titlePlaceholder')}
                  maxLength={200}
                />
              </div>

              <div>
                <Label>{t('admin.announcements.message')}</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={t('admin.announcements.messagePlaceholder')}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('common.sending') : t('admin.announcements.send')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : announcements?.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('admin.announcements.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.announcements.categoryHeader')}</TableHead>
                <TableHead>{t('admin.announcements.startup')}</TableHead>
                <TableHead>{t('admin.announcements.titleLabel')}</TableHead>
                <TableHead>{t('admin.announcements.date')}</TableHead>
                <TableHead>{t('admin.announcements.status')}</TableHead>
                <TableHead className="w-16">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {announcements?.map((ann) => {
                const config = CATEGORY_CONFIG[ann.category as AnnouncementCategory];
                const Icon = config?.icon || Bell;
                return (
                  <TableRow key={ann.id}>
                    <TableCell>
                      <Badge className={config?.color || ''}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config?.label || ann.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {((ann.workspace as any)?.startup as { name: string } | null)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ann.title}</p>
                        {ann.message && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{ann.message}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(ann.created_at), 'dd MMM yyyy HH:mm', { locale: pt })}
                    </TableCell>
                    <TableCell>
                      {ann.is_read ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('admin.announcements.read')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('admin.announcements.unread')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(ann.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}