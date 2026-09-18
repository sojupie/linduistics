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
        <div className="mx-auto my-12 max-w-xl rounded border border-specimen-oxblood/40 bg-substrate-panel p-6 text-ink-carbon shadow-lg">
          <div className="flex items-center gap-3 border-b border-border-hairline pb-3">
            <span className="text-specimen-oxblood font-mono text-xs tracking-wider uppercase">
              Observation Interrupted
            </span>
          </div>
          <p className="mt-4 font-serif text-base text-ink-muted">
            A taxonomic computation anomaly occurred while rendering this specimen view.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-substrate-dark p-3 font-mono text-xs text-specimen-oxblood">
            {this.state.error?.message || 'Unknown taxonomy fault'}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 inline-flex items-center rounded border border-border-hairline bg-substrate-dark px-4 py-1.5 font-serif text-xs text-ink-carbon hover:border-ink-muted transition-colors"
          >
            Reset Field Register
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
