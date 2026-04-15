/**
 * Workspace Email History Panel
 * Shows synced Outlook emails for a workspace, with AI summary and sync capabilities.
 * Staff-only component used in WorkspaceDetail overview.
 */
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useSyncEmails } from '@/hooks/useActivityTimeline';
import { EmailHistoryPanel } from '@/components/crm/drawer/EmailHistoryPanel';

interface WorkspaceEmailHistoryPanelProps {
  workspaceId: string;
}

export function WorkspaceEmailHistoryPanel({ workspaceId }: WorkspaceEmailHistoryPanelProps) {
  const emailSyncEnabled = useFeatureFlag('crm_graph_email_sync');
  const syncEmails = useSyncEmails();

  return (
    <EmailHistoryPanel
      workspaceId={workspaceId}
      onSyncEmails={() => syncEmails.mutate({ workspaceId })}
      isSyncing={syncEmails.isPending}
      emailSyncEnabled={emailSyncEnabled}
    />
  );
}
