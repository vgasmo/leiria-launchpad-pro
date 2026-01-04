import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { AppConfig } from '@/lib/appConfig';
import { 
  Calendar,
  Copy, 
  Check, 
  ChevronDown,
  Download,
  RefreshCw,
  Rss,
  Key
} from 'lucide-react';

interface CalendarFeedCardProps {
  workspaceId?: string;
}

export function CalendarFeedCard({ workspaceId }: CalendarFeedCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing calendar token
  useEffect(() => {
    const fetchToken = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('calendar_feed_token')
        .eq('id', user.id)
        .single();
      
      if (!error && data?.calendar_feed_token) {
        setCalendarToken(data.calendar_feed_token);
      }
      setIsLoading(false);
    };
    
    fetchToken();
  }, [user?.id]);

  // Generate the calendar feed URL using secure token
  const feedUrl = calendarToken 
    ? `${AppConfig.supabaseUrl}/functions/v1/calendar-feed?token=${calendarToken}`
    : workspaceId 
      ? AppConfig.workspaceCalendarUrl(workspaceId)
      : '';

  const generateToken = async () => {
    if (!user?.id) return;
    
    setIsGenerating(true);
    try {
      // Generate a cryptographically secure 256-bit token (64 hex chars)
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const { error } = await supabase
        .from('profiles')
        .update({ calendar_feed_token: token })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setCalendarToken(token);
      toast.success('Calendar feed token generated successfully');
    } catch (err) {
      console.error('Error generating token:', err);
      toast.error('Failed to generate calendar token');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateToken = async () => {
    if (!user?.id) return;
    if (!confirm('Regenerating the token will invalidate your current calendar subscriptions. Continue?')) {
      return;
    }
    await generateToken();
  };

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
    window.open(feedUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {/* Generate Token Section */}
        {!calendarToken && user && (
          <Alert>
            <Key className="h-4 w-4" />
            <AlertTitle>Secure Calendar Access</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                Generate a secure token to subscribe to your calendar feed. 
                This token allows calendar apps to access your sessions without logging in.
              </p>
              <Button
                size="sm"
                onClick={generateToken}
                disabled={isGenerating}
                className="mt-2"
              >
                {isGenerating ? 'Generating...' : 'Generate Calendar Token'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Calendar URL */}
        {calendarToken && (
          <div className="space-y-2">
            <Label>Calendar subscription URL</Label>
            <div className="flex gap-2">
              <Input
                value={feedUrl}
                readOnly
                className="font-mono text-xs bg-muted"
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
        )}

        {/* Quick Actions */}
        {calendarToken && (
          <div className="flex gap-2 flex-wrap">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerateToken}
              disabled={isGenerating}
              className="gap-2 text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate token
            </Button>
          </div>
        )}

        {/* Setup Instructions */}
        {calendarToken && (
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
        )}
      </CardContent>
    </Card>
  );
}
