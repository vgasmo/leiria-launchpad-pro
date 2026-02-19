import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Download, 
  Trash2, 
  ExternalLink,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  Presentation,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { DocumentFeedbackButton } from './DocumentFeedbackButton';
import { useQuickWinToast } from '@/hooks/useQuickWinToast';
import { format } from 'date-fns';
import { 
  useDocuments, 
  useUploadDocument, 
  useAddExternalLink, 
  useDeleteDocument,
  useGetDocumentUrl,
  Document 
} from '@/hooks/useDocuments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FinancialModelPanel } from './FinancialModelPanel';
import { useSearchParams } from 'react-router-dom';

interface DocumentsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

const CATEGORY_KEYS = [
  { key: 'pitch_deck', labelKey: 'documents.categoryPitchDeck' },
  { key: 'financial_model', labelKey: 'documents.categoryFinancialModel' },
  { key: 'legal', labelKey: 'documents.categoryLegal' },
  { key: 'marketing', labelKey: 'documents.categoryMarketing' },
  { key: 'product', labelKey: 'documents.categoryProduct' },
  { key: 'team', labelKey: 'documents.categoryTeam' },
  { key: 'other', labelKey: 'documents.categoryOther' },
];

function getFileIcon(documentType: string) {
  if (documentType === 'link') return LinkIcon;
  if (documentType.startsWith('image/')) return FileImage;
  if (documentType.startsWith('video/')) return FileVideo;
  if (documentType.startsWith('audio/')) return FileAudio;
  if (documentType.includes('spreadsheet') || documentType.includes('excel') || documentType.includes('csv')) return FileSpreadsheet;
  if (documentType.includes('presentation') || documentType.includes('powerpoint')) return Presentation;
  if (documentType.includes('pdf') || documentType.includes('document') || documentType.includes('word')) return FileText;
  return File;
}

export function DocumentsTab({ workspaceId, canWrite }: DocumentsTabProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: documents, isLoading } = useDocuments(workspaceId);
  const uploadMutation = useUploadDocument();
  const addLinkMutation = useAddExternalLink();
  const deleteMutation = useDeleteDocument();
  const getDocumentUrl = useGetDocumentUrl();
  const { confirm, dialogProps } = useConfirmDialog();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [externalLinkConfirmOpen, setExternalLinkConfirmOpen] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  // B6 Fix: Auto-open upload dialog with pre-selected category via query param
  useEffect(() => {
    const uploadCategory = searchParams.get('upload');
    if (uploadCategory && canWrite) {
      // Map common param values to category keys
      const categoryKeyMap: Record<string, string> = {
        'pitch_deck': 'pitch_deck',
        'pitch-deck': 'pitch_deck',
        'pitchdeck': 'pitch_deck',
        'financial_model': 'financial_model',
        'financial-model': 'financial_model',
        'legal': 'legal',
        'marketing': 'marketing',
        'product': 'product',
        'team': 'team',
        'other': 'other',
      };
      const mappedCategoryKey = categoryKeyMap[uploadCategory.toLowerCase()] || 'other';
      
      // Only set if it's a valid category key
      const validCategoryKeys = CATEGORY_KEYS.map(c => c.key);
      if (validCategoryKeys.includes(mappedCategoryKey)) {
        setSelectedCategory(mappedCategoryKey);
      }
      setUploadOpen(true);
      
      // Clean up the URL param
      searchParams.delete('upload');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, canWrite]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadMutation.mutateAsync({
      workspaceId,
      file,
      category: selectedCategory || undefined,
      description: description || undefined,
    });

    setUploadOpen(false);
    setSelectedCategory('');
    setDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) {
      toast.error(t('documents.provideNameAndUrl'));
      return;
    }

    await addLinkMutation.mutateAsync({
      workspaceId,
      name: linkName,
      url: linkUrl,
      category: selectedCategory || undefined,
      description: description || undefined,
    });

    setLinkOpen(false);
    setLinkName('');
    setLinkUrl('');
    setSelectedCategory('');
    setDescription('');
  };

  const handleDownload = async (doc: Document) => {
    if (doc.external_url) {
      setPendingExternalUrl(doc.external_url);
      setExternalLinkConfirmOpen(true);
      return;
    }

    if (doc.file_path) {
      try {
        const url = await getDocumentUrl(doc.file_path);
        window.open(url, '_blank');
      } catch (error) {
        toast.error(t('documents.downloadFailed'));
      }
    }
  };
  
  const confirmOpenExternalLink = () => {
    if (pendingExternalUrl) {
      window.open(pendingExternalUrl, '_blank', 'noopener,noreferrer');
    }
    setExternalLinkConfirmOpen(false);
    setPendingExternalUrl(null);
  };
  
  const cancelOpenExternalLink = () => {
    setExternalLinkConfirmOpen(false);
    setPendingExternalUrl(null);
  };

  const handleDelete = (doc: Document) => {
    confirm({
      title: t('documents.deleteTitle', 'Eliminar documento?'),
      description: t('documents.deleteConfirm', 'Tem a certeza que quer eliminar "{{name}}"? Esta ação não pode ser desfeita.', { name: doc.name }),
      confirmLabel: t('common.delete'),
      onConfirm: async () => {
        await deleteMutation.mutateAsync({ document: doc, workspaceId });
        toast.success(t('documents.documentDeleted', 'Documento eliminado'));
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const groupedDocuments = documents?.reduce((acc, doc) => {
    const cat = doc.category || t('documents.uncategorized');
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  // Sort categories to show Financial Model first
  const sortedCategories = Object.keys(groupedDocuments).sort((a, b) => {
    if (a === 'Financial Model') return -1;
    if (b === 'Financial Model') return 1;
    if (a === t('documents.uncategorized')) return 1;
    if (b === t('documents.uncategorized')) return -1;
    return a.localeCompare(b);
  });

  return (
    <>
    <div className="space-y-6">
      {/* External Link Confirmation Dialog */}
      <AlertDialog open={externalLinkConfirmOpen} onOpenChange={setExternalLinkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('documents.openingExternalLink')}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('documents.aboutToOpen')}</p>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                {pendingExternalUrl}
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                {t('documents.externalLinkWarning')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelOpenExternalLink}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOpenExternalLink}>
              {t('documents.openLink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Financial Model Panel */}
      <FinancialModelPanel workspaceId={workspaceId} canWrite={canWrite} />

      {/* Upload Actions */}
      {canWrite && (
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                {t('documents.uploadFile')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('documents.uploadDocument')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('documents.category')}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('documents.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_KEYS.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>{t(cat.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('documents.descriptionOptional')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('documents.descriptionPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('documents.file')}</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadMutation.isPending}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" />
                {t('documents.addLink')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('documents.addExternalLink')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t('documents.name')}</Label>
                  <Input
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder={t('documents.namePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('documents.url')}</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder={t('documents.urlPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('documents.category')}</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('documents.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_KEYS.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>{t(cat.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('documents.descriptionOptional')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('documents.descriptionPlaceholder')}
                  />
                </div>
                <Button 
                  onClick={handleAddLink} 
                  disabled={addLinkMutation.isPending}
                  className="w-full"
                >
                  {t('documents.addLink')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Documents List */}
      {sortedCategories.length === 0 || (sortedCategories.length === 1 && !documents?.some(d => d.category !== 'Financial Model')) ? (
        <EmptyState
          icon={FileText}
          title={t('emptyStates.documents.title')}
          description={t('emptyStates.documents.description')}
          action={canWrite ? {
            label: t('documents.uploadFile'),
            onClick: () => setUploadOpen(true),
            icon: Upload,
          } : undefined}
          secondaryAction={canWrite ? {
            label: t('documents.addLink'),
            onClick: () => setLinkOpen(true),
          } : undefined}
        />
      ) : (
        sortedCategories
          .filter(cat => cat !== 'Financial Model')
          .map((category) => {
            const docs = groupedDocuments[category] || [];
            
            if (docs.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {category === 'Financial Model' && <FileSpreadsheet className="h-5 w-5 text-green-600" />}
                    {category === 'Pitch Deck' && <Presentation className="h-5 w-5 text-blue-600" />}
                    {category === 'Legal' && <FileText className="h-5 w-5 text-amber-600" />}
                    {!['Financial Model', 'Pitch Deck', 'Legal'].includes(category) && <File className="h-5 w-5 text-muted-foreground" />}
                    {category}
                    <Badge variant="secondary" className="ml-2">{docs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {docs.map((doc) => {
                      const Icon = getFileIcon(doc.document_type);
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.name || t('documents.untitled', { defaultValue: 'Sem título' })}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {doc.uploader && (
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={doc.uploader.avatar_url || undefined} />
                                      <AvatarFallback className="text-[8px]">
                                        {doc.uploader.full_name?.charAt(0) || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[100px]">{doc.uploader.full_name}</span>
                                  </div>
                                )}
                                <span>•</span>
                                <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                              </div>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Request Feedback button for pitch decks */}
                            {(doc.category === 'Pitch Deck' || doc.name.toLowerCase().includes('pitch')) && (
                              <DocumentFeedbackButton documentId={doc.id} documentName={doc.name} workspaceId={workspaceId} />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              title={doc.external_url ? t('documents.openLink') : t('common.download', 'Download')}
                            >
                              {doc.external_url ? (
                                <ExternalLink className="h-4 w-4" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(doc)}
                                disabled={deleteMutation.isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
      )}
    </div>
    
    <ConfirmDialog {...dialogProps} />
    </>
  );
}