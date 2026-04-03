import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Settings2,
  Zap,
  Mail,
  Video,
  Copy,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

// Microsoft Teams icon
const TeamsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.19 8.77c1.32 0 2.4-1.06 2.4-2.38s-1.08-2.39-2.4-2.39c-.51 0-.98.16-1.37.43.25.52.38 1.1.38 1.71 0 .94-.32 1.8-.86 2.48.39.1.81.15 1.25.15h.6zm-4.12-3.4c0-1.62-1.32-2.93-2.95-2.93s-2.95 1.31-2.95 2.93 1.32 2.93 2.95 2.93 2.95-1.31 2.95-2.93zM5.27 11.53c0-.78.28-1.49.75-2.04H3.3v6.23c0 1.37 1.12 2.48 2.5 2.48.17 0 .33-.02.49-.05v-6.62h-1.02zm11.22-2.04H9.65c-1.38 0-2.5 1.11-2.5 2.48v5.81c0 .87.71 1.58 1.58 1.58H16c.87 0 1.58-.71 1.58-1.58v-7.43c0-.47-.38-.86-.86-.86h-.23zm.41 7.91c0 .31-.25.56-.56.56H9.22c-.31 0-.56-.25-.56-.56v-4.62c0-.31.25-.56.56-.56h7.12c.31 0 .56.25.56.56v4.62zm3.8-8.87c-.34-.15-.71-.24-1.1-.24h-.24c.56.62.9 1.44.9 2.33 0 .34-.05.67-.14.98h.91c.83 0 1.5.67 1.5 1.5v3.42c0 .31-.25.56-.56.56h-2.04v1.02h2.55c.87 0 1.58-.71 1.58-1.58v-5.81c0-1.08-.61-2.02-1.36-2.18z"/>
  </svg>
);

// Outlook icon
const OutlookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.88 12.04c0 .78-.29 1.47-.88 2.06-.59.59-1.28.88-2.06.88s-1.47-.29-2.06-.88c-.59-.59-.88-1.28-.88-2.06s.29-1.47.88-2.06c.59-.59 1.28-.88 2.06-.88s1.47.29 2.06.88c.59.59.88 1.28.88 2.06zM24 12v9.38c0 .46-.17.85-.5 1.18-.33.33-.72.5-1.18.5H8.32c-.46 0-.85-.17-1.18-.5-.33-.33-.5-.72-.5-1.18V14.5l7.5-5.25c.5-.35 1.04-.35 1.54 0L24 14.5V12zm0-2.62l-7.5-5.25c-.5-.35-1.04-.35-1.54 0L7.46 9.38V2.62c0-.46.17-.85.5-1.18.33-.33.72-.5 1.18-.5h13.68c.46 0 .85.17 1.18.5.33.33.5.72.5 1.18v6.76z"/>
  </svg>
);

export default function IntegrationsSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('common.copiedToClipboard'));
    } catch {
      toast.error(t('common.errorGeneric'));
    }
  };

  return (
    <AppLayout title={t('integrations.setupGuide', 'Guia de Configuração de Integrações')}>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations Setup Guide</h1>
          <p className="text-muted-foreground mt-2">
            Connect Startup Leiria to your Microsoft 365 environment for seamless notifications and calendar sync.
          </p>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="teams" className="gap-2">
              <TeamsIcon className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="outlook" className="gap-2">
              <OutlookIcon className="h-4 w-4" />
              Outlook
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sso" className="gap-2">
              <Settings2 className="h-4 w-4" />
              SSO
            </TabsTrigger>
          </TabsList>

          {/* Teams Integration */}
          <TabsContent value="teams" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TeamsIcon className="h-6 w-6 text-[#6264A7]" />
                  Microsoft Teams Notifications
                </CardTitle>
                <CardDescription>
                  Receive real-time notifications in your Teams channel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>What you'll get</AlertTitle>
                  <AlertDescription>
                    Automatic Teams messages when: check-ins are submitted, actions are assigned/overdue, 
                    sessions are scheduled, and health alerts are triggered.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Option 1: Teams Workflows (Easiest)</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li className="space-y-1">
                      <span>Open Microsoft Teams and navigate to your target channel</span>
                    </li>
                    <li className="space-y-1">
                      <span>Click the <strong>⋯</strong> menu → <strong>Workflows</strong></span>
                    </li>
                    <li className="space-y-1">
                      <span>Search for <strong>"Post to a channel when a webhook request is received"</strong></span>
                    </li>
                    <li className="space-y-1">
                      <span>Configure the workflow and copy the generated webhook URL</span>
                    </li>
                    <li className="space-y-1">
                      <span>Paste the URL in Settings → Integrations → Microsoft Teams</span>
                    </li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Option 2: Power Automate Flow</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      Go to <a href="https://make.powerautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        Power Automate <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Create new → Instant cloud flow</li>
                    <li>Add trigger: <strong>"When an HTTP request is received"</strong></li>
                    <li>Add action: <strong>"Post message in a chat or channel"</strong> (Microsoft Teams)</li>
                    <li>Configure the message to use dynamic content from the request body</li>
                    <li>Save and copy the HTTP POST URL</li>
                  </ol>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Request body schema (paste in Power Automate):</p>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "type": "object",
  "properties": {
    "type": { "type": "string" },
    "attachments": { "type": "array" }
  }
}`}
                    </pre>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 gap-1"
                      onClick={() => copyToClipboard('{"type":"object","properties":{"type":{"type":"string"},"attachments":{"type":"array"}}}')}
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>

                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Notification Types</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li><strong>Check-in submitted:</strong> When a startup completes their monthly check-in</li>
                      <li><strong>Action assigned:</strong> When a new action item is assigned to someone</li>
                      <li><strong>Action overdue:</strong> Daily reminder for overdue actions</li>
                      <li><strong>Session created:</strong> When a new session/meeting is scheduled</li>
                      <li><strong>Health alert:</strong> When a startup's health score drops significantly</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Outlook Integration */}
          <TabsContent value="outlook" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <OutlookIcon className="h-6 w-6 text-[#0078D4]" />
                  Outlook Calendar Sync
                </CardTitle>
                <CardDescription>
                  Automatically create Outlook calendar events with Teams meeting links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>What you'll get</AlertTitle>
                  <AlertDescription>
                    When sessions are created in Startup Leiria, they're automatically added to Outlook 
                    with a Teams meeting link. Updates and cancellations sync automatically.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Power Automate Setup (Recommended)</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      Go to <a href="https://make.powerautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        Power Automate <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Create new → Instant cloud flow</li>
                    <li>Add trigger: <strong>"When an HTTP request is received"</strong></li>
                    <li>Add action: <strong>"Create event (V4)"</strong> from Office 365 Outlook</li>
                    <li>Configure the event:
                      <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                        <li>Calendar: Your calendar or shared calendar</li>
                        <li>Subject: <code className="bg-muted px-1 rounded">@{'{'}triggerBody()['title']{'}'}</code></li>
                        <li>Start time: <code className="bg-muted px-1 rounded">@{'{'}triggerBody()['start']{'}'}</code></li>
                        <li>End time: <code className="bg-muted px-1 rounded">@{'{'}triggerBody()['end']{'}'}</code></li>
                        <li>Is online meeting: <strong>Yes</strong></li>
                      </ul>
                    </li>
                    <li>Add action: <strong>"Response"</strong> to return the event ID and Teams URL</li>
                    <li>Save and copy the HTTP POST URL</li>
                  </ol>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Response body (in Response action):</p>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "event_id": "@{body('Create_event_(V4)')?['id']}",
  "teams_url": "@{body('Create_event_(V4)')?['onlineMeetingUrl']}"
}`}
                    </pre>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 gap-1"
                      onClick={() => copyToClipboard('{"event_id":"@{body(\'Create_event_(V4)\')?[\'id\']}","teams_url":"@{body(\'Create_event_(V4)\')?[\'onlineMeetingUrl\']}"}')}
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Direct Microsoft Graph API (Coming Soon)</h3>
                  <p className="text-sm text-muted-foreground">
                    For a fully seamless experience, we're working on direct Microsoft Graph integration.
                    This will require Azure AD app registration with the following permissions:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    <li>Calendars.ReadWrite</li>
                    <li>OnlineMeetings.ReadWrite</li>
                  </ul>
                  <Badge variant="secondary">Coming in Phase 2</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Integration */}
          <TabsContent value="email" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-6 w-6" />
                  Email Ingestion
                </CardTitle>
                <CardDescription>
                  Automatically capture emails from Outlook into workspace communications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>How it works</AlertTitle>
                  <AlertDescription>
                    Emails sent to your workspace's unique address are automatically logged in the 
                    Communications tab. Great for capturing founder correspondence.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Automatic Email Forwarding with Power Automate</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>Create a shared mailbox in Microsoft 365 Admin Center (e.g., startups@yourdomain.com)</li>
                    <li>
                      Go to <a href="https://make.powerautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        Power Automate <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Create new → Automated cloud flow</li>
                    <li>Add trigger: <strong>"When a new email arrives (V3)"</strong></li>
                    <li>Add action: <strong>"HTTP"</strong> with POST method</li>
                    <li>Configure the HTTP action with your inbound email webhook URL</li>
                  </ol>

                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">HTTP request body:</p>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "alias": "startup-{workspace-id}",
  "from": "@{triggerOutputs()?['body/from']}",
  "subject": "@{triggerOutputs()?['body/subject']}",
  "body_text": "@{triggerOutputs()?['body/body']}"
}`}
                    </pre>
                  </div>

                  <Alert variant="default">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email Tagging Tips</AlertTitle>
                    <AlertDescription className="text-sm">
                      Use subject prefixes to categorize emails:
                      <ul className="list-disc list-inside mt-2">
                        <li><code>[Startup]</code> - General startup communications</li>
                        <li><code>[Deal]</code> - Investment-related correspondence</li>
                        <li><code>[Support]</code> - Support requests</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SSO Integration */}
          <TabsContent value="sso" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-6 w-6" />
                  Microsoft SSO (Single Sign-On)
                </CardTitle>
                <CardDescription>
                  Allow users to sign in with their Microsoft 365 accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Badge variant="secondary" className="mb-4">Setup Required</Badge>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Prerequisites</AlertTitle>
                  <AlertDescription>
                    You need Azure AD admin access to register an application and configure OAuth.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Azure AD App Registration</h3>
                  <ol className="list-decimal list-inside space-y-3 text-sm">
                    <li>
                      Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        Azure Portal → App Registrations <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Click <strong>"New registration"</strong></li>
                    <li>Configure:
                      <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                        <li>Name: <strong>Startup Leiria</strong></li>
                        <li>Supported account types: <strong>Accounts in this organizational directory only</strong></li>
                        <li>Redirect URI: <strong>Web</strong> → your Supabase Auth callback URL</li>
                      </ul>
                    </li>
                    <li>After creation, note the <strong>Application (client) ID</strong></li>
                    <li>Go to <strong>Certificates & secrets</strong> → New client secret</li>
                    <li>Copy the secret value (you'll need it for Supabase)</li>
                    <li>Go to <strong>API permissions</strong> → Add:
                      <ul className="list-disc list-inside ml-4 mt-2 text-muted-foreground">
                        <li>Microsoft Graph → Delegated → User.Read</li>
                        <li>Microsoft Graph → Delegated → email</li>
                        <li>Microsoft Graph → Delegated → profile</li>
                        <li>Microsoft Graph → Delegated → openid</li>
                      </ul>
                    </li>
                    <li>Click <strong>"Grant admin consent"</strong></li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Supabase Configuration</h3>
                  <p className="text-sm text-muted-foreground">
                    After creating the Azure AD app, configure the Microsoft provider in Supabase:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Go to your Supabase project → Authentication → Providers</li>
                    <li>Enable <strong>Azure (Microsoft)</strong></li>
                    <li>Enter your Azure AD Client ID and Client Secret</li>
                    <li>Copy the callback URL from Supabase to your Azure AD app's redirect URIs</li>
                  </ol>
                </div>

                <Alert variant="default">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>What users will experience</AlertTitle>
                  <AlertDescription>
                    Once configured, users will see a "Sign in with Microsoft" button on the login page.
                    They'll authenticate through Microsoft and be automatically mapped to their workspace.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Useful Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="https://make.powerautomate.com" target="_blank" rel="noopener noreferrer" 
                className="flex flex-col items-center p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center">
                <Zap className="h-8 w-8 mb-2 text-[#0066FF]" />
                <span className="text-sm font-medium">Power Automate</span>
              </a>
              <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center">
                <Settings2 className="h-8 w-8 mb-2 text-[#0078D4]" />
                <span className="text-sm font-medium">Azure Portal</span>
              </a>
              <a href="https://admin.microsoft.com" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center">
                <Mail className="h-8 w-8 mb-2 text-[#0078D4]" />
                <span className="text-sm font-medium">Microsoft 365 Admin</span>
              </a>
              <a href="https://learn.microsoft.com/en-us/graph/overview" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center p-4 rounded-lg border hover:bg-muted/50 transition-colors text-center">
                <ExternalLink className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm font-medium">Graph API Docs</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
