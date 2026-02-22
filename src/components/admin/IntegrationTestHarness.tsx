/**
 * Integration Test Harness for Microsoft Graph / Teams / Calendar
 * Tests all critical integration points and persists results
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Video,
  Clock,
  Wifi,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invokeWithAuth } from '@/lib/invokeWithAuth';
import { format } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  duration_ms?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface TestRun {
  id: string;
  ran_at: string;
  ran_by: string;
  overall_status: 'pass' | 'fail' | 'partial';
  results: TestResult[];
}

const TEST_DEFINITIONS = [
  {
    key: 'graph_auth',
    name: 'Graph API Authentication',
    description: 'Verify Microsoft Graph API credentials are valid',
    icon: Wifi,
  },
  {
    key: 'get_schedule',
    name: 'Get Schedule / Availability',
    description: 'Check if we can fetch free/busy calendar data',
    icon: Calendar,
  },
  {
    key: 'create_event',
    name: 'Create Calendar Event',
    description: 'Test creating a calendar event (dry-run mode)',
    icon: Clock,
  },
  {
    key: 'teams_meeting',
    name: 'Teams Meeting Link',
    description: 'Verify Teams online meeting creation',
    icon: Video,
  },
];

export function IntegrationTestHarness() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Fetch last test run from activity_log or a dedicated table
  const { data: lastRun, isLoading: loadingLastRun } = useQuery({
    queryKey: ['integration-test-last-run'],
    queryFn: async () => {
      // Check activity_log for last integration test run
      const { data } = await supabase
        .from('activity_log')
        .select('*')
        .eq('entity_type', 'integration_test')
        .eq('action', 'test_run')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.metadata) {
        return {
          id: data.id,
          ran_at: data.created_at,
          ran_by: data.user_id,
          overall_status: (data.metadata as Record<string, unknown>).overall_status as string,
          results: (data.metadata as Record<string, unknown>).results as TestResult[],
        } as TestRun;
      }
      return null;
    },
  });

  // Run individual test
  const runTest = async (testKey: string): Promise<TestResult> => {
    const startTime = Date.now();
    setCurrentTest(testKey);

    try {
      let result: TestResult = { name: testKey, status: 'pending' };

      switch (testKey) {
        case 'graph_auth': {
          const { data, error } = await invokeWithAuth('test-graph-api', {
            body: { test: 'auth' },
          });
          if (error) throw error;
          result = {
            name: testKey,
            status: data?.success ? 'pass' : 'fail',
            error: data?.error,
            details: data,
          };
          break;
        }

        case 'get_schedule': {
          // Find an active workspace that has a consultant assigned
          // Use a join to get both conditions in one query
          const { data: workspacesWithConsultant, error: wsError } = await supabase
            .from('workspaces')
            .select(`
              id,
              workspace_users!inner(user_id, role, active)
            `)
            .eq('status', 'active')
            .eq('workspace_users.role', 'consultor')
            .eq('workspace_users.active', true)
            .limit(1);

          if (wsError) {
            result = { name: testKey, status: 'fail', error: `Query error: ${wsError.message}` };
            break;
          }

          if (!workspacesWithConsultant?.length) {
            result = { name: testKey, status: 'skip', error: 'No active workspace with consultant assigned' };
            break;
          }

          const workspaceId = workspacesWithConsultant[0].id;
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = format(tomorrow, 'yyyy-MM-dd');

          const { data, error } = await invokeWithAuth('check-consultant-availability', {
            body: { workspaceId, date: dateStr },
          });

          if (error) throw error;
          
          // Treat 'no_graph_integration' or 'not_configured' as skip (needs config)
          const skipReasons = ['not_configured', 'no_graph_integration'];
          result = {
            name: testKey,
            status: data?.success ? 'pass' : skipReasons.includes(data?.reason) ? 'skip' : 'fail',
            error: skipReasons.includes(data?.reason)
              ? 'Graph API not configured for calendar'
              : (data?.error || data?.warning || data?.reason),
            details: { slots_found: data?.slots?.length ?? 0, reason: data?.reason, workspaceId },
          };
          break;
        }

        case 'create_event': {
          // Dry-run test - just validate we can reach the function
          const { data, error } = await invokeWithAuth('test-graph-api', {
            body: { test: 'create_event_dry_run' },
          });
          if (error) throw error;
          result = {
            name: testKey,
            status: data?.success ? 'pass' : data?.reason === 'not_configured' ? 'skip' : 'fail',
            error: data?.error,
            details: data,
          };
          break;
        }

        case 'teams_meeting': {
          const { data, error } = await invokeWithAuth('test-graph-api', {
            body: { test: 'teams_meeting' },
          });
          if (error) throw error;
          result = {
            name: testKey,
            status: data?.success ? 'pass' : data?.reason === 'not_configured' ? 'skip' : 'fail',
            error: data?.error,
            details: data,
          };
          break;
        }

        default:
          result = { name: testKey, status: 'skip', error: 'Unknown test' };
      }

      result.duration_ms = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        name: testKey,
        status: 'fail',
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const results: TestResult[] = [];

    for (const test of TEST_DEFINITIONS) {
      const result = await runTest(test.key);
      results.push(result);
      setTestResults([...results]);
    }

    setCurrentTest(null);
    setIsRunning(false);

    // Determine overall status
    const hasFailure = results.some((r) => r.status === 'fail');
    const allPass = results.every((r) => r.status === 'pass' || r.status === 'skip');
    const overallStatus = hasFailure ? 'fail' : allPass ? 'pass' : 'partial';

    // Log to activity_log
    const { data: user } = await supabase.auth.getUser();
    if (user.user?.id) {
      const metadataJson: Json = {
        overall_status: overallStatus,
        results: results.map(r => ({
          name: r.name,
          status: r.status,
          duration_ms: r.duration_ms ?? null,
          error: r.error ?? null,
        })),
        test_count: results.length,
        pass_count: results.filter((r) => r.status === 'pass').length,
        fail_count: results.filter((r) => r.status === 'fail').length,
      };
      await supabase.from('activity_log').insert([{
        user_id: user.user.id,
        entity_type: 'integration_test',
        action: 'test_run',
        metadata: metadataJson,
      }]);
    }

    queryClient.invalidateQueries({ queryKey: ['integration-test-last-run'] });

    if (overallStatus === 'pass') {
      toast.success(t('admin.integrationTests.allPassed', 'Todos os testes de integração passaram!'));
    } else if (overallStatus === 'fail') {
      toast.error(t('admin.integrationTests.someFailed', 'Alguns testes de integração falharam'));
    } else {
      toast.info(t('admin.integrationTests.completedWithWarnings', 'Testes de integração concluídos com avisos'));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skip':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'skip':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'partial':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Partial</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Integration Test Harness
            </CardTitle>
            <CardDescription>
              Verify Microsoft Graph API, Calendar, and Teams integrations are working correctly
            </CardDescription>
          </div>
          <Button onClick={runAllTests} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run All Tests
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Last run info */}
        {loadingLastRun ? (
          <Skeleton className="h-10 w-full" />
        ) : lastRun ? (
          <Alert className={lastRun.overall_status === 'pass' ? 'border-green-500/50' : 'border-amber-500/50'}>
            <div className="flex items-center gap-2">
              {getStatusIcon(lastRun.overall_status)}
              <AlertDescription>
                Last run: {format(new Date(lastRun.ran_at), 'PPp')} — {getStatusBadge(lastRun.overall_status)}
              </AlertDescription>
            </div>
          </Alert>
        ) : (
          <Alert>
            <AlertDescription>No previous test runs found. Click "Run All Tests" to validate your integrations.</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Test list */}
        <div className="space-y-3">
          {TEST_DEFINITIONS.map((test) => {
            const result = testResults.find((r) => r.name === test.key);
            const isCurrentTest = currentTest === test.key;
            const Icon = test.icon;

            return (
              <div
                key={test.key}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                  isCurrentTest ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result?.duration_ms && (
                    <span className="text-xs text-muted-foreground">{result.duration_ms}ms</span>
                  )}
                  {result ? (
                    getStatusIcon(result.status)
                  ) : isCurrentTest ? (
                    <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error details */}
        {testResults.some((r) => r.status === 'fail' && r.error) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Errors</h4>
            <ScrollArea className="h-32 rounded border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20">
              {testResults
                .filter((r) => r.status === 'fail' && r.error)
                .map((r) => (
                  <div key={r.name} className="text-sm text-red-700 dark:text-red-400">
                    <strong>{r.name}:</strong> {r.error}
                  </div>
                ))}
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
