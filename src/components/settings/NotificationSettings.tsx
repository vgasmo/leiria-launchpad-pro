import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Bell, Mail } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const handleToggleDigest = async (enabled: boolean) => {
    try {
      await updatePrefs.mutateAsync({ email_digest_enabled: enabled });
      toast.success(enabled ? 'Email digest enabled' : 'Email digest disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences');
    }
  };

  const handleFrequencyChange = async (frequency: string) => {
    try {
      await updatePrefs.mutateAsync({ digest_frequency: frequency });
      toast.success('Digest frequency updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences');
    }
  };

  const handleDayChange = async (day: string) => {
    try {
      await updatePrefs.mutateAsync({ digest_day: parseInt(day) });
      toast.success('Digest day updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const digestEnabled = prefs?.email_digest_enabled ?? true;
  const digestFrequency = prefs?.digest_frequency ?? 'weekly';
  const digestDay = prefs?.digest_day ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Configure how you receive updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Digest
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive a summary of critical items needing your attention
            </p>
          </div>
          <Switch
            checked={digestEnabled}
            onCheckedChange={handleToggleDigest}
            disabled={updatePrefs.isPending}
          />
        </div>

        {digestEnabled && (
          <div className="grid gap-4 sm:grid-cols-2 pl-6 border-l-2 border-muted">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={digestFrequency} onValueChange={handleFrequencyChange} disabled={updatePrefs.isPending}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {digestFrequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={digestDay.toString()} onValueChange={handleDayChange} disabled={updatePrefs.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, i) => (
                      <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Note: Email digests will be sent based on your preferences. You'll receive summaries of overdue actions, 
          at-risk startups, and other critical items.
        </p>
      </CardContent>
    </Card>
  );
}
