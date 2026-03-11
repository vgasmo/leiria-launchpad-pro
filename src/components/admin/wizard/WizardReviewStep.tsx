import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Layers,
  BarChart3,
  BookOpen,
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Star,
} from 'lucide-react';
import type { ProgramSetupDraft } from '@/hooks/useProgramSetup';

interface WizardReviewStepProps {
  draft: ProgramSetupDraft;
  validationErrors: string[];
}

export function WizardReviewStep({ draft, validationErrors }: WizardReviewStepProps) {
  const { t } = useTranslation();
  const { basics, stages, kpis, coreKpis, playbooks, alertRules, healthModel } = draft.draft_json;

  const activeStages = stages?.filter((s) => s.is_active) || [];
  const totalKpis = kpis?.reduce((sum, s) => sum + s.kpis.length, 0) || 0;
  const totalPlaybookItems = playbooks?.reduce((sum, p) => sum + p.items.length, 0) || 0;
  const enabledRules = alertRules?.filter((r) => r.is_enabled).length || 0;

  const hasErrors = validationErrors.length > 0;

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      {hasErrors ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cannot Publish</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Ready to Publish</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            All validations passed. Your program configuration is ready to be published.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Basics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Program Basics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{basics?.name || 'Untitled'}</p>
              {basics?.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{basics.description}</p>
              )}
              {basics?.start_date && (
                <p className="text-xs text-muted-foreground">Starts: {basics.start_date}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {activeStages.map((stage) => (
                <Badge key={stage.stage_key} variant="secondary">
                  {stage.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {activeStages.length} active stage{activeStages.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalKpis}</p>
            <p className="text-xs text-muted-foreground">Total across all stages</p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-3 w-3 text-yellow-500" />
              <span className="text-xs">
                {coreKpis?.length || 0} core KPIs
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Playbooks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Playbooks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{playbooks?.length || 0}</p>
            <p className="text-xs text-muted-foreground">
              {totalPlaybookItems} items (milestones + actions)
            </p>
          </CardContent>
        </Card>

        {/* Alert Rules */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alert Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{enabledRules}</p>
            <p className="text-xs text-muted-foreground">
              of {alertRules?.length || 0} rules enabled
            </p>
          </CardContent>
        </Card>

        {/* Health Model */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {healthModel?.is_enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              Health Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={healthModel?.is_enabled ? 'default' : 'secondary'}>
              {healthModel?.is_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {healthModel?.is_enabled && (
              <p className="text-xs text-muted-foreground mt-2">
                {Object.keys(healthModel.weights_json || {}).length} dimensions configured
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core KPIs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[100px]">
            <div className="flex flex-wrap gap-2">
              {coreKpis?.map((kpi, idx) => (
                <Badge key={idx} variant="outline" className="gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {kpi.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}