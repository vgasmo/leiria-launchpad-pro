import { useTranslation } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreakHeroProps {
  streakWeeks: number;
  className?: string;
}

export function StreakHero({ streakWeeks, className }: StreakHeroProps) {
  const { t } = useTranslation();

  // Don't show if no streak
  if (streakWeeks <= 0) return null;

  // Determine visual intensity based on streak length
  const isHotStreak = streakWeeks >= 4;
  const isMilestone = streakWeeks === 4 || streakWeeks === 8 || streakWeeks === 12 || streakWeeks === 26 || streakWeeks === 52;

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border transition-all",
        isHotStreak 
          ? "bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border-orange-300/30 dark:border-orange-700/30" 
          : "bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20",
        isMilestone && "animate-pulse",
        className
      )}
    >
      <div className={cn(
        "flex items-center justify-center h-12 w-12 rounded-full",
        isHotStreak 
          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white" 
          : "bg-primary/20 text-primary"
      )}>
        {isHotStreak ? (
          <Flame className="h-6 w-6 animate-bounce" style={{ animationDuration: '2s' }} />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xl font-bold tabular-nums",
            isHotStreak ? "text-orange-600 dark:text-orange-400" : "text-foreground"
          )}>
            {streakWeeks}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('streakHero.weeksStreak', 'week streak', { count: streakWeeks })}
          </span>
          {isMilestone && (
            <Badge variant="secondary" className="text-xs">
              🎉 {t('streakHero.milestone', 'Milestone!')}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {isHotStreak 
            ? t('streakHero.onFire', "You're on fire! Keep the momentum going.") 
            : t('streakHero.keepItUp', 'Keep coming back weekly to build your streak.')}
        </p>
      </div>
    </div>
  );
}
