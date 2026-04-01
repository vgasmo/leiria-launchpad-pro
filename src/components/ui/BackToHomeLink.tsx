import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

interface BackToHomeLinkProps {
  to?: string;
  label?: string;
  variant?: 'button' | 'text';
  className?: string;
}

export function BackToHomeLink({ 
  to = '/my-workspaces', 
  label,
  variant = 'button',
  className = ''
}: BackToHomeLinkProps) {
  const { t } = useTranslation();
  const text = label || t('common.backToHome', { defaultValue: 'Voltar ao Início' });

  if (variant === 'text') {
    return (
      <Link 
        to={to} 
        className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {text}
      </Link>
    );
  }

  return (
    <Link to={to} className={className}>
      <Button variant="ghost" size="sm" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {text}
      </Button>
    </Link>
  );
}
