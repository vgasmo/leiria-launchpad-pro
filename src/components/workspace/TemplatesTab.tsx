import { useState, useMemo, useEffect } from 'react';
import { FileText, ChevronRight, Check, Save, FolderOpen, Calculator, Send, MessageSquare, CheckCircle2, Sparkles, LayoutGrid, Target, Users, Crosshair } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  useTemplates, 
  useTemplateInstances, 
  useUpsertTemplateInstance,
  useCompleteTemplateInstance,
  useSubmitForReview,
  useReviewTemplateInstance,
  type Template,
  type TemplateInstance,
  type TemplateField,
} from '@/hooks/useTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { UnitEconomicsCalculator } from './UnitEconomicsCalculator';
import { TemplateCoachPanel } from './TemplateCoachPanel';
import { CanvasTemplate, CanvasType, getCanvasType } from './CanvasTemplate';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface TemplatesTabProps {
  workspaceId: string;
  canWrite: boolean;
  isFounder?: boolean;
}

export function TemplatesTab({ workspaceId, canWrite, isFounder = false }: TemplatesTabProps) {
  const { t } = useTranslation();
  const { data: templates, isLoading: loadingTemplates } = useTemplates();
  const { data: instances, isLoading: loadingInstances } = useTemplateInstances(workspaceId);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<TemplateInstance | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    if (!templates) return {};
    return templates.reduce((acc, t) => {
      const cat = t.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    }, {} as Record<string, Template[]>);
  }, [templates]);

  // Map instances by template ID
  const instancesByTemplateId = useMemo(() => {
    if (!instances) return {};
    return instances.reduce((acc, i) => {
      acc[i.template_id] = i;
      return acc;
    }, {} as Record<string, TemplateInstance>);
  }, [instances]);

  const handleOpenTemplate = (template: Template) => {
    // If it's a canvas template, switch to the appropriate tab instead of opening dialog
    const canvasType = getCanvasType(template.name);
    if (canvasType) {
      setActiveTab(canvasType);
      return;
    }
    
    const existingInstance = instancesByTemplateId[template.id];
    setSelectedTemplate(template);
    setSelectedInstance(existingInstance || null);
  };

  const handleCloseEditor = () => {
    setSelectedTemplate(null);
    setSelectedInstance(null);
  };

  if (loadingTemplates || loadingInstances) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!templates?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          {t('templates.noTemplatesDesc', 'No templates available. Ask an admin to create templates.')}
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(templatesByCategory).sort();

  // Find canvas templates for dedicated tabs
  const findCanvasTemplate = (type: CanvasType) => 
    templates?.find(t => getCanvasType(t.name) === type);
  
  const bmcTemplate = findCanvasTemplate('bmc');
  const leanTemplate = findCanvasTemplate('lean');
  const valuePropTemplate = findCanvasTemplate('value_prop');
  const empathyTemplate = findCanvasTemplate('empathy');
  const swotTemplate = findCanvasTemplate('swot');

  const canvasTemplates: { type: CanvasType; template: Template | undefined; label: string; icon: React.ReactNode }[] = [
    { type: 'bmc', template: bmcTemplate, label: 'BMC', icon: <LayoutGrid className="h-4 w-4" /> },
    { type: 'lean', template: leanTemplate, label: 'Lean', icon: <LayoutGrid className="h-4 w-4" /> },
    { type: 'value_prop', template: valuePropTemplate, label: 'Value Prop', icon: <Target className="h-4 w-4" /> },
    { type: 'empathy', template: empathyTemplate, label: 'Empathy', icon: <Users className="h-4 w-4" /> },
    { type: 'swot', template: swotTemplate, label: 'SWOT', icon: <Crosshair className="h-4 w-4" /> },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="templates" className="gap-2">
          <FileText className="h-4 w-4" />
          {t('templates.title')}
        </TabsTrigger>
        {canvasTemplates.map(({ type, template, label, icon }) => 
          template && (
            <TabsTrigger key={type} value={type} className="gap-2">
              {icon}
              {label}
            </TabsTrigger>
          )
        )}
        <TabsTrigger value="calculator" className="gap-2">
          <Calculator className="h-4 w-4" />
          {t('templates.unitEconomics', 'Unit Economics')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calculator">
        <UnitEconomicsCalculator workspaceId={workspaceId} />
      </TabsContent>

      {/* Canvas Tabs */}
      {canvasTemplates.map(({ type, template }) => 
        template && (
          <TabsContent key={type} value={type}>
            <CanvasTemplateWrapper
              template={template}
              instance={instancesByTemplateId[template.id] || null}
              workspaceId={workspaceId}
              canWrite={canWrite}
              type={type}
            />
          </TabsContent>
        )
      )}

      <TabsContent value="templates" className="space-y-6">
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {category}
          </h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {templatesByCategory[category].map(template => {
              const instance = instancesByTemplateId[template.id];
              const isCompleted = instance?.status === 'completed';
              const isStarted = !!instance;

              return (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${isCompleted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : ''}`}
                  onClick={() => handleOpenTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          {template.name}
                          {isCompleted && <Check className="h-4 w-4 text-green-600" />}
                        </h4>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {isStarted && !isCompleted && (
                        <Badge variant="secondary" className="text-xs">{t('templates.inProgress', 'In Progress')}</Badge>
                      )}
                      {instance?.review_status === 'pending_review' && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">{t('templates.pendingReview')}</Badge>
                      )}
                      {instance?.review_status === 'approved' && (
                        <Badge className="text-xs bg-green-100 text-green-700">{t('templates.approved')}</Badge>
                      )}
                      {instance?.review_status === 'needs_changes' && (
                        <Badge className="text-xs bg-red-100 text-red-700">{t('templates.needsChanges', 'Needs Changes')}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      </TabsContent>

      {/* Template Editor Dialog - outside TabsContent to avoid ref issues */}
      <TemplateEditorDialog
        template={selectedTemplate}
        instance={selectedInstance}
        workspaceId={workspaceId}
        canWrite={canWrite}
        isFounder={isFounder}
        onClose={handleCloseEditor}
      />
    </Tabs>
  );
}

// Wrapper for canvas templates with save functionality
interface CanvasTemplateWrapperProps {
  template: Template;
  instance: TemplateInstance | null;
  workspaceId: string;
  canWrite: boolean;
  type: CanvasType;
}

function CanvasTemplateWrapper({ template, instance, workspaceId, canWrite, type }: CanvasTemplateWrapperProps) {
  const upsertInstance = useUpsertTemplateInstance(workspaceId);
  const [canvasData, setCanvasData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (instance?.data_json) {
      setCanvasData(instance.data_json as Record<string, string>);
    }
  }, [instance?.data_json]);

  const handleChange = (data: Record<string, string>) => {
    setCanvasData(data);
    setHasChanges(true);
    // Auto-save after a short delay
    const timeout = setTimeout(async () => {
      try {
        await upsertInstance.mutateAsync({
          template_id: template.id,
          data_json: data,
          existingId: instance?.id,
        });
        setHasChanges(false);
        toast.success('Canvas saved');
      } catch {
        toast.error('Failed to save canvas');
      }
    }, 1000);
    return () => clearTimeout(timeout);
  };

  return (
    <div className="space-y-4">
      {hasChanges && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Saving...
        </div>
      )}
      <CanvasTemplate
        type={type}
        data={canvasData}
        onChange={handleChange}
        disabled={!canWrite}
      />
    </div>
  );
}

interface TemplateEditorDialogProps {
  template: Template | null;
  instance: TemplateInstance | null;
  workspaceId: string;
  canWrite: boolean;
  isFounder: boolean;
  onClose: () => void;
}

function TemplateEditorDialog({
  template,
  instance,
  workspaceId,
  canWrite,
  isFounder,
  onClose,
}: TemplateEditorDialogProps) {
  const { roles } = useAuth();
  const upsertInstance = useUpsertTemplateInstance(workspaceId);
  const completeInstance = useCompleteTemplateInstance(workspaceId);
  const submitForReview = useSubmitForReview(workspaceId);
  const reviewInstance = useReviewTemplateInstance(workspaceId);
  
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  
  const canReview = roles.includes('admin') || roles.includes('consultor') || roles.includes('mentor_externo');

  // Initialize form data when template/instance changes
  useEffect(() => {
    if (template) {
      const instanceData = instance?.data_json || {};
      setFormData(instanceData);
      setHasChanges(false);
    }
  }, [template?.id, instance?.id, instance?.data_json]);

  // Reset form when dialog opens with new template
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setFormData({});
      setHasChanges(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!template) return;
    try {
      await upsertInstance.mutateAsync({
        template_id: template.id,
        data_json: formData,
        existingId: instance?.id,
      });
      toast.success('Template saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save template');
    }
  };

  const handleMarkComplete = async () => {
    if (!instance) {
      await handleSave();
    }
    try {
      if (instance?.id) {
        await completeInstance.mutateAsync(instance.id);
        toast.success('Template marked as complete');
      }
    } catch {
      toast.error('Failed to mark as complete');
    }
  };

  const handleSubmitForReview = async () => {
    if (!instance) {
      await handleSave();
    }
    try {
      if (instance?.id) {
        await submitForReview.mutateAsync(instance.id);
        toast.success('Template submitted for review');
      }
    } catch {
      toast.error('Failed to submit for review');
    }
  };

  const handleReview = async (status: 'approved' | 'needs_changes') => {
    if (!instance?.id) return;
    try {
      await reviewInstance.mutateAsync({
        instanceId: instance.id,
        review_status: status,
        review_notes: reviewNotes.trim() || undefined,
      });
      toast.success(status === 'approved' ? 'Template approved' : 'Requested changes');
      setReviewNotes('');
    } catch {
      toast.error('Failed to submit review');
    }
  };

  if (!template) return null;

  const schema = template.schema_json;
  if (!schema?.sections) {
    return (
      <Dialog open={!!template} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{template.name}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            This template has no form schema configured.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!template} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{template.name}</span>
            {instance?.status === 'completed' && (
              <Badge className="bg-green-100 text-green-700">Completed</Badge>
            )}
          </DialogTitle>
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {schema.sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-4">
                <div>
                  <h3 className="font-medium text-sm">{section.title}</h3>
                  {section.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  )}
                </div>
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  {section.fields.map(field => (
                    <TemplateFormField
                      key={field.id}
                      field={field}
                      value={formData[field.id]}
                      onChange={(val) => handleFieldChange(field.id, val)}
                      disabled={!canWrite}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Review feedback display */}
        {instance?.review_status === 'needs_changes' && instance.review_notes && (
          <Alert className="border-amber-200 bg-amber-50">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              <strong>Reviewer feedback:</strong> {instance.review_notes}
            </AlertDescription>
          </Alert>
        )}

        {/* AI Coach Panel for consultants/mentors */}
        {canReview && instance?.id && (
          <TemplateCoachPanel 
            instanceId={instance.id}
            workspaceId={workspaceId}
            onCopyToNotes={(notes) => setReviewNotes(notes)}
            showReviewActions={instance?.review_status === 'pending_review'}
            onApplyReview={(recommendation, notes) => {
              setReviewNotes(notes);
              handleReview(recommendation);
            }}
          />
        )}

        {/* Review section for consultants/mentors */}
        {canReview && instance?.review_status === 'pending_review' && (
          <div className="border-t pt-4 space-y-3">
            <Label>Review Notes (optional)</Label>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add feedback for the founder..."
              rows={2}
            />
            <div className="flex gap-2">
              <Button onClick={() => handleReview('approved')} className="flex-1">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button variant="outline" onClick={() => handleReview('needs_changes')} className="flex-1">
                Request Changes
              </Button>
            </div>
          </div>
        )}

        {canWrite && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleSave} 
                disabled={!hasChanges || upsertInstance.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              {isFounder && instance?.review_status !== 'pending_review' && instance?.review_status !== 'approved' && (
                <Button 
                  variant="outline"
                  onClick={handleSubmitForReview}
                  disabled={submitForReview.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Submit for Review
                </Button>
              )}
              {!isFounder && instance?.status !== 'completed' && (
                <Button 
                  onClick={handleMarkComplete}
                  disabled={completeInstance.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TemplateFormFieldProps {
  field: TemplateField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}

function TemplateFormField({ field, value, onChange, disabled }: TemplateFormFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            disabled={disabled}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={checked => onChange(checked)}
              disabled={disabled}
            />
            <span className="text-sm">{field.placeholder}</span>
          </div>
        );
      
      case 'checklist':
        const checkedItems = (value as string[]) || [];
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Checkbox
                  checked={checkedItems.includes(option)}
                  onCheckedChange={checked => {
                    if (checked) {
                      onChange([...checkedItems, option]);
                    } else {
                      onChange(checkedItems.filter(i => i !== option));
                    }
                  }}
                  disabled={disabled}
                  className="mt-0.5"
                />
                <span className="text-sm">{option}</span>
              </div>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
    </div>
  );
}
