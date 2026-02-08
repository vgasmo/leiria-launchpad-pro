import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FocusModeProvider, FocusModeToggle, useFocusMode } from '@/components/ui/FocusModeToggle';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

// Test helper component
function FocusConsumer() {
  const { isFocused } = useFocusMode();
  return <div data-testid="focus-state">{isFocused ? 'focused' : 'full'}</div>;
}

function Wrapper({ children, defaultFocused = true }: { children: React.ReactNode; defaultFocused?: boolean }) {
  return (
    <TooltipProvider>
      <FocusModeProvider defaultFocused={defaultFocused}>
        {children}
      </FocusModeProvider>
    </TooltipProvider>
  );
}

describe('FocusModeToggle', () => {
  it('defaults to focus mode', () => {
    const { getByTestId } = render(
      <Wrapper defaultFocused={true}>
        <FocusConsumer />
      </Wrapper>
    );
    expect(getByTestId('focus-state').textContent).toBe('focused');
  });

  it('toggles between focus and full view', () => {
    const { getByTestId } = render(
      <Wrapper defaultFocused={true}>
        <FocusModeToggle />
        <FocusConsumer />
      </Wrapper>
    );
    expect(getByTestId('focus-state').textContent).toBe('focused');
    getByTestId('focus-mode-toggle').click();
    expect(getByTestId('focus-state').textContent).toBe('full');
    getByTestId('focus-mode-toggle').click();
    expect(getByTestId('focus-state').textContent).toBe('focused');
  });

  it('can start in full view', () => {
    const { getByTestId } = render(
      <Wrapper defaultFocused={false}>
        <FocusConsumer />
      </Wrapper>
    );
    expect(getByTestId('focus-state').textContent).toBe('full');
  });
});
