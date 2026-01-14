import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Shield, 
  Zap, 
  Mail,
  ChevronDown,
  Play,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AccessDenied } from '@/components/ui/AccessDenied';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

interface TestResult {
  status: TestStatus;
  message: string;
  details?: string;
}

export default function CrmDiagnostics() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();
  const [funnelItemId, setFunnelItemId] = useState('');
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [schemaTest, setSchemaTest] = useState<TestResult>({ status: 'idle', message: 'Not run' });
  const [permissionsTest, setPermissionsTest] = useState<TestResult>({ status: 'idle', message: 'Not run' });
  const [notificationsTest, setNotificationsTest] = useState<TestResult>({ status: 'idle', message: 'Not run' });
  const [graphSyncTest, setGraphSyncTest] = useState<TestResult>({ status: 'idle', message: 'Not run' });
  const [drawerTest, setDrawerTest] = useState<TestResult>({ status: 'idle', message: 'Not run' });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  if (!isStaff) {
    return <AppLayout><AccessDenied /></AppLayout>;
  }

  const runSchemaCheck = async () => {
    setSchemaTest({ status: 'running', message: 'Checking...' });
    addLog('Starting schema check...');
    
    try {
      // Check communication_log columns
      const { data: commLog, error: commErr } = await supabase
        .from('communication_log')
        .select('id, status, due_at, assigned_to, priority, completed_at, visibility, activity_type')
        .limit(1);
      
      if (commErr) throw new Error(`communication_log: ${commErr.message}`);
      addLog('✓ communication_log task columns exist');

      // Check funnel_items columns
      const { data: funnel, error: funnelErr } = await supabase
        .from('funnel_items')
        .select('id, next_action_at, next_action_description, last_activity_at')
        .limit(1);
      
      if (funnelErr) throw new Error(`funnel_items: ${funnelErr.message}`);
      addLog('✓ funnel_items next_action columns exist');

      // Check notifications columns
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .select('id, entity_type, entity_id')
        .limit(1);
      
      if (notifErr) throw new Error(`notifications: ${notifErr.message}`);
      addLog('✓ notifications entity columns exist');

      setSchemaTest({ status: 'pass', message: 'All required columns present' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Schema error: ${msg}`);
      setSchemaTest({ status: 'fail', message: msg });
    }
  };

  const runPermissionsCheck = async () => {
    setPermissionsTest({ status: 'running', message: 'Checking...' });
    addLog('Starting permissions check...');
    
    try {
      // Staff can query communication_log
      const { data: staffItems, error: staffErr } = await supabase
        .from('communication_log')
        .select('id, visibility')
        .limit(5);
      
      if (staffErr) throw new Error(`Staff query failed: ${staffErr.message}`);
      addLog(`✓ Staff can query communication_log (${staffItems?.length || 0} items)`);

      // Check visibility distribution
      const staffOnly = staffItems?.filter(i => i.visibility === 'staff').length || 0;
      const shared = staffItems?.filter(i => i.visibility === 'shared').length || 0;
      addLog(`  - Staff visibility: ${staffOnly}, Shared: ${shared}`);

      setPermissionsTest({ 
        status: 'pass', 
        message: `Staff access OK. ${staffItems?.length || 0} items visible.`,
        details: `Staff-only: ${staffOnly}, Shared: ${shared}`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Permissions error: ${msg}`);
      setPermissionsTest({ status: 'fail', message: msg });
    }
  };

  const runNotificationsCheck = async () => {
    setNotificationsTest({ status: 'running', message: 'Calling edge function...' });
    addLog('Calling generate-crm-notifications...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-crm-notifications', {
        body: {},
      });
      
      if (error) throw error;
      
      addLog(`✓ Function returned: ${JSON.stringify(data)}`);
      setNotificationsTest({ 
        status: 'pass', 
        message: `Created ${data?.created || 0} notifications`,
        details: `Tasks checked: ${data?.checked?.tasks || 0}, Funnel items: ${data?.checked?.funnelItems || 0}`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Notification function error: ${msg}`);
      setNotificationsTest({ status: 'fail', message: msg });
    }
  };

  const runGraphSyncCheck = async () => {
    if (!funnelItemId) {
      setGraphSyncTest({ status: 'warn', message: 'Enter a funnel_item_id first' });
      return;
    }
    
    setGraphSyncTest({ status: 'running', message: 'Running dry-run sync...' });
    addLog(`Calling sync-graph-email-history (dry_run) for ${funnelItemId}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-graph-email-history', {
        body: { funnel_item_id: funnelItemId, dry_run: true },
      });
      
      if (error) throw error;
      
      if (data?.error) {
        addLog(`⚠ Function returned error: ${data.error}`);
        setGraphSyncTest({ status: 'warn', message: data.error });
      } else {
        addLog(`✓ Dry run result: would insert ${data?.would_insert || 0} emails`);
        setGraphSyncTest({ 
          status: 'pass', 
          message: `Would sync ${data?.would_insert || 0} emails`,
          details: `Mailbox: ${data?.mailbox || 'N/A'}`
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Graph sync error: ${msg}`);
      setGraphSyncTest({ status: 'fail', message: msg });
    }
  };

  const runDrawerCheck = async () => {
    if (!funnelItemId) {
      setDrawerTest({ status: 'warn', message: 'Enter a funnel_item_id first' });
      return;
    }
    
    setDrawerTest({ status: 'running', message: 'Loading timeline...' });
    addLog(`Loading timeline for ${funnelItemId}...`);
    
    try {
      const { data: timeline, error: tlErr } = await supabase
        .from('communication_log')
        .select('id, activity_type, status')
        .eq('funnel_item_id', funnelItemId)
        .limit(50);
      
      if (tlErr) throw tlErr;
      
      const tasks = timeline?.filter(t => t.activity_type === 'task') || [];
      const openTasks = tasks.filter(t => t.status === 'open').length;
      
      addLog(`✓ Timeline loaded: ${timeline?.length || 0} items, ${tasks.length} tasks (${openTasks} open)`);
      
      setDrawerTest({ 
        status: 'pass', 
        message: `${timeline?.length || 0} timeline items loaded`,
        details: `Tasks: ${tasks.length} (${openTasks} open)`
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`✗ Drawer load error: ${msg}`);
      setDrawerTest({ status: 'fail', message: msg });
    }
  };

  const getStatusIcon = (status: TestStatus) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warn': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'running': return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      default: return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">CRM Diagnostics</h1>
          <p className="text-muted-foreground">Validate CRM features without affecting production data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Configuration</CardTitle>
            <CardDescription>Optional: provide a funnel_item_id for targeted tests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="funnel-id">Funnel Item ID (optional)</Label>
                <Input 
                  id="funnel-id"
                  value={funnelItemId} 
                  onChange={(e) => setFunnelItemId(e.target.value)}
                  placeholder="Enter UUID..."
                  className="font-mono text-sm"
                />
              </div>
              <Button variant="outline" onClick={() => window.open('/crm', '_blank')}>
                Open CRM →
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {/* Schema Check */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(schemaTest.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Schema Check</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{schemaTest.message}</p>
                    {schemaTest.details && <p className="text-xs text-muted-foreground">{schemaTest.details}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={runSchemaCheck} disabled={schemaTest.status === 'running'}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Check */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(permissionsTest.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Permissions Check</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{permissionsTest.message}</p>
                    {permissionsTest.details && <p className="text-xs text-muted-foreground">{permissionsTest.details}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={runPermissionsCheck} disabled={permissionsTest.status === 'running'}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Edge Function */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(notificationsTest.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Generate CRM Notifications</span>
                      <Badge variant="secondary" className="text-[10px]">writes data</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notificationsTest.message}</p>
                    {notificationsTest.details && <p className="text-xs text-muted-foreground">{notificationsTest.details}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={runNotificationsCheck} disabled={notificationsTest.status === 'running'}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Graph Sync (Dry Run) */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(graphSyncTest.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Graph Email Sync (Dry Run)</span>
                      <Badge variant="outline" className="text-[10px]">read-only</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{graphSyncTest.message}</p>
                    {graphSyncTest.details && <p className="text-xs text-muted-foreground">{graphSyncTest.details}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={runGraphSyncCheck} disabled={graphSyncTest.status === 'running'}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* UI Wiring Check */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(drawerTest.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">RecordDrawer Timeline Load</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{drawerTest.message}</p>
                    {drawerTest.details && <p className="text-xs text-muted-foreground">{drawerTest.details}</p>}
                  </div>
                </div>
                <Button size="sm" onClick={runDrawerCheck} disabled={drawerTest.status === 'running'}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Panel */}
        <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Diagnostic Logs</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{logs.length} entries</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${logsExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-48 rounded border bg-muted/30 p-2">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Run tests to see logs...</p>
                  ) : (
                    <div className="space-y-1 font-mono text-xs">
                      {logs.map((log, i) => (
                        <div key={i} className="text-muted-foreground">{log}</div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {logs.length > 0 && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLogs([])}>
                    Clear Logs
                  </Button>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </AppLayout>
  );
}
