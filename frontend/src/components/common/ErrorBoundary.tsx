import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './ErrorState';

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
        <div className="mx-auto my-12 max-w-xl rounded border border-book-rule bg-page-surface p-8 text-ink-main shadow-xs">
          <ErrorState
            title="Unable to display this view"
            errorMessage={this.state.error?.message}
            onRetry={() => this.setState({ hasError: false, error: null })}
            retryLabel="Try again"
            className="py-2"
          />
        </div>
      );
    }

    return this.props.children;
  }

  private get fallback(): ReactNode {
    return this.props.fallback;
  }
}
