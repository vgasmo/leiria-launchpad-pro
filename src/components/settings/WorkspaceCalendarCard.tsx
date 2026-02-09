import { useState, useEffect } from 'react';
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
  AlertTriangle,
  User,
  Settings2,
} from 'lucide-react';
import { useOutlookSettings, useUpdateOutlookSettings } from '@/hooks/useOutlookCalendar';
import { useGlobalGraphSettings } from '@/hooks/useGlobalIntegrations';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceCalendarCardProps {
  workspaceId: string;
  canEdit?: boolean;
}

export function WorkspaceCalendarCard({ workspaceId, canEdit = true }: WorkspaceCalendarCardProps) {
  const { data: settings, isLoading } = useOutlookSettings(workspaceId);
  const { data: globalSettings, isLoading: globalLoading } = useGlobalGraphSettings();
  const updateSettings = useUpdateOutlookSettings(workspaceId);
  
  const [email, setEmail] = useState('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [assignedConsultantEmail, setAssignedConsultantEmail] = useState<string | null>(null);
  const [loadingConsultant, setLoadingConsultant] = useState(true);

  const globalEnabled = globalSettings?.is_enabled;
  const isEnabled = settings?.enabled;
  
  // Fetch assigned consultant email
  useEffect(() => {
    async function fetchConsultant() {
      setLoadingConsultant(true);
      try {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('assigned_consultor_id')
          .eq('id', workspaceId)
          .single();
        
        if (workspace?.assigned_consultor_id) {
          const { data: profile } = await supabase
            .from('profiles_safe')
            .select('email')
            .eq('id', workspace.assigned_consultor_id)
            .single();
          
          setAssignedConsultantEmail(profile?.email || null);
        } else {
          setAssignedConsultantEmail(null);
        }
      } catch {
        setAssignedConsultantEmail(null);
      } finally {
        setLoadingConsultant(false);
      }
    }
    
    fetchConsultant();
  }, [workspaceId]);

  // Initialize state from settings
  useEffect(() => {
    if (settings) {
      setUseCustomEmail(settings.use_custom_calendar_email ?? false);
      setEmail(settings.calendar_user_email || '');
    }
  }, [settings]);

  const effectiveEmail = useCustomEmail 
    ? email 
    : assignedConsultantEmail;
  
  const hasEffectiveEmail = !!effectiveEmail;
  const canEnableSync = hasEffectiveEmail && globalEnabled;

  const handleSaveCustomEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      await updateSettings.mutateAsync({ 
        calendar_user_email: email,
        use_custom_calendar_email: true,
        sync_mode: 'graph',
      });
      toast.success('Custom calendar email saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  const handleToggleCustomEmail = async (useCustom: boolean) => {
    setUseCustomEmail(useCustom);
    
    if (!useCustom) {
      // Switching back to auto: clear custom email flag
      try {
        await updateSettings.mutateAsync({ 
          use_custom_calendar_email: false,
          sync_mode: 'graph',
        });
        toast.success('Using assigned consultant calendar');
      } catch (error: any) {
        toast.error(error.message || 'Failed to update');
      }
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    if (enabled && !hasEffectiveEmail) {
      toast.error('No calendar email available. Assign a consultant or set a custom email.');
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
        use_custom_calendar_email: useCustomEmail,
        ...(useCustomEmail && email && { calendar_user_email: email }),
      });
      toast.success(enabled ? 'Calendar sync enabled' : 'Calendar sync disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    }
  };

  if (isLoading || globalLoading || loadingConsultant) {
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
          {isEnabled && globalEnabled && hasEffectiveEmail && (
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

        {globalEnabled && !assignedConsultantEmail && !useCustomEmail && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              No consultant assigned to this workspace. Assign a consultant in Settings or use a custom calendar email.
            </AlertDescription>
          </Alert>
        )}

        {globalEnabled && (
          <>
            {/* Assigned Consultant (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Assigned Consultant Calendar
              </Label>
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className={assignedConsultantEmail ? 'text-foreground' : 'text-muted-foreground italic'}>
                  {assignedConsultantEmail || 'No consultant assigned'}
                </span>
                {assignedConsultantEmail && !useCustomEmail && (
                  <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Sessions will be created in this consultant's Outlook calendar by default.
              </p>
            </div>

            {/* Custom Email Override Toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Override with custom email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Use a different calendar instead of the assigned consultant
                </p>
              </div>
              <Switch
                checked={useCustomEmail}
                onCheckedChange={handleToggleCustomEmail}
                disabled={updateSettings.isPending || !canEdit}
              />
            </div>

            {/* Custom Email Input (only when override is on) */}
            {useCustomEmail && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label htmlFor="custom-calendar-email" className="text-xs">Custom Calendar Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="custom-calendar-email"
                    type="email"
                    placeholder="shared-calendar@startupleiria.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    disabled={!canEdit}
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleSaveCustomEmail}
                    disabled={!email || updateSettings.isPending || !canEdit}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Enable Sync Toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label>Enable calendar sync for this workspace</Label>
                <p className="text-sm text-muted-foreground">
                  Sessions will create Outlook events + Teams links
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggleSync}
                disabled={updateSettings.isPending || !canEnableSync || !canEdit}
              />
            </div>

            {isEnabled && hasEffectiveEmail && (
              <div className="text-xs bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="font-medium text-green-700 dark:text-green-400">✓ Calendar sync active</p>
                <p className="text-muted-foreground">Events → {effectiveEmail}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
