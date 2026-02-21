import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/logError';

interface Props {
  children: ReactNode;
  /** Widget name shown in fallback UI */
  name?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary for individual widgets/panels.
 * Unlike the global ErrorBoundary, this renders an inline card
 * so the rest of the page remains functional.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, {
      component: `WidgetErrorBoundary:${this.props.name ?? 'unknown'}`,
      severity: 'high',
      metadata: { componentStack: errorInfo.componentStack },
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive/70" />
          <p className="text-sm text-muted-foreground">
            {this.props.name
              ? `Erro ao carregar "${this.props.name}".`
              : 'Erro ao carregar este módulo.'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
            <RefreshCcw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
