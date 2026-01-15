import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { logError } from '@/lib/logError';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

/**
 * Sanitize error message for production display.
 * Never expose stack traces, internal paths, or sensitive data.
 */
function getSafeErrorMessage(error: Error | null, isDev: boolean): string | null {
  if (!error) return null;
  
  // In development, show full message for debugging
  if (isDev) {
    return error.message;
  }
  
  // In production, only show safe generic messages
  // Check for known safe error patterns
  const safePatterns = [
    /network/i,
    /timeout/i,
    /not found/i,
    /unauthorized/i,
    /forbidden/i,
  ];
  
  const message = error.message;
  
  // If it matches a safe pattern, show a sanitized version
  if (safePatterns.some(p => p.test(message))) {
    if (/network/i.test(message)) return 'Network error. Please check your connection.';
    if (/timeout/i.test(message)) return 'Request timed out. Please try again.';
    if (/not found/i.test(message)) return 'The requested resource was not found.';
    if (/unauthorized/i.test(message)) return 'You are not authorized to perform this action.';
    if (/forbidden/i.test(message)) return 'Access denied.';
  }
  
  // For all other errors, return null (show generic message only)
  return null;
}

/**
 * Generate a unique error ID for support reference
 */
function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: generateErrorId(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with structured context using our logging utility
    const loggedError = logError(error, {
      component: 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
    
    // Update state with the logged error ID
    this.setState({ errorId: loggedError.errorId });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/my-workspaces';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const safeMessage = getSafeErrorMessage(this.state.error, isDev);

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                An unexpected error occurred. Please try refreshing the page or return to the dashboard.
              </p>
              
              {/* Error ID for support reference (always safe to show) */}
              {this.state.errorId && (
                <p className="text-xs text-muted-foreground mb-4">
                  Error ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
                </p>
              )}
              
              {/* Only show error details in development or for safe messages */}
              {safeMessage && (
                <details className="text-left bg-muted/50 rounded-lg p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    {isDev ? 'Error details (dev only)' : 'More info'}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-destructive">
                    {safeMessage}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
              <Button onClick={this.handleReload}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
