import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfirmVariant = 'destructive' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  isLoading?: boolean;
  children?: ReactNode;
}

const variantConfig: Record<ConfirmVariant, { icon: typeof AlertTriangle; iconClass: string; buttonClass: string }> = {
  destructive: {
    icon: Trash2,
    iconClass: 'text-destructive bg-destructive/10',
    buttonClass: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning bg-warning/10',
    buttonClass: 'bg-warning text-warning-foreground hover:bg-warning/90',
  },
  info: {
    icon: Info,
    iconClass: 'text-info bg-info/10',
    buttonClass: 'bg-info text-info-foreground hover:bg-info/90',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-success bg-success/10',
    buttonClass: 'bg-success text-success-foreground hover:bg-success/90',
  },
};

/**
 * Premium confirmation dialog with variants and Portuguese-first labels.
 * P1: Trust signal - clear confirmation before destructive actions.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  onConfirm,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              config.iconClass
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        {children && (
          <div className="px-4 py-3 bg-muted/50 rounded-lg my-2">
            {children}
          </div>
        )}
        
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel ?? t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(config.buttonClass)}
          >
            {isLoading ? t('common.loading') : (confirmLabel ?? t('common.confirm'))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
