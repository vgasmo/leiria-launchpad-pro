import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusModeProvider, FocusModeToggle, useFocusMode } from '@/components/ui/FocusModeToggle';

// Test helper component
function FocusConsumer() {
  const { isFocused } = useFocusMode();
  return <div data-testid="focus-state">{isFocused ? 'focused' : 'full'}</div>;
}

describe('FocusModeToggle', () => {
  it('defaults to focus mode', () => {
    render(
      <FocusModeProvider defaultFocused={true}>
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(screen.getByTestId('focus-state').textContent).toBe('focused');
  });

  it('toggles between focus and full view', () => {
    render(
      <FocusModeProvider defaultFocused={true}>
        <FocusModeToggle />
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(screen.getByTestId('focus-state').textContent).toBe('focused');
    fireEvent.click(screen.getByTestId('focus-mode-toggle'));
    expect(screen.getByTestId('focus-state').textContent).toBe('full');
    fireEvent.click(screen.getByTestId('focus-mode-toggle'));
    expect(screen.getByTestId('focus-state').textContent).toBe('focused');
  });

  it('can start in full view', () => {
    render(
      <FocusModeProvider defaultFocused={false}>
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(screen.getByTestId('focus-state').textContent).toBe('full');
  });
});
