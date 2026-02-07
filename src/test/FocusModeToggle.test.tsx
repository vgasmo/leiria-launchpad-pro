import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { FocusModeProvider, FocusModeToggle, useFocusMode } from '@/components/ui/FocusModeToggle';

// Test helper component
function FocusConsumer() {
  const { isFocused } = useFocusMode();
  return <div data-testid="focus-state">{isFocused ? 'focused' : 'full'}</div>;
}

describe('FocusModeToggle', () => {
  it('defaults to focus mode', () => {
    const { getByTestId } = render(
      <FocusModeProvider defaultFocused={true}>
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(getByTestId('focus-state').textContent).toBe('focused');
  });

  it('toggles between focus and full view', () => {
    const { getByTestId } = render(
      <FocusModeProvider defaultFocused={true}>
        <FocusModeToggle />
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(getByTestId('focus-state').textContent).toBe('focused');
    getByTestId('focus-mode-toggle').click();
    expect(getByTestId('focus-state').textContent).toBe('full');
    getByTestId('focus-mode-toggle').click();
    expect(getByTestId('focus-state').textContent).toBe('focused');
  });

  it('can start in full view', () => {
    const { getByTestId } = render(
      <FocusModeProvider defaultFocused={false}>
        <FocusConsumer />
      </FocusModeProvider>
    );
    expect(getByTestId('focus-state').textContent).toBe('full');
  });
});
