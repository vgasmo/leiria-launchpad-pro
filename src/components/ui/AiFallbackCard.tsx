import { useTranslation } from 'react-i18next';
import { Sparkles, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AiFallbackCardProps {
  title?: string;
  className?: string;
}

/**
 * Graceful fallback when AI features are unavailable.
 * Shows an intentionally degraded state rather than a broken/error state.
 */
export function AiFallbackCard({ title, className }: AiFallbackCardProps) {
  const { t } = useTranslation();

  return (
    <Card className={cn('border-border/40 rounded-2xl', className)}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-muted-foreground/50" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {title || t('ai.unavailable.title', { defaultValue: 'Sugestões IA temporariamente indisponíveis' })}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {t('ai.unavailable.hint', { defaultValue: 'Funcionalidade assistiva — não afeta os seus dados.' })}
          </p>
        </div>
        <WifiOff className="h-4 w-4 text-muted-foreground/30 shrink-0" />
      </CardContent>
    </Card>
  );
}
