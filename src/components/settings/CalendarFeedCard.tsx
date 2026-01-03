import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AppConfig } from '@/lib/appConfig';
import { 
  Calendar,
  Copy, 
  Check, 
  ChevronDown,
  ExternalLink,
  Link,
  Download,
  RefreshCw,
  Rss
} from 'lucide-react';

interface CalendarFeedCardProps {
  workspaceId?: string;
}

export function CalendarFeedCard({ workspaceId }: CalendarFeedCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Generate the calendar feed URL
  const feedUrl = workspaceId 
    ? AppConfig.workspaceCalendarUrl(workspaceId)
    : user?.id 
      ? AppConfig.calendarFeedUrl(user.id)
      : '';

  const copyToClipboard = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Calendar URL copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownloadICS = () => {
    if (!feedUrl) return;
    // Trigger direct download
    window.open(feedUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Feed
          <Badge variant="secondary" className="gap-1">
            <Rss className="h-3 w-3" />
            ICS
          </Badge>
        </CardTitle>
        <CardDescription>
          Subscribe to your sessions calendar in Outlook, Google Calendar, or Apple Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar URL */}
        <div className="space-y-2">
          <Label>Calendar subscription URL</Label>
          <div className="flex gap-2">
            <Input
              value={feedUrl}
              readOnly
              className="font-mono text-xs bg-muted"
              placeholder={!user ? 'Please log in to get your calendar URL' : ''}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              disabled={!feedUrl}
              title="Copy URL"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This URL will automatically sync new sessions to your calendar
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadICS}
            disabled={!feedUrl}
            className="gap-2"
          >
            <Download className="h-3.5 w-3.5" />
            Download .ics file
          </Button>
        </div>

        {/* Setup Instructions */}
        <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs p-0 h-auto">
              <ChevronDown className={`h-3 w-3 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
              How to subscribe in your calendar app
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4 text-sm">
              {/* Outlook */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="text-[#0078D4]">📬</span> Outlook
                </h4>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Open Outlook → Calendar</li>
                  <li>Click "Add calendar" → "Subscribe from web"</li>
                  <li>Paste the calendar URL above</li>
                  <li>Name it "Startup Leiria Sessions" and click Import</li>
                </ol>
              </div>

              {/* Google Calendar */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="text-[#4285F4]">📅</span> Google Calendar
                </h4>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Open Google Calendar → Settings</li>
                  <li>Click "Add calendar" → "From URL"</li>
                  <li>Paste the calendar URL and click "Add calendar"</li>
                </ol>
              </div>

              {/* Apple Calendar */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span>🍎</span> Apple Calendar
                </h4>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Open Calendar app → File → New Calendar Subscription</li>
                  <li>Paste the calendar URL</li>
                  <li>Configure refresh frequency and click Subscribe</li>
                </ol>
              </div>

              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertTitle className="text-xs">Auto-refresh</AlertTitle>
                <AlertDescription className="text-xs">
                  Most calendar apps check for updates every 15-60 minutes. 
                  Changes to sessions will appear automatically.
                </AlertDescription>
              </Alert>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
