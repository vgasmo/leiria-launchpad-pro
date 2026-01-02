import { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, Share2, Printer, TrendingUp, Target, CheckCircle2, Calendar, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HealthBadge } from '@/components/ui/HealthBadge';
import { StageBadge } from '@/components/ui/StageBadge';
import { useWorkspaceActions, useWorkspaceKpis, useWorkspaceMilestones, useWorkspaceSessions } from '@/hooks/useWorkspaceData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HealthScore, StartupStage } from '@/types/database';

interface ProgressReportViewProps {
  workspaceId: string;
  workspace: {
    stage: StartupStage;
    health_score: string | null;
    health_score_override: string | null;
    startup: { name: string; description: string | null } | null;
    program: { name: string } | null;
  };
}

export function ProgressReportView({ workspaceId, workspace }: ProgressReportViewProps) {
  const [open, setOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { data: actions } = useWorkspaceActions(workspaceId);
  const { data: kpiData } = useWorkspaceKpis(workspaceId);
  const { data: milestones } = useWorkspaceMilestones(workspaceId);
  const { data: sessions } = useWorkspaceSessions(workspaceId);

  const effectiveHealth = workspace.health_score_override || workspace.health_score;

  const milestoneCounts = {
    total: milestones?.length || 0,
    completed: milestones?.filter(m => m.status === 'completed').length || 0,
    inProgress: milestones?.filter(m => m.status === 'in_progress').length || 0,
  };

  const actionCounts = {
    total: actions?.length || 0,
    completed: actions?.filter(a => a.status === 'completed').length || 0,
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleShare = async () => {
    const shareUrl = window.location.href.replace(/\?.*/, '') + '?tab=overview';
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-progress-report-pdf', {
        body: { workspaceId },
      });

      if (error) throw error;

      // Create a blob from HTML and trigger download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new tab for printing/saving as PDF
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }

      toast.success('Report generated! Use browser print to save as PDF');
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Progress Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Progress Report
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 print:hidden">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>

        {/* Printable Report Content */}
        <div className="space-y-6 print:p-8" id="progress-report">
          {/* Header */}
          <div className="text-center border-b pb-6">
            <h1 className="text-2xl font-bold">{workspace.startup?.name}</h1>
            <p className="text-muted-foreground">{workspace.program?.name}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Report generated on {format(new Date(), 'MMMM d, yyyy')}
            </p>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Stage</p>
                <StageBadge stage={workspace.stage} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Health</p>
                <HealthBadge score={effectiveHealth as HealthScore | null} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Milestones</p>
                <p className="text-lg font-semibold">{milestoneCounts.completed}/{milestoneCounts.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Actions</p>
                <p className="text-lg font-semibold">{actionCounts.completed}/{actionCounts.total}</p>
              </CardContent>
            </Card>
          </div>

          {/* KPIs Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Key Metrics
              </CardTitle>
              {kpiData?.currentMonth && (
                <CardDescription>
                  {format(new Date(kpiData.currentMonth), 'MMMM yyyy')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {kpiData?.current.length === 0 ? (
                <p className="text-muted-foreground text-sm">No KPIs recorded this period</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {kpiData?.current.slice(0, 6).map((kpi: any) => (
                    <div key={kpi.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground truncate">{kpi.kpi_definition?.name}</p>
                      <p className="text-lg font-semibold">
                        {kpi.value?.toLocaleString() ?? '—'}
                        {kpi.kpi_definition?.unit && (
                          <span className="text-xs text-muted-foreground ml-1">{kpi.kpi_definition.unit}</span>
                        )}
                      </p>
                      {kpi.target_value && (
                        <p className="text-xs text-muted-foreground">
                          Target: {kpi.target_value.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Milestones Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No milestones defined</p>
              ) : (
                <div className="space-y-2">
                  {milestones?.slice(0, 8).map((milestone: any) => (
                    <div key={milestone.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${
                          milestone.status === 'completed' ? 'bg-green-500' :
                          milestone.status === 'in_progress' ? 'bg-blue-500' :
                          milestone.status === 'delayed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm">{milestone.title}</span>
                      </div>
                      <Badge variant={
                        milestone.status === 'completed' ? 'default' :
                        milestone.status === 'in_progress' ? 'secondary' : 'outline'
                      } className="text-xs capitalize">
                        {milestone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No sessions recorded</p>
              ) : (
                <div className="space-y-3">
                  {sessions?.slice(0, 5).map((session: any) => (
                    <div key={session.id} className="border-l-2 border-primary/30 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{session.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(session.scheduled_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {session.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Generated by Startup Leiria • {format(new Date(), 'PPP')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
