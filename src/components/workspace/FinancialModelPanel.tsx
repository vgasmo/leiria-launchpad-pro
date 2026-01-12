import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Upload, FileSpreadsheet, Download, RefreshCw, Calculator, TrendingUp, 
  Loader2, CheckCircle2, AlertTriangle, XCircle, Sparkles, ChevronDown,
  ChevronUp, ArrowRight, Lightbulb, Target, ListChecks, Copy, Calendar,
  TrendingDown, Zap, Clock, Users, FileDown
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUploadDocument, useGetDocumentUrl, Document } from '@/hooks/useDocuments';
import {
  useFinancialModelVersions,
  useCreateFinancialModelVersion,
  useParseFinancialModel,
  useSyncFinancialKpis,
  useGenerateFinancialModelReview,
  useCreateActionsFromInsights,
  useCreateActionsFromAIReview,
  useSetActiveFinancialVersion,
  generateInsights,
  FinancialModelVersion,
  KeyMetrics,
  AIReview,
  FinancialInsight,
} from '@/hooks/useFinancialModel';

interface FinancialModelPanelProps {
  workspaceId: string;
  canWrite: boolean;
}

const SCENARIOS = ['Base', 'Conservative', 'Optimistic', 'Custom'];

function MetricCard({ 
  label, 
  value, 
  unit, 
  trend,
  comparison 
}: { 
  label: string; 
  value: number | null; 
  unit: string;
  trend?: 'up' | 'down' | 'neutral';
  comparison?: { prev: number | null; label: string };
}) {
  if (value === null) return null;
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  
  return (
    <div className="p-3 rounded-lg border bg-card">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold">
          {unit === '€' ? `€${value.toLocaleString()}` : 
           unit === '%' ? `${value.toFixed(1)}%` :
           unit === 'ratio' ? `${value.toFixed(1)}x` :
           `${value}`}
        </span>
        {unit === 'months' && <span className="text-xs text-muted-foreground">months</span>}
      </div>
      {TrendIcon && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          {comparison && comparison.prev !== null && (
            <span>vs {comparison.prev} ({comparison.label})</span>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight, onCreateAction }: { insight: FinancialInsight; onCreateAction?: () => void }) {
  const severityConfig = {
    critical: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: XCircle, color: 'text-red-600' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle, color: 'text-amber-600' },
    info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Lightbulb, color: 'text-blue-600' },
  };
  
  const config = severityConfig[insight.severity];
  const Icon = config.icon;
  
  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
          {insight.suggested_action && onCreateAction && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={onCreateAction}>
              <ArrowRight className="h-3 w-3 mr-1" />
              Create Action
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function FinancialModelPanel({ workspaceId, canWrite }: FinancialModelPanelProps) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useFinancialModelVersions(workspaceId);
  const uploadMutation = useUploadDocument();
  const createVersion = useCreateFinancialModelVersion(workspaceId);
  const parseModel = useParseFinancialModel();
  const syncKpis = useSyncFinancialKpis(workspaceId);
  const generateReview = useGenerateFinancialModelReview();
  const createActionsFromInsights = useCreateActionsFromInsights(workspaceId);
  const createActionsFromAI = useCreateActionsFromAIReview(workspaceId);
  const setActiveVersion = useSetActiveFinancialVersion(workspaceId);
  const getDocumentUrl = useGetDocumentUrl();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('Base');
  const [selectedVersion, setSelectedVersion] = useState<FinancialModelVersion | null>(null);
  const [aiReviewMode, setAiReviewMode] = useState<'full' | 'investor' | 'mentor_prep'>('full');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics', 'insights']));
  const [templateAvailable, setTemplateAvailable] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latestVersion = versions?.[0];
  const activeVersion = selectedVersion || latestVersion;
  const metrics = activeVersion?.key_metrics_json;
  const aiReview = activeVersion?.ai_review_json;
  const insights = metrics ? generateInsights(metrics) : [];

  // Template download URL (public bucket)
  const TEMPLATE_BUCKET = 'public-assets';
  const TEMPLATE_PATH = 'templates/Template_Avaliacao_Startup_Ecossistema.xlsm';
  
  const getTemplateUrl = () => {
    const { data } = supabase.storage
      .from(TEMPLATE_BUCKET)
      .getPublicUrl(TEMPLATE_PATH);
    return data.publicUrl;
  };

  // Check if template exists on mount - using useEffect instead of useState
  useEffect(() => {
    const checkTemplate = async () => {
      try {
        const url = getTemplateUrl();
        const response = await fetch(url, { method: 'HEAD' });
        setTemplateAvailable(response.ok);
      } catch {
        setTemplateAvailable(false);
      }
    };
    checkTemplate();
  }, []);

  const handleDownloadTemplate = async () => {
    const url = getTemplateUrl();
    
    // Check if template exists before opening
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        window.open(url, '_blank');
      } else {
        toast.error('Template not available yet. Ask an admin to upload it in Admin > Templates.');
      }
    } catch {
      toast.error('Template not available yet. Ask an admin to upload it in Admin > Templates.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - check extension first (more reliable than MIME)
    const fileName = file.name.toLowerCase();
    const isValidExtension = /\.(xlsx|xlsm|xls|csv)$/i.test(fileName);
    
    if (!isValidExtension) {
      toast.error('Please upload an Excel (.xlsx, .xlsm, .xls) or CSV file');
      return;
    }

    try {
      // Upload document
      const document = await uploadMutation.mutateAsync({
        workspaceId,
        file,
        category: 'Financial Model',
        description: `Financial Model - ${scenarioName} scenario`,
      });

      // Create version
      const version = await createVersion.mutateAsync({
        documentId: document.id,
        scenarioName,
      });

      setUploadOpen(false);
      setScenarioName('Base');
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Auto-parse
      await parseModel.mutateAsync(version.id);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleParse = async () => {
    if (!activeVersion) return;
    await parseModel.mutateAsync(activeVersion.id);
  };

  const handleSyncKpis = async () => {
    if (!activeVersion) return;
    await syncKpis.mutateAsync(activeVersion.id);
  };

  const handleGenerateAIReview = async () => {
    if (!activeVersion) return;
    await generateReview.mutateAsync({ versionId: activeVersion.id, mode: aiReviewMode });
  };

  const handleCreateAllInsightActions = async () => {
    const actionsToCreate = insights.filter(i => i.suggested_action);
    if (actionsToCreate.length === 0) {
      toast.info('No actionable insights');
      return;
    }
    await createActionsFromInsights.mutateAsync(actionsToCreate);
  };

  const handleCreateAIActions = async () => {
    if (!aiReview?.recommended_actions?.length) return;
    await createActionsFromAI.mutateAsync(aiReview.recommended_actions);
  };

  const handleDownload = async () => {
    if (!activeVersion?.document?.file_path) return;
    try {
      const url = await getDocumentUrl(activeVersion.document.file_path);
      window.open(url, '_blank');
    } catch {
      toast.error('Failed to download');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const copyInvestorNarrative = () => {
    if (!aiReview?.investor_narrative) return;
    navigator.clipboard.writeText(aiReview.investor_narrative);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Financial Model
            </CardTitle>
            <CardDescription>
              Upload, parse, and analyze your financial projections
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}>
              <FileDown className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            {canWrite && (
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {versions?.length ? 'New Version' : 'Upload Model'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Financial Model</DialogTitle>
                    <DialogDescription>
                      Supports Excel (.xlsx, .xlsm, .xls) and CSV files
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Scenario</Label>
                      <Select value={scenarioName} onValueChange={setScenarioName}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCENARIOS.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>File</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xlsm,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={uploadMutation.isPending || createVersion.isPending}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!versions?.length ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No financial model uploaded yet</p>
            <p className="text-sm text-muted-foreground">
              Upload your Excel model to track KPIs, get insights, and AI recommendations
            </p>
          </div>
        ) : (
          <>
            {/* Version Selector */}
            {versions.length > 1 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Version:</Label>
                <Select 
                  value={activeVersion?.id || ''} 
                  onValueChange={(id) => setSelectedVersion(versions.find(v => v.id === id) || null)}
                >
                  <SelectTrigger className="w-64 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.scenario_name} - {format(new Date(v.uploaded_at), 'MMM d, yyyy HH:mm')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current Version Info */}
            {activeVersion && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activeVersion.document?.name || 'Financial Model'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs h-5">
                        {activeVersion.scenario_name}
                      </Badge>
                      <span>{formatDistanceToNow(new Date(activeVersion.uploaded_at), { addSuffix: true })}</span>
                      <Badge 
                        variant={activeVersion.status === 'parsed' ? 'default' : 
                                activeVersion.status === 'failed' ? 'destructive' : 'secondary'}
                        className="text-xs h-5"
                      >
                        {activeVersion.status === 'parsed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {activeVersion.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                        {activeVersion.status === 'parsing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {activeVersion.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {activeVersion.status === 'uploaded' && canWrite && (
                    <Button size="sm" onClick={handleParse} disabled={parseModel.isPending}>
                      {parseModel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
                      Parse
                    </Button>
                  )}
                  {activeVersion.status === 'failed' && canWrite && (
                    <Button size="sm" variant="outline" onClick={handleParse} disabled={parseModel.isPending}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Parse Error */}
            {activeVersion?.parse_error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Parse Error</p>
                    <p className="text-muted-foreground">{activeVersion.parse_error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Content */}
            {activeVersion?.status === 'parsed' && metrics && (
              <Tabs defaultValue="metrics" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
                  <TabsTrigger value="insights">
                    Insights
                    {insights.filter(i => i.severity !== 'info').length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 text-xs">
                        {insights.filter(i => i.severity !== 'info').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ai">AI Review</TabsTrigger>
                </TabsList>

                <TabsContent value="metrics" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Runway" value={metrics.runway_months} unit="months" />
                    <MetricCard label="Monthly Burn" value={metrics.burn_rate_monthly} unit="€" />
                    <MetricCard label="Gross Margin" value={metrics.gross_margin_pct} unit="%" />
                    <MetricCard label="Cash Balance" value={metrics.cash_end} unit="€" />
                    <MetricCard label="CAC" value={metrics.cac} unit="€" />
                    <MetricCard label="LTV" value={metrics.ltv} unit="€" />
                    <MetricCard label="LTV/CAC" value={metrics.ltv_cac} unit="ratio" />
                    <MetricCard label="Payback" value={metrics.payback_months} unit="months" />
                    <MetricCard label="Churn" value={metrics.churn_monthly_pct} unit="%" />
                    <MetricCard label="Treasury Need" value={metrics.treasury_need} unit="€" />
                  </div>

                  {canWrite && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleSyncKpis} disabled={syncKpis.isPending}>
                        {syncKpis.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Target className="h-4 w-4 mr-1" />}
                        Sync to KPIs
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Not enough data to generate insights
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {insights.map((insight, idx) => (
                          <InsightCard 
                            key={idx} 
                            insight={insight}
                            onCreateAction={insight.suggested_action && canWrite ? () => {
                              createActionsFromInsights.mutate([insight]);
                            } : undefined}
                          />
                        ))}
                      </div>

                      {canWrite && insights.some(i => i.suggested_action) && (
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            onClick={handleCreateAllInsightActions}
                            disabled={createActionsFromInsights.isPending}
                          >
                            {createActionsFromInsights.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <ListChecks className="h-4 w-4 mr-1" />
                            )}
                            Create All Actions
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="ai" className="space-y-4">
                  {!aiReview ? (
                    <div className="text-center py-6 space-y-4">
                      <Sparkles className="h-8 w-8 mx-auto text-primary/50" />
                      <div>
                        <p className="font-medium">AI Financial Review</p>
                        <p className="text-sm text-muted-foreground">
                          Get AI-powered analysis with actionable recommendations
                        </p>
                      </div>
                      {canWrite && (
                        <div className="flex items-center justify-center gap-2">
                          <Select value={aiReviewMode} onValueChange={(v) => setAiReviewMode(v as typeof aiReviewMode)}>
                            <SelectTrigger className="w-40 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Review</SelectItem>
                              <SelectItem value="investor">Investor Focus</SelectItem>
                              <SelectItem value="mentor_prep">Mentor Prep</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={handleGenerateAIReview} disabled={generateReview.isPending}>
                            {generateReview.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="h-4 w-4 mr-1" />
                            )}
                            Generate Review
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm">{aiReview.summary}</p>
                        {activeVersion.ai_review_generated_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Generated {formatDistanceToNow(new Date(activeVersion.ai_review_generated_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>

                      {/* Questions */}
                      {aiReview.questions?.length > 0 && (
                        <Collapsible open={expandedSections.has('questions')}>
                          <CollapsibleTrigger 
                            className="flex items-center gap-2 w-full text-left py-2"
                            onClick={() => toggleSection('questions')}
                          >
                            {expandedSections.has('questions') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium text-sm">Questions to Explore ({aiReview.questions.length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 pt-2">
                            {aiReview.questions.map((q, idx) => (
                              <div key={idx} className="p-3 rounded-lg border bg-card text-sm">
                                <p className="font-medium">{q.q}</p>
                                <p className="text-xs text-muted-foreground mt-1">{q.why}</p>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Risks */}
                      {aiReview.risks?.length > 0 && (
                        <Collapsible open={expandedSections.has('risks')}>
                          <CollapsibleTrigger 
                            className="flex items-center gap-2 w-full text-left py-2"
                            onClick={() => toggleSection('risks')}
                          >
                            {expandedSections.has('risks') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium text-sm">Risks ({aiReview.risks.length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 pt-2">
                            {aiReview.risks.map((r, idx) => (
                              <div key={idx} className="p-3 rounded-lg border bg-card text-sm">
                                <div className="flex items-center gap-2">
                                  <Badge variant={r.severity === 'high' ? 'destructive' : r.severity === 'medium' ? 'secondary' : 'outline'}>
                                    {r.severity}
                                  </Badge>
                                  <span className="font-medium">{r.risk}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Mitigation: {r.mitigation}</p>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Recommended Actions */}
                      {aiReview.recommended_actions?.length > 0 && (
                        <Collapsible open={expandedSections.has('actions')} defaultOpen>
                          <CollapsibleTrigger 
                            className="flex items-center gap-2 w-full text-left py-2"
                            onClick={() => toggleSection('actions')}
                          >
                            {expandedSections.has('actions') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium text-sm">Recommended Actions ({aiReview.recommended_actions.length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 pt-2">
                            {aiReview.recommended_actions.map((a, idx) => (
                              <div key={idx} className="p-3 rounded-lg border bg-card text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{a.title}</span>
                                  <div className="flex items-center gap-1">
                                    <Badge variant={a.priority === 'urgent' ? 'destructive' : 'secondary'}>{a.priority}</Badge>
                                    <Badge variant="outline">{a.due_in_days}d</Badge>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                              </div>
                            ))}
                            {canWrite && (
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={handleCreateAIActions}
                                disabled={createActionsFromAI.isPending}
                              >
                                {createActionsFromAI.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <ListChecks className="h-4 w-4 mr-1" />
                                )}
                                Create All Actions
                              </Button>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Next Session Agenda */}
                      {aiReview.next_session_agenda?.length > 0 && (
                        <Collapsible open={expandedSections.has('agenda')}>
                          <CollapsibleTrigger 
                            className="flex items-center gap-2 w-full text-left py-2"
                            onClick={() => toggleSection('agenda')}
                          >
                            {expandedSections.has('agenda') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="font-medium text-sm">Suggested Agenda ({aiReview.next_session_agenda.length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-2">
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {aiReview.next_session_agenda.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Investor Narrative */}
                      {aiReview.investor_narrative && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Investor Update Snippet</span>
                            <Button variant="ghost" size="sm" className="h-6" onClick={copyInvestorNarrative}>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <p className="text-sm italic">{aiReview.investor_narrative}</p>
                        </div>
                      )}

                      {/* Regenerate */}
                      {canWrite && (
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Select value={aiReviewMode} onValueChange={(v) => setAiReviewMode(v as typeof aiReviewMode)}>
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Review</SelectItem>
                              <SelectItem value="investor">Investor Focus</SelectItem>
                              <SelectItem value="mentor_prep">Mentor Prep</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={handleGenerateAIReview} disabled={generateReview.isPending}>
                            {generateReview.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                            Regenerate
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
