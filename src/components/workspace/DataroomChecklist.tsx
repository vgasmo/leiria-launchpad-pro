import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Check, X, Upload, FileText, TrendingUp,
  Users, DollarSign, Lightbulb, BarChart3,
  Sparkles, Eye, MessageSquare, BookOpen,
} from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useDocumentReviews } from '@/hooks/useDocumentReviews';
import { useSearchParams } from 'react-router-dom';
import { PitchDeckReviewPanel } from './PitchDeckReviewPanel';

interface DataroomChecklistProps {
  workspaceId: string;
  canWrite: boolean;
  isStaff: boolean;
  isMentor: boolean;
}

interface ChecklistItem {
  id: string;
  labelKey: string;
  icon: typeof FileText;
  categoryKey: string;
  required: boolean;
  /** ID of the template in the templates table, if one exists */
  templateId?: string;
  /** Name of the template to search for in the templates sub-tab */
  templateName?: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'pitch_deck', labelKey: 'dataroomChecklist.pitchDeck', icon: Lightbulb, categoryKey: 'pitch_deck', required: true, templateId: '479fa1ff-066f-409f-bd03-9a9242d559bf', templateName: 'Pitch Deck Checklist' },
  { id: 'one_pager', labelKey: 'dataroomChecklist.onePager', icon: FileText, categoryKey: 'one_pager', required: true, templateId: '633a9b38-93d9-4a5f-a478-264bce866676', templateName: 'Value Proposition Canvas' },
  { id: 'financial_model', labelKey: 'dataroomChecklist.financialModel', icon: DollarSign, categoryKey: 'financial_model', required: true, templateId: '8c7e8080-6d4b-4b99-96b3-340d1e7e37eb', templateName: 'Unit Economics' },
  { id: 'team', labelKey: 'dataroomChecklist.teamDeck', icon: Users, categoryKey: 'team', required: false, templateId: 'd4a3a07b-7974-4a2c-a325-2f7cf3422cb9', templateName: 'Hiring Plan' },
  { id: 'traction', labelKey: 'dataroomChecklist.tractionReport', icon: TrendingUp, categoryKey: 'traction', required: false },
  { id: 'market', labelKey: 'dataroomChecklist.marketAnalysis', icon: BarChart3, categoryKey: 'market', required: false, templateId: 'c9cca57a-bbde-4a4a-a136-efbd1c858e66', templateName: 'Competitor Analysis' },
];

export function DataroomChecklist({ workspaceId, canWrite, isStaff, isMentor }: DataroomChecklistProps) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const { data: documents } = useDocuments(workspaceId);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);

  // Find matching document for each checklist item
  const getDocForCategory = (categoryKey: string) => {
    return documents?.find(
      d => d.category === categoryKey ||
        d.name.toLowerCase().includes(categoryKey.replace('_', ' ')) ||
        d.name.toLowerCase().includes(categoryKey.replace('_', '-'))
    );
  };

  const handleUpload = (categoryKey: string) => {
    setSearchParams({ tab: 'documents', sub: 'all', upload: categoryKey }, { replace: true });
  };

  const handleOpenTemplate = (item: ChecklistItem) => {
    // Navigate to the tools sub-tab with the specific template ID
    const params: Record<string, string> = { tab: 'documents', sub: 'tools' };
    if (item.templateId) {
      params.openTemplate = item.templateId;
    }
    setSearchParams(params, { replace: true });
  };

  const completedCount = CHECKLIST_ITEMS.filter(item => getDocForCategory(item.categoryKey)).length;
  const requiredCount = CHECKLIST_ITEMS.filter(item => item.required).length;
  const requiredCompleted = CHECKLIST_ITEMS.filter(item => item.required && getDocForCategory(item.categoryKey)).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                {t('dataroomChecklist.title', { defaultValue: 'Documentos para Investidor' })}
              </CardTitle>
              <CardDescription>
                {t('dataroomChecklist.description', {
                  defaultValue: 'Checklist de documentos essenciais para o Data Room',
                })}
              </CardDescription>
            </div>
            <Badge variant={requiredCompleted === requiredCount ? 'default' : 'secondary'}>
              {completedCount}/{CHECKLIST_ITEMS.length}
            </Badge>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item) => {
              const doc = getDocForCategory(item.categoryKey);
              const Icon = item.icon;
              const hasDoc = !!doc;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/30"
                >
                  {/* Status icon */}
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    hasDoc ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {hasDoc ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>

                  {/* Icon + label */}
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${hasDoc ? '' : 'text-muted-foreground'}`}>
                        {t(item.labelKey, { defaultValue: item.id })}
                      </span>
                      {item.required && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {t('common.required', { defaultValue: 'Obrigatório' })}
                        </Badge>
                      )}
                    </div>
                    {hasDoc && doc.name && (
                      <p className="text-xs text-muted-foreground truncate">{doc.name}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {hasDoc && item.id === 'pitch_deck' && (
                      <>
                        <PitchDeckReviewBadge documentId={doc.id} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReviewDocId(doc.id)}
                          title={t('dataroomChecklist.viewReview', { defaultValue: 'Ver avaliação' })}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!hasDoc && canWrite && (
                      <div className="flex items-center gap-1">
                        {item.templateId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTemplate(item)}
                            title={t('dataroomChecklist.useTemplate', { defaultValue: 'Usar template' })}
                          >
                            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                            {t('dataroomChecklist.template', { defaultValue: 'Template' })}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpload(item.categoryKey)}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          {t('common.upload', { defaultValue: 'Upload' })}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Review panel for pitch deck */}
      {reviewDocId && (
        <PitchDeckReviewPanel
          documentId={reviewDocId}
          workspaceId={workspaceId}
          isStaff={isStaff}
          isMentor={isMentor}
          onClose={() => setReviewDocId(null)}
        />
      )}
    </>
  );
}

/** Small badge showing review status for a document */
function PitchDeckReviewBadge({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const { data: reviews } = useDocumentReviews(documentId);

  if (!reviews?.length) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        {t('dataroomChecklist.noReview', { defaultValue: 'Sem avaliação' })}
      </Badge>
    );
  }

  const latestReview = reviews[0];
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    approved: { label: t('review.approved', { defaultValue: 'Aprovado' }), variant: 'default' },
    needs_revision: { label: t('review.needsRevision', { defaultValue: 'Precisa revisão' }), variant: 'secondary' },
    rejected: { label: t('review.rejected', { defaultValue: 'Rejeitado' }), variant: 'destructive' },
    pending: { label: t('review.pending', { defaultValue: 'Pendente' }), variant: 'outline' },
  };

  const status = statusMap[latestReview.approval_status] || statusMap.pending;

  return (
    <Badge variant={status.variant} className="text-xs">
      {status.label}
    </Badge>
  );
}
