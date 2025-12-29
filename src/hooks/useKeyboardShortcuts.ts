import { useState, useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Common shortcuts hook for the app
export function useAppShortcuts(handlers: {
  onSearch?: () => void;
  onToggleView?: () => void;
  onNewItem?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts = useCallback(() => {
    const result: KeyboardShortcut[] = [];
    
    if (handlers.onSearch) {
      result.push({
        key: 'k',
        ctrlKey: true,
        action: handlers.onSearch,
        description: 'Focus search',
      });
    }
    
    if (handlers.onToggleView) {
      result.push({
        key: 'v',
        action: handlers.onToggleView,
        description: 'Toggle view mode',
      });
    }
    
    if (handlers.onNewItem) {
      result.push({
        key: 'n',
        action: handlers.onNewItem,
        description: 'Create new item',
      });
    }
    
    if (handlers.onEscape) {
      result.push({
        key: 'Escape',
        action: handlers.onEscape,
        description: 'Close/cancel',
      });
    }

    return result;
  }, [handlers]);

  useKeyboardShortcuts(shortcuts());
}

// Session timeout hook
export function useSessionTimeout(timeoutMs: number = 30 * 60 * 1000, onTimeout: () => void) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(onTimeout, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, { passive: true });
    });
    
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout);
      });
    };
  }, [timeoutMs, onTimeout]);
}
