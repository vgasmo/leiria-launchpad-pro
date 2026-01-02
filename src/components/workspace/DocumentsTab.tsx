import { useState, useRef } from 'react';
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
  TrendingUp,
  Calculator,
  RefreshCw
} from 'lucide-react';
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

interface DocumentsTabProps {
  workspaceId: string;
  canWrite: boolean;
}

const CATEGORIES = [
  'Pitch Deck',
  'Financial Model',
  'Legal',
  'Marketing',
  'Product',
  'Team',
  'Other',
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
  const { data: documents, isLoading } = useDocuments(workspaceId);
  const uploadMutation = useUploadDocument();
  const addLinkMutation = useAddExternalLink();
  const deleteMutation = useDeleteDocument();
  const getDocumentUrl = useGetDocumentUrl();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [financialModelOpen, setFinancialModelOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const financialModelInputRef = useRef<HTMLInputElement>(null);
  
  const [externalLinkConfirmOpen, setExternalLinkConfirmOpen] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

  // Find existing financial model
  const financialModel = documents?.find(doc => doc.category === 'Financial Model' && 
    (doc.document_type.includes('spreadsheet') || 
     doc.document_type.includes('excel') || 
     doc.document_type.includes('csv') ||
     doc.name.toLowerCase().includes('financial')));

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

  const handleFinancialModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv'
    ];
    
    const isValidType = validTypes.includes(file.type) || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv');

    if (!isValidType) {
      toast.error(t('documents.supportedFormats'));
      return;
    }

    await uploadMutation.mutateAsync({
      workspaceId,
      file,
      category: 'Financial Model',
      description: t('documents.financialModelDesc'),
    });

    setFinancialModelOpen(false);
    if (financialModelInputRef.current) financialModelInputRef.current.value = '';
    toast.success(t('documents.financialModel') + ' uploaded');
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
        toast.error('Failed to generate download link');
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

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}"?`)) return;
    await deleteMutation.mutateAsync({ document: doc, workspaceId });
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

      {/* Financial Model Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t('documents.financialModel')}
          </CardTitle>
          <CardDescription>
            {t('documents.financialModelDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {financialModel ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{financialModel.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{format(new Date(financialModel.created_at), 'MMM d, yyyy')}</span>
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {t('documents.currentModel')}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload(financialModel)}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                {canWrite && (
                  <Dialog open={financialModelOpen} onOpenChange={setFinancialModelOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {t('documents.replaceModel')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('documents.uploadFinancialModel')}</DialogTitle>
                        <DialogDescription>
                          {t('documents.supportedFormats')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Input
                          ref={financialModelInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFinancialModelUpload}
                          disabled={uploadMutation.isPending}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-2">{t('documents.noFinancialModel')}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('documents.uploadToTrack')}</p>
              {canWrite && (
                <Dialog open={financialModelOpen} onOpenChange={setFinancialModelOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('documents.uploadFinancialModel')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('documents.uploadFinancialModel')}</DialogTitle>
                      <DialogDescription>
                        {t('documents.supportedFormats')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Input
                        ref={financialModelInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFinancialModelUpload}
                        disabled={uploadMutation.isPending}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p>{t('documents.noDocumentsDesc')}</p>
            {canWrite && <p className="text-sm mt-2">{t('documents.getStarted')}</p>}
          </CardContent>
        </Card>
      ) : (
        sortedCategories
          .filter(cat => cat !== 'Financial Model' || (groupedDocuments[cat]?.length > 1))
          .map((category) => {
            const docs = groupedDocuments[category]?.filter(d => 
              category !== 'Financial Model' || d.id !== financialModel?.id
            ) || [];
            
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
                              <p className="font-medium truncate">{doc.name}</p>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              title={doc.external_url ? 'Open link' : 'Download'}
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
  );
}