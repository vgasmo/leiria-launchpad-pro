import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePrograms } from '@/hooks/useAdminData';
import {
  useCreateSupportMaterial,
  useUpdateSupportMaterial,
  useUploadSupportMaterialFile,
} from '@/hooks/useSupportMaterials';
import { logger } from '@/lib/logger';

const CATEGORIES = ['guide', 'checklist', 'example', 'template'] as const;
const STAGES = ['idea', 'validation', 'early_traction', 'growth', 'scale'] as const;

interface UploadSupportMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadSupportMaterialDialog({
  open,
  onOpenChange,
}: UploadSupportMaterialDialogProps) {
  const { t } = useTranslation();
  const { data: programs } = usePrograms();
  const createMaterial = useCreateSupportMaterial();
  const updateMaterial = useUpdateSupportMaterial();
  const uploadFile = useUploadSupportMaterialFile();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState<string>('');
  const [category, setCategory] = useState<string>('guide');
  const [stage, setStage] = useState<string>('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setProgramId('');
    setCategory('guide');
    setStage('');
    setTags('');
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t('consultorTools.upload.titleRequired', 'Título obrigatório'));
      return;
    }
    if (!file) {
      toast.error(t('consultorTools.upload.fileRequired', 'Selecione um ficheiro'));
      return;
    }
    setSubmitting(true);
    try {
      // 1) Create the row first to get an id (status = approved so founders see it immediately)
      const created = await createMaterial.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        program_id: programId || null,
        category,
        startup_stage: stage || null,
        tags: tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: 'approved',
        external_links: [],
      });

      // 2) Upload file to storage under <programId|global>/<material_id>/
      const filePath = await uploadFile.mutateAsync({
        file,
        programId: programId || null,
        materialId: created.id,
      });

      // 3) Patch material row with file_path
      await updateMaterial.mutateAsync({ id: created.id, file_path: filePath });

      toast.success(t('consultorTools.upload.success', 'Material carregado com sucesso'));
      reset();
      onOpenChange(false);
    } catch (err) {
      logger.error('Failed to upload support material', {}, err as Error);
      toast.error(
        t('consultorTools.upload.error', 'Erro ao carregar material'),
        { description: (err as Error).message }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('consultorTools.upload.title', 'Carregar Material de Apoio')}</DialogTitle>
          <DialogDescription>
            {t('consultorTools.upload.description', 'Disponibiliza PowerPoints, PDFs e outros recursos aos founders do programa.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t('consultorTools.upload.titleLabel', 'Título')} *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('consultorTools.upload.titlePlaceholder', 'Ex: PPT Sessão 3 — Customer Discovery')}
            />
          </div>

          <div>
            <Label>{t('consultorTools.upload.descriptionLabel', 'Descrição')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('consultorTools.upload.descriptionPlaceholder', 'Resumo do conteúdo')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('consultorTools.upload.program', 'Programa')}</Label>
              <Select value={programId || 'global'} onValueChange={(v) => setProgramId(v === 'global' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t('consultorTools.upload.globalScope', 'Global (todos)')}</SelectItem>
                  {programs?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('consultorTools.upload.category', 'Categoria')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('consultorTools.upload.stage', 'Estágio')}</Label>
              <Select value={stage || 'any'} onValueChange={(v) => setStage(v === 'any' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('consultorTools.upload.anyStage', 'Qualquer')}</SelectItem>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('consultorTools.upload.tags', 'Tags (vírgula)')}</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="sales, pitch"
              />
            </div>
          </div>

          <div>
            <Label>{t('consultorTools.upload.file', 'Ficheiro')} *</Label>
            <Input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.txt,.md,.zip,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Upload className="h-4 w-4 mr-2" />
            {submitting
              ? t('consultorTools.upload.uploading', 'A carregar…')
              : t('consultorTools.upload.submit', 'Carregar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
