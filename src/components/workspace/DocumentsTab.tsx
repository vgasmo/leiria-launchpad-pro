import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  AlertTriangle
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
  const { data: documents, isLoading } = useDocuments(workspaceId);
  const uploadMutation = useUploadDocument();
  const addLinkMutation = useAddExternalLink();
  const deleteMutation = useDeleteDocument();
  const getDocumentUrl = useGetDocumentUrl();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // External link confirmation state
  const [externalLinkConfirmOpen, setExternalLinkConfirmOpen] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string | null>(null);

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
      toast.error('Please provide both name and URL');
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
      // Show confirmation dialog for external links
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const groupedDocuments = documents?.reduce((acc, doc) => {
    const cat = doc.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  return (
    <div className="space-y-6">
      {/* External Link Confirmation Dialog */}
      <AlertDialog open={externalLinkConfirmOpen} onOpenChange={setExternalLinkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Opening External Link
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to open an external website:</p>
              <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                {pendingExternalUrl}
              </p>
              <p className="text-amber-600 dark:text-amber-400">
                This link leads to an external site. Make sure you trust this destination before proceeding.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelOpenExternalLink}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmOpenExternalLink}>
              Open Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {canWrite && (
        <div className="flex gap-2">
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <Label>File</Label>
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
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add External Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="e.g., Pitch Deck on Google Drive"
                  />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description..."
                  />
                </div>
                <Button 
                  onClick={handleAddLink} 
                  disabled={addLinkMutation.isPending}
                  className="w-full"
                >
                  Add Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {Object.keys(groupedDocuments).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No documents yet. {canWrite && 'Upload a file or add a link to get started.'}
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedDocuments).map(([category, docs]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => {
                  const Icon = getFileIcon(doc.document_type);
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
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
                                <span>{doc.uploader.full_name}</span>
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
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
