import { useState } from 'react';
import { useResources, useCreateResource, useDeleteResource, Resource } from '@/hooks/useResources';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { BookOpen, Plus, ExternalLink, Trash2, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ResourceLibraryProps {
  programId?: string | null;
}

const CATEGORIES = ['guides', 'templates', 'tools', 'articles', 'videos', 'other'];

export function ResourceLibrary({ programId }: ResourceLibraryProps) {
  const { isAdmin, isConsultor, isMentor } = useAuth();
  const canManage = isAdmin || isConsultor || isMentor;
  
  const { data: resources, isLoading } = useResources(programId);
  const createResource = useCreateResource();
  const deleteResource = useDeleteResource();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    category: 'guides',
    is_global: true,
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.url.trim()) {
      toast.error('URL is required');
      return;
    }
    try {
      await createResource.mutateAsync({
        ...formData,
        program_id: formData.is_global ? undefined : programId || undefined,
      });
      toast.success('Resource added');
      setDialogOpen(false);
      setFormData({ title: '', description: '', url: '', category: 'guides', is_global: true });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add resource');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await deleteResource.mutateAsync(id);
      toast.success('Resource deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete resource');
    }
  };

  const filteredResources = resources?.filter(r => filter === 'all' || r.category === filter);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}</div></CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Resource Library
            </CardTitle>
            <CardDescription>Curated resources for startups</CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
            {CATEGORIES.map(cat => (
              <Button key={cat} variant={filter === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilter(cat)} className="capitalize">
                {cat}
              </Button>
            ))}
          </div>
          
          {!filteredResources?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No resources available</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResources.map(resource => (
                <Card key={resource.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium truncate">{resource.title}</h4>
                        </div>
                        {resource.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{resource.description}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{resource.category}</Badge>
                          {resource.is_global && <Badge variant="outline">Global</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {resource.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(resource.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {resource.creator?.full_name && (
                      <p className="text-xs text-muted-foreground mt-2">Added by {resource.creator.full_name}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input value={formData.url} onChange={e => setFormData(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createResource.isPending}>Add Resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
