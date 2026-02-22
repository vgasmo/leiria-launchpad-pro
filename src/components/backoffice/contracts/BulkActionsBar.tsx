import { useTranslation } from 'react-i18next';
import { Archive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkActionsBarProps {
  selectedCount: number;
  onArchive: () => void;
  onClearSelection: () => void;
  isArchiving: boolean;
}

export function BulkActionsBar({ selectedCount, onArchive, onClearSelection, isArchiving }: BulkActionsBarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2">
      <Badge variant="secondary" className="text-sm">
        {t('contracts.bulk.selected', { count: selectedCount, defaultValue: '{{count}} selected' })}
      </Badge>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onArchive}
        disabled={isArchiving}
      >
        <Archive className="h-4 w-4" />
        {t('contracts.bulk.archiveSelected', { defaultValue: 'Archive Selected' })}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
