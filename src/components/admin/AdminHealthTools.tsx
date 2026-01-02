import { useState } from 'react';
import { RefreshCw, Download, Loader2, FileText, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  useHealthModelTemplates, 
  useCreateHealthModelTemplate, 
  useApplyHealthModelTemplate,
  useRecomputeHealth 
} from '@/hooks/useHealthHistory';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminHealthToolsProps {
  programId?: string;
  className?: string;
}

export function AdminHealthTools({ programId, className }: AdminHealthToolsProps) {
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const { data: templates, isLoading: templatesLoading } = useHealthModelTemplates();
  const createTemplate = useCreateHealthModelTemplate();
  const applyTemplate = useApplyHealthModelTemplate();
  const recomputeHealth = useRecomputeHealth();

  // Get current program health model
  const { data: currentModel } = useQuery({
    queryKey: ['program-health-model', programId],
    queryFn: async () => {
      if (!programId) return null;
      const { data, error } = await supabase
        .from('program_health_model')
        .select('*')
        .eq('program_id', programId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!programId,
  });

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    try {
      const result = await recomputeHealth.mutateAsync(
        programId ? { program_id: programId } : undefined
      );
      toast.success(`Recalculado: ${result.updatedWorkspaces} workspaces, ${result.historySnapshots} snapshots, ${result.alertsCreated} alertas`);
    } catch (error) {
      console.error('Recompute error:', error);
      toast.error('Erro ao recalcular health scores');
    } finally {
      setRecomputeLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!programId) {
      toast.error('Selecione um programa');
      return;
    }

    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-cohort-health-pdf', {
        body: { program_id: programId },
      });

      if (error) throw error;

      if (data.report_url) {
        window.open(data.report_url, '_blank');
        toast.success('Relatório gerado com sucesso');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setExportLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !programId) {
      toast.error('Selecione um template e um programa');
      return;
    }

    try {
      await applyTemplate.mutateAsync({ templateId: selectedTemplate, programId });
      toast.success('Template aplicado com sucesso');
    } catch (error) {
      console.error('Apply template error:', error);
      toast.error('Erro ao aplicar template');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentModel || !newTemplateName) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        name: newTemplateName,
        description: newTemplateDesc || undefined,
        weights_json: currentModel.weights_json,
        thresholds_json: currentModel.thresholds_json,
      });
      toast.success('Template criado com sucesso');
      setShowSaveDialog(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
    } catch (error) {
      console.error('Save template error:', error);
      toast.error('Erro ao criar template');
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ferramentas de Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recompute Section */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium">Recalcular Health Scores</p>
            <p className="text-xs text-muted-foreground">
              {programId ? 'Workspaces deste programa' : 'Todos os workspaces ativos'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecompute}
            disabled={recomputeLoading}
          >
            {recomputeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalcular
          </Button>
        </div>

        {/* Export PDF Section */}
        {programId && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium">Exportar Relatório</p>
              <p className="text-xs text-muted-foreground">Health do cohort em PDF</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar
            </Button>
          </div>
        )}

        {/* Templates Section */}
        <div className="space-y-3 p-3 rounded-lg bg-muted/50">
          <p className="text-sm font-medium">Templates de Health Model</p>
          
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || !programId || applyTemplate.isPending}
            >
              {applyTemplate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
          </div>

          {currentModel && programId && (
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Guardar modelo atual como template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Guardar como Template</DialogTitle>
                  <DialogDescription>
                    Crie um template reutilizável a partir do modelo atual.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Ex: Programa Intensivo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descrição (opcional)</Label>
                    <Textarea
                      id="desc"
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      placeholder="Descreva quando usar este template..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveAsTemplate}
                    disabled={!newTemplateName || createTemplate.isPending}
                  >
                    {createTemplate.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
