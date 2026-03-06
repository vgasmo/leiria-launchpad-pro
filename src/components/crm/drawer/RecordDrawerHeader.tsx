import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Activity } from 'lucide-react';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FunnelItem, FunnelStage } from '@/hooks/useFunnel';
import { getFunnelStageLabel } from '@/lib/stageLabels';
import { getRelationshipStatus, getRelationshipStatusConfig } from '@/lib/crmUtils';
import { cn } from '@/lib/utils';

const STAGE_OPTIONS: FunnelStage[] = [
  'new', 'first_contact_booked', 'met', 'qualified', 'proposal_sent',
  'negotiating', 'contracted', 'incubating', 'accelerating', 'rejected', 'archived',
];

const STAGE_COLORS: Record<FunnelStage, string> = {
  new: 'bg-slate-500',
  first_contact_booked: 'bg-blue-500',
  met: 'bg-indigo-500',
  qualified: 'bg-purple-500',
  proposal_sent: 'bg-amber-500',
  negotiating: 'bg-orange-500',
  contracted: 'bg-green-500',
  incubating: 'bg-emerald-600',
  accelerating: 'bg-primary',
  rejected: 'bg-destructive',
  archived: 'bg-muted-foreground',
};

interface RecordDrawerHeaderProps {
  item: FunnelItem;
  onStageChange: (stage: FunnelStage) => void;
  isUpdating: boolean;
}

export function RecordDrawerHeader({ item, onStageChange, isUpdating }: RecordDrawerHeaderProps) {
  const { t } = useTranslation();
  const [localStage, setLocalStage] = useState<FunnelStage>(item.stage);

  // Sync local state when the prop item changes (e.g. different record opened)
  useEffect(() => {
    setLocalStage(item.stage);
  }, [item.id, item.stage]);
  
  const stageColor = STAGE_COLORS[localStage];
  const stageLabel = getFunnelStageLabel(t, localStage);
  const nextActionAt = item.next_action_at ?? null;
  const lastActivityAt = item.last_activity_at ?? null;
  
  const relationshipStatus = getRelationshipStatus({
    next_action_at: nextActionAt,
    last_activity_at: lastActivityAt,
  });
  const statusConfig = getRelationshipStatusConfig(relationshipStatus);

  return (
    <SheetHeader className="p-4 pb-2 border-b">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg truncate">
              {item.organization_name || item.contact_name || t('crm.unnamedLead')}
            </SheetTitle>
            <Badge className={cn('h-5 text-[10px] shrink-0', statusConfig.bgColor, statusConfig.color)}>
              <Activity className="h-3 w-3 mr-1" />
              {t(`crm.relationshipStatus.${relationshipStatus}`)}
            </Badge>
          </div>
          {item.contact_email && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              {item.contact_email}
            </p>
          )}
        </div>
        <Select
          value={localStage}
          onValueChange={(value) => {
            const newStage = value as FunnelStage;
            setLocalStage(newStage);
            onStageChange(newStage);
          }}
          disabled={isUpdating}
        >
          <SelectTrigger className={cn('w-auto min-w-[140px] h-8', stageColor, 'text-white border-0 hover:opacity-90')} data-testid="stage-select">
            <SelectValue>{stageLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STAGE_OPTIONS.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {getFunnelStageLabel(t, stage)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </SheetHeader>
  );
}

export { STAGE_COLORS, STAGE_OPTIONS };
