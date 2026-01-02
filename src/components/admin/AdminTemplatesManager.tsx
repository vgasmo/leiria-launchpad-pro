import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, FileText, Code, Upload, FileSpreadsheet, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useTemplates, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate,
  type Template,
  type TemplateSchema,
} from '@/hooks/useTemplates';
import { INITIAL_TEMPLATES } from '@/data/initialTemplates';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FINANCIAL_MODEL_TEMPLATE_PATH = 'templates/Template_Avaliacao_Startup_Ecossistema.xlsm';
const FINANCIAL_MODEL_BUCKET = 'public-assets';

export function AdminTemplatesManager() {
  const { isAdmin, isConsultor } = useAuth();
  const canUploadAssets = isAdmin || isConsultor;
  
  const { data: templates, isLoading, refetch } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  
  // Asset upload state
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    schema_json: '',
  });

  // Get the public URL for the financial model template
  const getTemplatePublicUrl = () => {
    const { data } = supabase.storage
      .from(FINANCIAL_MODEL_BUCKET)
      .getPublicUrl(FINANCIAL_MODEL_TEMPLATE_PATH);
    return data.publicUrl;
  };

  // MIME types for Excel files
  const XLSM_MIME = 'application/vnd.ms-excel.sheet.macroEnabled.12';
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadAssets) {
      toast.error('You do not have permission to upload assets');
      return;
    }
    
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isXlsm = fileName.endsWith('.xlsm');
    const isXlsx = fileName.endsWith('.xlsx');
    
    if (!isXlsm && !isXlsx) {
      toast.error('Please upload an Excel file (.xlsm or .xlsx)');
      return;
    }

    // Determine correct MIME type based on extension (browser MIME detection can be unreliable)
    const contentType = isXlsm ? XLSM_MIME : XLSX_MIME;

    setIsUploadingAsset(true);
    try {
      // Upload with upsert to overwrite existing
      const { error } = await supabase.storage
        .from(FINANCIAL_MODEL_BUCKET)
        .upload(FINANCIAL_MODEL_TEMPLATE_PATH, file, {
          upsert: true,
          contentType,
        });

      if (error) {
        // Check for MIME/type restriction errors
        if (error.message?.includes('mime') || error.message?.includes('type') || error.message?.includes('not allowed')) {
          throw new Error('Your storage configuration restricts this file type. Please upload via Supabase Storage console or use an .xlsx fallback.');
        }
        throw error;
      }

      const publicUrl = getTemplatePublicUrl();
      setAssetUrl(publicUrl);
      toast.success('Template uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload template');
    } finally {
      setIsUploadingAsset(false);
      if (assetFileInputRef.current) assetFileInputRef.current.value = '';
    }
  };

  const handleCopyAssetUrl = async () => {
    const url = getTemplatePublicUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', category: '', schema_json: '{\n  "sections": []\n}' });
    setIsCreating(true);
  };

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      schema_json: template.schema_json ? JSON.stringify(template.schema_json, null, 2) : '{\n  "sections": []\n}',
    });
    setEditingTemplate(template);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    let schema: TemplateSchema | undefined;
    try {
      if (formData.schema_json.trim()) {
        schema = JSON.parse(formData.schema_json);
      }
    } catch {
      toast.error('Invalid JSON in schema');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          schema_json: schema,
        });
        toast.success('Template updated');
      } else {
        await createTemplate.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          category: formData.category || undefined,
          schema_json: schema,
          is_global: true,
        });
        toast.success('Template created');
      }
      setEditingTemplate(null);
      setIsCreating(false);
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTemplate.mutateAsync(deleteTarget.id);
      toast.success('Template deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleSeedTemplates = async () => {
    try {
      for (const template of INITIAL_TEMPLATES) {
        // Check if template already exists
        const existing = templates?.find(t => t.name === template.name);
        if (!existing) {
          await createTemplate.mutateAsync({
            name: template.name,
            description: template.description,
            category: template.category,
            schema_json: template.schema_json,
            is_global: true,
          });
        }
      }
      await refetch();
      toast.success('Initial templates created');
    } catch {
      toast.error('Failed to seed templates');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const groupedTemplates = templates?.reduce((acc, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, Template[]>) || {};

  return (
    <div className="space-y-6">
      {/* Assets Section - Admin Only */}
      {canUploadAssets && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Program Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex-1">
                <h4 className="font-medium text-sm">Financial Model Template</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  The canonical .xlsm template available for all startups to download
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={assetFileInputRef}
                  type="file"
                  accept=".xlsm,.xlsx"
                  className="hidden"
                  onChange={handleAssetUpload}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => assetFileInputRef.current?.click()}
                  disabled={isUploadingAsset}
                >
                  {isUploadingAsset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  {isUploadingAsset ? 'Uploading...' : 'Upload Template'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyAssetUrl}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy URL
                </Button>
              </div>
            </div>
            {assetUrl && (
              <p className="text-xs text-muted-foreground">
                Last uploaded template URL copied. Startups can download from Workspace &gt; Financial Model.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates Library</h2>
          <p className="text-sm text-muted-foreground">Manage templates available to all workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          {(!templates || templates.length === 0) && (
            <Button variant="outline" onClick={handleSeedTemplates}>
              Seed Initial Templates
            </Button>
          )}
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </div>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No templates yet. Click "Seed Initial Templates" to add starter templates.
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedTemplates).map(([category, catTemplates]) => (
          <div key={category}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{category}</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {catTemplates.map(template => (
                <Card key={template.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {template.is_global && (
                            <Badge variant="secondary" className="text-xs">Global</Badge>
                          )}
                          {template.schema_json?.sections?.length ? (
                            <span className="text-xs text-muted-foreground">
                              {template.schema_json.sections.length} sections
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(template)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(template)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isCreating || !!editingTemplate} onOpenChange={(open) => {
        if (!open) {
          setIsCreating(false);
          setEditingTemplate(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'New Template'}</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="schema">
                <Code className="h-3.5 w-3.5 mr-1" />
                Schema (JSON)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Lean Canvas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this template"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g., Strategy, Finance, Growth"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="schema" className="py-4">
              <div className="space-y-2">
                <Label>Schema JSON</Label>
                <p className="text-xs text-muted-foreground">
                  Define sections and fields. Field types: text, textarea, number, checkbox, checklist
                </p>
                <Textarea
                  value={formData.schema_json}
                  onChange={e => setFormData(f => ({ ...f, schema_json: e.target.value }))}
                  className="font-mono text-xs"
                  rows={20}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreating(false);
              setEditingTemplate(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also delete all workspace instances of this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
