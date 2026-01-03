import { ReactNode, useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface WizardStepTransitionProps {
  children: ReactNode;
  stepKey: string;
  direction?: 'forward' | 'backward';
  className?: string;
}

export function WizardStepTransition({
  children,
  stepKey,
  direction = 'forward',
  className,
}: WizardStepTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const prevKeyRef = useRef(stepKey);

  useEffect(() => {
    // Reset animation on step change
    if (prevKeyRef.current !== stepKey) {
      setIsVisible(false);
      prevKeyRef.current = stepKey;
      // Trigger reflow for animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [stepKey]);

  return (
    <div
      key={stepKey}
      className={cn(
        'transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 translate-x-0'
          : direction === 'forward'
          ? 'opacity-0 translate-x-8'
          : 'opacity-0 -translate-x-8',
        className
      )}
    >
      {children}
    </div>
  );
}
