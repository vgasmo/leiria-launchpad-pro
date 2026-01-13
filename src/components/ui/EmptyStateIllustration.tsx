import { cn } from '@/lib/utils';

type IllustrationType = 
  | 'no-data' 
  | 'no-results' 
  | 'success' 
  | 'error' 
  | 'empty-inbox' 
  | 'welcome' 
  | 'rocket'
  | 'chart'
  | 'documents'
  | 'team';

interface EmptyStateIllustrationProps {
  type: IllustrationType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * P2: SVG illustrations for empty states - lightweight, themed, and animated.
 */
export function EmptyStateIllustration({ type, size = 'md', className }: EmptyStateIllustrationProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const illustrations: Record<IllustrationType, JSX.Element> = {
    'no-data': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <circle cx="50" cy="50" r="40" className="fill-muted/50" />
        <rect x="30" y="35" width="40" height="30" rx="4" className="fill-muted stroke-muted-foreground/30" strokeWidth="2" />
        <path d="M35 50h30M35 57h20" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
        <circle cx="70" cy="30" r="12" className="fill-primary/20 stroke-primary" strokeWidth="2">
          <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M67 27l6 6M73 27l-6 6" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'no-results': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <circle cx="45" cy="45" r="25" className="stroke-muted-foreground/30" strokeWidth="3" fill="none" />
        <path d="M63 63l15 15" className="stroke-muted-foreground/50" strokeWidth="4" strokeLinecap="round">
          <animate attributeName="stroke-opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M35 45h20" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'success': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-scale-in">
        <circle cx="50" cy="50" r="35" className="fill-green-500/20 stroke-green-500" strokeWidth="3" />
        <path d="M35 50l10 10 20-20" className="stroke-green-500" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.5s" fill="freeze" />
          <animate attributeName="stroke-dasharray" values="60" dur="0.5s" fill="freeze" />
        </path>
      </svg>
    ),
    'error': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <circle cx="50" cy="50" r="35" className="fill-destructive/20 stroke-destructive" strokeWidth="3" />
        <path d="M35 35l30 30M65 35l-30 30" className="stroke-destructive" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    'empty-inbox': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <rect x="20" y="30" width="60" height="45" rx="4" className="fill-muted stroke-muted-foreground/30" strokeWidth="2" />
        <path d="M20 45l30 15 30-15" className="stroke-muted-foreground/40" strokeWidth="2" fill="none" />
        <circle cx="75" cy="25" r="10" className="fill-accent/30 stroke-accent" strokeWidth="2">
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    ),
    'welcome': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <circle cx="50" cy="50" r="35" className="fill-primary/10" />
        <circle cx="50" cy="40" r="12" className="fill-primary/30 stroke-primary" strokeWidth="2" />
        <path d="M30 70c0-11 9-20 20-20s20 9 20 20" className="stroke-primary" strokeWidth="2" fill="none" />
        <path d="M70 25l5 5M75 20l-5 10M80 25l-10 5" className="stroke-accent" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
        </path>
      </svg>
    ),
    'rocket': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <path d="M50 20c-5 10-5 30-5 40l5 10 5-10c0-10 0-30-5-40z" className="fill-primary/20 stroke-primary" strokeWidth="2" />
        <circle cx="50" cy="40" r="5" className="fill-primary" />
        <path d="M40 55l-8 8M60 55l8 8" className="stroke-primary/50" strokeWidth="2" strokeLinecap="round" />
        <path d="M45 70l5 10 5-10" className="fill-accent stroke-accent" strokeWidth="1">
          <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
        </path>
      </svg>
    ),
    'chart': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <rect x="20" y="60" width="12" height="20" rx="2" className="fill-primary/40" />
        <rect x="38" y="45" width="12" height="35" rx="2" className="fill-primary/60" />
        <rect x="56" y="30" width="12" height="50" rx="2" className="fill-primary/80" />
        <rect x="74" y="50" width="12" height="30" rx="2" className="fill-primary/50" />
        <path d="M20 25l20 15 20-10 26 5" className="stroke-accent" strokeWidth="2" strokeLinecap="round" fill="none">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
          <animate attributeName="stroke-dasharray" values="100" dur="1s" fill="freeze" />
        </path>
      </svg>
    ),
    'documents': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <rect x="25" y="20" width="40" height="55" rx="3" className="fill-muted stroke-muted-foreground/30" strokeWidth="2" />
        <rect x="35" y="25" width="40" height="55" rx="3" className="fill-card stroke-muted-foreground/40" strokeWidth="2" />
        <path d="M42 40h26M42 48h26M42 56h18M42 64h22" className="stroke-muted-foreground/40" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    'team': (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-fade-in">
        <circle cx="50" cy="35" r="12" className="fill-primary/30 stroke-primary" strokeWidth="2" />
        <circle cx="25" cy="45" r="8" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" />
        <circle cx="75" cy="45" r="8" className="fill-muted stroke-muted-foreground/40" strokeWidth="2" />
        <path d="M35 65c0-8 7-15 15-15s15 7 15 15" className="stroke-primary" strokeWidth="2" fill="none" />
        <path d="M15 70c0-6 4-10 10-10s10 4 10 10M65 70c0-6 4-10 10-10s10 4 10 10" className="stroke-muted-foreground/40" strokeWidth="2" fill="none" />
      </svg>
    ),
  };

  return (
    <div className={cn(sizeClasses[size], className)}>
      {illustrations[type]}
    </div>
  );
}
