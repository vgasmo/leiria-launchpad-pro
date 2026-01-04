/**
 * Admin panel for testing Teams notifications with workspace selection
 * Shows which settings source is used (workspace vs global fallback)
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Building2,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Microsoft Teams icon component
const TeamsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.19 8.77c1.32 0 2.4-1.06 2.4-2.38s-1.08-2.39-2.4-2.39c-.51 0-.98.16-1.37.43.25.52.38 1.1.38 1.71 0 .94-.32 1.8-.86 2.48.39.1.81.15 1.25.15h.6zm-4.12-3.4c0-1.62-1.32-2.93-2.95-2.93s-2.95 1.31-2.95 2.93 1.32 2.93 2.95 2.93 2.95-1.31 2.95-2.93zM5.27 11.53c0-.78.28-1.49.75-2.04H3.3v6.23c0 1.37 1.12 2.48 2.5 2.48.17 0 .33-.02.49-.05v-6.62h-1.02zm11.22-2.04H9.65c-1.38 0-2.5 1.11-2.5 2.48v5.81c0 .87.71 1.58 1.58 1.58H16c.87 0 1.58-.71 1.58-1.58v-7.43c0-.47-.38-.86-.86-.86h-.23zm.41 7.91c0 .31-.25.56-.56.56H9.22c-.31 0-.56-.25-.56-.56v-4.62c0-.31.25-.56.56-.56h7.12c.31 0 .56.25.56.56v4.62zm3.8-8.87c-.34-.15-.71-.24-1.1-.24h-.24c.56.62.9 1.44.9 2.33 0 .34-.05.67-.14.98h.91c.83 0 1.5.67 1.5 1.5v3.42c0 .31-.25.56-.56.56h-2.04v1.02h2.55c.87 0 1.58-.71 1.58-1.58v-5.81c0-1.08-.61-2.02-1.36-2.18z"/>
  </svg>
);

interface WorkspaceOption {
  id: string;
  name: string;
  startup_name: string | null;
}

interface TestResult {
  success: boolean;
  sent?: boolean;
  reason?: string;
  settings_source?: 'workspace' | 'program' | 'global_fallback' | 'not_found';
  error?: string;
}

export function AdminTeamsTestPanel() {
  const { t } = useTranslation();
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('global');
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  // Fetch workspaces for dropdown
  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['admin-workspaces-for-teams-test'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          id,
          startup:startups(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []).map((w: any) => ({
        id: w.id,
        name: w.startup?.name || 'Unknown Startup',
        startup_name: w.startup?.name,
      })) as WorkspaceOption[];
    },
  });

  // Fetch global Teams settings to show status
  const { data: globalSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['global-teams-settings-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams_integration_settings')
        .select('id, enabled, webhook_url')
        .is('workspace_id', null)
        .is('program_id', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async (workspaceId: string | null): Promise<TestResult> => {
      const workspaceName = workspaceId 
        ? workspaces?.find(w => w.id === workspaceId)?.name || 'Unknown'
        : 'Global Test';

      const { data, error } = await supabase.functions.invoke('teams-notify', {
        body: {
          workspace_id: workspaceId,
          event_type: 'test',
          payload: {
            title: 'Test Notification',
            summary: `This is a test from Startup Companion Admin`,
            startup_name: workspaceName,
            fields: [
              { name: 'Test Type', value: workspaceId ? 'Workspace-specific' : 'Global' },
              { name: 'Workspace', value: workspaceName },
              { name: 'Timestamp', value: new Date().toLocaleString() },
            ],
            link: window.location.origin + '/admin',
            link_text: 'Open Admin Panel',
            priority: 'low',
          },
        },
      });

      if (error) throw error;
      return data as TestResult;
    },
    onSuccess: (result) => {
      setLastResult(result);
      if (result.sent) {
        toast.success('Test message sent to Teams!', {
          description: `Used ${result.settings_source === 'global_fallback' ? 'global settings' : 'workspace settings'}`,
        });
      } else {
        toast.info('Message not sent', {
          description: result.reason || 'Unknown reason',
        });
      }
    },
    onError: (error: Error) => {
      setLastResult({ success: false, error: error.message });
      toast.error('Test failed', { description: error.message });
    },
  });

  const handleTest = () => {
    const wsId = selectedWorkspace === 'global' ? null : selectedWorkspace;
    testMutation.mutate(wsId);
  };

  const hasGlobalConfig = globalSettings?.enabled && globalSettings?.webhook_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TeamsIcon className="h-5 w-5 text-[#6264A7]" />
          Teams Notification Test
          {hasGlobalConfig && (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Global Configured
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Test Teams notifications for specific workspaces to verify both workspace-specific and global fallback settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global status info */}
        {loadingSettings ? (
          <Skeleton className="h-10 w-full" />
        ) : !hasGlobalConfig ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Global Teams integration is not configured. Configure it in Workflow Integrations below.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-900/10">
            <Globe className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              Global Teams settings are active. Workspaces without specific settings will use these.
            </AlertDescription>
          </Alert>
        )}

        {/* Workspace selector */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Test Target</label>
            <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
              <SelectTrigger>
                <SelectValue placeholder="Select workspace..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Global Settings (no workspace)
                  </div>
                </SelectItem>
                {loadingWorkspaces ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  workspaces?.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {ws.name}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleTest}
            disabled={testMutation.isPending || !hasGlobalConfig}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {testMutation.isPending ? 'Sending...' : 'Send Test'}
          </Button>
        </div>

        {/* Last result */}
        {lastResult && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              {lastResult.sent ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : lastResult.error ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Info className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                {lastResult.sent ? 'Message Sent' : lastResult.error ? 'Error' : 'Not Sent'}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              {lastResult.settings_source && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Settings used:</span>
                  <Badge variant="outline" className="text-xs">
                    {lastResult.settings_source === 'global_fallback' ? (
                      <><Globe className="h-3 w-3 mr-1" /> Global Fallback</>
                    ) : lastResult.settings_source === 'workspace' ? (
                      <><Building2 className="h-3 w-3 mr-1" /> Workspace Specific</>
                    ) : (
                      lastResult.settings_source
                    )}
                  </Badge>
                </div>
              )}
              {lastResult.reason && (
                <div><span className="text-muted-foreground">Reason:</span> {lastResult.reason}</div>
              )}
              {lastResult.error && (
                <div className="text-red-600"><span>Error:</span> {lastResult.error}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
