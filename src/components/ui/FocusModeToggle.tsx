import { useState, createContext, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FocusContextType {
  isFocused: boolean;
  toggle: () => void;
}

const FocusContext = createContext<FocusContextType>({ isFocused: true, toggle: () => {} });

export function useFocusMode() {
  return useContext(FocusContext);
}

export function FocusModeProvider({ children, defaultFocused = true }: { children: ReactNode; defaultFocused?: boolean }) {
  const [isFocused, setIsFocused] = useState(defaultFocused);
  return (
    <FocusContext.Provider value={{ isFocused, toggle: () => setIsFocused(p => !p) }}>
      {children}
    </FocusContext.Provider>
  );
}

export function FocusModeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { isFocused, toggle } = useFocusMode();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          className={cn('gap-2 h-8', className)}
          data-testid="focus-mode-toggle"
        >
          {isFocused ? (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{t('dashboard.focusMode', 'Focus')}</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{t('dashboard.fullView', 'Full View')}</span>
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isFocused
          ? t('dashboard.switchToFull', 'Show all sections')
          : t('dashboard.switchToFocus', 'Show only priorities')}
      </TooltipContent>
    </Tooltip>
  );
}
