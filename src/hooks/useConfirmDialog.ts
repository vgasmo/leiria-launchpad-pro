import { useState, useCallback } from 'react';

type ConfirmVariant = 'destructive' | 'warning' | 'info' | 'success';

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
  isLoading: boolean;
}

const initialState: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: undefined,
  variant: 'destructive',
  onConfirm: () => {},
  isLoading: false,
};

/**
 * Hook for managing confirmation dialog state.
 * P1 CTO Hardening: Replaces native confirm() with premium dialogs.
 * 
 * Usage:
 * const { confirm, dialogProps } = useConfirmDialog();
 * 
 * await confirm({
 *   title: 'Eliminar documento?',
 *   description: 'Esta ação não pode ser desfeita.',
 *   onConfirm: () => deleteDoc(id),
 * });
 * 
 * <ConfirmDialog {...dialogProps} />
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(initialState);

  const confirm = useCallback((options: {
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void | Promise<void>;
  }) => {
    setState({
      open: true,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel,
      variant: options.variant ?? 'destructive',
      onConfirm: options.onConfirm,
      isLoading: false,
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await state.onConfirm();
    } finally {
      setState(initialState);
    }
  }, [state.onConfirm]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setState(initialState);
    }
  }, []);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      onOpenChange: handleOpenChange,
      title: state.title,
      description: state.description,
      confirmLabel: state.confirmLabel,
      variant: state.variant,
      onConfirm: handleConfirm,
      isLoading: state.isLoading,
    },
  };
}
