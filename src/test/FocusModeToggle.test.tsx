import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// Mock Radix tooltip as passthrough so tests don't need TooltipProvider
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: any) => <>{children}</>,
  Root: ({ children }: any) => <>{children}</>,
  Trigger: ({ children }: any) => <>{children}</>,
  Content: ({ children }: any) => <>{children}</>,
  Portal: ({ children }: any) => <>{children}</>,
  Arrow: () => null,
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild, ...props }: any) => <span {...props}>{children}</span>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

import { FocusModeProvider, FocusModeToggle, useFocusMode } from '@/components/ui/FocusModeToggle';

// Test helper component
function FocusConsumer() {
  const { isFocused } = useFocusMode();
  return <div data-testid="focus-state">{isFocused ? 'focused' : 'full'}</div>;
}

function Wrapper({ children, defaultFocused = true }: { children: React.ReactNode; defaultFocused?: boolean }) {
  return (
    <FocusModeProvider defaultFocused={defaultFocused}>
      {children}
    </FocusModeProvider>
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
