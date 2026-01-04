import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Calendar,
  Info,
  Mail,
  AlertTriangle
} from 'lucide-react';
import { useOutlookSettings, useUpdateOutlookSettings } from '@/hooks/useOutlookCalendar';
import { useGlobalGraphSettings } from '@/hooks/useGlobalIntegrations';

interface WorkspaceCalendarCardProps {
  workspaceId: string;
  canEdit?: boolean;
}

export function WorkspaceCalendarCard({ workspaceId, canEdit = true }: WorkspaceCalendarCardProps) {
  const { data: settings, isLoading } = useOutlookSettings(workspaceId);
  const { data: globalSettings, isLoading: globalLoading } = useGlobalGraphSettings();
  const updateSettings = useUpdateOutlookSettings(workspaceId);
  
  const [email, setEmail] = useState('');

  const globalEnabled = globalSettings?.is_enabled;
  const currentEmail = email || settings?.calendar_user_email || '';
  const isEnabled = settings?.enabled;
  const hasEmail = !!currentEmail;

  const handleSaveEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await updateSettings.mutateAsync({ 
        calendar_user_email: email,
        sync_mode: 'graph',
      });
      toast.success('Calendar email saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (enabled && !hasEmail) {
      toast.error('Please enter a calendar email first');
      return;
    }
    if (enabled && !globalEnabled) {
      toast.error('Global Graph API is not enabled. Ask an admin to configure it.');
      return;
    }
    try {
      await updateSettings.mutateAsync({ 
        enabled,
        sync_mode: 'graph',
        ...(email && { calendar_user_email: email }),
      });
      toast.success(enabled ? 'Calendar sync enabled' : 'Calendar sync disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  if (isLoading || globalLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#0078D4]" />
          Outlook Calendar Sync
          {isEnabled && globalEnabled && hasEmail && (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Automatically create Outlook events with Teams meeting links for sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!globalEnabled && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Global Microsoft Graph API is not configured. Contact an admin to set it up in Admin → Integrations.
            </AlertDescription>
          </Alert>
        )}

        {globalEnabled && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Enter the email address of the Outlook calendar where session events should be created.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="calendar-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Calendar User Email
              </Label>
              <div className="flex gap-2">
                <Input
                  id="calendar-email"
                  type="email"
                  placeholder={settings?.calendar_user_email || 'consultor@startupleiria.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                  disabled={!canEdit}
                />
                <Button 
                  variant="outline" 
                  onClick={handleSaveEmail}
                  disabled={!email || updateSettings.isPending || !canEdit}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This user's calendar will receive session events. They must be in your Microsoft 365 organization.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Enable calendar sync for this workspace</Label>
                <p className="text-sm text-muted-foreground">
                  Sessions will create Outlook events + Teams links
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                disabled={updateSettings.isPending || !hasEmail || !globalEnabled || !canEdit}
              />
            </div>

            {isEnabled && hasEmail && (
              <div className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400">✓ Calendar sync active</p>
                <p className="text-muted-foreground">Events → {settings?.calendar_user_email || email}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
