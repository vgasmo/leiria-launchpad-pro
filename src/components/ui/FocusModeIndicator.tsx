import { Zap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FocusModeIndicatorProps {
  active: boolean;
  onToggle: () => void;
  itemCount?: number;
  className?: string;
}

/**
 * Focus Mode indicator and toggle.
 * P1: Consultor productivity feature - reduces noise, shows only urgent items.
 */
export function FocusModeIndicator({
  active,
  onToggle,
  itemCount,
  className,
}: FocusModeIndicatorProps) {
  const { t } = useTranslation();

  if (!active) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn('gap-1.5 text-muted-foreground hover:text-foreground', className)}
      >
        <Zap className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('focusMode.activate', 'Modo Foco')}</span>
      </Button>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full',
      'bg-warning/10 border border-warning/30',
      'animate-fade-in',
      className
    )}>
      <Zap className="h-3.5 w-3.5 text-warning" />
      <span className="text-sm font-medium text-warning-foreground">
        {t('focusMode.active', 'Modo Foco Ativo')}
      </span>
      {itemCount !== undefined && (
        <Badge variant="secondary" className="h-5 text-xs">
          {itemCount}
        </Badge>
      )}
      <button
        onClick={onToggle}
        className="ml-1 p-0.5 rounded-full hover:bg-warning/20 transition-colors"
        aria-label={t('focusMode.deactivate', 'Desativar Modo Foco')}
      >
        <X className="h-3.5 w-3.5 text-warning" />
      </button>
    </div>
  );
}

/**
 * Focus Mode empty state
 */
export function FocusModeEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
        <Zap className="h-8 w-8 text-success" />
      </div>
      <h3 className="font-semibold text-lg mb-2">
        {t('focusMode.allClear', 'Tudo em dia!')}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        {t('focusMode.noPriorityItems', 'Não há itens urgentes que precisem da sua atenção. Excelente trabalho!')}
      </p>
    </div>
  );
}
