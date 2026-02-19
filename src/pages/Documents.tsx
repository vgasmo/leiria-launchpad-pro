import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileText,
  File,
  FileImage,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  Presentation,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Search,
  FolderOpen,
  Building2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllDocuments, AggregatedDocument } from '@/hooks/useAllDocuments';
import { useGetDocumentUrl } from '@/hooks/useDocuments';
import { toast } from 'sonner';

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

const CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'documents.allCategories' },
  { value: 'pitch_deck', labelKey: 'documents.categoryPitchDeck' },
  { value: 'financial_model', labelKey: 'documents.categoryFinancialModel' },
  { value: 'legal', labelKey: 'documents.categoryLegal' },
  { value: 'marketing', labelKey: 'documents.categoryMarketing' },
  { value: 'product', labelKey: 'documents.categoryProduct' },
  { value: 'team', labelKey: 'documents.categoryTeam' },
  { value: 'other', labelKey: 'documents.categoryOther' },
];

export default function Documents() {
  const { t } = useTranslation();
  const { data: documents, isLoading } = useAllDocuments();
  const getDocumentUrl = useGetDocumentUrl();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => {
      const matchesSearch = !search || 
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.description?.toLowerCase().includes(search.toLowerCase()) ||
        doc.workspace_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [documents, search, categoryFilter]);

  // Group by workspace
  const grouped = useMemo(() => {
    const map: Record<string, { name: string; workspaceId: string; docs: AggregatedDocument[] }> = {};
    filtered.forEach(doc => {
      if (!map[doc.workspace_id]) {
        map[doc.workspace_id] = { name: doc.workspace_name, workspaceId: doc.workspace_id, docs: [] };
      }
      map[doc.workspace_id].docs.push(doc);
    });
    return Object.values(map);
  }, [filtered]);

  const handleOpen = async (doc: AggregatedDocument) => {
    if (doc.external_url) {
      window.open(doc.external_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (doc.file_path) {
      try {
        const url = await getDocumentUrl(doc.file_path);
        window.open(url, '_blank');
      } catch {
        toast.error(t('documents.downloadFailed'));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('documentsPage.title', { defaultValue: 'Documentos' })}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('documentsPage.subtitle', { defaultValue: 'Todos os ficheiros, templates e submissões num único lugar.' })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('documentsPage.searchPlaceholder', { defaultValue: 'Pesquisar documentos...' })}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, { defaultValue: opt.value === 'all' ? 'Todas as categorias' : opt.value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {documents && documents.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filtered.length} {t('documentsPage.documentsFound', { defaultValue: 'documentos' })}</span>
          {search && <span>• {t('documentsPage.filtered', { defaultValue: 'filtrado' })}</span>}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={t('documentsPage.emptyTitle', { defaultValue: 'Sem documentos' })}
          description={t('documentsPage.emptyDescription', { defaultValue: 'Os documentos submetidos nos workspaces aparecerão aqui.' })}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <Card key={group.workspaceId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Link 
                    to={`/workspace/${group.workspaceId}?tab=documents`} 
                    className="hover:underline"
                  >
                    {group.name}
                  </Link>
                  <Badge variant="secondary" className="ml-auto">{group.docs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.docs.map(doc => {
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">
                              {doc.name || t('documents.untitled', { defaultValue: 'Sem título' })}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                              {doc.category && (
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {doc.category}
                                </Badge>
                              )}
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
                              <span>{format(new Date(doc.created_at), 'dd MMM yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpen(doc)}
                          className="shrink-0"
                        >
                          {doc.external_url ? (
                            <ExternalLink className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
