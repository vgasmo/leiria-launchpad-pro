/**
 * Admin panel for managing feature flags
 * Controls which new features are enabled globally or per-program
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, Globe, Building2 } from 'lucide-react';
import { useFeatureFlags, useUpdateFeatureFlag } from '@/hooks/useFeatureFlags';
import { toast } from 'sonner';

const FLAG_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  public_first_contact_booking: {
    label: 'Public First Contact Booking',
    description: 'Allow external leads to book first contact sessions via public links (no login required)',
  },
  funnel_ui: {
    label: 'Funnel Management UI',
    description: 'Enable leads/funnel management interface in admin panel',
  },
  strict_calendar_validation: {
    label: 'Strict Calendar Validation',
    description: 'Require Microsoft Graph API validation before booking (fail-closed mode)',
  },
  founder_gamification: {
    label: 'Founder Gamification',
    description: 'Enable XP, badges, and streak tracking for founders',
  },
  traction_stage: {
    label: 'Traction Stage',
    description: 'Enable traction stage between MVP and growth stages',
  },
};

export function AdminFeatureFlagsManager() {
  const { t } = useTranslation();
  const { data: flags, isLoading } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();

  const handleToggle = (flagId: string, currentEnabled: boolean) => {
    updateFlag.mutate(
      { id: flagId, enabled: !currentEnabled },
      {
        onSuccess: () => {
          toast.success(`Feature flag ${!currentEnabled ? 'enabled' : 'disabled'}`);
        },
        onError: (error) => {
          toast.error('Failed to update flag', { description: error.message });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Group flags by scope
  const globalFlags = flags?.filter((f) => f.scope === 'global') ?? [];
  const programFlags = flags?.filter((f) => f.scope === 'program') ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          {t('admin.featureFlags.title', 'Feature Flags')}
        </CardTitle>
        <CardDescription>
          {t('admin.featureFlags.description', 'Control which new features are enabled. All flags are OFF by default for safety.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global flags */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe className="h-4 w-4" />
            Global Flags
          </div>
          {globalFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No global flags configured</p>
          ) : (
            <div className="space-y-3">
              {globalFlags.map((flag) => {
                const meta = FLAG_DESCRIPTIONS[flag.key] ?? {
                  label: flag.key,
                  description: flag.description ?? '',
                };
                return (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{meta.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {flag.key}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag.id, flag.enabled)}
                      disabled={updateFlag.isPending}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Program-scoped flags */}
        {programFlags.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Program Overrides
            </div>
            <div className="space-y-3">
              {programFlags.map((flag) => {
                const meta = FLAG_DESCRIPTIONS[flag.key] ?? {
                  label: flag.key,
                  description: flag.description ?? '',
                };
                return (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{meta.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          Program: {flag.program_id?.slice(0, 8)}...
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{meta.description}</p>
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggle(flag.id, flag.enabled)}
                      disabled={updateFlag.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
