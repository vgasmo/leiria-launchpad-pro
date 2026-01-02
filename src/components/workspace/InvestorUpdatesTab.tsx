import { useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Download, 
  Mail, 
  Copy, 
  Link2, 
  Trash2,
  Loader2,
  Calendar,
  TrendingUp,
  Target,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInvestorUpdates } from '@/hooks/useInvestorUpdates';
import { toast } from 'sonner';

interface InvestorUpdatesTabProps {
  workspaceId: string;
  canWrite: boolean;
}

interface UpdateContent {
  highlights?: string[];
  lowlights?: string[];
  kpis?: { name: string; value: number; change?: number; unit?: string }[];
  milestones?: { title: string; status: string }[];
  risks?: string[];
  asks?: string[];
  priorities?: string[];
}

export function InvestorUpdatesTab({ workspaceId, canWrite }: InvestorUpdatesTabProps) {
  const { 
    investorUpdates, 
    shareLinks,
    isLoading,
    generateInvestorUpdate,
    createShareLink,
    revokeShareLink,
  } = useInvestorUpdates(workspaceId);

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [shareDays, setShareDays] = useState('7');
  const [shareScope, setShareScope] = useState('report_only');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateInvestorUpdate.mutateAsync({ month: selectedMonth });
      toast.success('Investor update generated');
      setShowGenerateDialog(false);
    } catch (error) {
      toast.error('Failed to generate update');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true);
    try {
      const link = await createShareLink.mutateAsync({
        scope: shareScope,
        expiresInDays: parseInt(shareDays),
      });
      toast.success('Share link created');
      
      // Copy to clipboard
      const shareUrl = `${window.location.origin}/share/${link.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
      
      setShowShareDialog(false);
    } catch (error) {
      toast.error('Failed to create share link');
    } finally {
      setIsCreatingLink(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleRevokeLink = async (linkId: string) => {
    try {
      await revokeShareLink.mutateAsync(linkId);
      toast.success('Link revoked');
    } catch (error) {
      toast.error('Failed to revoke link');
    }
  };

  const copyUpdateAsMarkdown = (content: UpdateContent) => {
    let markdown = `# Investor Update - ${format(new Date(), 'MMMM yyyy')}\n\n`;
    
    if (content.highlights?.length) {
      markdown += `## Highlights\n${content.highlights.map(h => `- ${h}`).join('\n')}\n\n`;
    }
    if (content.lowlights?.length) {
      markdown += `## Lowlights\n${content.lowlights.map(l => `- ${l}`).join('\n')}\n\n`;
    }
    if (content.kpis?.length) {
      markdown += `## KPIs\n${content.kpis.map(k => `- **${k.name}**: ${k.value}${k.unit || ''} ${k.change ? `(${k.change > 0 ? '+' : ''}${k.change}%)` : ''}`).join('\n')}\n\n`;
    }
    if (content.milestones?.length) {
      markdown += `## Milestones\n${content.milestones.map(m => `- ${m.title} (${m.status})`).join('\n')}\n\n`;
    }
    if (content.risks?.length) {
      markdown += `## Risks & Challenges\n${content.risks.map(r => `- ${r}`).join('\n')}\n\n`;
    }
    if (content.asks?.length) {
      markdown += `## Asks\n${content.asks.map(a => `- ${a}`).join('\n')}\n\n`;
    }
    if (content.priorities?.length) {
      markdown += `## Next Month Priorities\n${content.priorities.map(p => `- ${p}`).join('\n')}\n\n`;
    }

    navigator.clipboard.writeText(markdown);
    toast.success('Copied as Markdown');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Update
            </Button>
            <Button variant="outline" onClick={() => setShowShareDialog(true)}>
              <Link2 className="h-4 w-4 mr-2" />
              Create Share Link
            </Button>
          </>
        )}
      </div>

      {/* Active Share Links */}
      {shareLinks && shareLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-4 w-4" />
              Active Share Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shareLinks.filter(l => !l.revoked_at).map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{link.scope.replace('_', ' ')}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Expires {format(new Date(link.expires_at), 'MMM d, yyyy')}
                    </span>
                    {link.views_count !== null && link.views_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {link.views_count} view{link.views_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(link.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleRevokeLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Updates List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Investor Updates
          </CardTitle>
          <CardDescription>
            Generated monthly updates for investors and board members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investorUpdates?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No updates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate your first investor update to share with stakeholders
              </p>
              {canWrite && (
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate First Update
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {investorUpdates?.map((update) => {
                const content = update.content_json as UpdateContent;
                
                return (
                  <div key={update.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">
                          {format(new Date(update.month), 'MMMM yyyy')} Update
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Generated {format(new Date(update.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyUpdateAsMarkdown(content)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>

                    {/* Update Preview */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {content.highlights && content.highlights.length > 0 && (
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-sm text-green-700 dark:text-green-400">Highlights</span>
                          </div>
                          <ul className="text-sm space-y-1">
                            {content.highlights.slice(0, 3).map((h, i) => (
                              <li key={i} className="text-green-800 dark:text-green-200">• {h}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {content.kpis && content.kpis.length > 0 && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-sm text-blue-700 dark:text-blue-400">Key Metrics</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {content.kpis.slice(0, 4).map((kpi, i) => (
                              <div key={i} className="text-sm">
                                <span className="text-muted-foreground">{kpi.name}:</span>
                                <span className="font-medium ml-1">{kpi.value}{kpi.unit || ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {content.risks && content.risks.length > 0 && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="font-medium text-sm text-amber-700 dark:text-amber-400">Risks</span>
                          </div>
                          <ul className="text-sm space-y-1">
                            {content.risks.slice(0, 2).map((r, i) => (
                              <li key={i} className="text-amber-800 dark:text-amber-200">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Investor Update</DialogTitle>
            <DialogDescription>
              Create a structured monthly update from your workspace data
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Link Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Share Link</DialogTitle>
            <DialogDescription>
              Create a read-only link to share with investors or board members
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={shareScope} onValueChange={setShareScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report_only">Report Only</SelectItem>
                  <SelectItem value="kpis_only">KPIs Only</SelectItem>
                  <SelectItem value="full_readonly">Full Read-Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expires In</Label>
              <Select value={shareDays} onValueChange={setShareDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateShareLink} disabled={isCreatingLink}>
              {isCreatingLink && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
