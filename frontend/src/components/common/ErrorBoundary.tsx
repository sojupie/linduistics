import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Field Guide Encountered Anomaly:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }
      return (
        <div className="mx-auto my-12 max-w-xl rounded border border-falsefriend-border bg-page-surface p-8 text-ink-main shadow-xs">
          <div className="border-b border-book-rule pb-3">
            <h3 className="text-falsefriend-ink font-serif text-lg font-bold">
              Unable to display this section
            </h3>
          </div>
          <p className="mt-4 font-serif text-base text-ink-muted">
            An unexpected error occurred while loading this view.
          </p>
          <pre className="mt-4 overflow-x-auto rounded border border-book-rule bg-page-muted p-4 font-mono text-sm text-falsefriend-ink">
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-6 inline-flex items-center rounded border border-book-rule bg-page-surface px-4 py-2 font-serif text-sm text-ink-main hover:border-book-rule-strong transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback(): ReactNode {
    return this.props.fallback;
  }
}
