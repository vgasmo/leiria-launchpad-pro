import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  ExternalLink, 
  ChevronDown, 
  Shield,
  Info,
  Video,
  Calendar,
  Users,
  Link2,
  Globe,
  Loader2,
  TestTube,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalGraphSettings, useUpdateGlobalGraphSettings, useToggleGlobalGraph, GraphApiGlobalSettings } from '@/hooks/useGlobalIntegrations';

export function GlobalGraphApiCard() {
  const { data: settings, isLoading } = useGlobalGraphSettings();
  const updateSettings = useUpdateGlobalGraphSettings();
  const toggleEnabled = useToggleGlobalGraph();
  
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showPolicyGuide, setShowPolicyGuide] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const settingsJson = settings?.settings_json as GraphApiGlobalSettings | undefined;
  const isConfigured = !!(settingsJson?.tenant_id && settingsJson?.client_id);
  const isEnabled = settings?.is_enabled && isConfigured;

  const handleSaveCredentials = async () => {
    if (!tenantId || !clientId || !clientSecret) {
      toast.error('All Azure AD credentials are required');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      toast.error('Invalid Tenant ID format (should be a GUID)');
      return;
    }
    if (!uuidRegex.test(clientId)) {
      toast.error('Invalid Client ID format (should be a GUID)');
      return;
    }

    await updateSettings.mutateAsync({
      tenant_id: tenantId,
      client_id: clientId,
      client_secret: clientSecret,
    });
    setClientSecret('');
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !isConfigured) {
      toast.error('Please configure Azure AD credentials first');
      return;
    }
    await toggleEnabled.mutateAsync(enabled);
  };

  const handleTestGraph = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Enter a valid consultant email to test');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-graph-api', {
        body: { test_email: testEmail },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(
          data.teams_url 
            ? `✓ Test passed! Teams URL: ${data.teams_url.slice(0, 50)}...` 
            : '✓ Event created and deleted successfully'
        );
      } else {
        toast.error(data?.error || 'Test failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to run test');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Global Microsoft Graph API
          {isEnabled && (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
          {isConfigured && !isEnabled && (
            <Badge variant="outline">Configured</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure Azure AD credentials once. Workspaces automatically use the assigned consultant's calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Sessions are created in the Outlook calendar of each workspace's assigned consultant. No manual email entry needed per workspace.
          </AlertDescription>
        </Alert>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-[#0078D4]" />
            <span>Outlook events</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="h-4 w-4 text-[#6264A7]" />
            <span>Teams meetings</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Per-consultant calendars</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Auto transcripts</span>
          </div>
        </div>

        {/* Azure AD Credentials */}
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <Label className="font-medium">Azure AD App Registration</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="global-tenant-id" className="text-xs">Tenant ID (Directory ID)</Label>
            <Input
              id="global-tenant-id"
              type="text"
              placeholder={settingsJson?.tenant_id || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-client-id" className="text-xs">Application (Client) ID</Label>
            <Input
              id="global-client-id"
              type="text"
              placeholder={settingsJson?.client_id || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-client-secret" className="text-xs">Client Secret</Label>
            <Input
              id="global-client-secret"
              type="password"
              placeholder={isConfigured ? '••••••••••••••••' : 'Enter client secret'}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Secret is stored securely and never exposed to the frontend.
            </p>
          </div>

          <Button 
            onClick={handleSaveCredentials}
            disabled={(!tenantId || !clientId || !clientSecret) || updateSettings.isPending}
            size="sm"
            className="w-full"
          >
            {updateSettings.isPending ? 'Saving...' : isConfigured ? 'Update Credentials' : 'Save Credentials'}
          </Button>
        </div>

        {/* Test Graph API */}
        {isConfigured && (
          <div className="space-y-2 pt-3 border-t">
            <Label className="flex items-center gap-2 text-sm">
              <TestTube className="h-4 w-4" />
              Test Graph API Connection
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="consultor@startupleiria.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTestGraph}
                disabled={isTesting || !testEmail}
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a test event with Teams link in this user's calendar, then deletes it.
            </p>
          </div>
        )}

        {/* Setup Instructions */}
        <Collapsible open={showSetup} onOpenChange={setShowSetup}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs p-0 h-auto">
              <ChevronDown className={`h-3 w-3 transition-transform ${showSetup ? 'rotate-180' : ''}`} />
              How to set up Azure AD App
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
              <h4 className="font-medium">1. Create Azure AD App Registration:</h4>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 text-xs">
                <li>Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Azure Portal → App Registrations <ExternalLink className="h-3 w-3 inline" /></a></li>
                <li>Click "New registration"</li>
                <li>Name: "Startup Leiria Calendar Sync"</li>
                <li>Supported account types: "Single tenant"</li>
                <li>Click "Register"</li>
              </ol>
              
              <h4 className="font-medium pt-2">2. Configure API Permissions (Application, not Delegated):</h4>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 text-xs">
                <li>Go to "API Permissions" → "Add a permission"</li>
                <li>Select "Microsoft Graph" → "Application permissions"</li>
                <li>Add these permissions:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><code className="bg-muted px-1 rounded">Calendars.ReadWrite</code> - Create/update calendar events</li>
                    <li><code className="bg-muted px-1 rounded">OnlineMeetings.ReadWrite.All</code> - Create Teams meetings</li>
                    <li><code className="bg-muted px-1 rounded">OnlineMeetingTranscript.Read.All</code> - Read transcripts (required!)</li>
                    <li><code className="bg-muted px-1 rounded">User.Read.All</code> - Resolve user emails</li>
                  </ul>
                </li>
                <li><strong>Click "Grant admin consent for [Your Org]"</strong></li>
              </ol>

              <h4 className="font-medium pt-2">3. Create Client Secret:</h4>
              <ol className="list-decimal list-inside text-muted-foreground space-y-2 text-xs">
                <li>Go to "Certificates & secrets"</li>
                <li>Click "New client secret"</li>
                <li>Set expiry (recommend: 24 months)</li>
                <li>Copy the secret value immediately (only shown once!)</li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Teams Application Access Policy Guide */}
        <Collapsible open={showPolicyGuide} onOpenChange={setShowPolicyGuide}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-xs p-0 h-auto text-amber-600">
              <ChevronDown className={`h-3 w-3 transition-transform ${showPolicyGuide ? 'rotate-180' : ''}`} />
              Teams Application Access Policy (required for transcripts)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3 text-sm">
              <p className="text-muted-foreground text-xs">
                By default, Microsoft blocks apps from accessing meeting transcripts. You must create an Application Access Policy to allow this app to access consultant meetings.
              </p>
              
              <h4 className="font-medium">PowerShell Commands (run as Teams Admin):</h4>
              <div className="bg-background rounded p-2 font-mono text-xs space-y-2 overflow-x-auto">
                <p className="text-muted-foreground"># 1. Connect to Teams</p>
                <code>Connect-MicrosoftTeams</code>
                <br /><br />
                <p className="text-muted-foreground"># 2. Create an access policy (replace APP_CLIENT_ID)</p>
                <code>New-CsApplicationAccessPolicy -Identity "StartupLeiriaAccess" -AppIds "YOUR_APP_CLIENT_ID" -Description "Allow Startup Leiria to access meetings"</code>
                <br /><br />
                <p className="text-muted-foreground"># 3. Grant to all consultants (or a specific group)</p>
                <code>Grant-CsApplicationAccessPolicy -PolicyName "StartupLeiriaAccess" -Global</code>
                <br /><br />
                <p className="text-muted-foreground"># OR grant to specific user:</p>
                <code>Grant-CsApplicationAccessPolicy -PolicyName "StartupLeiriaAccess" -Identity "consultor@startupleiria.com"</code>
              </div>
              
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Policy changes can take up to 30 minutes to propagate. Transcripts only appear after meetings end with transcription enabled.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <Label>Enable Graph API globally</Label>
            <p className="text-sm text-muted-foreground">
              All workspaces can use this for calendar sync
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggleEnabled.isPending || !isConfigured}
          />
        </div>

        {isEnabled && (
          <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="font-medium text-green-700 dark:text-green-400">🎉 Global integration active!</p>
            <p>Sessions auto-sync to the assigned consultant's Outlook calendar. No per-workspace setup needed.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
