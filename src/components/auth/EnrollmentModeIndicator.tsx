/**
 * Enrollment Mode Indicator for Login Page
 * Shows a subtle, non-alarming banner when the platform is in invite-only mode.
 * Helps founders understand why signup might be gated.
 */

import { useTranslation } from 'react-i18next';
import { Shield, Info } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';

export function EnrollmentModeIndicator() {
  const { t } = useTranslation();
  const isOpenRegistration = useFeatureFlag('open_registration');

  // When open registration is ON, no need to warn
  if (isOpenRegistration) return null;

  return (
    <div className={cn(
      'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
      'border-amber-200/60 dark:border-amber-800/30',
      'bg-amber-50/60 dark:bg-amber-950/15',
      'text-amber-800 dark:text-amber-300'
    )}>
      <Shield className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1">
        <p className="font-medium">
          {t('login.inviteOnlyBanner', { defaultValue: 'Plataforma por convite' })}
        </p>
        <p className="text-amber-700/80 dark:text-amber-400/70">
          {t('login.inviteOnlyBannerDesc', { 
            defaultValue: 'O registo está atualmente limitado a convites. Se a sua startup já faz parte do ecossistema, pode fazer login normalmente. Para novos registos, contacte a equipa Startup Leiria.' 
          })}
        </p>
      </div>
    </div>
  );
}
